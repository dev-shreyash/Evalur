package com.evalur.domain.assessment.dto;

import java.util.List;

import lombok.Data;

@Data
public class UserSubmissionDTO {
    private Long userAssessmentId;
    private List<Integer> mcqAnswers; // Indices matching the assessment content order
    private String codingSolution;    // The actual code written by the student

    public UserSubmissionDTO() {}

    public UserSubmissionDTO(Long userAssessmentId, List<Integer> mcqAnswers, String codingSolution) {
        this.userAssessmentId = userAssessmentId;
        this.mcqAnswers = mcqAnswers;
        this.codingSolution = codingSolution;
    }

    public Long getUserAssessmentId() { return userAssessmentId; }
    public void setUserAssessmentId(Long userAssessmentId) { this.userAssessmentId = userAssessmentId; }
    public List<Integer> getMcqAnswers() { return mcqAnswers; }
    public void setMcqAnswers(List<Integer> mcqAnswers) { this.mcqAnswers = mcqAnswers; }
    public String getCodingSolution() { return codingSolution; }
    public void setCodingSolution(String codingSolution) { this.codingSolution = codingSolution; }
}