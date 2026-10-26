package com.evalur.domain.assessment.dto;

import java.util.List;

public record AssessmentAssignmentRequest(
    Long assessmentId,
    List<Long> candidateIds,
    Long cohortId
) {
    public AssessmentAssignmentRequest(Long assessmentId, List<Long> candidateIds) {
        this(assessmentId, candidateIds, null);
    }
}
