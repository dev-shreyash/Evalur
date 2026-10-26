package com.evalur.domain.organization.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.evalur.domain.organization.dto.MemberResponse;
import com.evalur.domain.organization.dto.CandidateAssessmentDto;
import com.evalur.domain.organization.dto.AssessmentBriefDto;
import com.evalur.domain.user.repository.UserRepository;
import com.evalur.domain.assessment.repository.UserAssessmentRepository;
import com.evalur.domain.assessment.entity.UserAssessment;
import com.evalur.security.utils.SecurityUtils;


@Service
public class MemberService {

    private final UserRepository userRepository;
    private final UserAssessmentRepository userAssessmentRepository;

    public MemberService(UserRepository userRepository, UserAssessmentRepository userAssessmentRepository) {
        this.userRepository = userRepository;
        this.userAssessmentRepository = userAssessmentRepository;
    }

    public List<MemberResponse> getOrganizationMembers() {
        Long orgId = SecurityUtils.getCurrentOrgId();
        if (orgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }

        return userRepository.findByOrganizationId(orgId).stream()
                .map(user -> {
                    List<UserAssessment> assessments = userAssessmentRepository.findByUserId(user.getId());

                    List<CandidateAssessmentDto> assessmentDtos = assessments.stream().map(ua -> {

                        // 1. Setup default evaluation values
                        String evalStatus = "PENDING";
                        Double objScore = null;
                        String logicDna = null;
                        String aiFeedback = null;

                        // 2. Override if evaluation exists
                        if (ua.getEvaluation() != null) {
                            evalStatus = ua.getEvaluation().getEvaluationStatus().name();
                            logicDna = ua.getEvaluation().getLogicDna();
                            aiFeedback = ua.getEvaluation().getAiLogicFeedback();

                            if (ua.getEvaluation().getObjectiveScore() != null) {
                                objScore = ua.getEvaluation().getObjectiveScore().doubleValue();
                            }
                        }

                        // 3. Create the Brief Record
                        AssessmentBriefDto brief = new AssessmentBriefDto(
                                ua.getAssessment().getId(),
                                ua.getAssessment().getTitle());

                        // 4. Return the fully constructed Assessment Record
                        return new CandidateAssessmentDto(
                                ua.getId(),
                                ua.getStatus().name(),
                                evalStatus,
                                objScore,
                                logicDna,
                                aiFeedback,
                                ua.getAssignedAt(),
                                ua.getStartedAt(),
                                ua.getCompletedAt(),
                                brief);
                    }).collect(Collectors.toList());

                    // 5. Return the parent Member Record
                    Long cohortId = user.getCohort() != null ? user.getCohort().getId() : null;
                    String cohortName = user.getCohort() != null ? user.getCohort().getName() : null;

                    return new MemberResponse(
                            user.getId(),
                            user.getName(),
                            user.getEmail(),
                            user.getRole(),
                            user.getSeniorityLevel(),
                            assessmentDtos,
                            cohortId,
                            cohortName);
                })
                .collect(Collectors.toList());
    }
}
