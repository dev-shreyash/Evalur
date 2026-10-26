package com.evalur.domain.organization.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.evalur.domain.organization.dto.MemberResponse;
import com.evalur.domain.organization.service.MemberService;


@RestController
@RequestMapping("/org") 
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    /**
     * GET /api/v1/org/members
     * Fetches all members for the current organization based on JWT context.
     */
    @GetMapping("/members")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<MemberResponse>> getMembers() {
        return ResponseEntity.ok(memberService.getOrganizationMembers());
    }
}