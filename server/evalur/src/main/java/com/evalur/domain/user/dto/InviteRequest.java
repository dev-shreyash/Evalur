package com.evalur.domain.user.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Used by Managers and Admins to invite others via the InvitationController.
 * Email is optional; if provided, the invitation is bound to that recipient email.
 * CohortId is optional; if provided, the candidate is automatically joined to the specified cohort.
 */
public record InviteRequest(
    String email,

    @NotBlank(message = "Role assignment is required")
    String role,

    String seniorityLevel,

    Long cohortId
) {
    public InviteRequest(String email, String role, String seniorityLevel) {
        this(email, role, seniorityLevel, null);
    }
}
