package com.evalur.domain.assessment.controller;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.evalur.common.ApiResponse;
import com.evalur.domain.assessment.dto.AssessmentAssignmentRequest;
import com.evalur.domain.assessment.dto.CandidateAssessmentResponse;
import com.evalur.domain.assessment.dto.UserSubmissionDTO;
import com.evalur.domain.assessment.entity.AssessmentEvaluation;
import com.evalur.domain.assessment.entity.UserAssessment;
import com.evalur.domain.assessment.repository.UserAssessmentRepository;
import com.evalur.domain.assessment.service.EvaluationService;
import com.evalur.domain.assessment.service.ReportService;
import com.evalur.domain.assessment.service.UserAssessmentService;
import com.evalur.exceptions.ResourceNotFoundException;
import com.evalur.security.utils.SecurityUtils;


@RestController
@RequestMapping("/user-assessments")
public class UserAssessmentController {

    private final UserAssessmentService userAssessmentService;
    private final EvaluationService evaluationService;
    private final UserAssessmentRepository userAssessmentRepository;
    private final ReportService reportService;

    public UserAssessmentController(
            UserAssessmentService userAssessmentService,
            EvaluationService evaluationService,
            UserAssessmentRepository userAssessmentRepository,
            ReportService reportService) {
        this.userAssessmentService = userAssessmentService;
        this.evaluationService = evaluationService;
        this.userAssessmentRepository = userAssessmentRepository;
        this.reportService = reportService;
    }

    @PostMapping("/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Void>> assign(
            @RequestBody AssessmentAssignmentRequest request) {
        Long orgId = SecurityUtils.getCurrentOrgId();
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        userAssessmentService.assignToCandidates(request, orgId);
        return ResponseEntity.ok(ApiResponse.success(null, "Assessment assigned successfully."));
    }

    @GetMapping("/my-tasks")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<ApiResponse<List<CandidateAssessmentResponse>>> getMyTasks() {
        return ResponseEntity.ok(ApiResponse.success(
                userAssessmentService.getCandidateDashboard(SecurityUtils.getCurrentUser().getId()),
                "Tasks retrieved."
        ));
    }

    @GetMapping("/{assignmentId}/start")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<ApiResponse<String>> startTest(@PathVariable Long assignmentId) {
        String content = userAssessmentService.startAssessment(
                assignmentId,
                SecurityUtils.getCurrentUser().getId()
        );
        return ResponseEntity.ok(ApiResponse.success(content, "Test started."));
    }

    @PostMapping("/submit")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<ApiResponse<Void>> submit(@RequestBody UserSubmissionDTO dto) {
        Long currentUserId = SecurityUtils.getCurrentUser().getId();

        // 1. Mark status as SUBMITTED (ownership check inside)
        userAssessmentService.submitAssessment(dto, currentUserId);

        // 2. Fetch the session
        UserAssessment ua = userAssessmentRepository.findById(dto.getUserAssessmentId())
                .orElseThrow(() -> new ResourceNotFoundException("UserAssessment", "id", dto.getUserAssessmentId()));

        // 3. Run Pipeline (Scoring -> RAG -> AI Logic DNA)
        evaluationService.runEvaluationPipeline(ua, dto);

        return ResponseEntity.ok(ApiResponse.success(null, "Assessment evaluated successfully"));
    }

    // --- Result Endpoint for Radar Chart/Logic DNA ---
    @GetMapping("/{assignmentId}/result")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CANDIDATE')")
    public ResponseEntity<ApiResponse<AssessmentEvaluation>> getResult(@PathVariable Long assignmentId) {
        AssessmentEvaluation eval = userAssessmentService.getEvaluationResult(
                assignmentId,
                SecurityUtils.getCurrentUser()
        );
        return ResponseEntity.ok(ApiResponse.success(eval, "Result retrieved."));
    }

    // --- PDF Download Endpoint ---
    @GetMapping("/evaluation/{evaluationId}/report")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<byte[]> downloadReport(@PathVariable Long evaluationId) throws Exception {
        Long callerOrgId = SecurityUtils.getCurrentOrgId();
        if (callerOrgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        byte[] pdfContent = reportService.generateAssessmentPdf(evaluationId, callerOrgId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=assessment_report_" + evaluationId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfContent);
    }
}
