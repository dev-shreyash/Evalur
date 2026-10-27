package com.evalur.domain.organization.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonAlias;

public record AssignCohortRequest(
    Long cohortId,
    @JsonAlias({"userIds", "candidateIds"})
    List<Long> candidateIds
) {
    public List<Long> getEffectiveCandidateIds() {
        return candidateIds != null ? candidateIds : List.of();
    }
}

