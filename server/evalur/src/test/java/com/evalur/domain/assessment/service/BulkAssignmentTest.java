package com.evalur.domain.assessment.service;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.evalur.domain.assessment.dto.AssessmentAssignmentRequest;
import com.evalur.domain.assessment.entity.Assessment;
import com.evalur.domain.assessment.entity.UserAssessment;
import com.evalur.domain.assessment.repository.AssessmentEvaluationRepository;
import com.evalur.domain.assessment.repository.AssessmentRepository;
import com.evalur.domain.assessment.repository.UserAssessmentRepository;
import com.evalur.domain.organization.entity.Cohort;
import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.organization.repository.CohortRepository;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BulkAssignmentTest {

    @Mock
    private UserAssessmentRepository userAssessmentRepository;

    @Mock
    private AssessmentRepository assessmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AssessmentEvaluationRepository evaluationRepository;

    @Mock
    private CohortRepository cohortRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private UserAssessmentService userAssessmentService;

    private Organization org1;
    private Organization org2;
    private Assessment assessment1;
    private Cohort cohort1;
    private User candidate1;
    private User candidate2;
    private User candidate3;

    @BeforeEach
    void setUp() {
        org1 = Organization.builder().id(100L).name("Acme Academy").build();
        org2 = Organization.builder().id(200L).name("Other Corp").build();

        assessment1 = Assessment.builder().id(10L).title("Spring Assessment").organization(org1).build();
        cohort1 = Cohort.builder().id(50L).name("Java Batch").organization(org1).build();

        candidate1 = User.builder().id(1L).name("Alice").role(Role.CANDIDATE).organization(org1).cohort(cohort1).build();
        candidate2 = User.builder().id(2L).name("Bob").role(Role.CANDIDATE).organization(org1).cohort(cohort1).build();
        candidate3 = User.builder().id(3L).name("Charlie").role(Role.CANDIDATE).organization(org1).build();
    }

    @Test
    @DisplayName("Bulk assign multiple individual candidates succeeds")
    void assignToCandidates_multipleCandidates_succeeds() {
        when(assessmentRepository.findById(10L)).thenReturn(Optional.of(assessment1));
        when(userRepository.findById(1L)).thenReturn(Optional.of(candidate1));
        when(userRepository.findById(2L)).thenReturn(Optional.of(candidate2));
        when(userAssessmentRepository.existsByUserIdAndAssessmentId(1L, 10L)).thenReturn(false);
        when(userAssessmentRepository.existsByUserIdAndAssessmentId(2L, 10L)).thenReturn(false);

        AssessmentAssignmentRequest request = new AssessmentAssignmentRequest(10L, List.of(1L, 2L));
        userAssessmentService.assignToCandidates(request, 100L);

        ArgumentCaptor<List<UserAssessment>> captor = ArgumentCaptor.forClass(List.class);
        verify(userAssessmentRepository).saveAll(captor.capture());
        assertEquals(2, captor.getValue().size());
    }

    @Test
    @DisplayName("Bulk assign via cohort assigns all cohort candidates")
    void assignToCandidates_withCohort_assignsAllCohortMembers() {
        when(assessmentRepository.findById(10L)).thenReturn(Optional.of(assessment1));
        when(cohortRepository.findByIdAndOrganizationId(50L, 100L)).thenReturn(Optional.of(cohort1));
        when(userRepository.findByOrganizationIdAndCohortId(100L, 50L)).thenReturn(List.of(candidate1, candidate2));

        when(userRepository.findById(1L)).thenReturn(Optional.of(candidate1));
        when(userRepository.findById(2L)).thenReturn(Optional.of(candidate2));
        when(userAssessmentRepository.existsByUserIdAndAssessmentId(1L, 10L)).thenReturn(false);
        when(userAssessmentRepository.existsByUserIdAndAssessmentId(2L, 10L)).thenReturn(false);

        AssessmentAssignmentRequest request = new AssessmentAssignmentRequest(10L, null, 50L);
        userAssessmentService.assignToCandidates(request, 100L);

        ArgumentCaptor<List<UserAssessment>> captor = ArgumentCaptor.forClass(List.class);
        verify(userAssessmentRepository).saveAll(captor.capture());
        assertEquals(2, captor.getValue().size());
    }

    @Test
    @DisplayName("Bulk assign deduplicates already-assigned candidates idempotently")
    void assignToCandidates_duplicateCandidate_skipped() {
        when(assessmentRepository.findById(10L)).thenReturn(Optional.of(assessment1));
        when(userRepository.findById(1L)).thenReturn(Optional.of(candidate1));
        when(userRepository.findById(2L)).thenReturn(Optional.of(candidate2));
        when(userAssessmentRepository.existsByUserIdAndAssessmentId(1L, 10L)).thenReturn(true); // already assigned!
        when(userAssessmentRepository.existsByUserIdAndAssessmentId(2L, 10L)).thenReturn(false);

        AssessmentAssignmentRequest request = new AssessmentAssignmentRequest(10L, List.of(1L, 2L));
        userAssessmentService.assignToCandidates(request, 100L);

        ArgumentCaptor<List<UserAssessment>> captor = ArgumentCaptor.forClass(List.class);
        verify(userAssessmentRepository).saveAll(captor.capture());
        assertEquals(1, captor.getValue().size());
        assertEquals(2L, captor.getValue().get(0).getUserId());
    }

    @Test
    @DisplayName("Bulk assign rejects candidate from another organization and rolls back")
    void assignToCandidates_crossOrgCandidate_throwsAccessDenied() {
        User rivalCand = User.builder().id(99L).name("Eve").role(Role.CANDIDATE).organization(org2).build();

        when(assessmentRepository.findById(10L)).thenReturn(Optional.of(assessment1));
        when(userRepository.findById(1L)).thenReturn(Optional.of(candidate1));
        when(userRepository.findById(99L)).thenReturn(Optional.of(rivalCand));

        AssessmentAssignmentRequest request = new AssessmentAssignmentRequest(10L, List.of(1L, 99L));
        assertThrows(AccessDeniedException.class, () -> userAssessmentService.assignToCandidates(request, 100L));
    }
}

