package com.evalur.domain.ai.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiReasoningContext {
    private Long evaluationId;     // ID from the sidecar table
    private String candidateCode;   // The student's code
    private String solutionRubric; // Retrieved RAG chunks (The "Ground Truth")

    public AiReasoningContext() {}

    public AiReasoningContext(Long evaluationId, String candidateCode, String solutionRubric) {
        this.evaluationId = evaluationId;
        this.candidateCode = candidateCode;
        this.solutionRubric = solutionRubric;
    }

    public Long getEvaluationId() { return evaluationId; }
    public void setEvaluationId(Long evaluationId) { this.evaluationId = evaluationId; }
    public String getCandidateCode() { return candidateCode; }
    public void setCandidateCode(String candidateCode) { this.candidateCode = candidateCode; }
    public String getSolutionRubric() { return solutionRubric; }
    public void setSolutionRubric(String solutionRubric) { this.solutionRubric = solutionRubric; }

    public static AiReasoningContextBuilder builder() {
        return new AiReasoningContextBuilder();
    }

    public static class AiReasoningContextBuilder {
        private Long evaluationId;
        private String candidateCode;
        private String solutionRubric;

        public AiReasoningContextBuilder evaluationId(Long evaluationId) { this.evaluationId = evaluationId; return this; }
        public AiReasoningContextBuilder candidateCode(String candidateCode) { this.candidateCode = candidateCode; return this; }
        public AiReasoningContextBuilder solutionRubric(String solutionRubric) { this.solutionRubric = solutionRubric; return this; }

        public AiReasoningContext build() {
            return new AiReasoningContext(evaluationId, candidateCode, solutionRubric);
        }
    }
}