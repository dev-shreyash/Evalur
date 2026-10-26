package com.evalur.domain.ai.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.evalur.domain.ai.dto.AiReasoningContext;
import com.evalur.domain.assessment.entity.EvaluationStatus;
import com.evalur.domain.assessment.repository.AssessmentEvaluationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;


@Service
public class AiReasoningService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AiReasoningService.class);

    private final String apiKey;
    private final String model;
    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AssessmentEvaluationRepository evaluationRepository;

    public AiReasoningService(
            WebClient.Builder webClientBuilder,
            AssessmentEvaluationRepository evaluationRepository,
            @Value("${evalur.ai.google-gemini.api-key}") String apiKey,
            @Value("${evalur.ai.google-gemini.base.url}") String baseUrl,
            @Value("${evalur.ai.google-gemini.model}") String model) {
        this.evaluationRepository = evaluationRepository;
        this.apiKey = apiKey;
        this.model = model;
        this.webClient = webClientBuilder.baseUrl(baseUrl).build();
    }

    /**
     * Performs an asynchronous logic analysis of the candidate's code.
     * This keeps the user experience snappy while the AI thinks in the background.
     */
    @Async("taskExecutor")
    public void generateReasoning(AiReasoningContext context) {
        log.info("Starting AI Logic Analysis for Evaluation ID: {}", context.getEvaluationId());

        String prompt = constructReasoningPrompt(context.getCandidateCode(), context.getSolutionRubric());

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.1,
                        "maxOutputTokens", 2048,
                        "responseMimeType", "application/json" // FORCE Gemini to return valid JSON
                ));

        try {
            String response = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/" + model + ":generateContent")
                            .queryParam("key", apiKey)
                            .build())
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            // 1. Extract the raw text (which is now a JSON string)
            String rawJson = extractText(response);

            // 2. Parse the internal JSON
            JsonNode rootNode = objectMapper.readTree(rawJson);
            String qualitativeFeedback = rootNode.path("feedback").asText();
            String metricsJson = rootNode.path("metrics").toString(); // This is for your Radar Chart

            // 3. Update the Sidecar Table correctly
            evaluationRepository.findById(context.getEvaluationId()).ifPresent(eval -> {
                eval.setAiLogicFeedback(qualitativeFeedback); // Plain text feedback
                eval.setLogicDna(metricsJson); // Structured JSON for Radar Chart
                eval.setEvaluationStatus(EvaluationStatus.COMPLETED);
                evaluationRepository.save(eval);
                log.info("AI Logic DNA and Feedback successfully parsed for ID: {}", context.getEvaluationId());
            });

        } catch (Exception e) {
            log.error("AI logic analysis failed for Evaluation ID: {}", context.getEvaluationId(), e);
            try {
                evaluationRepository.findById(context.getEvaluationId()).ifPresent(eval -> {
                    eval.setEvaluationStatus(EvaluationStatus.FAILED);
                    eval.setAiLogicFeedback("Automated code analysis could not be completed. Please contact your instructor or administrator.");
                    evaluationRepository.save(eval);
                    log.info("Persisted FAILED evaluation status for Evaluation ID: {}", context.getEvaluationId());
                });
            } catch (Exception ex) {
                log.error("Failed to update evaluation status to FAILED for ID: {}", context.getEvaluationId(), ex);
            }
        }
    }

    private String extractText(String response) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText().trim();
    }

    // Update the prompt in your constructReasoningPrompt method:
    private String constructReasoningPrompt(String code, String rubric) {
        return String.format("""
                Analyze the candidate's code logic based on the provided standards.
                Return your response in this EXACT JSON format:
                {
                  "feedback": "2-3 sentences of qualitative analysis",
                  "metrics": {
                    "Efficiency": 8,
                    "Security": 6,
                    "Maintainability": 9,
                    "Readability": 7
                  }
                }

                STANDARDS: %s
                CODE: %s
                """, rubric, code);
    }
}
