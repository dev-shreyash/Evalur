package com.evalur.domain.user.dto;

import com.evalur.domain.user.entity.Role;

public record UserResponse(
    Long id,
    String name,
    String email,
    Role role,
    String organizationName
) {
    public UserResponse(String name, String email, Role role, String organizationName) {
        this(null, name, email, role, organizationName);
    }
}
