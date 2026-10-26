package com.evalur.domain.user.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; 

import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.organization.repository.OrganizationRepository;
import com.evalur.domain.user.dto.AuthResponse;
import com.evalur.domain.user.dto.LoginRequest;
import com.evalur.domain.user.dto.RegisterRequest;
import com.evalur.domain.user.dto.UserResponse;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.repository.UserRepository;
import com.evalur.exceptions.BadRequestException;
import com.evalur.exceptions.DuplicateResourceException;
import com.evalur.exceptions.InvalidInvitationException;
import com.evalur.security.jwtAuth.JwtProvider;


@Service
public class AuthService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final AuthenticationManager authenticationManager;

    public AuthService(
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            PasswordEncoder passwordEncoder,
            JwtProvider jwtProvider,
            AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email is already in use.");
        }

        Organization organization;
        Role assignedRole;
        String assignedSeniority; 

        // ====================================================================
        // PATH 1 (PRIORITY): Joining via Invite Token
        // ====================================================================
        if (request.inviteToken() != null && !request.inviteToken().isBlank()) {
            if (!jwtProvider.validateInviteToken(request.inviteToken())) {
                throw new InvalidInvitationException("Invalid or expired invitation token.");
            }

            Long orgId = jwtProvider.extractOrgId(request.inviteToken());
            if (orgId == null) {
                throw new InvalidInvitationException("Invalid invitation token: Missing organization.");
            }

            String roleString = jwtProvider.extractRole(request.inviteToken());
            if (roleString == null || roleString.isBlank()) {
                throw new InvalidInvitationException("Invalid invitation token: Missing role.");
            }

            String seniorityFromToken = jwtProvider.extractSeniority(request.inviteToken());

            String tokenEmail = jwtProvider.extractInviteEmail(request.inviteToken());
            if (tokenEmail != null && !tokenEmail.isBlank()) {
                if (!tokenEmail.equalsIgnoreCase(request.email().trim())) {
                    throw new InvalidInvitationException("Registration email does not match invitation recipient.");
                }
            }

            organization = organizationRepository.findById(orgId)
                    .orElseThrow(() -> new InvalidInvitationException("Invalid invitation link: Organization not found."));
            
            try {
                assignedRole = Role.valueOf(roleString.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new InvalidInvitationException("Invalid role in invitation token: " + roleString);
            }
            assignedSeniority = seniorityFromToken; // Force seniority from the secure token
        } 
        // ====================================================================
        // PATH 2: Creating a new Organization (The "Boss" path)
        // ====================================================================
        else if (request.organizationName() != null && !request.organizationName().isBlank()) {
            if (organizationRepository.existsByName(request.organizationName())) {
                throw new DuplicateResourceException("Organization name '" + request.organizationName() + "' is already taken.");
            }
            
            organization = new Organization();
            organization.setName(request.organizationName());
            organization = organizationRepository.save(organization);
            
            assignedRole = Role.ADMIN;
            assignedSeniority = request.seniorityLevel(); // Boss sets their own seniority
        } 
        else {
            throw new BadRequestException("Registration failed: Provide an Organization Name to start a new company, or use an Invite Token to join one.");
        }

        // ====================================================================
        // CREATE THE USER
        // ====================================================================
        User user = User.builder()
                .name(request.name())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(assignedRole) 
                .organization(organization) 
                .seniorityLevel(assignedSeniority) 
                .build();

        userRepository.save(user);
        String jwtToken = jwtProvider.generateToken(user);

        return new AuthResponse(jwtToken, user.getEmail(), user.getRole(), "Registration successful");
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));

        String jwtToken = jwtProvider.generateToken(user);

        return new AuthResponse(jwtToken, user.getEmail(), user.getRole(), "Login successful");
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUserProfile(User currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("User not authenticated.");
        }

        User user = userRepository.findByEmail(currentUser.getEmail())
                .orElseThrow(() -> new AccessDeniedException("User not found"));

        String orgName = (user.getOrganization() != null) ? user.getOrganization().getName() : null;

        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                orgName
        );
    }
}
