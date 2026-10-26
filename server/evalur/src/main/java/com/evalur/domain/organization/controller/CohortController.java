package com.evalur.domain.organization.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.evalur.common.ApiResponse;
import com.evalur.domain.organization.dto.AssignCohortRequest;
import com.evalur.domain.organization.dto.CohortRequest;
import com.evalur.domain.organization.dto.CohortResponse;
import com.evalur.domain.organization.service.CohortService;
import com.evalur.security.utils.SecurityUtils;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/cohorts")
public class CohortController {

    private final CohortService cohortService;

    public CohortController(CohortService cohortService) {
        this.cohortService = cohortService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<CohortResponse>>> getCohorts() {
        Long orgId = SecurityUtils.getCurrentOrgId();
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        return ResponseEntity.ok(ApiResponse.success(cohortService.getCohorts(orgId), "Cohorts retrieved."));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<CohortResponse>> createCohort(@Valid @RequestBody CohortRequest request) {
        Long orgId = SecurityUtils.getCurrentOrgId();
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        CohortResponse cohort = cohortService.createCohort(request, orgId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(cohort, "Cohort created successfully."));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<CohortResponse>> getCohortById(@PathVariable Long id) {
        Long orgId = SecurityUtils.getCurrentOrgId();
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        return ResponseEntity.ok(ApiResponse.success(cohortService.getCohortById(id, orgId), "Cohort retrieved."));
    }

    @PostMapping("/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Void>> assignCandidatesToCohort(@RequestBody AssignCohortRequest request) {
        Long orgId = SecurityUtils.getCurrentOrgId();
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        cohortService.assignCandidatesToCohort(request, orgId);
        return ResponseEntity.ok(ApiResponse.success(null, "Candidates assigned to cohort successfully."));
    }
}

