package com.evalur.domain.user.service;

import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.user.dto.InviteRequest;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.repository.UserRepository;
import com.evalur.exceptions.InvalidInvitationException;
import com.evalur.security.jwtAuth.JwtProvider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvitationServiceTest {

    @Mock
    private JwtProvider jwtProvider;

    @Mock
    private UserRepository userRepository;

    private InvitationService invitationService;

    private Organization org;
    private User manager;
    private User admin;
    private User noOrgUser;

    @BeforeEach
    void setUp() {
        invitationService = new InvitationService(jwtProvider, userRepository);
        ReflectionTestUtils.setField(invitationService, "clientUrl", "http://localhost:5173");

        org = Organization.builder().name("Acme").build();
        org.setId(100L);

        manager = User.builder()
                .name("Manager")
                .email("manager@acme.com")
                .role(Role.MANAGER)
                .organization(org)
                .build();
        manager.setId(10L);

        admin = User.builder()
                .name("Admin")
                .email("admin@acme.com")
                .role(Role.ADMIN)
                .organization(org)
                .build();
        admin.setId(11L);

        noOrgUser = User.builder()
                .name("No Org")
                .email("noorg@acme.com")
                .role(Role.MANAGER)
                .organization(null)
                .build();
        noOrgUser.setId(99L);
    }

    @Test
    @DisplayName("Manager cannot invite ADMIN (AccessDeniedException)")
    void manager_cannotInviteAdmin_throwsAccessDenied() {
        when(userRepository.findByEmail("manager@acme.com")).thenReturn(Optional.of(manager));

        InviteRequest request = new InviteRequest(null, "ADMIN", "Senior");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
            invitationService.generateInvite(request, manager)
        );

        assertTrue(ex.getMessage().contains("Managers are not permitted to issue invitations for role: ADMIN"));
    }

    @Test
    @DisplayName("Manager cannot invite MANAGER (AccessDeniedException)")
    void manager_cannotInviteManager_throwsAccessDenied() {
        when(userRepository.findByEmail("manager@acme.com")).thenReturn(Optional.of(manager));

        InviteRequest request = new InviteRequest(null, "MANAGER", "Mid");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
            invitationService.generateInvite(request, manager)
        );

        assertTrue(ex.getMessage().contains("Managers are not permitted to issue invitations for role: MANAGER"));
    }

    @Test
    @DisplayName("Manager can invite CANDIDATE (succeeds)")
    void manager_canInviteCandidate_succeeds() {
        when(userRepository.findByEmail("manager@acme.com")).thenReturn(Optional.of(manager));
        when(jwtProvider.generateInviteToken(eq(100L), eq("Acme"), eq("CANDIDATE"), eq("Junior"), any()))
                .thenReturn("mock_token");

        InviteRequest request = new InviteRequest(null, "CANDIDATE", "Junior");

        Map<String, String> result = invitationService.generateInvite(request, manager);

        assertNotNull(result);
        assertEquals("http://localhost:5173/auth/register/join?token=mock_token", result.get("inviteLink"));
    }

    @Test
    @DisplayName("Admin can invite MANAGER (succeeds)")
    void admin_canInviteManager_succeeds() {
        when(userRepository.findByEmail("admin@acme.com")).thenReturn(Optional.of(admin));
        when(jwtProvider.generateInviteToken(eq(100L), eq("Acme"), eq("MANAGER"), eq("Senior"), any()))
                .thenReturn("admin_mock_token");

        InviteRequest request = new InviteRequest(null, "MANAGER", "Senior");

        Map<String, String> result = invitationService.generateInvite(request, admin);

        assertNotNull(result);
        assertEquals("http://localhost:5173/auth/register/join?token=admin_mock_token", result.get("inviteLink"));
    }

    @Test
    @DisplayName("Invalid role throws InvalidInvitationException")
    void invalidRole_throwsInvalidInvitation() {
        when(userRepository.findByEmail("manager@acme.com")).thenReturn(Optional.of(manager));

        InviteRequest request = new InviteRequest(null, "HACKER_ROLE", "Junior");

        InvalidInvitationException ex = assertThrows(InvalidInvitationException.class, () ->
            invitationService.generateInvite(request, manager)
        );

        assertTrue(ex.getMessage().contains("Invalid role specified for invitation: HACKER_ROLE"));
    }

    @Test
    @DisplayName("User without organization throws AccessDeniedException")
    void userWithoutOrg_throwsAccessDenied() {
        when(userRepository.findByEmail("noorg@acme.com")).thenReturn(Optional.of(noOrgUser));

        InviteRequest request = new InviteRequest(null, "CANDIDATE", "Junior");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
            invitationService.generateInvite(request, noOrgUser)
        );

        assertEquals("User does not belong to a valid organization.", ex.getMessage());
    }

    @Test
    @DisplayName("Named recipient email is passed to token generator")
    void namedRecipientEmail_passedToJwtProvider() {
        when(userRepository.findByEmail("admin@acme.com")).thenReturn(Optional.of(admin));
        when(jwtProvider.generateInviteToken(100L, "Acme", "CANDIDATE", "Junior", "alice@example.com"))
                .thenReturn("bound_token");

        InviteRequest request = new InviteRequest("alice@example.com", "CANDIDATE", "Junior");

        Map<String, String> result = invitationService.generateInvite(request, admin);

        assertNotNull(result);
        assertEquals("http://localhost:5173/auth/register/join?token=bound_token", result.get("inviteLink"));
    }
}

