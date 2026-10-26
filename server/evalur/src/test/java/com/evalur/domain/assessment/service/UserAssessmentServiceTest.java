package com.evalur.domain.assessment.service;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.evalur.domain.assessment.dto.AssessmentAssignmentRequest;
import com.evalur.domain.assessment.dto.UserSubmissionDTO;
import com.evalur.domain.assessment.entity.Assessment;
import com.evalur.domain.assessment.entity.AssessmentEvaluation;
import com.evalur.domain.assessment.entity.UserAssessment;
import com.evalur.domain.assessment.entity.UserAssessment.AssignmentStatus;
import com.evalur.domain.assessment.repository.AssessmentEvaluationRepository;
import com.evalur.domain.assessment.repository.AssessmentRepository;
import com.evalur.domain.assessment.repository.UserAssessmentRepository;
import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.repository.UserRepository;
import com.evalur.exceptions.ResourceNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserAssessmentServiceTest {

    @Mock
    private UserAssessmentRepository userAssessmentRepository;

    @Mock
    private AssessmentRepository assessmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AssessmentEvaluationRepository evaluationRepository;

    private ObjectMapper objectMapper;
    private UserAssessmentService userAssessmentService;

    private static final String FULL_ASSESSMENT_JSON = """
        {
          "mcqs": [
            {
              "question": "What is 2+2?",
              "options": ["2", "3", "4", "5"],
              "correctOptionIndex": 2,
              "explanation": "Basic arithmetic"
            }
          ],
          "codingTasks": [
            {
              "title": "Fix Bug",
              "initialCode": "return false;",
              "solutionTemplate": "return true;"
            }
          ]
        }
        """;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        userAssessmentService = new UserAssessmentService(
            userAssessmentRepository,
            assessmentRepository,
            userRepository,
            evaluationRepository,
            objectMapper
        );
    }

    // =========================================================================
    // 1. startAssessment tests
    // =========================================================================

    @Test
    void startAssessment_assignedStatus_sanitizesAnswersAndMarksInProgress() {
        Assessment assessment = Assessment.builder().content(FULL_ASSESSMENT_JSON).build();
        UserAssessment ua = UserAssessment.builder()
            .id(10L)
            .userId(1L)
            .assessment(assessment)
            .status(AssignmentStatus.ASSIGNED)
            .build();

        when(userAssessmentRepository.findById(10L)).thenReturn(Optional.of(ua));

        String sanitizedJson = userAssessmentService.startAssessment(10L, 1L);

        // Verify correctOptionIndex, explanation, and solutionTemplate are stripped
        assertFalse(sanitizedJson.contains("correctOptionIndex"));
        assertFalse(sanitizedJson.contains("explanation"));
        assertFalse(sanitizedJson.contains("solutionTemplate"));

        // Verify public fields remain intact
        assertTrue(sanitizedJson.contains("What is 2+2?"));
        assertTrue(sanitizedJson.contains("initialCode"));

        // Verify session status transition to IN_PROGRESS
        assertEquals(AssignmentStatus.IN_PROGRESS, ua.getStatus());
        assertNotNull(ua.getStartedAt());
        verify(userAssessmentRepository).save(ua);
    }

    @Test
    void startAssessment_wrongUserId_throwsAccessDeniedException() {
        Assessment assessment = Assessment.builder().content(FULL_ASSESSMENT_JSON).build();
        UserAssessment ua = UserAssessment.builder()
            .id(10L)
            .userId(1L) // Assigned to user 1
            .assessment(assessment)
            .status(AssignmentStatus.ASSIGNED)
            .build();

        when(userAssessmentRepository.findById(10L)).thenReturn(Optional.of(ua));

        // User 2 attempts to start user 1's test
        AccessDeniedException exception = assertThrows(AccessDeniedException.class, () ->
            userAssessmentService.startAssessment(10L, 2L)
        );

        assertEquals("You do not have permission to access this assessment assignment.", exception.getMessage());
        verify(userAssessmentRepository, never()).save(any());
    }

    @Test
    void startAssessment_assignmentNotFound_throwsResourceNotFoundException() {
        when(userAssessmentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
            userAssessmentService.startAssessment(99L, 1L)
        );
    }

    @Test
    void startAssessment_alreadyInProgress_doesNotReSaveStatus() {
        Assessment assessment = Assessment.builder().content(FULL_ASSESSMENT_JSON).build();
        UserAssessment ua = UserAssessment.builder()
            .id(10L)
            .userId(1L)
            .assessment(assessment)
            .status(AssignmentStatus.IN_PROGRESS)
            .build();

        when(userAssessmentRepository.findById(10L)).thenReturn(Optional.of(ua));

        String sanitizedJson = userAssessmentService.startAssessment(10L, 1L);

        assertNotNull(sanitizedJson);
        verify(userAssessmentRepository, never()).save(any());
    }

    // =========================================================================
    // 2. submitAssessment tests
    // =========================================================================

    @Test
    void submitAssessment_unEvaluatedSession_marksSubmittedAndCompletedAt() {
        UserAssessment ua = UserAssessment.builder()
            .id(10L)
            .userId(1L)
            .status(AssignmentStatus.IN_PROGRESS)
            .evaluation(null) // Not evaluated
            .build();

        when(userAssessmentRepository.findById(10L)).thenReturn(Optional.of(ua));

        UserSubmissionDTO dto = new UserSubmissionDTO();
        dto.setUserAssessmentId(10L);

        userAssessmentService.submitAssessment(dto);

        assertEquals(AssignmentStatus.SUBMITTED, ua.getStatus());
        assertNotNull(ua.getCompletedAt());
        verify(userAssessmentRepository).save(ua);
    }

    @Test
    @DisplayName("submitAssessment with matching candidate ID marks submitted")
    void submitAssessment_matchingCandidateId_marksSubmitted() {
        UserAssessment ua = UserAssessment.builder()
            .id(10L)
            .userId(1L)
            .status(AssignmentStatus.IN_PROGRESS)
            .evaluation(null)
            .build();

        when(userAssessmentRepository.findById(10L)).thenReturn(Optional.of(ua));

        UserSubmissionDTO dto = new UserSubmissionDTO();
        dto.setUserAssessmentId(10L);

        userAssessmentService.submitAssessment(dto, 1L);

        assertEquals(AssignmentStatus.SUBMITTED, ua.getStatus());
        assertNotNull(ua.getCompletedAt());
        verify(userAssessmentRepository).save(ua);
    }

    @Test
    @DisplayName("submitAssessment with wrong candidate ID throws AccessDeniedException and never saves")
    void submitAssessment_wrongCandidateId_throwsAccessDenied() {
        UserAssessment ua = UserAssessment.builder()
            .id(10L)
            .userId(1L) // Belongs to candidate 1
            .status(AssignmentStatus.IN_PROGRESS)
            .build();

        when(userAssessmentRepository.findById(10L)).thenReturn(Optional.of(ua));

        UserSubmissionDTO dto = new UserSubmissionDTO();
        dto.setUserAssessmentId(10L);

        // Candidate 2 attempts to submit candidate 1's assessment
        AccessDeniedException exception = assertThrows(AccessDeniedException.class, () ->
            userAssessmentService.submitAssessment(dto, 2L)
        );

        assertEquals("You do not have permission to submit this assessment.", exception.getMessage());
        verify(userAssessmentRepository, never()).save(any());
    }

    @Test
    void submitAssessment_alreadyEvaluated_throwsException() {
        UserAssessment ua = UserAssessment.builder()
            .id(10L)
            .userId(1L)
            .status(AssignmentStatus.SUBMITTED)
            .evaluation(new AssessmentEvaluation()) // Already evaluated
            .build();

        when(userAssessmentRepository.findById(10L)).thenReturn(Optional.of(ua));

        UserSubmissionDTO dto = new UserSubmissionDTO();
        dto.setUserAssessmentId(10L);

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
            userAssessmentService.submitAssessment(dto)
        );

        assertEquals("This assessment has already been evaluated.", exception.getMessage());
        verify(userAssessmentRepository, never()).save(any());
    }

    @Test
    void submitAssessment_sessionNotFound_throwsException() {
        when(userAssessmentRepository.findById(99L)).thenReturn(Optional.empty());

        UserSubmissionDTO dto = new UserSubmissionDTO();
        dto.setUserAssessmentId(99L);

        assertThrows(ResourceNotFoundException.class, () ->
            userAssessmentService.submitAssessment(dto)
        );
    }

    // =========================================================================
    // 3. assignToCandidates tests
    // =========================================================================

    @Test
    @DisplayName("assignToCandidates with valid same-org candidates saves assignments")
    void assignToCandidates_validSameOrgCandidates_savesAssignments() {
        Organization org = Organization.builder().name("Acme").build();
        org.setId(100L);

        Assessment assessment = Assessment.builder().organization(org).build();
        assessment.setId(5L);

        User candidate = User.builder()
                .name("Alice")
                .role(Role.CANDIDATE)
                .organization(org)
                .build();
        candidate.setId(20L);

        when(assessmentRepository.findById(5L)).thenReturn(Optional.of(assessment));
        when(userRepository.findById(20L)).thenReturn(Optional.of(candidate));
        when(userAssessmentRepository.existsByUserIdAndAssessmentId(20L, 5L)).thenReturn(false);

        AssessmentAssignmentRequest request = new AssessmentAssignmentRequest(5L, List.of(20L));
        userAssessmentService.assignToCandidates(request, 100L);

        verify(userAssessmentRepository).saveAll(any());
    }

    @Test
    @DisplayName("assignToCandidates with foreign assessment throws AccessDeniedException")
    void assignToCandidates_foreignAssessment_throwsAccessDenied() {
        Organization foreignOrg = Organization.builder().name("Foreign").build();
        foreignOrg.setId(999L);

        Assessment assessment = Assessment.builder().organization(foreignOrg).build();
        assessment.setId(5L);

        when(assessmentRepository.findById(5L)).thenReturn(Optional.of(assessment));

        AssessmentAssignmentRequest request = new AssessmentAssignmentRequest(5L, List.of(20L));

        assertThrows(AccessDeniedException.class, () ->
            userAssessmentService.assignToCandidates(request, 100L) // Caller belongs to org 100
        );

        verify(userAssessmentRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("assignToCandidates with candidate from foreign org throws AccessDeniedException and does not save")
    void assignToCandidates_foreignCandidate_throwsAccessDenied() {
        Organization myOrg = Organization.builder().name("Acme").build();
        myOrg.setId(100L);

        Organization foreignOrg = Organization.builder().name("Foreign").build();
        foreignOrg.setId(999L);

        Assessment assessment = Assessment.builder().organization(myOrg).build();
        assessment.setId(5L);

        User foreignCandidate = User.builder()
                .name("Bob")
                .role(Role.CANDIDATE)
                .organization(foreignOrg) // Foreign org!
                .build();
        foreignCandidate.setId(21L);

        when(assessmentRepository.findById(5L)).thenReturn(Optional.of(assessment));
        when(userRepository.findById(21L)).thenReturn(Optional.of(foreignCandidate));

        AssessmentAssignmentRequest request = new AssessmentAssignmentRequest(5L, List.of(21L));

        assertThrows(AccessDeniedException.class, () ->
            userAssessmentService.assignToCandidates(request, 100L)
        );

        verify(userAssessmentRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("assignToCandidates with non-candidate user throws AccessDeniedException")
    void assignToCandidates_nonCandidateRole_throwsAccessDenied() {
        Organization myOrg = Organization.builder().name("Acme").build();
        myOrg.setId(100L);

        Assessment assessment = Assessment.builder().organization(myOrg).build();
        assessment.setId(5L);

        User managerUser = User.builder()
                .name("Eve")
                .role(Role.MANAGER) // Not CANDIDATE!
                .organization(myOrg)
                .build();
        managerUser.setId(22L);

        when(assessmentRepository.findById(5L)).thenReturn(Optional.of(assessment));
        when(userRepository.findById(22L)).thenReturn(Optional.of(managerUser));

        AssessmentAssignmentRequest request = new AssessmentAssignmentRequest(5L, List.of(22L));

        assertThrows(AccessDeniedException.class, () ->
            userAssessmentService.assignToCandidates(request, 100L)
        );

        verify(userAssessmentRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("assignToCandidates with null caller org throws AccessDeniedException")
    void assignToCandidates_nullCallerOrg_throwsAccessDenied() {
        AssessmentAssignmentRequest request = new AssessmentAssignmentRequest(5L, List.of(20L));

        assertThrows(AccessDeniedException.class, () ->
            userAssessmentService.assignToCandidates(request, null)
        );
    }

    // =========================================================================
    // 4. getEvaluationResult tests
    // =========================================================================

    @Test
    @DisplayName("getEvaluationResult by candidate owner returns result")
    void getEvaluationResult_candidateOwner_returnsResult() {
        Organization org = Organization.builder().name("Acme").build();
        org.setId(100L);

        Assessment assessment = Assessment.builder().organization(org).build();
        UserAssessment ua = UserAssessment.builder()
                .id(50L)
                .userId(1L)
                .assessment(assessment)
                .build();

        AssessmentEvaluation eval = AssessmentEvaluation.builder().build();
        eval.setId(101L);

        User candidate = User.builder().role(Role.CANDIDATE).organization(org).build();
        candidate.setId(1L);

        when(userAssessmentRepository.findById(50L)).thenReturn(Optional.of(ua));
        when(evaluationRepository.findByUserAssessmentId(50L)).thenReturn(Optional.of(eval));

        AssessmentEvaluation result = userAssessmentService.getEvaluationResult(50L, candidate);
        assertNotNull(result);
        assertEquals(101L, result.getId());
    }

    @Test
    @DisplayName("getEvaluationResult by non-owner candidate throws AccessDeniedException")
    void getEvaluationResult_candidateNonOwner_throwsAccessDenied() {
        UserAssessment ua = UserAssessment.builder()
                .id(50L)
                .userId(1L) // Belongs to candidate 1
                .build();

        User otherCandidate = User.builder().role(Role.CANDIDATE).build();
        otherCandidate.setId(2L); // Candidate 2

        when(userAssessmentRepository.findById(50L)).thenReturn(Optional.of(ua));

        assertThrows(AccessDeniedException.class, () ->
            userAssessmentService.getEvaluationResult(50L, otherCandidate)
        );
    }

    @Test
    @DisplayName("getEvaluationResult by manager of matching org returns result")
    void getEvaluationResult_managerMatchingOrg_returnsResult() {
        Organization org = Organization.builder().name("Acme").build();
        org.setId(100L);

        Assessment assessment = Assessment.builder().organization(org).build();
        UserAssessment ua = UserAssessment.builder()
                .id(50L)
                .userId(1L)
                .assessment(assessment)
                .build();

        AssessmentEvaluation eval = AssessmentEvaluation.builder().build();
        eval.setId(101L);

        User manager = User.builder().role(Role.MANAGER).organization(org).build();
        manager.setId(10L);

        when(userAssessmentRepository.findById(50L)).thenReturn(Optional.of(ua));
        when(evaluationRepository.findByUserAssessmentId(50L)).thenReturn(Optional.of(eval));

        AssessmentEvaluation result = userAssessmentService.getEvaluationResult(50L, manager);
        assertNotNull(result);
        assertEquals(101L, result.getId());
    }

    @Test
    @DisplayName("getEvaluationResult by manager of foreign org throws AccessDeniedException")
    void getEvaluationResult_managerForeignOrg_throwsAccessDenied() {
        Organization orgA = Organization.builder().name("OrgA").build();
        orgA.setId(100L);

        Organization orgB = Organization.builder().name("OrgB").build();
        orgB.setId(200L);

        Assessment assessment = Assessment.builder().organization(orgA).build();
        UserAssessment ua = UserAssessment.builder()
                .id(50L)
                .userId(1L)
                .assessment(assessment)
                .build();

        User managerOrgB = User.builder().role(Role.MANAGER).organization(orgB).build();
        managerOrgB.setId(10L);

        when(userAssessmentRepository.findById(50L)).thenReturn(Optional.of(ua));

        assertThrows(AccessDeniedException.class, () ->
            userAssessmentService.getEvaluationResult(50L, managerOrgB)
        );
    }
}
