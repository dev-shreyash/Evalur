package com.evalur.domain.user.service;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.organization.repository.OrganizationRepository;
import com.evalur.domain.user.dto.AuthResponse;
import com.evalur.domain.user.dto.RegisterRequest;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.repository.UserRepository;
import com.evalur.exceptions.BadRequestException;
import com.evalur.exceptions.DuplicateResourceException;
import com.evalur.exceptions.InvalidInvitationException;
import com.evalur.security.jwtAuth.JwtProvider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceRegistrationTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtProvider jwtProvider;

    @Mock
    private AuthenticationManager authenticationManager;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                organizationRepository,
                passwordEncoder,
                jwtProvider,
                authenticationManager
        );
    }

    @Test
    @DisplayName("Registration with duplicate email throws DuplicateResourceException")
    void register_duplicateEmail_throwsDuplicateResourceException() {
        when(userRepository.existsByEmail("existing@test.com")).thenReturn(true);

        RegisterRequest request = new RegisterRequest(
                "Existing User",
                "existing@test.com",
                "password123",
                "Junior",
                "New Org",
                null
        );

        DuplicateResourceException ex = assertThrows(DuplicateResourceException.class, () ->
            authService.register(request)
        );

        assertEquals("Email is already in use.", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Registration with duplicate org name throws DuplicateResourceException")
    void register_duplicateOrgName_throwsDuplicateResourceException() {
        when(userRepository.existsByEmail("boss@test.com")).thenReturn(false);
        when(organizationRepository.existsByName("Taken Corp")).thenReturn(true);

        RegisterRequest request = new RegisterRequest(
                "Boss User",
                "boss@test.com",
                "password123",
                "Senior",
                "Taken Corp",
                null
        );

        DuplicateResourceException ex = assertThrows(DuplicateResourceException.class, () ->
            authService.register(request)
        );

        assertEquals("Organization name 'Taken Corp' is already taken.", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Registration without org name and without invite token throws BadRequestException")
    void register_missingOrgAndToken_throwsBadRequestException() {
        when(userRepository.existsByEmail("user@test.com")).thenReturn(false);

        RegisterRequest request = new RegisterRequest(
                "No Org User",
                "user@test.com",
                "password123",
                "Junior",
                null,
                null
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
            authService.register(request)
        );

        assertTrue(ex.getMessage().contains("Provide an Organization Name to start a new company, or use an Invite Token"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Registration with expired or invalid token throws InvalidInvitationException")
    void register_invalidOrExpiredToken_throwsInvalidInvitation() {
        when(userRepository.existsByEmail("test@test.com")).thenReturn(false);
        when(jwtProvider.validateInviteToken("tampered_token")).thenReturn(false);

        RegisterRequest request = new RegisterRequest(
                "Test User",
                "test@test.com",
                "password123",
                "Junior",
                null,
                "tampered_token"
        );

        InvalidInvitationException ex = assertThrows(InvalidInvitationException.class, () ->
            authService.register(request)
        );

        assertEquals("Invalid or expired invitation token.", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Registration with mismatched recipient email throws InvalidInvitationException")
    void register_mismatchedRecipientEmail_throwsInvalidInvitation() {
        when(userRepository.existsByEmail("bob@test.com")).thenReturn(false);
        when(jwtProvider.validateInviteToken("token_for_alice")).thenReturn(true);
        when(jwtProvider.extractOrgId("token_for_alice")).thenReturn(100L);
        when(jwtProvider.extractRole("token_for_alice")).thenReturn("CANDIDATE");
        when(jwtProvider.extractSeniority("token_for_alice")).thenReturn("Junior");
        when(jwtProvider.extractInviteEmail("token_for_alice")).thenReturn("alice@test.com");

        RegisterRequest request = new RegisterRequest(
                "Bob",
                "bob@test.com",
                "password123",
                "Junior",
                null,
                "token_for_alice"
        );

        InvalidInvitationException ex = assertThrows(InvalidInvitationException.class, () ->
            authService.register(request)
        );

        assertTrue(ex.getMessage().contains("Registration email does not match invitation recipient"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Registration with valid token assigns role from token, not client")
    void register_validToken_assignsRoleFromToken() {
        Organization org = Organization.builder().name("Acme Corp").build();
        org.setId(100L);

        when(userRepository.existsByEmail("alice@test.com")).thenReturn(false);
        when(jwtProvider.validateInviteToken("valid_cand_token")).thenReturn(true);
        when(jwtProvider.extractOrgId("valid_cand_token")).thenReturn(100L);
        when(jwtProvider.extractRole("valid_cand_token")).thenReturn("CANDIDATE");
        when(jwtProvider.extractSeniority("valid_cand_token")).thenReturn("Junior");
        when(jwtProvider.extractInviteEmail("valid_cand_token")).thenReturn("alice@test.com");
        when(organizationRepository.findById(100L)).thenReturn(Optional.of(org));
        when(passwordEncoder.encode("password123")).thenReturn("encoded_pass");
        when(jwtProvider.generateToken(any())).thenReturn("auth_jwt");

        RegisterRequest request = new RegisterRequest(
                "Alice",
                "alice@test.com",
                "password123",
                "Junior",
                null,
                "valid_cand_token"
        );

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals(Role.CANDIDATE, response.role());
        verify(userRepository).save(any(User.class));
    }
}
