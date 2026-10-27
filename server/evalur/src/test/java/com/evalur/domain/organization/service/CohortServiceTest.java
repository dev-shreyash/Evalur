package com.evalur.domain.organization.service;

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

import com.evalur.domain.organization.dto.AssignCohortRequest;
import com.evalur.domain.organization.dto.CohortRequest;
import com.evalur.domain.organization.dto.CohortResponse;
import com.evalur.domain.organization.entity.Cohort;
import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.organization.repository.CohortRepository;
import com.evalur.domain.organization.repository.OrganizationRepository;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.repository.UserRepository;
import com.evalur.exceptions.DuplicateResourceException;
import com.evalur.exceptions.ResourceNotFoundException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CohortServiceTest {

    @Mock
    private CohortRepository cohortRepository;

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CohortService cohortService;

    private Organization org1;
    private Organization org2;
    private Cohort cohort1;

    @BeforeEach
    void setUp() {
        org1 = Organization.builder().id(100L).name("Acme Academy").build();
        org2 = Organization.builder().id(200L).name("Rival Bootcamp").build();
        cohort1 = Cohort.builder().id(10L).name("MCA Java 2026").description("Fall batch").organization(org1).build();
    }

    @Test
    @DisplayName("Create cohort successfully for organization")
    void createCohort_succeeds() {
        when(organizationRepository.findById(100L)).thenReturn(Optional.of(org1));
        when(cohortRepository.existsByOrganizationIdAndNameIgnoreCase(100L, "MCA Java 2026")).thenReturn(false);
        when(cohortRepository.save(any(Cohort.class))).thenAnswer(invocation -> {
            Cohort c = invocation.getArgument(0);
            c.setId(10L);
            return c;
        });

        CohortRequest req = new CohortRequest("MCA Java 2026", "Fall batch");
        CohortResponse res = cohortService.createCohort(req, 100L);

        assertNotNull(res);
        assertEquals("MCA Java 2026", res.name());
        assertEquals("Fall batch", res.description());
        assertEquals(0, res.memberCount());
    }

    @Test
    @DisplayName("Create cohort with duplicate name throws DuplicateResourceException")
    void createCohort_duplicateName_throwsException() {
        when(organizationRepository.findById(100L)).thenReturn(Optional.of(org1));
        when(cohortRepository.existsByOrganizationIdAndNameIgnoreCase(100L, "MCA Java 2026")).thenReturn(true);

        CohortRequest req = new CohortRequest("MCA Java 2026", "Another batch");
        assertThrows(DuplicateResourceException.class, () -> cohortService.createCohort(req, 100L));
    }

    @Test
    @DisplayName("Get cohorts lists all cohorts scoped to org with member counts")
    void getCohorts_scopedToOrg() {
        when(cohortRepository.findByOrganizationIdOrderByNameAsc(100L)).thenReturn(List.of(cohort1));
        when(userRepository.countByCohortId(10L)).thenReturn(24);

        List<CohortResponse> list = cohortService.getCohorts(100L);

        assertEquals(1, list.size());
        assertEquals("MCA Java 2026", list.get(0).name());
        assertEquals(24, list.get(0).memberCount());
    }

    @Test
    @DisplayName("Assign candidates to cohort successfully")
    void assignCandidatesToCohort_succeeds() {
        User cand1 = User.builder().id(1L).name("Alice").role(Role.CANDIDATE).organization(org1).build();
        User cand2 = User.builder().id(2L).name("Bob").role(Role.CANDIDATE).organization(org1).build();

        when(cohortRepository.findByIdAndOrganizationId(10L, 100L)).thenReturn(Optional.of(cohort1));
        when(userRepository.findById(1L)).thenReturn(Optional.of(cand1));
        when(userRepository.findById(2L)).thenReturn(Optional.of(cand2));

        AssignCohortRequest req = new AssignCohortRequest(10L, List.of(1L, 2L));
        cohortService.assignCandidatesToCohort(req, 100L);

        assertEquals(cohort1, cand1.getCohort());
        assertEquals(cohort1, cand2.getCohort());
        verify(userRepository).save(cand1);
        verify(userRepository).save(cand2);
    }

    @Test
    @DisplayName("Assign candidates to cohort rejects cross-organization candidate")
    void assignCandidatesToCohort_crossOrg_throwsAccessDenied() {
        User rivalCand = User.builder().id(99L).name("Eve").role(Role.CANDIDATE).organization(org2).build();

        when(cohortRepository.findByIdAndOrganizationId(10L, 100L)).thenReturn(Optional.of(cohort1));
        when(userRepository.findById(99L)).thenReturn(Optional.of(rivalCand));

        AssignCohortRequest req = new AssignCohortRequest(10L, List.of(99L));
        assertThrows(AccessDeniedException.class, () -> cohortService.assignCandidatesToCohort(req, 100L));
    }

    @Test
    @DisplayName("Assign candidates to cohort rejects non-candidate role")
    void assignCandidatesToCohort_nonCandidate_throwsAccessDenied() {
        User manager = User.builder().id(5L).name("Manager").role(Role.MANAGER).organization(org1).build();

        when(cohortRepository.findByIdAndOrganizationId(10L, 100L)).thenReturn(Optional.of(cohort1));
        when(userRepository.findById(5L)).thenReturn(Optional.of(manager));

        AssignCohortRequest req = new AssignCohortRequest(10L, List.of(5L));
        assertThrows(AccessDeniedException.class, () -> cohortService.assignCandidatesToCohort(req, 100L));
    }

    @Test
    @DisplayName("Update cohort details successfully")
    void updateCohort_succeeds() {
        when(cohortRepository.findByIdAndOrganizationId(10L, 100L)).thenReturn(Optional.of(cohort1));
        when(cohortRepository.existsByOrganizationIdAndNameIgnoreCaseAndIdNot(100L, "Advanced Java 2026", 10L)).thenReturn(false);
        when(cohortRepository.save(any(Cohort.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.countByCohortId(10L)).thenReturn(15);

        CohortRequest req = new CohortRequest("Advanced Java 2026", "Updated description");
        CohortResponse res = cohortService.updateCohort(10L, req, 100L);

        assertNotNull(res);
        assertEquals("Advanced Java 2026", res.name());
        assertEquals("Updated description", res.description());
        assertEquals(15, res.memberCount());
    }

    @Test
    @DisplayName("Update cohort with duplicate name in same org throws DuplicateResourceException")
    void updateCohort_duplicateName_throwsException() {
        when(cohortRepository.findByIdAndOrganizationId(10L, 100L)).thenReturn(Optional.of(cohort1));
        when(cohortRepository.existsByOrganizationIdAndNameIgnoreCaseAndIdNot(100L, "Existing Cohort", 10L)).thenReturn(true);

        CohortRequest req = new CohortRequest("Existing Cohort", "Desc");
        assertThrows(DuplicateResourceException.class, () -> cohortService.updateCohort(10L, req, 100L));
    }

    @Test
    @DisplayName("Sync cohort members adds new and removes unselected")
    void syncCohortMembers_addsAndRemoves() {
        User cand1 = User.builder().id(1L).name("Alice").role(Role.CANDIDATE).organization(org1).cohort(cohort1).build();
        User cand2 = User.builder().id(2L).name("Bob").role(Role.CANDIDATE).organization(org1).cohort(cohort1).build();
        User cand3 = User.builder().id(3L).name("Charlie").role(Role.CANDIDATE).organization(org1).build();

        when(cohortRepository.findByIdAndOrganizationId(10L, 100L)).thenReturn(Optional.of(cohort1));
        when(userRepository.findByOrganizationIdAndCohortId(100L, 10L)).thenReturn(List.of(cand1, cand2));
        when(userRepository.findById(1L)).thenReturn(Optional.of(cand1));
        when(userRepository.findById(3L)).thenReturn(Optional.of(cand3));

        // Keep 1, remove 2, add 3
        cohortService.syncCohortMembers(10L, List.of(1L, 3L), 100L);

        assertEquals(cohort1, cand1.getCohort());
        assertEquals(null, cand2.getCohort());
        assertEquals(cohort1, cand3.getCohort());
        verify(userRepository).save(cand2);
        verify(userRepository).save(cand3);
    }

    @Test
    @DisplayName("Remove candidate from cohort leaves candidate account intact with null cohort")
    void removeCandidateFromCohort_succeeds() {
        User cand = User.builder().id(1L).name("Alice").role(Role.CANDIDATE).organization(org1).cohort(cohort1).build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(cand));

        cohortService.removeCandidateFromCohort(10L, 1L, 100L);

        assertEquals(null, cand.getCohort());
        assertEquals("Alice", cand.getName());
        assertEquals(org1, cand.getOrganization());
        verify(userRepository).save(cand);
    }

    @Test
    @DisplayName("Remove candidate from cohort rejects cross-organization request")
    void removeCandidateFromCohort_crossOrg_throwsAccessDenied() {
        User rivalCand = User.builder().id(99L).name("Eve").role(Role.CANDIDATE).organization(org2).build();

        when(userRepository.findById(99L)).thenReturn(Optional.of(rivalCand));

        assertThrows(AccessDeniedException.class, () -> cohortService.removeCandidateFromCohort(10L, 99L, 100L));
    }
}

