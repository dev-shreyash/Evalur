package com.evalur.domain.ai.service;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import reactor.util.retry.Retry;

@Service
public class AiGenerationService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AiGenerationService.class);

    private final String apiKey;
    private final String model;
    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Use constructor injection for @Value to avoid null pointer issues during WebClient initialization
    public AiGenerationService(
            WebClient.Builder webClientBuilder,
            @Value("${evalur.ai.google-gemini.api-key}") String apiKey,
            @Value("${evalur.ai.google-gemini.base.url}") String baseUrl,
            @Value("${evalur.ai.google-gemini.model}") String model
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.webClient = webClientBuilder.baseUrl(baseUrl).build();
    }

    public String generateAssessmentJson(
            String role,
            String seniority,
            String context,
            String jobDescription,
            int regenerationCount
    ) {
        // Dynamic counts based on seniority
        int targetMcqs = calculateMcqCount(seniority);
        int targetCodingTasks = calculateCodingCount(seniority);

        double temperature = (regenerationCount == 0) ? 0.2 : 0.4;
        String prompt = constructPrompt(role, seniority, context, jobDescription, regenerationCount, targetMcqs, targetCodingTasks);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt))
                )),
                "generationConfig", Map.of(
                        "temperature", temperature,
                        "responseMimeType", "application/json"
                )
        );

        log.info("Generating Assessment: {} | {} MCQs | {} Coding | Temp: {}", 
                 role, targetMcqs, targetCodingTasks, temperature);

        try {
            String response = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/" + model + ":generateContent")
                            .queryParam("key", apiKey)
                            .build()
                    )
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(60)) 
                    .retryWhen(Retry.backoff(2, Duration.ofSeconds(2)))
                    .block();

            JsonNode root = objectMapper.readTree(sanitizeJson(extractText(response)));
            
            // Normalize to enforce dynamic limits and validate structure
            root = normalize(root, targetMcqs, targetCodingTasks);
            validateJson(root, targetMcqs, targetCodingTasks);

            return objectMapper.writeValueAsString(root);

        } catch (Exception e) {
            log.error("Gemini generation failed for role {}: {}", role, e.getMessage());
            throw new RuntimeException("Gemini generation failed", e);
        }
    }

    private int calculateMcqCount(String seniority) {
        if (seniority == null) return 5;
        return switch (seniority.toLowerCase()) {
            case "junior", "entry" -> 5;
            case "mid", "intermediate" -> 10;
            case "senior", "lead", "architect" -> 15;
            default -> 8;
        };
    }

    private int calculateCodingCount(String seniority) {
        if (seniority == null) return 1;
        return (seniority.toLowerCase().contains("senior") || seniority.toLowerCase().contains("architect")) ? 2 : 1;
    }

    private String extractText(String response) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
    }

    private String sanitizeJson(String raw) {
        String trimmed = raw.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf("\n");
            int lastBackticks = trimmed.lastIndexOf("```");
            if (firstNewline > 0 && lastBackticks > firstNewline) {
                return trimmed.substring(firstNewline, lastBackticks).trim();
            }
        }
        return trimmed;
    }

    private JsonNode normalize(JsonNode root, int mcqLimit, int codingLimit) {
        if (!(root instanceof ObjectNode objectNode)) return root;

        if (objectNode.has("mcqs") && objectNode.get("mcqs").isArray()) {
            ArrayNode mcqs = (ArrayNode) objectNode.get("mcqs");
            while (mcqs.size() > mcqLimit) mcqs.remove(mcqLimit);
        }

        if (objectNode.has("codingTasks") && objectNode.get("codingTasks").isArray()) {
            ArrayNode coding = (ArrayNode) objectNode.get("codingTasks");
            while (coding.size() > codingLimit) coding.remove(codingLimit);
        }
        return objectNode;
    }

    private void validateJson(JsonNode root, int mcqLimit, int codingLimit) {
        if (root.path("mcqs").size() != mcqLimit || root.path("codingTasks").size() != codingLimit) {
            throw new RuntimeException("Incomplete assessment generated: " + 
                                       root.path("mcqs").size() + " MCQs, " + 
                                       root.path("codingTasks").size() + " Tasks.");
        }
    }

    private String constructPrompt(String role, String seniority, String context, String jd, int regen, int mcqs, int tasks) {
        String variation = (regen > 0) ? "This is a REGENERATION. Focus on different sub-topics and deeper edge cases." : "";
        
        return String.format("""
            Act as a Lead Technical Interviewer. Generate a professional assessment for:
            - ROLE: %s
            - SENIORITY: %s
            
            CONTEXTUAL SOURCES:
            1. JOB DESCRIPTION: %s
            2. TECHNICAL MANUALS: %s
            
            %s
            
            GOAL:
            Provide EXACTLY %d Multiple Choice Questions (MCQs) and %d Coding Tasks.
            
            STRICT RULES:
            - Use the 'Technical Manuals' to ensure accuracy of questions.
            - Assign a 'timeEstimateMinutes' for EVERY item based on complexity.
            - MCQs: Usually 1-2 minutes.
            - Coding: Usually 20-45 minutes.
            - Provide a 'difficulty' tag for every item (Easy, Medium, Hard) relative to the seniority.
            - Return ONLY raw JSON.

            JSON SCHEMA:
            {
              "mcqs": [{
                "question": "",
                "options": ["", "", "", ""],
                "correctOptionIndex": 0,
                "explanation": "",
                "difficulty": "Medium",
                "timeEstimateMinutes": 2
              }],
              "codingTasks": [{
                "title": "",
                "description": "",
                "constraints": "",
                "initialCode": "",
                "solutionTemplate": "",
                "difficulty": "Hard",
                "timeEstimateMinutes": 35
              }]
            }
            """, role, seniority, (jd != null ? jd : "N/A"), (context != null ? context : "N/A"), variation, mcqs, tasks);
    }
}