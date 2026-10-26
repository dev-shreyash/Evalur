package com.evalur.domain.user.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.evalur.config.SecurityConfig;
import com.evalur.config.WebConfig;
import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.user.dto.UserResponse;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.repository.UserRepository;
import com.evalur.domain.user.service.AuthService;
import com.evalur.security.jwtAuth.CustomAuthenticationEntryPoint;
import com.evalur.security.jwtAuth.JwtAuthenticationFilter;
import com.evalur.security.jwtAuth.JwtProvider;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@Import({
    SecurityConfig.class,
    WebConfig.class,
    CustomAuthenticationEntryPoint.class,
    JwtAuthenticationFilter.class
})
class AuthControllerTest {

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
    private AuthService authService;

    @Test
    @DisplayName("GET /api/v1/auth/me when authenticated returns 200 with user profile")
    void getCurrentUser_authenticated_returns200() throws Exception {
        Organization org = Organization.builder().name("Acme Corp").build();
        org.setId(100L);

        User candidate = User.builder()
                .name("Alice Candidate")
                .email("alice@acme.com")
                .role(Role.CANDIDATE)
                .organization(org)
                .build();
        candidate.setId(1L);

        UserResponse userResponse = new UserResponse(
                1L,
                "Alice Candidate",
                "alice@acme.com",
                Role.CANDIDATE,
                "Acme Corp"
        );

        when(authService.getCurrentUserProfile(any())).thenReturn(userResponse);

        mockMvc.perform(get("/api/v1/auth/me")
                .with(SecurityMockMvcRequestPostProcessors.authentication(
                        new UsernamePasswordAuthenticationToken(candidate, null, candidate.getAuthorities()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("Alice Candidate"))
                .andExpect(jsonPath("$.data.email").value("alice@acme.com"))
                .andExpect(jsonPath("$.data.role").value("CANDIDATE"))
                .andExpect(jsonPath("$.data.organizationName").value("Acme Corp"));
    }

    @Test
    @DisplayName("GET /api/v1/auth/me when unauthenticated returns 401 Unauthorized")
    void getCurrentUser_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }
}

