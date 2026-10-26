package com.evalur.domain.organization.entity;

import java.util.ArrayList;
import java.util.List;

import com.evalur.common.BaseEntity;
import com.evalur.domain.user.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore; 

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "organizations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Organization extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;

    @Column(unique = true)
    private String domain; 

    @Column(name = "subscription_tier")
    @Builder.Default 
    private String subscriptionTier = "FREE"; 

    @Column(nullable = false)
    @Builder.Default 
    private int apiQuotaLimit = 100; 

    // --- NEW IDENTITY FIELDS FOR ONBOARDING ---
    @Column
    private String industry;

    @Column
    private String website;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "contact_phone")
    private String contactPhone;

    @JsonIgnore 
    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<User> users = new ArrayList<>();

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }
    public String getSubscriptionTier() { return subscriptionTier; }
    public void setSubscriptionTier(String subscriptionTier) { this.subscriptionTier = subscriptionTier; }
    public int getApiQuotaLimit() { return apiQuotaLimit; }
    public void setApiQuotaLimit(int apiQuotaLimit) { this.apiQuotaLimit = apiQuotaLimit; }
    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }
    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public List<User> getUsers() { return users; }
    public void setUsers(List<User> users) { this.users = users; }

    public static OrganizationBuilder builder() {
        return new OrganizationBuilder();
    }

    public static class OrganizationBuilder {
        private Long id;
        private String name;
        private String domain;
        private String subscriptionTier = "FREE";
        private int apiQuotaLimit = 100;
        private String industry;
        private String website;
        private String logoUrl;
        private String contactPhone;
        private List<User> users = new ArrayList<>();

        public OrganizationBuilder id(Long id) { this.id = id; return this; }
        public OrganizationBuilder name(String name) { this.name = name; return this; }
        public OrganizationBuilder domain(String domain) { this.domain = domain; return this; }
        public OrganizationBuilder subscriptionTier(String subscriptionTier) { this.subscriptionTier = subscriptionTier; return this; }
        public OrganizationBuilder apiQuotaLimit(int apiQuotaLimit) { this.apiQuotaLimit = apiQuotaLimit; return this; }
        public OrganizationBuilder industry(String industry) { this.industry = industry; return this; }
        public OrganizationBuilder website(String website) { this.website = website; return this; }
        public OrganizationBuilder logoUrl(String logoUrl) { this.logoUrl = logoUrl; return this; }
        public OrganizationBuilder contactPhone(String contactPhone) { this.contactPhone = contactPhone; return this; }
        public OrganizationBuilder users(List<User> users) { this.users = users; return this; }

        public Organization build() {
            Organization org = new Organization();
            org.setId(this.id);
            org.name = this.name;
            org.domain = this.domain;
            org.subscriptionTier = this.subscriptionTier;
            org.apiQuotaLimit = this.apiQuotaLimit;
            org.industry = this.industry;
            org.website = this.website;
            org.logoUrl = this.logoUrl;
            org.contactPhone = this.contactPhone;
            org.users = this.users != null ? this.users : new ArrayList<>();
            return org;
        }
    }
}