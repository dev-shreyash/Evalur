package com.evalur.domain.assessment.dto;

import java.util.List;

public record AssessmentRequest(
    String title, 
    String role, 
    String seniority, 
    List<String> documentIds,
    String jobDescription,
    List<String> topics,
    List<String> assessmentFocus,
    List<String> questionTypes,
    Integer questionCount
) {
    public AssessmentRequest(String title, String role, String seniority, List<String> documentIds, String jobDescription) {
        this(title, role, seniority, documentIds, jobDescription, null, null, null, null);
    }
}
