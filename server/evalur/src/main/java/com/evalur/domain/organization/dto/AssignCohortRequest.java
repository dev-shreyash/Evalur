package com.evalur.domain.organization.dto;

import java.util.List;

public record AssignCohortRequest(
    Long cohortId,
    List<Long> candidateIds
) {}

