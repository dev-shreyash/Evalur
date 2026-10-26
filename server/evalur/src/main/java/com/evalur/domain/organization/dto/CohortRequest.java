package com.evalur.domain.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CohortRequest(
    @NotBlank(message = "Cohort name is required")
    @Size(max = 100, message = "Cohort name cannot exceed 100 characters")
    String name,

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    String description
) {}

