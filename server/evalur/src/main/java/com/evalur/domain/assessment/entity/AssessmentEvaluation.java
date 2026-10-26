package com.evalur.domain.assessment.entity;

import com.evalur.common.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "assessment_evaluations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentEvaluation extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_assessment_id", nullable = false, unique = true)
    @JsonIgnore
    private UserAssessment userAssessment;

    @Column(name = "objective_score", precision = 5, scale = 2)
    private BigDecimal objectiveScore; // Hard-coded truth

    @Column(name = "ai_logic_feedback", columnDefinition = "TEXT")
    private String aiLogicFeedback; // AI reasoning from Phase 3

    @Enumerated(EnumType.STRING)
    @Column(name = "evaluation_status")
    @Builder.Default
    private EvaluationStatus evaluationStatus = EvaluationStatus.PENDING;

    @Column(name = "logic_dna", columnDefinition = "TEXT")
    private String logicDna; 

    

    public UserAssessment getUserAssessment() { return userAssessment; }
    public void setUserAssessment(UserAssessment userAssessment) { this.userAssessment = userAssessment; }
    public BigDecimal getObjectiveScore() { return objectiveScore; }
    public void setObjectiveScore(BigDecimal objectiveScore) { this.objectiveScore = objectiveScore; }
    public String getAiLogicFeedback() { return aiLogicFeedback; }
    public void setAiLogicFeedback(String aiLogicFeedback) { this.aiLogicFeedback = aiLogicFeedback; }
    public EvaluationStatus getEvaluationStatus() { return evaluationStatus; }
    public void setEvaluationStatus(EvaluationStatus evaluationStatus) { this.evaluationStatus = evaluationStatus; }
    public String getLogicDna() { return logicDna; }
    public void setLogicDna(String logicDna) { this.logicDna = logicDna; }

    public static AssessmentEvaluationBuilder builder() {
        return new AssessmentEvaluationBuilder();
    }

    public static class AssessmentEvaluationBuilder {
        private Long id;
        private UserAssessment userAssessment;
        private BigDecimal objectiveScore;
        private String aiLogicFeedback;
        private EvaluationStatus evaluationStatus = EvaluationStatus.PENDING;
        private String logicDna;

        public AssessmentEvaluationBuilder id(Long id) { this.id = id; return this; }
        public AssessmentEvaluationBuilder userAssessment(UserAssessment userAssessment) { this.userAssessment = userAssessment; return this; }
        public AssessmentEvaluationBuilder objectiveScore(BigDecimal objectiveScore) { this.objectiveScore = objectiveScore; return this; }
        public AssessmentEvaluationBuilder aiLogicFeedback(String aiLogicFeedback) { this.aiLogicFeedback = aiLogicFeedback; return this; }
        public AssessmentEvaluationBuilder evaluationStatus(EvaluationStatus evaluationStatus) { this.evaluationStatus = evaluationStatus; return this; }
        public AssessmentEvaluationBuilder logicDna(String logicDna) { this.logicDna = logicDna; return this; }

        public AssessmentEvaluation build() {
            AssessmentEvaluation eval = new AssessmentEvaluation();
            eval.setId(this.id);
            eval.userAssessment = this.userAssessment;
            eval.objectiveScore = this.objectiveScore;
            eval.aiLogicFeedback = this.aiLogicFeedback;
            eval.evaluationStatus = this.evaluationStatus != null ? this.evaluationStatus : EvaluationStatus.PENDING;
            eval.logicDna = this.logicDna;
            return eval;
        }
    }
}