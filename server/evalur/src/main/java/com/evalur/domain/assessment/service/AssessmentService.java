package com.evalur.domain.assessment.service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.scheduling.annotation.Async;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.evalur.domain.ai.entity.AiDocument;
import com.evalur.domain.ai.repository.AiDocumentRepository;
import com.evalur.domain.ai.service.AiGenerationService;
import com.evalur.domain.ai.service.RetrievalService;
import com.evalur.domain.assessment.entity.Assessment;
import com.evalur.domain.assessment.repository.AssessmentRepository;
import com.evalur.exceptions.ResourceNotFoundException;


@Service
public class AssessmentService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AssessmentService.class);

    private final AssessmentRepository assessmentRepository;
    private final RetrievalService retrievalService;
    private final AiDocumentRepository aiDocumentRepository; 
    private final AiGenerationService aiGenerationService;

    public AssessmentService(
            AssessmentRepository assessmentRepository,
            RetrievalService retrievalService,
            AiDocumentRepository aiDocumentRepository,
            AiGenerationService aiGenerationService) {
        this.assessmentRepository = assessmentRepository;
        this.retrievalService = retrievalService;
        this.aiDocumentRepository = aiDocumentRepository;
        this.aiGenerationService = aiGenerationService;
    }

    @Transactional(readOnly = true)
    public List<AiDocument> validateDocumentsForOrganization(List<String> documentIds, Long organizationId) {
        if (organizationId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        if (documentIds == null || documentIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> longIds = documentIds.stream()
                .map(Long::valueOf)
                .collect(Collectors.toList());

        List<AiDocument> documents = aiDocumentRepository.findAllById(longIds);

        if (documents.size() != longIds.size()) {
            throw new ResourceNotFoundException("AiDocument", "ids", documentIds);
        }

        for (AiDocument doc : documents) {
            if (doc.getOrganization() == null || !doc.getOrganization().getId().equals(organizationId)) {
                throw new AccessDeniedException("Document " + doc.getId() + " does not belong to user's organization.");
            }
        }

        return documents;
    }

    @Async("taskExecutor")
    @Transactional // 2. Added Transactional to ensure the join table update commits
    public void runGenerationPipeline(Long assessmentId, List<String> documentIds, String jobDescription) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found for ID: " + assessmentId));

        try {
            log.info("Starting generation for Assessment ID: {}", assessmentId);

            // 3. Convert String IDs to Long and Link the entities to populate assessments_documents
            if (documentIds != null && !documentIds.isEmpty()) {
                List<Long> longIds = documentIds.stream()
                        .map(Long::valueOf)
                        .collect(Collectors.toList());
                
                List<AiDocument> documents = aiDocumentRepository.findAllById(longIds);
                assessment.setDocuments(documents); 
                
                log.info("Linked {} documents to Assessment {}", documents.size(), assessmentId);
            }

            // 1. Get Context from PDFs for Gemini
            String pdfContext = "";
            if (documentIds != null && !documentIds.isEmpty()) {
                pdfContext = retrievalService.getRelevantContext(
                        assessment.getRole() + " " + assessment.getSeniority(),
                        assessment.getOrganization().getId(),
                        documentIds
                );
            }

            // 2. Generate JSON via Gemini
            String jsonContent = aiGenerationService.generateAssessmentJson(
                    assessment.getRole(),
                    assessment.getSeniority(),
                    pdfContext,
                    jobDescription,
                    0 
            );

            // 3. Update and Save
            assessment.setContent(jsonContent);
            assessment.setStatus(Assessment.AssessmentStatus.READY);
            
            // This save now includes the document relationship!
            assessmentRepository.save(assessment);
            
            log.info("Assessment {} successfully marked as READY with document links.", assessmentId);

        } catch (Exception e) {
            log.error("Generation failed for ID {}: {}", assessmentId, e.getMessage(), e);
            assessment.setStatus(Assessment.AssessmentStatus.FAILED);
            assessmentRepository.save(assessment);
        }
    }

    @Transactional
    public void saveResults(Long id, String content) {
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));
        assessment.setContent(content);
        assessment.setStatus(Assessment.AssessmentStatus.READY);
        assessmentRepository.save(assessment);
    }

    @Transactional
    public void updateStatusToFailed(Long id) {
        assessmentRepository.findById(id).ifPresent(a -> {
            a.setStatus(Assessment.AssessmentStatus.FAILED);
            assessmentRepository.save(a);
        });
    }
}
