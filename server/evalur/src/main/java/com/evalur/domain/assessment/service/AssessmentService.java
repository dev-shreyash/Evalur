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
import com.evalur.domain.assessment.dto.AssessmentRequest;
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

    @Transactional
    public List<String> extractTopics(List<String> documentIds, Long organizationId) {
        List<AiDocument> documents = validateDocumentsForOrganization(documentIds, organizationId);
        java.util.Set<String> allTopics = new java.util.LinkedHashSet<>();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        for (AiDocument doc : documents) {
            boolean hasStoredTopics = false;
            if (doc.getExtractedTopics() != null && !doc.getExtractedTopics().isBlank()) {
                try {
                    List<String> parsed = mapper.readValue(doc.getExtractedTopics(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                    if (parsed != null && !parsed.isEmpty()) {
                        allTopics.addAll(parsed);
                        hasStoredTopics = true;
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse cached topics for doc {}: {}", doc.getId(), e.getMessage());
                }
            }

            if (!hasStoredTopics) {
                try {
                    String context = retrievalService.getRelevantContext(
                            doc.getFilename(),
                            organizationId,
                            List.of(doc.getId().toString())
                    );
                    if (context != null && !context.isBlank()) {
                        List<String> aiTopics = aiGenerationService.extractTopicsFromText(context);
                        if (!aiTopics.isEmpty()) {
                            allTopics.addAll(aiTopics);
                            doc.setExtractedTopics(mapper.writeValueAsString(aiTopics));
                            aiDocumentRepository.save(doc);
                        }
                    }
                } catch (Exception e) {
                    log.warn("Could not extract topics for document {}: {}", doc.getId(), e.getMessage());
                }
            }
        }

        return new java.util.ArrayList<>(allTopics);
    }

    @Async("taskExecutor")
    @Transactional
    public void runGenerationPipeline(Long assessmentId, List<String> documentIds, AssessmentRequest request) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found for ID: " + assessmentId));

        try {
            log.info("Starting generation for Assessment ID: {}", assessmentId);

            if (documentIds != null && !documentIds.isEmpty()) {
                List<Long> longIds = documentIds.stream()
                        .map(Long::valueOf)
                        .collect(Collectors.toList());
                
                List<AiDocument> documents = aiDocumentRepository.findAllById(longIds);
                assessment.setDocuments(documents); 
                log.info("Linked {} documents to Assessment {}", documents.size(), assessmentId);
            }

            String retrievalQuery;
            if (request != null && request.topics() != null && !request.topics().isEmpty()) {
                retrievalQuery = String.join(", ", request.topics());
            } else {
                retrievalQuery = (assessment.getRole() != null ? assessment.getRole() : "") + " " + 
                                 (assessment.getSeniority() != null ? assessment.getSeniority() : "");
            }

            String pdfContext = "";
            if (documentIds != null && !documentIds.isEmpty()) {
                pdfContext = retrievalService.getRelevantContext(
                        retrievalQuery.trim(),
                        assessment.getOrganization().getId(),
                        documentIds
                );
            }

            String jsonContent;
            if (request != null && request.topics() != null && !request.topics().isEmpty()) {
                jsonContent = aiGenerationService.generateCourseAssessmentJson(
                        assessment.getTitle(),
                        request.topics(),
                        request.assessmentFocus(),
                        request.questionTypes(),
                        request.questionCount(),
                        pdfContext,
                        0
                );
            } else {
                jsonContent = aiGenerationService.generateAssessmentJson(
                        assessment.getRole(),
                        assessment.getSeniority(),
                        pdfContext,
                        request != null ? request.jobDescription() : null,
                        0 
                );
            }

            assessment.setContent(jsonContent);
            assessment.setStatus(Assessment.AssessmentStatus.READY);
            assessmentRepository.save(assessment);
            
            log.info("Assessment {} successfully marked as READY with document links.", assessmentId);

        } catch (Exception e) {
            log.error("Generation failed for ID {}: {}", assessmentId, e.getMessage(), e);
            assessment.setStatus(Assessment.AssessmentStatus.FAILED);
            assessmentRepository.save(assessment);
        }
    }

    @Async("taskExecutor")
    @Transactional
    public void runGenerationPipeline(Long assessmentId, List<String> documentIds, String jobDescription) {
        runGenerationPipeline(assessmentId, documentIds, new AssessmentRequest(null, null, null, documentIds, jobDescription));
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
