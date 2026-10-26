package com.evalur.domain.ai.entity;

import com.evalur.common.BaseEntity;
import com.evalur.domain.organization.entity.Organization;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ai_documents")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiDocument extends BaseEntity {

    @Column(nullable = false)
    private String filename;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IngestionStatus status;

    @Column(name = "llama_job_id")
    private String llamaJobId;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    public enum IngestionStatus {
        PENDING, 
        PARSING, 
        VECTORIZING, 
        COMPLETED, 
        FAILED
    }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }
    public IngestionStatus getStatus() { return status; }
    public void setStatus(IngestionStatus status) { this.status = status; }
    public String getLlamaJobId() { return llamaJobId; }
    public void setLlamaJobId(String llamaJobId) { this.llamaJobId = llamaJobId; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public Organization getOrganization() { return organization; }
    public void setOrganization(Organization organization) { this.organization = organization; }

    public static AiDocumentBuilder builder() {
        return new AiDocumentBuilder();
    }

    public static class AiDocumentBuilder {
        private Long id;
        private String filename;
        private IngestionStatus status;
        private String llamaJobId;
        private String errorMessage;
        private Organization organization;

        public AiDocumentBuilder id(Long id) { this.id = id; return this; }
        public AiDocumentBuilder filename(String filename) { this.filename = filename; return this; }
        public AiDocumentBuilder status(IngestionStatus status) { this.status = status; return this; }
        public AiDocumentBuilder llamaJobId(String llamaJobId) { this.llamaJobId = llamaJobId; return this; }
        public AiDocumentBuilder errorMessage(String errorMessage) { this.errorMessage = errorMessage; return this; }
        public AiDocumentBuilder organization(Organization organization) { this.organization = organization; return this; }

        public AiDocument build() {
            AiDocument doc = new AiDocument();
            doc.setId(this.id);
            doc.filename = this.filename;
            doc.status = this.status;
            doc.llamaJobId = this.llamaJobId;
            doc.errorMessage = this.errorMessage;
            doc.organization = this.organization;
            return doc;
        }
    }
}