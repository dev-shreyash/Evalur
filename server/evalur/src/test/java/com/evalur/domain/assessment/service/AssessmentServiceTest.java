package com.evalur.domain.assessment.service;

import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.evalur.domain.ai.entity.AiDocument;
import com.evalur.domain.ai.repository.AiDocumentRepository;
import com.evalur.domain.ai.service.AiGenerationService;
import com.evalur.domain.ai.service.RetrievalService;
import com.evalur.domain.assessment.repository.AssessmentRepository;
import com.evalur.domain.organization.entity.Organization;
import com.evalur.exceptions.ResourceNotFoundException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssessmentServiceTest {

    @Mock
    private AssessmentRepository assessmentRepository;

    @Mock
    private RetrievalService retrievalService;

    @Mock
    private AiDocumentRepository aiDocumentRepository;

    @Mock
    private AiGenerationService aiGenerationService;

    private AssessmentService assessmentService;

    @BeforeEach
    void setUp() {
        assessmentService = new AssessmentService(
                assessmentRepository,
                retrievalService,
                aiDocumentRepository,
                aiGenerationService
        );
    }

    @Test
    @DisplayName("validateDocumentsForOrganization with same-org docs returns validated documents")
    void validateDocumentsForOrganization_allValid_returnsDocs() {
        Organization org = Organization.builder().name("Acme").build();
        org.setId(100L);

        AiDocument doc1 = AiDocument.builder().filename("doc1.pdf").organization(org).build();
        doc1.setId(1L);
        AiDocument doc2 = AiDocument.builder().filename("doc2.pdf").organization(org).build();
        doc2.setId(2L);

        when(aiDocumentRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(doc1, doc2));

        List<AiDocument> result = assessmentService.validateDocumentsForOrganization(List.of("1", "2"), 100L);

        assertNotNull(result);
        assertEquals(2, result.size());
    }

    @Test
    @DisplayName("validateDocumentsForOrganization with foreign doc throws AccessDeniedException")
    void validateDocumentsForOrganization_foreignDoc_throwsAccessDenied() {
        Organization myOrg = Organization.builder().name("MyOrg").build();
        myOrg.setId(100L);

        Organization foreignOrg = Organization.builder().name("ForeignOrg").build();
        foreignOrg.setId(999L);

        AiDocument doc1 = AiDocument.builder().filename("doc1.pdf").organization(myOrg).build();
        doc1.setId(1L);
        AiDocument doc2 = AiDocument.builder().filename("doc2.pdf").organization(foreignOrg).build();
        doc2.setId(2L);

        when(aiDocumentRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(doc1, doc2));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
            assessmentService.validateDocumentsForOrganization(List.of("1", "2"), 100L)
        );

        assertEquals("Document 2 does not belong to user's organization.", ex.getMessage());
    }

    @Test
    @DisplayName("validateDocumentsForOrganization with missing doc throws ResourceNotFoundException")
    void validateDocumentsForOrganization_missingDoc_throwsResourceNotFound() {
        when(aiDocumentRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(
                AiDocument.builder().filename("doc1.pdf").organization(Organization.builder().name("Org").build()).build()
        )); // Returns only 1 doc out of 2

        assertThrows(ResourceNotFoundException.class, () ->
            assessmentService.validateDocumentsForOrganization(List.of("1", "2"), 100L)
        );
    }

    @Test
    @DisplayName("validateDocumentsForOrganization with null organization throws AccessDeniedException")
    void validateDocumentsForOrganization_nullOrgId_throwsAccessDenied() {
        assertThrows(AccessDeniedException.class, () ->
            assessmentService.validateDocumentsForOrganization(List.of("1"), null)
        );
    }

    @Test
    @DisplayName("validateDocumentsForOrganization with empty IDs returns empty list")
    void validateDocumentsForOrganization_emptyIds_returnsEmptyList() {
        List<AiDocument> result = assessmentService.validateDocumentsForOrganization(Collections.emptyList(), 100L);
        assertNotNull(result);
        assertEquals(0, result.size());
    }
}

