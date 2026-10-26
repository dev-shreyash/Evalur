package com.evalur.config;

import java.util.Collection;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.evalur.domain.assessment.controller.AssessmentController;
import com.evalur.domain.assessment.repository.AssessmentRepository;
import com.evalur.domain.assessment.service.AssessmentService;
import com.evalur.domain.user.controller.AuthController;
import com.evalur.domain.user.dto.AuthResponse;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.service.AuthService;
import com.evalur.security.jwtAuth.CustomAuthenticationEntryPoint;
import com.evalur.security.jwtAuth.JwtAuthenticationFilter;
import com.evalur.security.jwtAuth.JwtProvider;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
    AuthController.class,
    AssessmentController.class,
    SecurityConfigTest.RepresentativeSecuredController.class
})
@Import({
    SecurityConfig.class,
    WebConfig.class,
    CustomAuthenticationEntryPoint.class,
    JwtAuthenticationFilter.class,
    SecurityConfigTest.TestSecuredConfig.class
})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoleHierarchy roleHierarchy;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMappingContext;

    @MockitoBean
    private JwtProvider jwtProvider;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private AssessmentService assessmentService;

    @MockitoBean
    private AssessmentRepository assessmentRepository;

    @TestConfiguration
    static class TestSecuredConfig {
        @Bean
        public RepresentativeSecuredController representativeSecuredController() {
            return new RepresentativeSecuredController();
        }
    }

    @RestController
    @RequestMapping("/test-secured")
    static class RepresentativeSecuredController {

        @GetMapping("/candidate-only")
        @PreAuthorize("hasRole('CANDIDATE')")
        public String candidateOnly() {
            return "candidate-granted";
        }

        @GetMapping("/manager-only")
        @PreAuthorize("hasRole('MANAGER')")
        public String managerOnly() {
            return "manager-granted";
        }
    }

    // --- 1. HTTP FILTER: PUBLIC ROUTES ---

    @Test
    void unauthenticated_postLogin_isPermitted() throws Exception {
        when(authService.login(any())).thenReturn(new AuthResponse("token", "user@test.com", Role.CANDIDATE, "Login successful"));

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "user@test.com", "password": "password123" }
                """))
                .andExpect(status().isOk());
    }

    @Test
    void unauthenticated_postRegister_isPermitted() throws Exception {
        when(authService.register(any())).thenReturn(new AuthResponse("token", "user@test.com", Role.ADMIN, "Registration successful"));

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "name": "Admin", "email": "admin@test.com", "password": "password123", "organizationName": "Acme" }
                """))
                .andExpect(status().isOk());
    }

    // --- 2. HTTP FILTER: PROTECTED ROUTES REQUIRE AUTHENTICATION (401) ---

    @Test
    void unauthenticated_getAssessments_returns401Unauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/assessments"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_generateAssessment_returns401Unauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/assessments/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    // --- 3. ROLE HIERARCHY DIRECT AUTHORITY RESOLUTION ---

    @Test
    void roleHierarchy_adminInheritsOnlyManagementRolesNotCandidate() {
        Collection<? extends GrantedAuthority> authorities = roleHierarchy.getReachableGrantedAuthorities(
                java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );

        java.util.List<String> authorityNames = authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        assertTrue(authorityNames.contains("ROLE_ADMIN"));
        assertTrue(authorityNames.contains("ROLE_MANAGER"));
        assertTrue(authorityNames.contains("ROLE_STAFF"));
        assertFalse(authorityNames.contains("ROLE_CANDIDATE"), "ADMIN must not inherit CANDIDATE authority");
    }

    @Test
    void roleHierarchy_managerInheritsStaffNotCandidateNorAdmin() {
        Collection<? extends GrantedAuthority> authorities = roleHierarchy.getReachableGrantedAuthorities(
                java.util.List.of(new SimpleGrantedAuthority("ROLE_MANAGER"))
        );

        java.util.List<String> authorityNames = authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        assertTrue(authorityNames.contains("ROLE_MANAGER"));
        assertTrue(authorityNames.contains("ROLE_STAFF"));
        assertFalse(authorityNames.contains("ROLE_CANDIDATE"), "MANAGER must not inherit CANDIDATE authority");
        assertFalse(authorityNames.contains("ROLE_ADMIN"));
    }

    @Test
    void roleHierarchy_staffDoesNotInheritCandidate() {
        Collection<? extends GrantedAuthority> authorities = roleHierarchy.getReachableGrantedAuthorities(
                java.util.List.of(new SimpleGrantedAuthority("ROLE_STAFF"))
        );

        java.util.List<String> authorityNames = authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        assertTrue(authorityNames.contains("ROLE_STAFF"));
        assertFalse(authorityNames.contains("ROLE_CANDIDATE"), "STAFF must not inherit CANDIDATE authority");
    }

    // --- 4. METHOD SECURITY ENFORCEMENT ON REPRESENTATIVE SECURED ENDPOINTS ---

    @Test
    @WithMockUser(roles = "CANDIDATE")
    void methodSecurity_candidate_accessesCandidateOnly_isPermitted() throws Exception {
        mockMvc.perform(get("/api/v1/test-secured/candidate-only"))
                .andExpect(status().isOk())
                .andExpect(content().string("candidate-granted"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void methodSecurity_admin_accessesCandidateOnly_isForbidden() throws Exception {
        // Confirms that ADMIN does not automatically satisfy candidate-only authorization
        mockMvc.perform(get("/api/v1/test-secured/candidate-only"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void methodSecurity_manager_accessesCandidateOnly_isForbidden() throws Exception {
        // Confirms that MANAGER does not automatically satisfy candidate-only authorization
        mockMvc.perform(get("/api/v1/test-secured/candidate-only"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void methodSecurity_admin_accessesManagerOnly_isPermittedViaHierarchy() throws Exception {
        // Confirms that ADMIN inherits MANAGER authority in method security
        mockMvc.perform(get("/api/v1/test-secured/manager-only"))
                .andExpect(status().isOk())
                .andExpect(content().string("manager-granted"));
    }

    @Test
    @WithMockUser(roles = "CANDIDATE")
    void methodSecurity_candidate_accessesManagerOnly_isForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/test-secured/manager-only"))
                .andExpect(status().isForbidden());
    }
}
