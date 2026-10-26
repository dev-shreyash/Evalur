package com.evalur.domain.ai.service;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.WebClient;

import com.evalur.domain.ai.dto.AiReasoningContext;
import com.evalur.domain.assessment.entity.AssessmentEvaluation;
import com.evalur.domain.assessment.entity.EvaluationStatus;
import com.evalur.domain.assessment.repository.AssessmentEvaluationRepository;

import reactor.core.publisher.Mono;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiReasoningServiceTest {

    @Mock
    private AssessmentEvaluationRepository evaluationRepository;

    private static final String GEMINI_SUCCESS_RESPONSE = """
        {
          "candidates": [
            {
              "content": {
                "parts": [
                  {
                    "text": "{\\"feedback\\":\\"Clean and modular implementation.\\",\\"metrics\\":{\\"Efficiency\\":8,\\"Security\\":7,\\"Maintainability\\":9,\\"Readability\\":8}}"
                  }
                ]
              }
            }
          ]
        }
        """;

    @Test
    @DisplayName("Successful AI analysis transitions to COMPLETED, persists feedback and metrics, and preserves objectiveScore")
    void generateReasoning_success_transitionsToCompletedAndPreservesScore() {
        ExchangeFunction exchangeFunction = request -> Mono.just(
                ClientResponse.create(HttpStatus.OK)
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                        .body(GEMINI_SUCCESS_RESPONSE)
                        .build()
        );

        WebClient.Builder builder = WebClient.builder().exchangeFunction(exchangeFunction);

        AiReasoningService aiReasoningService = new AiReasoningService(
                builder,
                evaluationRepository,
                "test-api-key",
                "http://mock-gemini-api",
                "gemini-2.5-flash"
        );

        AssessmentEvaluation eval = AssessmentEvaluation.builder()
                .objectiveScore(new BigDecimal("85.00"))
                .evaluationStatus(EvaluationStatus.EVALUATING)
                .build();
        eval.setId(500L);

        when(evaluationRepository.findById(500L)).thenReturn(Optional.of(eval));

        AiReasoningContext context = AiReasoningContext.builder()
                .evaluationId(500L)
                .candidateCode("public class Solution {}")
                .solutionRubric("Rubric standards")
                .build();

        aiReasoningService.generateReasoning(context);

        ArgumentCaptor<AssessmentEvaluation> captor = ArgumentCaptor.forClass(AssessmentEvaluation.class);
        verify(evaluationRepository).save(captor.capture());

        AssessmentEvaluation saved = captor.getValue();
        assertEquals(EvaluationStatus.COMPLETED, saved.getEvaluationStatus());
        assertEquals("Clean and modular implementation.", saved.getAiLogicFeedback());
        assertNotNull(saved.getLogicDna());
        assertTrue(saved.getLogicDna().contains("\"Efficiency\":8"));
        // Objective score preserved!
        assertEquals(new BigDecimal("85.00"), saved.getObjectiveScore());
    }

    @Test
    @DisplayName("AI failure transitions to FAILED with safe user message and preserves objectiveScore")
    void generateReasoning_failure_transitionsToFailedAndPreservesScore() {
        ExchangeFunction exchangeFunction = request -> Mono.error(
                new RuntimeException("Gemini service timeout / 503 unavailable")
        );

        WebClient.Builder builder = WebClient.builder().exchangeFunction(exchangeFunction);

        AiReasoningService aiReasoningService = new AiReasoningService(
                builder,
                evaluationRepository,
                "test-api-key",
                "http://mock-gemini-api",
                "gemini-2.5-flash"
        );

        AssessmentEvaluation eval = AssessmentEvaluation.builder()
                .objectiveScore(new BigDecimal("90.00"))
                .evaluationStatus(EvaluationStatus.EVALUATING)
                .build();
        eval.setId(501L);

        when(evaluationRepository.findById(501L)).thenReturn(Optional.of(eval));

        AiReasoningContext context = AiReasoningContext.builder()
                .evaluationId(501L)
                .candidateCode("public class Solution {}")
                .solutionRubric("Rubric standards")
                .build();

        aiReasoningService.generateReasoning(context);

        ArgumentCaptor<AssessmentEvaluation> captor = ArgumentCaptor.forClass(AssessmentEvaluation.class);
        verify(evaluationRepository).save(captor.capture());

        AssessmentEvaluation saved = captor.getValue();
        assertEquals(EvaluationStatus.FAILED, saved.getEvaluationStatus());
        assertEquals("Automated code analysis could not be completed. Please contact your instructor or administrator.",
                saved.getAiLogicFeedback());
        // Objective score preserved!
        assertEquals(new BigDecimal("90.00"), saved.getObjectiveScore());
    }
}

