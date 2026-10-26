package com.evalur.domain.user.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.evalur.domain.user.dto.InviteRequest;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.service.InvitationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/org")
public class InvitationController {

    private final InvitationService invitationService;

    public InvitationController(InvitationService invitationService) {
        this.invitationService = invitationService;
    }

    @PostMapping("/invite")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, String>> generateInvite(
            @Valid @RequestBody InviteRequest request,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(invitationService.generateInvite(request, currentUser));
    }
}
