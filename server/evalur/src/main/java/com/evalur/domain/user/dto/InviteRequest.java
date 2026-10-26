package com.evalur.domain.user.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Used by Managers and Admins to invite others via the InvitationController.
 * Email is optional; if provided, the invitation is bound to that recipient email.
 */
public record InviteRequest(
    String email,

    @NotBlank(message = "Role assignment is required")
    String role,

    @NotBlank(message = "Seniority level is required")
    String seniorityLevel
) {}
