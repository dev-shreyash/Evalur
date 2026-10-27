package com.evalur.domain.organization.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.evalur.domain.organization.entity.Cohort;

@Repository
public interface CohortRepository extends JpaRepository<Cohort, Long> {
    List<Cohort> findByOrganizationIdOrderByNameAsc(Long organizationId);
    Optional<Cohort> findByIdAndOrganizationId(Long id, Long organizationId);
    boolean existsByOrganizationIdAndNameIgnoreCase(Long organizationId, String name);
    boolean existsByOrganizationIdAndNameIgnoreCaseAndIdNot(Long organizationId, String name, Long id);
}

