package com.evalur.domain.assessment.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.evalur.domain.assessment.entity.Assessment;
import com.evalur.domain.assessment.entity.AssessmentEvaluation;
import com.evalur.domain.assessment.entity.UserAssessment;
import com.evalur.domain.assessment.repository.AssessmentEvaluationRepository;
import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.repository.UserRepository;
import com.evalur.exceptions.ResourceNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private AssessmentEvaluationRepository evaluationRepository;

    @Mock
    private UserRepository userRepository;

    private ObjectMapper objectMapper;
    private ReportService reportService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        reportService = new ReportService(
                evaluationRepository,
                userRepository,
                objectMapper
        );
    }

    @Test
    @DisplayName("generateAssessmentPdf with same-org evaluation generates PDF report")
    void generateAssessmentPdf_matchingOrg_generatesPdf() throws IOException {
        Organization org = Organization.builder().name("Acme").build();
        org.setId(100L);

        Assessment assessment = Assessment.builder()
                .title("Java Assessment")
                .organization(org)
                .build();

        UserAssessment ua = UserAssessment.builder()
                .id(10L)
                .userId(1L)
                .assessment(assessment)
                .build();

        AssessmentEvaluation eval = AssessmentEvaluation.builder()
                .userAssessment(ua)
                .objectiveScore(new BigDecimal("85.00"))
                .aiLogicFeedback("Great work on efficiency.")
                .logicDna("{\"Efficiency\": 9, \"Security\": 8, \"Maintainability\": 7, \"Readability\": 8}")
                .build();
        eval.setId(101L);

        User candidate = User.builder().name("Alice").build();
        candidate.setId(1L);

        when(evaluationRepository.findById(101L)).thenReturn(Optional.of(eval));
        when(userRepository.findById(1L)).thenReturn(Optional.of(candidate));

        byte[] pdfBytes = reportService.generateAssessmentPdf(101L, 100L);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
    }

    @Test
    @DisplayName("generateAssessmentPdf with foreign-org evaluation throws AccessDeniedException")
    void generateAssessmentPdf_foreignOrg_throwsAccessDenied() {
        Organization foreignOrg = Organization.builder().name("ForeignCorp").build();
        foreignOrg.setId(999L);

        Assessment assessment = Assessment.builder()
                .title("Secret Assessment")
                .organization(foreignOrg)
                .build();

        UserAssessment ua = UserAssessment.builder()
                .id(10L)
                .userId(1L)
                .assessment(assessment)
                .build();

        AssessmentEvaluation eval = AssessmentEvaluation.builder()
                .userAssessment(ua)
                .objectiveScore(new BigDecimal("90.00"))
                .build();
        eval.setId(101L);

        when(evaluationRepository.findById(101L)).thenReturn(Optional.of(eval));

        // Caller belongs to org 100, but evaluation belongs to org 999
        assertThrows(AccessDeniedException.class, () ->
            reportService.generateAssessmentPdf(101L, 100L)
        );
    }

    @Test
    @DisplayName("generateAssessmentPdf with non-existent evaluation throws ResourceNotFoundException")
    void generateAssessmentPdf_evaluationNotFound_throwsResourceNotFound() {
        when(evaluationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
            reportService.generateAssessmentPdf(999L, 100L)
        );
    }
}

