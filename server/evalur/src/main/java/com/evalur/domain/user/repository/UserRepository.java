package com.evalur.domain.user.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.evalur.domain.user.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    List<User> findByOrganizationId(Long organizationId);
    List<User> findByOrganizationIdAndCohortId(Long organizationId, Long cohortId);
    List<User> findByOrganizationIdAndCohortIsNull(Long organizationId);
    int countByCohortId(Long cohortId);
}
