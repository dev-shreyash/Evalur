package com.evalur.domain.organization.dto;

import java.time.LocalDateTime;

public record CohortResponse(
    Long id,
    String name,
    String description,
    int memberCount,
    LocalDateTime createdAt
) {}

