package com.evalur.domain.ai.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.filter.Filter;
import static dev.langchain4j.store.embedding.filter.MetadataFilterBuilder.metadataKey;

@Service
public class RetrievalService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RetrievalService.class);

    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;

    public RetrievalService(EmbeddingModel embeddingModel, EmbeddingStore<TextSegment> embeddingStore) {
        this.embeddingModel = embeddingModel;
        this.embeddingStore = embeddingStore;
    }

    public String getRelevantContext(String query, Long orgId, List<String> documentIds) {
        long startTime = System.currentTimeMillis();
        
        log.info("Starting context retrieval for Query: '{}', Org: {}", query, orgId);

        // 1. Vectorize the manager's prompt
        // POTENTIAL BOTTLENECK: This calls the Google Embedding API
        var queryEmbedding = embeddingModel.embed(query).content();
        log.info("Embedding generated in {}ms", (System.currentTimeMillis() - startTime));

        // 2. Build the Multi-tenant + Multi-doc Filter
        Filter filter = metadataKey("orgId").isEqualTo(orgId)
                .and(metadataKey("documentId").isIn(documentIds));

        EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                .queryEmbedding(queryEmbedding)
                .filter(filter)
                .maxResults(10)
                .build();

        // 3. Execute Search
        // POTENTIAL BOTTLENECK: This calls the Neon PGVector store via JDBC
        long searchStartTime = System.currentTimeMillis();
        List<EmbeddingMatch<TextSegment>> matches = embeddingStore.search(searchRequest).matches();
        log.info("Vector search in Neon took {}ms (Found {} matches)", 
                (System.currentTimeMillis() - searchStartTime), matches.size());

        // 4. Flatten the text chunks
        String context = matches.stream()
                .map(match -> match.embedded().text())
                .collect(Collectors.joining("\n---\n"));

        log.info("Total Retrieval Phase took: {}ms", (System.currentTimeMillis() - startTime));
        return context;
    }
}