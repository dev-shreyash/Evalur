package com.evalur.domain.assessment.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.stereotype.Service;

import com.evalur.domain.assessment.dto.UserSubmissionDTO;
import com.evalur.domain.assessment.entity.Assessment;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;


/**
 * Deterministic scoring service for assessment submissions.
 * 
 * Note: Evaluates candidate MCQ answers strictly against the assessment's stored
 * generated answer key. Deterministic calculation verifies agreement with the stored
 * key, but does not prove the key itself is intrinsically correct.
 * 
 * Coding solutions are not awarded arbitrary points based on character heuristics.
 * Points are only awarded based on verified objective evaluation.
 */
@Service
public class ScoringService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ScoringService.class);

    private final ObjectMapper objectMapper;

    public ScoringService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Calculates the objective MCQ score normalized to a 0–100 percentage.
     * Formula: (correct answers / total MCQs) * 100
     * Rounded to 2 decimal places using HALF_UP.
     * 
     * If an assessment contains no MCQs, returns 0.00.
     * If submission or assessment content is empty, null, or malformed, returns 0.00.
     */
    public BigDecimal calculateObjectiveScore(UserSubmissionDTO submission, Assessment assessment) {
        if (submission == null || assessment == null || assessment.getContent() == null || assessment.getContent().isBlank()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        try {
            JsonNode root = objectMapper.readTree(assessment.getContent());
            JsonNode mcqsNode = root.path("mcqs");

            if (!mcqsNode.isArray() || mcqsNode.isEmpty()) {
                // Assessment has no MCQs to score
                return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            }

            int totalMcqs = mcqsNode.size();
            List<Integer> answers = submission.getMcqAnswers();

            long correct = 0;
            for (int i = 0; i < totalMcqs; i++) {
                JsonNode mcq = mcqsNode.get(i);
                if (mcq == null || !mcq.isObject()) {
                    continue;
                }

                JsonNode correctOptNode = mcq.get("correctOptionIndex");
                if (correctOptNode == null || !correctOptNode.isInt()) {
                    log.warn("MCQ at index {} is missing a valid integer 'correctOptionIndex'", i);
                    continue;
                }

                int correctIdx = correctOptNode.asInt();

                // Validate correctOptionIndex against options list if present
                JsonNode optionsNode = mcq.get("options");
                if (optionsNode != null && optionsNode.isArray() && !optionsNode.isEmpty()) {
                    int optionCount = optionsNode.size();
                    if (correctIdx < 0 || correctIdx >= optionCount) {
                        log.warn("MCQ at index {} has out-of-bounds correctOptionIndex {} for option count {}", 
                                i, correctIdx, optionCount);
                        continue;
                    }
                } else if (correctIdx < 0) {
                    continue;
                }

                // Check candidate's answer
                if (answers != null && i < answers.size()) {
                    Integer candidateAnswer = answers.get(i);
                    if (candidateAnswer != null && candidateAnswer.equals(correctIdx)) {
                        correct++;
                    }
                }
            }

            // Normalize score to 0–100 percentage with 2 decimal places precision
            BigDecimal correctCount = BigDecimal.valueOf(correct);
            BigDecimal totalCount = BigDecimal.valueOf(totalMcqs);

            return correctCount.multiply(BigDecimal.valueOf(100))
                    .divide(totalCount, 2, RoundingMode.HALF_UP);

        } catch (Exception e) {
            log.error("Error calculating objective MCQ score: {}", e.getMessage());
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
    }
}
