package com.evalur.domain.user.entity;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.evalur.common.BaseEntity;
import com.evalur.domain.organization.entity.Organization;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User extends BaseEntity implements UserDetails {

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @JsonIgnore // Prevents password from EVER being serialized into JSON
    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_role", nullable = false)
    private Role role;

    // Required for targeting Assessment difficulty via LLM
    @Column(name = "seniority_level")
    private String seniorityLevel;

    // Bounded to an Organization. Nullable allows Evalur Platform Admins to exist.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = true)
    private Organization organization;

    // ==========================================================
    // Helper Methods for the B2B Multi-Tenant RBAC
    // ==========================================================
    public boolean isPlatformAdmin() {
        return this.role == Role.ADMIN && this.organization == null;
    }

    public boolean isCorporateAdmin() {
        return this.role == Role.ADMIN && this.organization != null;
    }

    // Safely get the organization ID without triggering LazyLoading exceptions
    public Long getTenantId() {
        return this.organization != null ? this.organization.getId() : null;
    }

    // ==========================================================
    // UserDetails Interface Methods (Spring Security)
    // ==========================================================
    @JsonIgnore // Hide authorities from standard JSON responses
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email; // Using email as the primary authentication identifier
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public String getSeniorityLevel() { return seniorityLevel; }
    public void setSeniorityLevel(String seniorityLevel) { this.seniorityLevel = seniorityLevel; }
    public Organization getOrganization() { return organization; }
    public void setOrganization(Organization organization) { this.organization = organization; }

    public static UserBuilder builder() {
        return new UserBuilder();
    }

    public static class UserBuilder {
        private Long id;
        private String name;
        private String email;
        private String password;
        private Role role;
        private String seniorityLevel;
        private Organization organization;

        public UserBuilder id(Long id) { this.id = id; return this; }
        public UserBuilder name(String name) { this.name = name; return this; }
        public UserBuilder email(String email) { this.email = email; return this; }
        public UserBuilder password(String password) { this.password = password; return this; }
        public UserBuilder role(Role role) { this.role = role; return this; }
        public UserBuilder seniorityLevel(String seniorityLevel) { this.seniorityLevel = seniorityLevel; return this; }
        public UserBuilder organization(Organization organization) { this.organization = organization; return this; }

        public User build() {
            User user = new User();
            user.setId(this.id);
            user.name = this.name;
            user.email = this.email;
            user.password = this.password;
            user.role = this.role;
            user.seniorityLevel = this.seniorityLevel;
            user.organization = this.organization;
            return user;
        }
    }
}