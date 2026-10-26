package com.evalur.security;

import java.util.Collections;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.evalur.config.SecurityConfig;
import com.evalur.config.WebConfig;
import com.evalur.domain.organization.controller.MemberController;
import com.evalur.domain.organization.controller.OrganizationController;
import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.organization.service.MemberService;
import com.evalur.domain.organization.service.OrganizationService;
import com.evalur.domain.user.controller.InvitationController;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.service.InvitationService;
import com.evalur.exceptions.BadRequestException;
import com.evalur.exceptions.DuplicateResourceException;
import com.evalur.exceptions.InvalidInvitationException;
import com.evalur.exceptions.ResourceNotFoundException;
import com.evalur.security.jwtAuth.CustomAuthenticationEntryPoint;
import com.evalur.security.jwtAuth.JwtAuthenticationFilter;
import com.evalur.security.jwtAuth.JwtProvider;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
    InvitationController.class,
    OrganizationController.class,
    MemberController.class
})
@Import({
    SecurityConfig.class,
    WebConfig.class,
    CustomAuthenticationEntryPoint.class,
    JwtAuthenticationFilter.class
})
class InvitationAndOrganizationSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMappingContext;

    @MockitoBean
    private JwtProvider jwtProvider;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private InvitationService invitationService;

    @MockitoBean
    private OrganizationService organizationService;

    @MockitoBean
    private MemberService memberService;

    private Organization orgA;
    private User managerA;
    private User adminA;
    private User candidateA;
    private User userWithoutOrg;

    @BeforeEach
    void setUp() {
        orgA = Organization.builder().name("Organization A").build();
        orgA.setId(100L);

        managerA = User.builder()
                .name("Manager A")
                .email("manager@orga.com")
                .role(Role.MANAGER)
                .organization(orgA)
                .build();
        managerA.setId(10L);

        adminA = User.builder()
                .name("Admin A")
                .email("admin@orga.com")
                .role(Role.ADMIN)
                .organization(orgA)
                .build();
        adminA.setId(11L);

        candidateA = User.builder()
                .name("Candidate A")
                .email("candidate@orga.com")
                .role(Role.CANDIDATE)
                .organization(orgA)
                .build();
        candidateA.setId(12L);

        userWithoutOrg = User.builder()
                .name("No Org User")
                .email("noorg@evalur.com")
                .role(Role.MANAGER)
                .organization(null)
                .build();
        userWithoutOrg.setId(99L);
    }

    private static RequestPostProcessor authAs(User user) {
        return SecurityMockMvcRequestPostProcessors.authentication(
                new UsernamePasswordAuthenticationToken(user, "password", user.getAuthorities())
        );
    }

    // =========================================================================
    // 1. Invitation Security Tests
    // =========================================================================
    @Nested
    @DisplayName("Invitation Security Tests")
    class InvitationSecurityTests {

        @Test
        @DisplayName("Manager attempting to invite ADMIN receives 403 Forbidden")
        void manager_inviteAdmin_returns403() throws Exception {
            doThrow(new AccessDeniedException("Managers are not permitted to issue invitations for role: ADMIN"))
                    .when(invitationService).generateInvite(any(), any());

            mockMvc.perform(post("/api/v1/org/invite")
                    .with(authAs(managerA))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"role\":\"ADMIN\",\"seniorityLevel\":\"Senior\"}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("You do not have permission to perform this action."));
        }

        @Test
        @DisplayName("Manager attempting to invite MANAGER receives 403 Forbidden")
        void manager_inviteManager_returns403() throws Exception {
            doThrow(new AccessDeniedException("Managers are not permitted to issue invitations for role: MANAGER"))
                    .when(invitationService).generateInvite(any(), any());

            mockMvc.perform(post("/api/v1/org/invite")
                    .with(authAs(managerA))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"role\":\"MANAGER\",\"seniorityLevel\":\"Mid\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Manager inviting CANDIDATE succeeds with 200 OK")
        void manager_inviteCandidate_succeeds() throws Exception {
            when(invitationService.generateInvite(any(), any())).thenReturn(Map.of(
                    "message", "Invite link generated successfully",
                    "inviteLink", "http://localhost:5173/auth/register/join?token=mock_token"
            ));

            mockMvc.perform(post("/api/v1/org/invite")
                    .with(authAs(managerA))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"role\":\"CANDIDATE\",\"seniorityLevel\":\"Junior\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.inviteLink").isNotEmpty());
        }

        @Test
        @DisplayName("Invalid role in invitation returns 400 Bad Request")
        void invalidRole_returns400() throws Exception {
            doThrow(new InvalidInvitationException("Invalid role specified for invitation: SUPERUSER"))
                    .when(invitationService).generateInvite(any(), any());

            mockMvc.perform(post("/api/v1/org/invite")
                    .with(authAs(managerA))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"role\":\"SUPERUSER\",\"seniorityLevel\":\"Senior\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Invalid role specified for invitation: SUPERUSER"));
        }

        @Test
        @DisplayName("User without organization attempting to invite receives 403 Forbidden")
        void userWithoutOrg_invite_returns403() throws Exception {
            doThrow(new AccessDeniedException("User does not belong to a valid organization."))
                    .when(invitationService).generateInvite(any(), any());

            mockMvc.perform(post("/api/v1/org/invite")
                    .with(authAs(userWithoutOrg))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"role\":\"CANDIDATE\",\"seniorityLevel\":\"Mid\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Candidate cannot access invitation endpoint (403 Forbidden)")
        void candidate_cannotInvite_returns403() throws Exception {
            mockMvc.perform(post("/api/v1/org/invite")
                    .with(authAs(candidateA))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"role\":\"CANDIDATE\",\"seniorityLevel\":\"Mid\"}"))
                    .andExpect(status().isForbidden());
        }
    }

    // =========================================================================
    // 2. Organization Profile & Member Access Tests
    // =========================================================================
    @Nested
    @DisplayName("Organization Profile & Member Isolation Tests")
    class OrganizationProfileAndMemberTests {

        @Test
        @DisplayName("Candidate cannot access organization profile (403 Forbidden)")
        void candidate_cannotAccessOrgProfile_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/org/profile")
                    .with(authAs(candidateA)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Manager can access organization profile (200 OK)")
        void manager_canAccessOrgProfile_returns200() throws Exception {
            when(organizationService.getDetails(100L)).thenReturn(orgA);

            mockMvc.perform(get("/api/v1/org/profile")
                    .with(authAs(managerA)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("User without organization accessing profile receives 403 Forbidden")
        void userWithoutOrg_accessProfile_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/org/profile")
                    .with(authAs(userWithoutOrg)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Candidate cannot update organization profile (403 Forbidden)")
        void candidate_cannotUpdateOrgProfile_returns403() throws Exception {
            mockMvc.perform(patch("/api/v1/org/profile")
                    .with(authAs(candidateA))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"New Name\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Manager cannot update organization profile (403 Forbidden - Admin only)")
        void manager_cannotUpdateOrgProfile_returns403() throws Exception {
            mockMvc.perform(patch("/api/v1/org/profile")
                    .with(authAs(managerA))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"New Name\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Admin can update organization profile (200 OK)")
        void admin_canUpdateOrgProfile_returns200() throws Exception {
            when(organizationService.updateProfile(eq(100L), any())).thenReturn(orgA);

            mockMvc.perform(patch("/api/v1/org/profile")
                    .with(authAs(adminA))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Updated Corp\"}"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Candidate cannot list organization members (403 Forbidden)")
        void candidate_cannotListMembers_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/org/members")
                    .with(authAs(candidateA)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("User without organization listing members receives 403 Forbidden")
        void userWithoutOrg_listMembers_returns403() throws Exception {
            doThrow(new AccessDeniedException("User does not belong to a valid organization."))
                    .when(memberService).getOrganizationMembers();

            mockMvc.perform(get("/api/v1/org/members")
                    .with(authAs(userWithoutOrg)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Manager can list organization members (200 OK)")
        void manager_canListMembers_returns200() throws Exception {
            when(memberService.getOrganizationMembers()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/org/members")
                    .with(authAs(managerA)))
                    .andExpect(status().isOk());
        }
    }

    // =========================================================================
    // 3. Error Handling & Sanitization Tests
    // =========================================================================
    @Nested
    @DisplayName("Error Handling & Leak Prevention Tests")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Unhandled internal exception returns 500 without leaking technical details")
        void unhandledException_returns500WithoutLeakingDetails() throws Exception {
            doThrow(new RuntimeException("PSQLException: relation 'users' does not exist at postgres.internal"))
                    .when(organizationService).getDetails(100L);

            mockMvc.perform(get("/api/v1/org/profile")
                    .with(authAs(managerA)))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.message").value("An internal server error occurred. Please contact support."));
        }

        @Test
        @DisplayName("Unexpected IllegalArgumentException is caught by global fallback returning 500 without leakage")
        void unexpectedIllegalArgument_returns500AndDoesNotLeakMessage() throws Exception {
            doThrow(new IllegalArgumentException("Internal bug: null pointer in helper calculation"))
                    .when(organizationService).getDetails(100L);

            mockMvc.perform(get("/api/v1/org/profile")
                    .with(authAs(managerA)))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.message").value("An internal server error occurred. Please contact support."))
                    .andExpect(jsonPath("$.data").doesNotExist());
        }

        @Test
        @DisplayName("DuplicateResourceException maps to HTTP 409 Conflict with clear business message")
        void duplicateResource_returns409Conflict() throws Exception {
            doThrow(new DuplicateResourceException("Organization name 'Acme Corp' is already taken."))
                    .when(organizationService).getDetails(100L);

            mockMvc.perform(get("/api/v1/org/profile")
                    .with(authAs(managerA)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.message").value("Organization name 'Acme Corp' is already taken."));
        }

        @Test
        @DisplayName("InvalidInvitationException maps to HTTP 400 Bad Request with clear business message")
        void invalidInvitation_returns400BadRequest() throws Exception {
            doThrow(new InvalidInvitationException("Invalid or expired invitation token."))
                    .when(organizationService).getDetails(100L);

            mockMvc.perform(get("/api/v1/org/profile")
                    .with(authAs(managerA)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Invalid or expired invitation token."));
        }

        @Test
        @DisplayName("BadRequestException maps to HTTP 400 Bad Request")
        void badRequest_returns400BadRequest() throws Exception {
            doThrow(new BadRequestException("Registration failed: Provide an Organization Name to start a new company, or use an Invite Token to join one."))
                    .when(organizationService).getDetails(100L);

            mockMvc.perform(get("/api/v1/org/profile")
                    .with(authAs(managerA)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Registration failed: Provide an Organization Name to start a new company, or use an Invite Token to join one."));
        }

        @Test
        @DisplayName("ResourceNotFoundException maps to HTTP 404 Not Found")
        void resourceNotFound_returns404NotFound() throws Exception {
            doThrow(new ResourceNotFoundException("Organization", "id", 100L))
                    .when(organizationService).getDetails(100L);

            mockMvc.perform(get("/api/v1/org/profile")
                    .with(authAs(managerA)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.message").value("Organization not found with id : '100'"));
        }
    }
}

