package com.evalur.domain.ai.service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.evalur.domain.ai.entity.AiDocument;
import com.evalur.domain.ai.repository.AiDocumentRepository;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;

@Service
public class AiDocumentService {

    private static final Logger log = LoggerFactory.getLogger(AiDocumentService.class);

    @Value("${evalur.ai.llamaparse.api-key}")
    private String llamaApiKey;

    @Value("${evalur.ai.llamaparse.base-url}")
    private String llamaBaseUrl;

    private final AiDocumentRepository aiDocumentRepository;
    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;
    private final RestTemplate restTemplate = new RestTemplate();

    public AiDocumentService(
            AiDocumentRepository aiDocumentRepository,
            EmbeddingModel embeddingModel,
            EmbeddingStore<TextSegment> embeddingStore) {
        this.aiDocumentRepository = aiDocumentRepository;
        this.embeddingModel = embeddingModel;
        this.embeddingStore = embeddingStore;
    }

    /**
     * Entry point for the background ingestion pipeline.
     * Uses byte[] to avoid I/O errors caused by Tomcat deleting temp files.
     */
    @Async("taskExecutor")
    public void initiateIngestionPipeline(byte[] fileBytes, String fileName, AiDocument aiDoc) {
        try {
            // STEP 1: PARSING
            updateStatus(aiDoc, AiDocument.IngestionStatus.PARSING);
            String jobId = uploadToLlamaParse(fileBytes, fileName);
            
            aiDoc.setLlamaJobId(jobId);
            aiDocumentRepository.save(aiDoc);

            String markdown = pollForResults(jobId);

            if (markdown != null) {
                // STEP 2: VECTORIZING
                updateStatus(aiDoc, AiDocument.IngestionStatus.VECTORIZING);
                processAndStore(markdown, aiDoc);

                // STEP 3: COMPLETED
                updateStatus(aiDoc, AiDocument.IngestionStatus.COMPLETED);
                log.info("Ingestion pipeline completed successfully for: {}", fileName);
            } else {
                throw new RuntimeException("LlamaParse parsing timeout or empty result.");
            }
        } catch (Exception e) {
            log.error("Pipeline failed for {}: {}", fileName, e.getMessage());
            aiDoc.setStatus(AiDocument.IngestionStatus.FAILED);
            aiDoc.setErrorMessage(e.getMessage());
            aiDocumentRepository.save(aiDoc);
        }
    }

    private String uploadToLlamaParse(byte[] fileBytes, String fileName) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(llamaApiKey);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        
        // Wrap bytes in a resource that identifies as the original filename
        ByteArrayResource resource = new ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() {
                return fileName;
            }
        };

        body.add("file", resource);
        String url = llamaBaseUrl + "/parsing/upload";

        ResponseEntity<Map> response = restTemplate.postForEntity(url, new HttpEntity<>(body, headers), Map.class);
        
        if (response.getBody() == null || !response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Failed to upload to LlamaParse: " + response.getStatusCode());
        }
        
        return response.getBody().get("id").toString();
    }

    private String pollForResults(String jobId) throws InterruptedException {
        String pollUrl = llamaBaseUrl + "/parsing/job/" + jobId + "/result/markdown";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(llamaApiKey);

        for (int i = 0; i < 30; i++) { // Max 5 minutes of polling
            TimeUnit.SECONDS.sleep(10);
            try {
                ResponseEntity<Map> resp = restTemplate.exchange(pollUrl, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
                if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                    return (String) resp.getBody().get("markdown");
                }
            } catch (Exception e) {
                log.debug("Polling LlamaParse job {}... attempt {}", jobId, i + 1);
            }
        }
        return null;
    }

    private void processAndStore(String markdown, AiDocument aiDoc) {
        Document document = Document.from(markdown);

        // Extract topics from markdown headings
        List<String> topics = extractTopicsFromMarkdown(markdown);
        if (!topics.isEmpty()) {
            try {
                aiDoc.setExtractedTopics(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(topics));
                aiDocumentRepository.save(aiDoc);
            } catch (Exception e) {
                log.warn("Could not serialize extracted topics: {}", e.getMessage());
            }
        }

        // 1. Generate raw segments
        List<TextSegment> rawSegments = DocumentSplitters.recursive(1000, 100).split(document);

        // 2. Attach Metadata (orgId and documentId) to each segment
        // This is critical for the RetrievalService filtering logic.
        List<TextSegment> allSegments = rawSegments.stream()
                .map(segment -> TextSegment.from(segment.text(), Metadata.from(Map.of(
                        "documentId", aiDoc.getId(),
                        "orgId", aiDoc.getOrganization().getId()
                ))))
                .toList();

        log.info("Total segments tagged: {}. Starting batched vectorization...", allSegments.size());

        int batchSize = 20; 
        for (int i = 0; i < allSegments.size(); i += batchSize) {
            int end = Math.min(i + batchSize, allSegments.size());
            List<TextSegment> batch = allSegments.subList(i, end);

            try {
                // 3. Embed and persist the tagged batch to Neon (PgVector)
                embeddingStore.addAll(embeddingModel.embedAll(batch).content(), batch);
                log.info("Successfully vectorized batch: {} to {} of {}", i, end, allSegments.size());

                // 4. Stay under the Free Tier rate limits (100 RPM)
                if (end < allSegments.size()) {
                    TimeUnit.SECONDS.sleep(2); 
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Vectorization interrupted", e);
            } catch (Exception e) {
                log.error("Failed to process batch starting at index {}: {}", i, e.getMessage());
                throw e; 
            }
        }
    }

    private void updateStatus(AiDocument doc, AiDocument.IngestionStatus status) {
        doc.setStatus(status);
        aiDocumentRepository.save(doc);
    }

    private List<String> extractTopicsFromMarkdown(String markdown) {
        if (markdown == null || markdown.isBlank()) return List.of();
        List<String> topics = new java.util.ArrayList<>();
        for (String line : markdown.split("\\R")) {
            line = line.trim();
            if (line.startsWith("#")) {
                String clean = line.replaceFirst("^#+\s*", "").replaceAll("^[0-9]+[.\s]+", "").trim();
                if (clean.length() >= 3 && clean.length() <= 80 && !topics.contains(clean)) {
                    topics.add(clean);
                }
            }
            if (topics.size() >= 25) break;
        }
        return topics;
    }

}
