package com.evalur.domain.assessment.service;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.evalur.domain.ai.dto.AiReasoningContext;
import com.evalur.domain.ai.service.AiReasoningService;
import com.evalur.domain.ai.service.RetrievalService;
import com.evalur.domain.assessment.dto.UserSubmissionDTO;
import com.evalur.domain.assessment.entity.AssessmentEvaluation;
import com.evalur.domain.assessment.entity.EvaluationStatus;
import com.evalur.domain.assessment.entity.UserAssessment;
import com.evalur.domain.assessment.repository.AssessmentEvaluationRepository;


@Service
public class EvaluationService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(EvaluationService.class);

    private final AssessmentEvaluationRepository evaluationRepository;
    private final ScoringService scoringService;
    private final RetrievalService retrievalService;
    private final AiReasoningService aiReasoningService;

    public EvaluationService(
            AssessmentEvaluationRepository evaluationRepository,
            ScoringService scoringService,
            RetrievalService retrievalService,
            AiReasoningService aiReasoningService) {
        this.evaluationRepository = evaluationRepository;
        this.scoringService = scoringService;
        this.retrievalService = retrievalService;
        this.aiReasoningService = aiReasoningService;
    }

    @Transactional
    public void runEvaluationPipeline(UserAssessment ua, UserSubmissionDTO dto) {
        
        // --- Phase 1: Objective Scoring (Deterministic) ---
        BigDecimal score = scoringService.calculateObjectiveScore(dto, ua.getAssessment());

        // Find existing sidecar evaluation or initialize a new one
        AssessmentEvaluation evaluation = evaluationRepository.findByUserAssessmentId(ua.getId())
                .orElseGet(() -> AssessmentEvaluation.builder().userAssessment(ua).build());
        
        evaluation.setUserAssessment(ua);
        evaluation.setObjectiveScore(score);

        // --- Phase 2 & 3: Asynchronous Logic Analysis (if code solution provided) ---
        boolean requiresCodingAnalysis = dto != null && 
                dto.getCodingSolution() != null && 
                !dto.getCodingSolution().trim().isBlank();

        if (requiresCodingAnalysis) {
            // Persist EVALUATING state before asynchronous analysis begins
            evaluation.setEvaluationStatus(EvaluationStatus.EVALUATING);
            final AssessmentEvaluation savedEval = evaluationRepository.saveAndFlush(evaluation);

            try {
                // 1. Extract metadata from the assessment
                Long orgId = (ua.getAssessment() != null && ua.getAssessment().getOrganization() != null)
                        ? ua.getAssessment().getOrganization().getId()
                        : null;

                // 2. Map associated document IDs for RAG filter
                List<String> documentIds = (ua.getAssessment() != null && ua.getAssessment().getDocuments() != null)
                        ? ua.getAssessment().getDocuments().stream()
                                .map(doc -> doc.getId().toString())
                                .collect(Collectors.toList())
                        : Collections.emptyList();

                // 3. Fetch context from Neon/PGVector if documents exist
                String rRubric = "";
                if (orgId != null && !documentIds.isEmpty()) {
                    rRubric = retrievalService.getRelevantContext(
                            dto.getCodingSolution(),
                            orgId,
                            documentIds
                    );
                }

                // 4. Bundle context for the AI Consultant
                AiReasoningContext aiContext = AiReasoningContext.builder()
                        .evaluationId(savedEval.getId())
                        .candidateCode(dto.getCodingSolution())
                        .solutionRubric(rRubric)
                        .build();

                // 5. Trigger Async Logic Analysis
                aiReasoningService.generateReasoning(aiContext);

            } catch (Exception e) {
                log.error("Failed to initiate asynchronous AI reasoning for Evaluation ID: {}", savedEval.getId(), e);
                savedEval.setEvaluationStatus(EvaluationStatus.FAILED);
                savedEval.setAiLogicFeedback("Automated code analysis could not be initiated. Please contact your instructor or administrator.");
                evaluationRepository.save(savedEval);
            }
        } else {
            // No coding analysis required: complete objective MCQ evaluation immediately
            evaluation.setEvaluationStatus(EvaluationStatus.COMPLETED);
            evaluationRepository.save(evaluation);
            log.info("Evaluation completed objectively (no coding solution submitted) for UserAssessment ID: {}", ua.getId());
        }
    }
}
