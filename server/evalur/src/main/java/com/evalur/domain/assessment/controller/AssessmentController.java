package com.evalur.domain.assessment.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.evalur.common.ApiResponse;
import com.evalur.domain.ai.entity.AiDocument;
import com.evalur.domain.assessment.dto.AssessmentRequest;
import com.evalur.domain.assessment.dto.AssessmentSummaryResponse;
import com.evalur.domain.assessment.dto.DocumentTopicsRequest;
import com.evalur.domain.assessment.entity.Assessment;
import com.evalur.domain.assessment.repository.AssessmentRepository;
import com.evalur.domain.assessment.service.AssessmentService;
import com.evalur.exceptions.BadRequestException;
import com.evalur.security.utils.SecurityUtils;

@RestController
@RequestMapping("/assessments")
public class AssessmentController {

    private final AssessmentService assessmentService;
    private final AssessmentRepository assessmentRepository;

    public AssessmentController(AssessmentService assessmentService, AssessmentRepository assessmentRepository) {
        this.assessmentService = assessmentService;
        this.assessmentRepository = assessmentRepository;
    }

    @PostMapping("/topics")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<String>>> getTopicsForDocuments(@RequestBody DocumentTopicsRequest request) {
        Long orgId = SecurityUtils.getCurrentOrgId();
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        if (request.documentIds() == null || request.documentIds().isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(List.of(), "No documents selected."));
        }
        List<String> topics = assessmentService.extractTopics(request.documentIds(), orgId);
        return ResponseEntity.ok(ApiResponse.success(topics, "Topics extracted successfully."));
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createAssessment(@RequestBody AssessmentRequest request) {
        var currentUser = SecurityUtils.getCurrentUser();
        if (currentUser.getOrganization() == null || currentUser.getOrganization().getId() == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        Long orgId = currentUser.getOrganization().getId();

        if (request.title() == null || request.title().trim().isBlank()) {
            throw new BadRequestException("Assessment title is required.");
        }
        if (request.title().trim().length() > 255) {
            throw new BadRequestException("Assessment title cannot exceed 255 characters.");
        }
        boolean hasTopics = request.topics() != null && !request.topics().isEmpty();
        boolean hasLegacyRole = request.role() != null && !request.role().isBlank();
        if (!hasTopics && !hasLegacyRole) {
            throw new BadRequestException("At least one learning objective or topic must be selected.");
        }

        // Validate source documents belong to the user's organization before proceeding
        List<AiDocument> validatedDocs = assessmentService.validateDocumentsForOrganization(request.documentIds(), orgId);

        // Initialize the Assessment record
        Assessment assessment = Assessment.builder()
                .title(request.title().trim())
                .role(request.role() != null ? request.role() : "Course Assessment")
                .seniority(request.seniority() != null ? request.seniority() : "Standard")
                .organization(currentUser.getOrganization())
                .status(Assessment.AssessmentStatus.GENERATING)
                .content("{}")
                .documents(validatedDocs)
                .build();

        assessment = assessmentRepository.save(assessment);

        // Trigger async generation in the background
        assessmentService.runGenerationPipeline(assessment.getId(), request.documentIds(), request);

        return ResponseEntity.accepted().body(ApiResponse.success(
                Map.of("id", assessment.getId(), "status", "GENERATING"),
                "Assessment generation started."
        ));
    }

    @GetMapping("/get-complete-assessments")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<Assessment>>> getFullMyAssessments() {
        Long orgId = SecurityUtils.getCurrentOrgId();
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        return ResponseEntity.ok(ApiResponse.success(
                assessmentRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId),
                "Assessments retrieved."
        ));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<AssessmentSummaryResponse>>> getMyAssessments() {
        Long orgId = SecurityUtils.getCurrentOrgId();
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        List<AssessmentSummaryResponse> list = assessmentRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId)
                .stream()
                .map(a -> new AssessmentSummaryResponse(a.getId(), a.getTitle(), a.getRole(), a.getSeniority(), a.getStatus()))
                .toList();

        return ResponseEntity.ok(ApiResponse.success(list, "Assessments retrieved."));
    }
}
