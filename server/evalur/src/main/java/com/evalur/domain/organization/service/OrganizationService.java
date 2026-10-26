package com.evalur.domain.organization.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.evalur.domain.organization.dto.OrganizationUpdateRequest;
import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.organization.repository.OrganizationRepository;
import com.evalur.exceptions.ResourceNotFoundException;


@Service
public class OrganizationService {

    private final OrganizationRepository orgRepository;

    public OrganizationService(OrganizationRepository orgRepository) {
        this.orgRepository = orgRepository;
    }

    public Organization getDetails(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        return orgRepository.findById(orgId)
            .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", orgId));
    }

    @Transactional
    public Organization updateProfile(Long orgId, OrganizationUpdateRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }
        Organization org = getDetails(orgId);
        
        if (request.name() != null) org.setName(request.name());
        if (request.industry() != null) org.setIndustry(request.industry());
        if (request.website() != null) org.setWebsite(request.website());
        if (request.logoUrl() != null) org.setLogoUrl(request.logoUrl());
        if (request.contactPhone() != null) org.setContactPhone(request.contactPhone());

        return orgRepository.save(org);
    }
}
