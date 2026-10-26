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

    public List<String> extractTopicsFromText(String context) {
        if (context == null || context.isBlank()) {
            return java.util.Collections.emptyList();
        }

        String prompt = String.format("""
            Act as an educational curriculum analyst. Analyze the following course material and extract a list of 5 to 15 key technical topics, modules, or learning objectives.
            
            COURSE MATERIAL:
            %s
            
            RULES:
            - Return ONLY a raw JSON array of strings, for example: ["Topic A", "Topic B", "Topic C"]
            - Keep each topic concise (2-6 words), descriptive, and strictly derived from the material.
            - Do not include introductory text, explanations, or markdown code fences.
            """, context.length() > 6000 ? context.substring(0, 6000) : context);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt))
                )),
                "generationConfig", Map.of(
                        "temperature", 0.1,
                        "responseMimeType", "application/json"
                )
        );

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
                    .timeout(Duration.ofSeconds(30))
                    .retryWhen(Retry.backoff(1, Duration.ofSeconds(1)))
                    .block();

            JsonNode root = objectMapper.readTree(sanitizeJson(extractText(response)));
            if (root.isArray()) {
                List<String> topics = new java.util.ArrayList<>();
                for (JsonNode item : root) {
                    if (item.isTextual() && !item.asText().isBlank()) {
                        topics.add(item.asText().trim());
                    }
                }
                return topics;
            }
        } catch (Exception e) {
            log.warn("Failed to extract topics via AI: {}", e.getMessage());
        }
        return java.util.Collections.emptyList();
    }

    public String generateCourseAssessmentJson(
            String title,
            List<String> topics,
            List<String> focusAreas,
            List<String> questionTypes,
            Integer questionCount,
            String context,
            int regenerationCount
    ) {
        int targetTotal = (questionCount != null && questionCount > 0) ? questionCount : 8;
        boolean wantsCoding = questionTypes != null && (questionTypes.contains("CODING") || questionTypes.contains("DEBUGGING"));
        boolean wantsMcq = questionTypes == null || questionTypes.isEmpty() || questionTypes.contains("MCQ");

        int targetCodingTasks = wantsCoding ? (targetTotal >= 8 ? 2 : 1) : 0;
        int targetMcqs = wantsMcq ? Math.max(1, targetTotal - targetCodingTasks) : 0;
        if (targetMcqs == 0 && targetCodingTasks == 0) {
            targetMcqs = targetTotal;
        }

        double temperature = (regenerationCount == 0) ? 0.2 : 0.4;
        String prompt = constructCoursePrompt(title, topics, focusAreas, context, regenerationCount, targetMcqs, targetCodingTasks);

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

        log.info("Generating Course Assessment: '{}' | {} Topics | {} MCQs | {} Coding | Temp: {}", 
                 title, (topics != null ? topics.size() : 0), targetMcqs, targetCodingTasks, temperature);

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
            root = normalize(root, targetMcqs, targetCodingTasks);
            validateCourseJson(root, targetMcqs, targetCodingTasks);

            return objectMapper.writeValueAsString(root);

        } catch (Exception e) {
            log.error("Gemini course assessment generation failed for '{}': {}", title, e.getMessage());
            throw new RuntimeException("Course assessment generation failed", e);
        }
    }

    private void validateCourseJson(JsonNode root, int mcqLimit, int codingLimit) {
        int actualMcqs = root.path("mcqs").isArray() ? root.path("mcqs").size() : 0;
        int actualCoding = root.path("codingTasks").isArray() ? root.path("codingTasks").size() : 0;
        if (actualMcqs == 0 && actualCoding == 0) {
            throw new RuntimeException("Assessment generation produced 0 questions.");
        }
    }

    private String constructCoursePrompt(
            String title,
            List<String> topics,
            List<String> focusAreas,
            String context,
            int regen,
            int mcqs,
            int tasks
    ) {
        String variation = (regen > 0) ? "This is a REGENERATION. Focus on different sub-topics and deeper edge cases." : "";
        String topicsStr = (topics != null && !topics.isEmpty()) ? String.join("\n- ", topics) : "General course concepts";
        String focusStr = (focusAreas != null && !focusAreas.isEmpty()) ? String.join(", ", focusAreas) : "Conceptual understanding, practical application";

        return String.format("""
            Act as a Senior Computer Science Instructor and Curriculum Designer.
            Generate a rigorous, course-aligned technical assessment based on the instructor's uploaded course materials and selected learning objectives.

            ASSESSMENT TITLE: %s

            TARGET LEARNING OBJECTIVES & TOPICS:
            - %s

            ASSESSMENT FOCUS & PEDAGOGICAL APPROACHES:
            %s

            COURSE MATERIAL CONTEXT:
            %s

            %s

            GOAL:
            Generate EXACTLY %d Multiple Choice Questions (MCQs) and %d Coding/Debugging Tasks.

            STRICT INSTRUCTIONAL RULES:
            - Ground every question directly in the course material and target learning objectives.
            - Ensure questions measure student comprehension according to the selected assessment approaches.
            - For MCQs: provide 4 distinct options, exactly 1 correct index (0-3), and an instructive technical explanation.
            - For Coding/Debugging: provide a clear problem statement, constraints, starter code template with comments, and full solution rubric.
            - Assign 'timeEstimateMinutes' for EVERY item based on complexity (MCQ: 1-3 mins, Coding: 15-40 mins).
            - Provide a 'difficulty' tag (Easy, Medium, Hard).
            - Return ONLY raw JSON matching the schema below.

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
                "timeEstimateMinutes": 30
              }]
            }
            """, title, topicsStr, focusStr, (context != null && !context.isBlank() ? context : "N/A"), variation, mcqs, tasks);
    }

}
