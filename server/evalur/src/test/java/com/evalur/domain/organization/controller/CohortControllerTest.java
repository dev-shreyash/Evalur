package com.evalur.domain.organization.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.evalur.config.SecurityConfig;
import com.evalur.config.WebConfig;
import com.evalur.domain.organization.dto.CohortRequest;
import com.evalur.domain.organization.dto.CohortResponse;
import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.organization.service.CohortService;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.repository.UserRepository;
import com.evalur.security.jwtAuth.CustomAuthenticationEntryPoint;
import com.evalur.security.jwtAuth.JwtAuthenticationFilter;
import com.evalur.security.jwtAuth.JwtProvider;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CohortController.class)
@Import({
    SecurityConfig.class,
    WebConfig.class,
    CustomAuthenticationEntryPoint.class,
    JwtAuthenticationFilter.class
})
class CohortControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMappingContext;

    @MockitoBean
    private JwtProvider jwtProvider;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private CohortService cohortService;

    private Organization testOrg;
    private User adminUser;
    private User candidateUser;

    @BeforeEach
    void setUp() {
        testOrg = Organization.builder().name("Test Org").build();
        testOrg.setId(100L);

        adminUser = User.builder()
                .name("Admin User")
                .email("admin@evalur.com")
                .password("encoded_pass")
                .role(Role.ADMIN)
                .organization(testOrg)
                .build();
        adminUser.setId(1L);

        candidateUser = User.builder()
                .name("Candidate User")
                .email("cand@evalur.com")
                .password("encoded_pass")
                .role(Role.CANDIDATE)
                .organization(testOrg)
                .build();
        candidateUser.setId(2L);
    }

    private static RequestPostProcessor authAs(User user) {
        return SecurityMockMvcRequestPostProcessors.authentication(
                new UsernamePasswordAuthenticationToken(user, "password", user.getAuthorities())
        );
    }

    @Test
    @DisplayName("GET /api/v1/cohorts as ADMIN returns 200 with cohorts list")
    void getCohorts_asAdmin_returns200() throws Exception {
        CohortResponse c = new CohortResponse(10L, "Java Batch 1", "Desc", 5, LocalDateTime.now());
        when(cohortService.getCohorts(100L)).thenReturn(List.of(c));

        mockMvc.perform(get("/api/v1/cohorts")
                .with(authAs(adminUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(10))
                .andExpect(jsonPath("$.data[0].name").value("Java Batch 1"));
    }

    @Test
    @DisplayName("POST /api/v1/cohorts as ADMIN returns 201 Created")
    void createCohort_asAdmin_returns201() throws Exception {
        CohortResponse c = new CohortResponse(10L, "Java Batch 1", "Desc", 0, LocalDateTime.now());
        when(cohortService.createCohort(any(CohortRequest.class), eq(100L))).thenReturn(c);

        mockMvc.perform(post("/api/v1/cohorts")
                .with(authAs(adminUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "name": "Java Batch 1",
                            "description": "Desc"
                        }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10))
                .andExpect(jsonPath("$.data.name").value("Java Batch 1"));
    }

    @Test
    @DisplayName("POST /api/v1/cohorts with blank name returns 400 Bad Request")
    void createCohort_blankName_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/cohorts")
                .with(authAs(adminUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "name": "",
                            "description": "Desc"
                        }
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/v1/cohorts/{id} as ADMIN returns 200 OK")
    void updateCohort_asAdmin_returns200() throws Exception {
        CohortResponse updated = new CohortResponse(10L, "Updated Batch", "Updated Desc", 5, LocalDateTime.now());
        when(cohortService.updateCohort(eq(10L), any(CohortRequest.class), eq(100L))).thenReturn(updated);

        mockMvc.perform(put("/api/v1/cohorts/10")
                .with(authAs(adminUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "name": "Updated Batch",
                            "description": "Updated Desc"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Updated Batch"));
    }

    @Test
    @DisplayName("POST /api/v1/cohorts/assign as ADMIN returns 200 OK")
    void assignCandidates_asAdmin_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/cohorts/assign")
                .with(authAs(adminUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "cohortId": 10,
                            "userIds": [1, 2]
                        }
                        """))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("DELETE /api/v1/cohorts/{cohortId}/members/{candidateId} returns 200 OK")
    void removeCandidate_asAdmin_returns200() throws Exception {
        mockMvc.perform(delete("/api/v1/cohorts/10/members/2")
                .with(authAs(adminUser)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("DELETE /api/v1/cohorts/members/{candidateId} returns 200 OK")
    void removeCandidateDirect_asAdmin_returns200() throws Exception {
        mockMvc.perform(delete("/api/v1/cohorts/members/2")
                .with(authAs(adminUser)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/v1/cohorts/{id}/members returns 200 OK")
    void getCohortMembers_asAdmin_returns200() throws Exception {
        when(cohortService.getCohortMembers(10L, 100L)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/cohorts/10/members")
                .with(authAs(adminUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("PUT /api/v1/cohorts/{id}/members returns 200 OK")
    void syncCohortMembers_asAdmin_returns200() throws Exception {
        mockMvc.perform(put("/api/v1/cohorts/10/members")
                .with(authAs(adminUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "candidateIds": [1, 2]
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("GET /api/v1/cohorts unauthenticated returns 401")
    void getCohorts_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/cohorts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/v1/cohorts as CANDIDATE returns 403 Forbidden")
    void createCohort_asCandidate_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/cohorts")
                .with(authAs(candidateUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "name": "Unauthorized Batch"
                        }
                        """))
                .andExpect(status().isForbidden());
    }
}
