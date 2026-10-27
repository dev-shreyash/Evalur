package com.evalur.domain.organization.service;

import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

@Service
public class CohortService {

    private final CohortRepository cohortRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;

    public CohortService(
            CohortRepository cohortRepository,
            OrganizationRepository organizationRepository,
            UserRepository userRepository) {
        this.cohortRepository = cohortRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<CohortResponse> getCohorts(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        return cohortRepository.findByOrganizationIdOrderByNameAsc(orgId).stream()
                .map(c -> new CohortResponse(
                        c.getId(),
                        c.getName(),
                        c.getDescription(),
                        userRepository.countByCohortId(c.getId()),
                        c.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public CohortResponse createCohort(CohortRequest request, Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", orgId));

        if (cohortRepository.existsByOrganizationIdAndNameIgnoreCase(orgId, request.name().trim())) {
            throw new DuplicateResourceException("A cohort with the name '" + request.name().trim() + "' already exists in this organization.");
        }

        Cohort cohort = Cohort.builder()
                .name(request.name().trim())
                .description(request.description() != null ? request.description().trim() : null)
                .organization(org)
                .build();

        cohort = cohortRepository.save(cohort);

        return new CohortResponse(cohort.getId(), cohort.getName(), cohort.getDescription(), 0, cohort.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public CohortResponse getCohortById(Long cohortId, Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        Cohort cohort = cohortRepository.findByIdAndOrganizationId(cohortId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Cohort", "id", cohortId));

        int memberCount = userRepository.countByCohortId(cohort.getId());
        return new CohortResponse(cohort.getId(), cohort.getName(), cohort.getDescription(), memberCount, cohort.getCreatedAt());
    }

    @Transactional
    public void assignCandidatesToCohort(AssignCohortRequest request, Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }

        Cohort cohort = null;
        if (request.cohortId() != null) {
            cohort = cohortRepository.findByIdAndOrganizationId(request.cohortId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Cohort", "id", request.cohortId()));
        }

        List<Long> candidateIds = request.getEffectiveCandidateIds();
        if (candidateIds.isEmpty()) {
            return;
        }

        for (Long candidateId : candidateIds) {
            User candidate = userRepository.findById(candidateId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", candidateId));

            if (candidate.getOrganization() == null || !candidate.getOrganization().getId().equals(orgId)) {
                throw new AccessDeniedException("Candidate " + candidateId + " does not belong to caller's organization.");
            }

            if (candidate.getRole() != Role.CANDIDATE) {
                throw new AccessDeniedException("User " + candidateId + " is not a candidate.");
            }

            candidate.setCohort(cohort);
            userRepository.save(candidate);
        }
    }

    @Transactional
    public CohortResponse updateCohort(Long cohortId, CohortRequest request, Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }

        Cohort cohort = cohortRepository.findByIdAndOrganizationId(cohortId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Cohort", "id", cohortId));

        String trimmedName = request.name().trim();
        if (trimmedName.isEmpty()) {
            throw new IllegalArgumentException("Cohort name cannot be blank.");
        }

        if (cohortRepository.existsByOrganizationIdAndNameIgnoreCaseAndIdNot(orgId, trimmedName, cohortId)) {
            throw new DuplicateResourceException("A cohort with the name '" + trimmedName + "' already exists in this organization.");
        }

        cohort.setName(trimmedName);
        cohort.setDescription(request.description() != null ? request.description().trim() : null);

        cohort = cohortRepository.save(cohort);
        int memberCount = userRepository.countByCohortId(cohort.getId());
        return new CohortResponse(cohort.getId(), cohort.getName(), cohort.getDescription(), memberCount, cohort.getCreatedAt());
    }

    @Transactional
    public void syncCohortMembers(Long cohortId, List<Long> desiredCandidateIds, Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }

        Cohort cohort = cohortRepository.findByIdAndOrganizationId(cohortId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Cohort", "id", cohortId));

        List<Long> targetIds = desiredCandidateIds != null ? desiredCandidateIds : List.of();

        // 1. Unassign currently enrolled candidates who are no longer in desiredCandidateIds
        List<User> currentMembers = userRepository.findByOrganizationIdAndCohortId(orgId, cohortId);
        for (User member : currentMembers) {
            if (!targetIds.contains(member.getId())) {
                member.setCohort(null);
                userRepository.save(member);
            }
        }

        // 2. Assign newly selected candidates to this cohort
        for (Long candidateId : targetIds) {
            User candidate = userRepository.findById(candidateId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", candidateId));

            if (candidate.getOrganization() == null || !candidate.getOrganization().getId().equals(orgId)) {
                throw new AccessDeniedException("Candidate " + candidateId + " does not belong to caller's organization.");
            }

            if (candidate.getRole() != Role.CANDIDATE) {
                throw new AccessDeniedException("User " + candidateId + " is not a candidate.");
            }

            candidate.setCohort(cohort);
            userRepository.save(candidate);
        }
    }

    @Transactional
    public void removeCandidateFromCohort(Long cohortId, Long candidateId, Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }

        User candidate = userRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", candidateId));

        if (candidate.getOrganization() == null || !candidate.getOrganization().getId().equals(orgId)) {
            throw new AccessDeniedException("Candidate " + candidateId + " does not belong to caller's organization.");
        }

        if (candidate.getRole() != Role.CANDIDATE) {
            throw new AccessDeniedException("User " + candidateId + " is not a candidate.");
        }

        if (cohortId != null && (candidate.getCohort() == null || !candidate.getCohort().getId().equals(cohortId))) {
            throw new ResourceNotFoundException("Cohort", "candidateCohortId", candidate.getCohort() != null ? candidate.getCohort().getId() : null);
        }

        candidate.setCohort(null);
        userRepository.save(candidate);
    }

    @Transactional(readOnly = true)
    public List<com.evalur.domain.organization.dto.MemberResponse> getCohortMembers(Long cohortId, Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }

        Cohort cohort = cohortRepository.findByIdAndOrganizationId(cohortId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Cohort", "id", cohortId));

        return userRepository.findByOrganizationIdAndCohortId(orgId, cohort.getId()).stream()
                .map(u -> new com.evalur.domain.organization.dto.MemberResponse(
                        u.getId(),
                        u.getName(),
                        u.getEmail(),
                        u.getRole(),
                        u.getSeniorityLevel(),
                        List.of(),
                        cohort.getId(),
                        cohort.getName()
                ))
                .toList();
    }
}

