package com.evalur.domain.organization.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.evalur.domain.organization.dto.OrganizationUpdateRequest;
import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.organization.service.OrganizationService;
import com.evalur.security.utils.SecurityUtils;


@RestController
@RequestMapping("/org")
public class OrganizationController {

    private final OrganizationService orgService;

    public OrganizationController(OrganizationService orgService) {
        this.orgService = orgService;
    }

    @GetMapping("/profile")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Organization> getOrgProfile() {
        Long orgId = SecurityUtils.getCurrentOrgId(); 
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        return ResponseEntity.ok(orgService.getDetails(orgId));
    }

    @PatchMapping("/profile")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Organization> updateOrgProfile(
        @RequestBody OrganizationUpdateRequest request
    ) {
        Long orgId = SecurityUtils.getCurrentOrgId();
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        return ResponseEntity.ok(orgService.updateProfile(orgId, request));
    }
}
