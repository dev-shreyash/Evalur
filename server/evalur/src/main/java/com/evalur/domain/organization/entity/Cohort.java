package com.evalur.domain.organization.entity;

import com.evalur.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "cohorts")
public class Cohort extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    public Cohort() {}

    public Cohort(String name, String description, Organization organization) {
        this.name = name;
        this.description = description;
        this.organization = organization;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Organization getOrganization() { return organization; }
    public void setOrganization(Organization organization) { this.organization = organization; }

    public static CohortBuilder builder() {
        return new CohortBuilder();
    }

    public static class CohortBuilder {
        private Long id;
        private String name;
        private String description;
        private Organization organization;

        public CohortBuilder id(Long id) { this.id = id; return this; }
        public CohortBuilder name(String name) { this.name = name; return this; }
        public CohortBuilder description(String description) { this.description = description; return this; }
        public CohortBuilder organization(Organization organization) { this.organization = organization; return this; }

        public Cohort build() {
            Cohort c = new Cohort(name, description, organization);
            c.setId(this.id);
            return c;
        }
    }
}

