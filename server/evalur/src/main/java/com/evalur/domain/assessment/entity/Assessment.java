package com.evalur.domain.assessment.entity;

import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.evalur.common.BaseEntity;
import com.evalur.domain.ai.entity.AiDocument;
import com.evalur.domain.organization.entity.Organization;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "assessments")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Assessment extends BaseEntity {

    @Column(nullable = false)
    private String title;

    private String role;
    private String seniority;

    @JdbcTypeCode(SqlTypes.JSON) 
    @Column(columnDefinition = "jsonb")
    private String content;


    @ManyToMany
private List<AiDocument> documents;

    

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Enumerated(EnumType.STRING)
    private AssessmentStatus status;

    public enum AssessmentStatus {
        GENERATING, // Currently being processed by Gemini
        READY,      // Successfully generated and saved to Neon
        FAILED,     // Error during retrieval or generation
        ASSIGNED,   // Sent to a candidate
        COMPLETED   // Candidate has finished the test
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getSeniority() { return seniority; }
    public void setSeniority(String seniority) { this.seniority = seniority; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public List<AiDocument> getDocuments() { return documents; }
    public void setDocuments(List<AiDocument> documents) { this.documents = documents; }
    public Organization getOrganization() { return organization; }
    public void setOrganization(Organization organization) { this.organization = organization; }
    public AssessmentStatus getStatus() { return status; }
    public void setStatus(AssessmentStatus status) { this.status = status; }

    public static AssessmentBuilder builder() {
        return new AssessmentBuilder();
    }

    public static class AssessmentBuilder {
        private Long id;
        private String title;
        private String role;
        private String seniority;
        private String content;
        private List<AiDocument> documents;
        private Organization organization;
        private AssessmentStatus status;

        public AssessmentBuilder id(Long id) { this.id = id; return this; }
        public AssessmentBuilder title(String title) { this.title = title; return this; }
        public AssessmentBuilder role(String role) { this.role = role; return this; }
        public AssessmentBuilder seniority(String seniority) { this.seniority = seniority; return this; }
        public AssessmentBuilder content(String content) { this.content = content; return this; }
        public AssessmentBuilder documents(List<AiDocument> documents) { this.documents = documents; return this; }
        public AssessmentBuilder organization(Organization organization) { this.organization = organization; return this; }
        public AssessmentBuilder status(AssessmentStatus status) { this.status = status; return this; }

        public Assessment build() {
            Assessment a = new Assessment();
            a.setId(this.id);
            a.title = this.title;
            a.role = this.role;
            a.seniority = this.seniority;
            a.content = this.content;
            a.documents = this.documents;
            a.organization = this.organization;
            a.status = this.status;
            return a;
        }
    }
}