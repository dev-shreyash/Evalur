package com.evalur.domain.assessment.entity;

import java.time.LocalDateTime;

import jakarta.persistence.CascadeType; // Added
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne; // Added
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_assessments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;

    @Enumerated(EnumType.STRING)
    private AssignmentStatus status;

    private LocalDateTime assignedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    public enum AssignmentStatus {
        ASSIGNED, IN_PROGRESS, SUBMITTED
    }

    // ADDED THIS RELATIONSHIP
    // This links the assessment session to its final evaluation/score
    @OneToOne(mappedBy = "userAssessment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private AssessmentEvaluation evaluation;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Assessment getAssessment() { return assessment; }
    public void setAssessment(Assessment assessment) { this.assessment = assessment; }
    public AssignmentStatus getStatus() { return status; }
    public void setStatus(AssignmentStatus status) { this.status = status; }
    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public AssessmentEvaluation getEvaluation() { return evaluation; }
    public void setEvaluation(AssessmentEvaluation evaluation) { this.evaluation = evaluation; }

    public static UserAssessmentBuilder builder() {
        return new UserAssessmentBuilder();
    }

    public static class UserAssessmentBuilder {
        private Long id;
        private Long userId;
        private Assessment assessment;
        private AssignmentStatus status;
        private LocalDateTime assignedAt;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private AssessmentEvaluation evaluation;

        public UserAssessmentBuilder id(Long id) { this.id = id; return this; }
        public UserAssessmentBuilder userId(Long userId) { this.userId = userId; return this; }
        public UserAssessmentBuilder assessment(Assessment assessment) { this.assessment = assessment; return this; }
        public UserAssessmentBuilder status(AssignmentStatus status) { this.status = status; return this; }
        public UserAssessmentBuilder assignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; return this; }
        public UserAssessmentBuilder startedAt(LocalDateTime startedAt) { this.startedAt = startedAt; return this; }
        public UserAssessmentBuilder completedAt(LocalDateTime completedAt) { this.completedAt = completedAt; return this; }
        public UserAssessmentBuilder evaluation(AssessmentEvaluation evaluation) { this.evaluation = evaluation; return this; }

        public UserAssessment build() {
            UserAssessment ua = new UserAssessment();
            ua.id = this.id;
            ua.userId = this.userId;
            ua.assessment = this.assessment;
            ua.status = this.status;
            ua.assignedAt = this.assignedAt;
            ua.startedAt = this.startedAt;
            ua.completedAt = this.completedAt;
            ua.evaluation = this.evaluation;
            return ua;
        }
    }
}