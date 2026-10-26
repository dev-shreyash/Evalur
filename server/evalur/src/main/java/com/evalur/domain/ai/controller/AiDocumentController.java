package com.evalur.domain.ai.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.evalur.common.ApiResponse;
import com.evalur.domain.ai.entity.AiDocument;
import com.evalur.domain.ai.repository.AiDocumentRepository;
import com.evalur.domain.ai.service.AiDocumentService;
import com.evalur.domain.user.entity.User;
import com.evalur.security.utils.SecurityUtils;


@RestController
@RequestMapping("/ai/docs")
public class AiDocumentController {

    private final AiDocumentService aiDocumentService;
    private final AiDocumentRepository aiDocumentRepository;

    public AiDocumentController(AiDocumentService aiDocumentService, AiDocumentRepository aiDocumentRepository) {
        this.aiDocumentService = aiDocumentService;
        this.aiDocumentRepository = aiDocumentRepository;
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadDocument(@RequestParam("file") MultipartFile file) throws java.io.IOException {
        User currentUser = SecurityUtils.getCurrentUser();
        if (currentUser.getOrganization() == null || currentUser.getOrganization().getId() == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        
        // 1. Read bytes immediately while the request thread is alive
        byte[] fileBytes = file.getBytes();
        String fileName = file.getOriginalFilename();
        
        AiDocument aiDoc = AiDocument.builder()
                .filename(fileName)
                .organization(currentUser.getOrganization())
                .status(AiDocument.IngestionStatus.PENDING)
                .build();
        
        aiDoc = aiDocumentRepository.save(aiDoc);

        // 2. Pass the byte array and filename, not the MultipartFile object
        aiDocumentService.initiateIngestionPipeline(fileBytes, fileName, aiDoc);

        return ResponseEntity.accepted().body(ApiResponse.success(
            Map.of("documentId", aiDoc.getId(), "status", "PENDING"),
            "Processing started."
        ));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<AiDocument>>> getOrgDocuments() {
        Long orgId = SecurityUtils.getCurrentOrgId();
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        List<AiDocument> docs = aiDocumentRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId);
        return ResponseEntity.ok(ApiResponse.success(docs, "Library retrieved."));
    }
}
