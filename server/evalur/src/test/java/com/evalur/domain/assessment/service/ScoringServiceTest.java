package com.evalur.domain.assessment.service;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.evalur.domain.assessment.dto.UserSubmissionDTO;
import com.evalur.domain.assessment.entity.Assessment;
import com.fasterxml.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ScoringServiceTest {

    private ScoringService scoringService;
    private ObjectMapper objectMapper;

    private static final String TWO_MCQ_JSON = """
        {
          "mcqs": [
            { "question": "Q1", "options": ["A", "B", "C", "D"], "correctOptionIndex": 0 },
            { "question": "Q2", "options": ["A", "B", "C", "D"], "correctOptionIndex": 1 }
          ]
        }
        """;

    private static final String THREE_MCQ_JSON = """
        {
          "mcqs": [
            { "question": "Q1", "options": ["A", "B", "C", "D"], "correctOptionIndex": 0 },
            { "question": "Q2", "options": ["A", "B", "C", "D"], "correctOptionIndex": 1 },
            { "question": "Q3", "options": ["A", "B", "C", "D"], "correctOptionIndex": 2 }
          ]
        }
        """;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        scoringService = new ScoringService(objectMapper);
    }

    @Test
    @DisplayName("All MCQs correct returns 100.00%")
    void calculateObjectiveScore_allCorrectWithoutCode_returns100() {
        Assessment assessment = Assessment.builder().content(TWO_MCQ_JSON).build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(0, 1));
        submission.setCodingSolution(null);

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        assertEquals(new BigDecimal("100.00"), score);
    }

    @Test
    @DisplayName("All MCQs correct with coding text still returns exactly 100.00%")
    void calculateObjectiveScore_allCorrectWithCode_returns100() {
        Assessment assessment = Assessment.builder().content(TWO_MCQ_JSON).build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(0, 1));
        submission.setCodingSolution("public class Solution { void run() { int x = 42; } }");

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        assertEquals(new BigDecimal("100.00"), score);
    }

    @Test
    @DisplayName("Zero MCQs correct without code returns 0.00%")
    void calculateObjectiveScore_zeroCorrectWithoutCode_returnsZero() {
        Assessment assessment = Assessment.builder().content(TWO_MCQ_JSON).build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(3, 3)); // Both incorrect
        submission.setCodingSolution(null);

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        assertEquals(new BigDecimal("0.00"), score);
    }

    @Test
    @DisplayName("Zero MCQs correct with long code returns 0.00% (heuristic removed)")
    void calculateObjectiveScore_zeroCorrectWithLongCode_returnsZero() {
        Assessment assessment = Assessment.builder().content(TWO_MCQ_JSON).build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(3, 3)); // Both incorrect
        submission.setCodingSolution("arbitrary long coding text exceeding twenty characters that previously awarded 40 points");

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        // Code-length heuristic completely removed: score must be 0.00
        assertEquals(new BigDecimal("0.00"), score);
    }

    @Test
    @DisplayName("Partial correctness 1 of 2 returns 50.00%")
    void calculateObjectiveScore_oneOfTwoCorrect_returns50() {
        Assessment assessment = Assessment.builder().content(TWO_MCQ_JSON).build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(0, 3)); // 1 of 2 correct
        submission.setCodingSolution("some random code");

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        assertEquals(new BigDecimal("50.00"), score);
    }

    @Test
    @DisplayName("Numeric rounding 1 of 3 correct rounds to 33.33%")
    void calculateObjectiveScore_oneOfThreeCorrect_roundsTo33_33() {
        Assessment assessment = Assessment.builder().content(THREE_MCQ_JSON).build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(0, 0, 0)); // Only Q1 is correct

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        assertEquals(new BigDecimal("33.33"), score);
    }

    @Test
    @DisplayName("Numeric rounding 2 of 3 correct rounds to 66.67%")
    void calculateObjectiveScore_twoOfThreeCorrect_roundsTo66_67() {
        Assessment assessment = Assessment.builder().content(THREE_MCQ_JSON).build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(0, 1, 0)); // Q1 and Q2 correct

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        assertEquals(new BigDecimal("66.67"), score);
    }

    @Test
    @DisplayName("Empty answers list returns 0.00%")
    void calculateObjectiveScore_emptyAnswersList_returnsZero() {
        Assessment assessment = Assessment.builder().content(TWO_MCQ_JSON).build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(Collections.emptyList());
        submission.setCodingSolution(null);

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        assertEquals(new BigDecimal("0.00"), score);
    }

    @Test
    @DisplayName("Null submission answers list returns 0.00%")
    void calculateObjectiveScore_nullAnswers_returnsZero() {
        Assessment assessment = Assessment.builder().content(TWO_MCQ_JSON).build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(null);

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        assertEquals(new BigDecimal("0.00"), score);
    }

    @Test
    @DisplayName("Assessment without MCQs (empty array) returns 0.00%")
    void calculateObjectiveScore_assessmentWithoutMCQs_returnsZero() {
        Assessment assessment = Assessment.builder().content("{\"mcqs\": []}").build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(0, 1));

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        assertEquals(new BigDecimal("0.00"), score);
    }

    @Test
    @DisplayName("Assessment without mcqs field returns 0.00%")
    void calculateObjectiveScore_noMcqFieldInAssessment_returnsZero() {
        Assessment assessment = Assessment.builder().content("{\"codingTasks\": []}").build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(0, 1));

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        assertEquals(new BigDecimal("0.00"), score);
    }

    @Test
    @DisplayName("Malformed JSON content safely returns 0.00%")
    void calculateObjectiveScore_malformedJsonContent_returnsZero() {
        Assessment assessment = Assessment.builder().content("not valid json {[[}").build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(0, 1));
        submission.setCodingSolution("some code");

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        assertEquals(new BigDecimal("0.00"), score);
    }

    @Test
    @DisplayName("Null assessment and null submission safely return 0.00%")
    void calculateObjectiveScore_nullInputs_returnsZero() {
        assertEquals(new BigDecimal("0.00"), scoringService.calculateObjectiveScore(null, null));
        assertEquals(new BigDecimal("0.00"), scoringService.calculateObjectiveScore(new UserSubmissionDTO(), null));
    }

    @Test
    @DisplayName("Invalid candidate answer indices (negative or out-of-bounds) are handled safely")
    void calculateObjectiveScore_invalidCandidateAnswerIndices_handledSafely() {
        Assessment assessment = Assessment.builder().content(TWO_MCQ_JSON).build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(-1, 999)); // Negative and out of bounds

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        assertEquals(new BigDecimal("0.00"), score);
    }

    @Test
    @DisplayName("MCQ with missing or non-integer correctOptionIndex is skipped safely")
    void calculateObjectiveScore_missingCorrectOptionIndex_skippedSafely() {
        String jsonWithMissingKey = """
            {
              "mcqs": [
                { "question": "Q1", "options": ["A", "B"], "correctOptionIndex": 0 },
                { "question": "Q2", "options": ["A", "B"] }
              ]
            }
            """;
        Assessment assessment = Assessment.builder().content(jsonWithMissingKey).build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(0, 1)); // Q1 correct, Q2 missing key

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        // 1 correct out of 2 total MCQs = 50.00%
        assertEquals(new BigDecimal("50.00"), score);
    }

    @Test
    @DisplayName("MCQ with out-of-bounds correctOptionIndex in answer key is skipped safely")
    void calculateObjectiveScore_outOfBoundsAnswerKey_skippedSafely() {
        String jsonWithBadKey = """
            {
              "mcqs": [
                { "question": "Q1", "options": ["A", "B"], "correctOptionIndex": 0 },
                { "question": "Q2", "options": ["A", "B"], "correctOptionIndex": 10 }
              ]
            }
            """;
        Assessment assessment = Assessment.builder().content(jsonWithBadKey).build();
        UserSubmissionDTO submission = new UserSubmissionDTO();
        submission.setMcqAnswers(List.of(0, 10));

        BigDecimal score = scoringService.calculateObjectiveScore(submission, assessment);

        // Q1 is valid and correct (1), Q2 answer key is out-of-bounds so ignored -> 1 of 2 = 50.00%
        assertEquals(new BigDecimal("50.00"), score);
    }
}
