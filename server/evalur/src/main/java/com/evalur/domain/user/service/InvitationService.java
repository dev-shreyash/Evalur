package com.evalur.domain.user.service;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.evalur.domain.user.dto.InviteRequest;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.repository.UserRepository;
import com.evalur.domain.organization.repository.CohortRepository;
import com.evalur.exceptions.InvalidInvitationException;
import com.evalur.exceptions.ResourceNotFoundException;
import com.evalur.security.jwtAuth.JwtProvider;


@Service
public class InvitationService {

    private final JwtProvider jwtProvider;
    private final UserRepository userRepository;
    private final CohortRepository cohortRepository;

    public InvitationService(JwtProvider jwtProvider, UserRepository userRepository, CohortRepository cohortRepository) {
        this.jwtProvider = jwtProvider;
        this.userRepository = userRepository;
        this.cohortRepository = cohortRepository;
    }

    public InvitationService(JwtProvider jwtProvider, UserRepository userRepository) {
        this(jwtProvider, userRepository, null);
    }

    @Value("${evalur.client.url}")
    private String clientUrl;

    @Transactional(readOnly = true)
    public Map<String, String> generateInvite(InviteRequest request, User currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        // 1. Fetch fresh user to ensure organization is loaded
        User attachedUser = userRepository.findByEmail(currentUser.getEmail())
                .orElseThrow(() -> new AccessDeniedException("User not found"));

        if (attachedUser.getOrganization() == null || attachedUser.getOrganization().getId() == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }

        // 2. Validate requested role against the Role enum
        Role targetRole;
        try {
            targetRole = Role.valueOf(request.role().trim().toUpperCase());
        } catch (Exception e) {
            throw new InvalidInvitationException("Invalid role specified for invitation: " + request.role());
        }

        // 3. Explicit role-assignment policy:
        // Managers can ONLY invite CANDIDATE or STAFF.
        // Managers MUST NOT issue invitations for ADMIN or MANAGER.
        if (attachedUser.getRole() == Role.MANAGER) {
            if (targetRole == Role.ADMIN || targetRole == Role.MANAGER) {
                throw new AccessDeniedException("Managers are not permitted to issue invitations for role: " + targetRole);
            }
        } else if (attachedUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only administrators and managers can generate invitations.");
        }

        // 4. Extract Organization data
        Long orgId = attachedUser.getOrganization().getId();
        String orgName = attachedUser.getOrganization().getName();

        // Validate cohort if provided
        Long targetCohortId = null;
        if (request.cohortId() != null) {
            if (cohortRepository != null) {
                var cohort = cohortRepository.findByIdAndOrganizationId(request.cohortId(), orgId)
                        .orElseThrow(() -> new ResourceNotFoundException("Cohort", "id", request.cohortId()));
                targetCohortId = cohort.getId();
            } else {
                targetCohortId = request.cohortId();
            }
        }

        // 5. Generate secure token (with optional email and cohort binding if provided)
        String inviteToken;
        if (targetCohortId != null) {
            inviteToken = jwtProvider.generateInviteToken(
                    orgId,
                    orgName,
                    targetRole.name(),
                    request.seniorityLevel(),
                    request.email(),
                    targetCohortId
            );
        } else {
            inviteToken = jwtProvider.generateInviteToken(
                    orgId,
                    orgName,
                    targetRole.name(),
                    request.seniorityLevel(),
                    request.email()
            );
        }

        String inviteLink = clientUrl + "/auth/register/join?token=" + inviteToken;

        return Map.of(
                "message", "Invite link generated successfully",
                "inviteLink", inviteLink
        );
    }
}
