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

        if (request.candidateIds() == null || request.candidateIds().isEmpty()) {
            return;
        }

        for (Long candidateId : request.candidateIds()) {
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
}

