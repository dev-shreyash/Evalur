package com.evalur.domain.assessment.service;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.evalur.domain.ai.entity.AiDocument;
import com.evalur.domain.ai.repository.AiDocumentRepository;
import com.evalur.domain.ai.service.AiGenerationService;
import com.evalur.domain.ai.service.RetrievalService;
import com.evalur.domain.assessment.controller.AssessmentController;
import com.evalur.domain.assessment.dto.AssessmentRequest;
import com.evalur.domain.assessment.dto.DocumentTopicsRequest;
import com.evalur.domain.assessment.entity.Assessment;
import com.evalur.domain.assessment.repository.AssessmentRepository;
import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.exceptions.BadRequestException;
import com.evalur.security.utils.SecurityUtils;

import org.mockito.MockedStatic;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssessmentValidationAndTopicsTest {

    @Mock
    private AssessmentRepository assessmentRepository;

    @Mock
    private RetrievalService retrievalService;

    @Mock
    private AiDocumentRepository aiDocumentRepository;

    @Mock
    private AiGenerationService aiGenerationService;

    @InjectMocks
    private AssessmentService assessmentService;

    private Organization org1;
    private Organization org2;
    private AiDocument doc1;
    private AiDocument doc2;
    private User manager;

    @BeforeEach
    void setUp() {
        org1 = Organization.builder().id(100L).name("Acme Bootcamp").build();
        org2 = Organization.builder().id(200L).name("Rival School").build();
        manager = User.builder().id(1L).email("inst@acme.com").role(Role.MANAGER).organization(org1).build();

        doc1 = AiDocument.builder()
                .id(1L)
                .filename("Spring_Boot_Syllabus.pdf")
                .organization(org1)
                .extractedTopics("[\"Dependency Injection\", \"REST APIs\", \"Spring Data JPA\"]")
                .status(AiDocument.IngestionStatus.COMPLETED)
                .build();

        doc2 = AiDocument.builder()
                .id(2L)
                .filename("Other_Org_Doc.pdf")
                .organization(org2)
                .status(AiDocument.IngestionStatus.COMPLETED)
                .build();
    }

    @Test
    @DisplayName("Extract topics retrieves cached topics from organization course documents")
    void extractTopics_returnsCachedTopics() {
        when(aiDocumentRepository.findAllById(List.of(1L))).thenReturn(List.of(doc1));

        List<String> topics = assessmentService.extractTopics(List.of("1"), 100L);

        assertEquals(3, topics.size());
        assertTrue(topics.contains("Dependency Injection"));
        assertTrue(topics.contains("REST APIs"));
        assertTrue(topics.contains("Spring Data JPA"));
    }

    @Test
    @DisplayName("Extract topics rejects documents belonging to a different organization")
    void extractTopics_crossOrgDoc_throwsAccessDenied() {
        when(aiDocumentRepository.findAllById(List.of(2L))).thenReturn(List.of(doc2));

        assertThrows(AccessDeniedException.class, () -> assessmentService.extractTopics(List.of("2"), 100L));
    }

    @Test
    @DisplayName("Controller rejects assessment title exceeding 255 characters with BadRequestException")
    void controller_rejectsOverlongTitle() {
        AssessmentController controller = new AssessmentController(assessmentService, assessmentRepository);

        try (MockedStatic<SecurityUtils> sec = mockStatic(SecurityUtils.class)) {
            sec.when(SecurityUtils::getCurrentUser).thenReturn(manager);

            String overlongTitle = "A".repeat(256);
            AssessmentRequest req = new AssessmentRequest(
                    overlongTitle,
                    null,
                    null,
                    List.of("1"),
                    null,
                    List.of("Dependency Injection"),
                    List.of("Conceptual understanding"),
                    List.of("MCQ"),
                    10
            );

            BadRequestException ex = assertThrows(BadRequestException.class, () -> controller.createAssessment(req));
            assertTrue(ex.getMessage().contains("255 characters"));
        }
    }

    @Test
    @DisplayName("Controller rejects blank assessment title with BadRequestException")
    void controller_rejectsBlankTitle() {
        AssessmentController controller = new AssessmentController(assessmentService, assessmentRepository);

        try (MockedStatic<SecurityUtils> sec = mockStatic(SecurityUtils.class)) {
            sec.when(SecurityUtils::getCurrentUser).thenReturn(manager);

            AssessmentRequest req = new AssessmentRequest(
                    "   ",
                    null,
                    null,
                    List.of("1"),
                    null,
                    List.of("Dependency Injection"),
                    null,
                    null,
                    null
            );

            BadRequestException ex = assertThrows(BadRequestException.class, () -> controller.createAssessment(req));
            assertTrue(ex.getMessage().contains("title is required"));
        }
    }

    @Test
    @DisplayName("Controller rejects assessment when neither topics nor legacy role are provided")
    void controller_rejectsMissingTopicsAndRole() {
        AssessmentController controller = new AssessmentController(assessmentService, assessmentRepository);

        try (MockedStatic<SecurityUtils> sec = mockStatic(SecurityUtils.class)) {
            sec.when(SecurityUtils::getCurrentUser).thenReturn(manager);

            AssessmentRequest req = new AssessmentRequest(
                    "Spring Boot Quiz",
                    null,
                    null,
                    List.of("1"),
                    null,
                    null,
                    null,
                    null,
                    null
            );

            BadRequestException ex = assertThrows(BadRequestException.class, () -> controller.createAssessment(req));
            assertTrue(ex.getMessage().contains("learning objective or topic must be selected"));
        }
    }
}

