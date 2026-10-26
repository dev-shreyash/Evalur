package com.evalur.security.jwtAuth;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.evalur.domain.user.entity.User;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtProvider jwtProvider;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtProvider jwtProvider, UserDetailsService userDetailsService) {
        this.jwtProvider = jwtProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        // 1. Skip filter if no Bearer token is found
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            jwt = authHeader.substring(7);
            userEmail = jwtProvider.extractUsername(jwt);

            // 2. Process authentication if user is found and not already authenticated
            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

                if (jwtProvider.isTokenValid(jwt, userDetails)) {
                    
                    // ==========================================================
                    // TENANT VALIDATION (Multi-Tenant Logic for Evalur)
                    // ==========================================================
                    Long orgIdFromToken = jwtProvider.extractOrgId(jwt);

                    if (userDetails instanceof User user) {
                        Long userActualOrgId = (user.getOrganization() != null)
                                ? user.getOrganization().getId() : null;

                        // Security Cross-Check: Prevent Token Hijacking across Orgs
                        if (orgIdFromToken != null && !orgIdFromToken.equals(userActualOrgId)) {
                            log.warn("Tenant mismatch detected for user: {}", userEmail);
                            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Tenant mismatch");
                            return; 
                        }
                    }

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()
                    );

                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (ExpiredJwtException e) {
            // THE FIX: Catch expired tokens so they don't crash the server
            log.warn("JWT expired: {}", e.getMessage());
            // We do NOT throw an exception here. We let the request continue.
            // If the endpoint is protected, Spring Security will block it automatically.
        } catch (JwtException | IllegalArgumentException e) {
            // Catch malformed or invalid signatures
            log.error("JWT validation failed: {}", e.getMessage());
        }

        // 3. Always continue the chain so the request can reach the Controller
        filterChain.doFilter(request, response);
    }
}