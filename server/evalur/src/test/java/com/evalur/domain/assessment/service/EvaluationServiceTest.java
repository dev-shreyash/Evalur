package com.evalur.domain.assessment.service;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.evalur.domain.ai.dto.AiReasoningContext;
import com.evalur.domain.ai.service.AiReasoningService;
import com.evalur.domain.ai.service.RetrievalService;
import com.evalur.domain.assessment.dto.UserSubmissionDTO;
import com.evalur.domain.assessment.entity.Assessment;
import com.evalur.domain.assessment.entity.AssessmentEvaluation;
import com.evalur.domain.assessment.entity.EvaluationStatus;
import com.evalur.domain.assessment.entity.UserAssessment;
import com.evalur.domain.assessment.repository.AssessmentEvaluationRepository;
import com.evalur.domain.organization.entity.Organization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EvaluationServiceTest {

    @Mock
    private AssessmentEvaluationRepository evaluationRepository;

    @Mock
    private ScoringService scoringService;

    @Mock
    private RetrievalService retrievalService;

    @Mock
    private AiReasoningService aiReasoningService;

    private EvaluationService evaluationService;

    private UserAssessment userAssessment;
    private Assessment assessment;
    private Organization organization;

    @BeforeEach
    void setUp() {
        evaluationService = new EvaluationService(
                evaluationRepository,
                scoringService,
                retrievalService,
                aiReasoningService
        );

        organization = Organization.builder().name("Acme").build();
        organization.setId(100L);

        assessment = Assessment.builder()
                .title("Java Core")
                .organization(organization)
                .content("{\"mcqs\": []}")
                .documents(Collections.emptyList())
                .build();
        assessment.setId(50L);

        userAssessment = UserAssessment.builder()
                .id(10L)
                .userId(1L)
                .assessment(assessment)
                .build();
    }

    @Test
    @DisplayName("Submission without code completes objective evaluation immediately with COMPLETED status and skips AI")
    void submissionWithoutCode_completesImmediatelyWithoutAiCall() {
        UserSubmissionDTO dto = new UserSubmissionDTO();
        dto.setUserAssessmentId(10L);
        dto.setMcqAnswers(Collections.emptyList());
        dto.setCodingSolution(null); // No code

        when(scoringService.calculateObjectiveScore(dto, assessment))
                .thenReturn(new BigDecimal("100.00"));
        when(evaluationRepository.findByUserAssessmentId(10L))
                .thenReturn(Optional.empty());

        evaluationService.runEvaluationPipeline(userAssessment, dto);

        ArgumentCaptor<AssessmentEvaluation> captor = ArgumentCaptor.forClass(AssessmentEvaluation.class);
        verify(evaluationRepository).save(captor.capture());

        AssessmentEvaluation saved = captor.getValue();
        assertEquals(EvaluationStatus.COMPLETED, saved.getEvaluationStatus());
        assertEquals(new BigDecimal("100.00"), saved.getObjectiveScore());
        assertEquals(userAssessment, saved.getUserAssessment());

        // Verify retrieval and async AI reasoning were never invoked
        verify(retrievalService, never()).getRelevantContext(anyString(), anyLong(), anyList());
        verify(aiReasoningService, never()).generateReasoning(any());
    }

    @Test
    @DisplayName("Submission with blank code completes objective evaluation immediately and skips AI")
    void submissionWithBlankCode_completesImmediatelyWithoutAiCall() {
        UserSubmissionDTO dto = new UserSubmissionDTO();
        dto.setUserAssessmentId(10L);
        dto.setMcqAnswers(Collections.emptyList());
        dto.setCodingSolution("   \n\t  "); // Whitespace only

        when(scoringService.calculateObjectiveScore(dto, assessment))
                .thenReturn(new BigDecimal("75.00"));
        when(evaluationRepository.findByUserAssessmentId(10L))
                .thenReturn(Optional.empty());

        evaluationService.runEvaluationPipeline(userAssessment, dto);

        ArgumentCaptor<AssessmentEvaluation> captor = ArgumentCaptor.forClass(AssessmentEvaluation.class);
        verify(evaluationRepository).save(captor.capture());

        AssessmentEvaluation saved = captor.getValue();
        assertEquals(EvaluationStatus.COMPLETED, saved.getEvaluationStatus());
        assertEquals(new BigDecimal("75.00"), saved.getObjectiveScore());

        verify(retrievalService, never()).getRelevantContext(anyString(), anyLong(), anyList());
        verify(aiReasoningService, never()).generateReasoning(any());
    }

    @Test
    @DisplayName("Submission with code persists EVALUATING state first before triggering async reasoning")
    void submissionWithCode_persistsEvaluatingStateBeforeAsyncAiCall() {
        UserSubmissionDTO dto = new UserSubmissionDTO();
        dto.setUserAssessmentId(10L);
        dto.setMcqAnswers(Collections.emptyList());
        dto.setCodingSolution("public class Solution { void solve() {} }");

        AssessmentEvaluation initialEval = AssessmentEvaluation.builder()
                .userAssessment(userAssessment)
                .build();
        initialEval.setId(200L);

        when(scoringService.calculateObjectiveScore(dto, assessment))
                .thenReturn(new BigDecimal("80.00"));
        when(evaluationRepository.findByUserAssessmentId(10L))
                .thenReturn(Optional.of(initialEval));
        when(evaluationRepository.saveAndFlush(any(AssessmentEvaluation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        evaluationService.runEvaluationPipeline(userAssessment, dto);

        ArgumentCaptor<AssessmentEvaluation> flushCaptor = ArgumentCaptor.forClass(AssessmentEvaluation.class);
        verify(evaluationRepository).saveAndFlush(flushCaptor.capture());

        AssessmentEvaluation flushedEval = flushCaptor.getValue();
        assertEquals(EvaluationStatus.EVALUATING, flushedEval.getEvaluationStatus());
        assertEquals(new BigDecimal("80.00"), flushedEval.getObjectiveScore());

        // Verify async AI analysis was scheduled with the evaluation ID
        ArgumentCaptor<AiReasoningContext> contextCaptor = ArgumentCaptor.forClass(AiReasoningContext.class);
        verify(aiReasoningService).generateReasoning(contextCaptor.capture());

        AiReasoningContext aiContext = contextCaptor.getValue();
        assertEquals(200L, aiContext.getEvaluationId());
        assertEquals(dto.getCodingSolution(), aiContext.getCandidateCode());
    }

    @Test
    @DisplayName("Failure during async initiation transitions evaluation to FAILED without clearing MCQ score")
    void failureDuringAsyncInitiation_transitionsToFailedAndPreservesScore() {
        UserSubmissionDTO dto = new UserSubmissionDTO();
        dto.setUserAssessmentId(10L);
        dto.setMcqAnswers(Collections.emptyList());
        dto.setCodingSolution("public class Solution { void solve() {} }");

        AssessmentEvaluation initialEval = AssessmentEvaluation.builder()
                .userAssessment(userAssessment)
                .build();
        initialEval.setId(300L);

        when(scoringService.calculateObjectiveScore(dto, assessment))
                .thenReturn(new BigDecimal("90.00"));
        when(evaluationRepository.findByUserAssessmentId(10L))
                .thenReturn(Optional.of(initialEval));
        when(evaluationRepository.saveAndFlush(any(AssessmentEvaluation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Simulate unexpected failure during async dispatch
        org.mockito.Mockito.doThrow(new RuntimeException("Task rejected from executor pool"))
                .when(aiReasoningService).generateReasoning(any());

        evaluationService.runEvaluationPipeline(userAssessment, dto);

        ArgumentCaptor<AssessmentEvaluation> saveCaptor = ArgumentCaptor.forClass(AssessmentEvaluation.class);
        verify(evaluationRepository).save(saveCaptor.capture());

        AssessmentEvaluation failedEval = saveCaptor.getValue();
        assertEquals(EvaluationStatus.FAILED, failedEval.getEvaluationStatus());
        assertEquals(new BigDecimal("90.00"), failedEval.getObjectiveScore()); // MCQ score preserved!
        assertNotNull(failedEval.getAiLogicFeedback());
        assertTrue(failedEval.getAiLogicFeedback().contains("Automated code analysis could not be initiated"));
    }
}

