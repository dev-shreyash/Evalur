package com.evalur.domain.assessment.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.evalur.domain.assessment.dto.AssessmentAssignmentRequest;
import com.evalur.domain.assessment.dto.CandidateAssessmentResponse;
import com.evalur.domain.assessment.dto.UserSubmissionDTO;
import com.evalur.domain.assessment.entity.Assessment;
import com.evalur.domain.assessment.entity.AssessmentEvaluation;
import com.evalur.domain.assessment.entity.UserAssessment;
import com.evalur.domain.assessment.repository.AssessmentEvaluationRepository;
import com.evalur.domain.assessment.repository.AssessmentRepository;
import com.evalur.domain.assessment.repository.UserAssessmentRepository;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.repository.UserRepository;
import com.evalur.exceptions.ResourceNotFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;


@Service
public class UserAssessmentService {

    private final UserAssessmentRepository userAssessmentRepository;
    private final AssessmentRepository assessmentRepository;
    private final UserRepository userRepository;
    private final AssessmentEvaluationRepository evaluationRepository;
    private final ObjectMapper objectMapper;

   
    public UserAssessmentService(
            UserAssessmentRepository userAssessmentRepository,
            AssessmentRepository assessmentRepository,
            UserRepository userRepository,
            AssessmentEvaluationRepository evaluationRepository,
            ObjectMapper objectMapper) {
        this.userAssessmentRepository = userAssessmentRepository;
        this.assessmentRepository = assessmentRepository;
        this.userRepository = userRepository;
        this.evaluationRepository = evaluationRepository;
        this.objectMapper = objectMapper;
    }

    public UserAssessmentService(
            UserAssessmentRepository userAssessmentRepository,
            AssessmentRepository assessmentRepository,
            ObjectMapper objectMapper) {
        this(userAssessmentRepository, assessmentRepository, null, null, objectMapper);
    }

    @Transactional
    public void assignToCandidates(AssessmentAssignmentRequest request, Long callerOrgId) {
        if (callerOrgId == null) {
            throw new AccessDeniedException("User does not belong to a valid organization.");
        }

        Assessment assessment = assessmentRepository.findById(request.assessmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Assessment", "id", request.assessmentId()));

        if (assessment.getOrganization() == null || !assessment.getOrganization().getId().equals(callerOrgId)) {
            throw new AccessDeniedException("Organization does not own this assessment.");
        }

        if (request.candidateIds() == null || request.candidateIds().isEmpty()) {
            return;
        }

        // Validate all target candidates belong to callerOrgId and have Role.CANDIDATE
        for (Long candidateId : request.candidateIds()) {
            User candidate = userRepository.findById(candidateId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", candidateId));

            if (candidate.getOrganization() == null || !candidate.getOrganization().getId().equals(callerOrgId)) {
                throw new AccessDeniedException("Candidate " + candidateId + " does not belong to caller's organization.");
            }

            if (candidate.getRole() != Role.CANDIDATE) {
                throw new AccessDeniedException("User " + candidateId + " is not a candidate.");
            }
        }

        // Complete request is valid - create assignments for candidates not yet assigned
        List<UserAssessment> assignments = request.candidateIds().stream()
                .filter(uid -> !userAssessmentRepository.existsByUserIdAndAssessmentId(uid, request.assessmentId()))
                .map(uid -> UserAssessment.builder()
                        .userId(uid)
                        .assessment(assessment)
                        .status(UserAssessment.AssignmentStatus.ASSIGNED)
                        .assignedAt(LocalDateTime.now())
                        .build())
                .toList();

        userAssessmentRepository.saveAll(assignments);
    }

    public List<CandidateAssessmentResponse> getCandidateDashboard(Long userId) {
        return userAssessmentRepository.findByUserIdOrderByAssignedAtDesc(userId)
                .stream()
                .map(ua -> new CandidateAssessmentResponse(
                        ua.getId(),
                        ua.getAssessment().getId(),
                        ua.getAssessment().getTitle(),
                        ua.getAssessment().getRole(),
                        ua.getAssessment().getSeniority(),
                        ua.getStatus(),
                        ua.getAssignedAt()))
                .toList();
    }

    @Transactional
    public String startAssessment(Long assignmentId, Long userId) {
        UserAssessment ua = userAssessmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("UserAssessment", "id", assignmentId));

        if (!ua.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to access this assessment assignment.");
        }

        if (ua.getStatus() == UserAssessment.AssignmentStatus.ASSIGNED) {
            ua.setStatus(UserAssessment.AssignmentStatus.IN_PROGRESS);
            ua.setStartedAt(LocalDateTime.now());
            userAssessmentRepository.save(ua);
        }

        String rawContent = ua.getAssessment().getContent();
        
        if (rawContent == null || rawContent.trim().isEmpty()) {
            return "{}";
        }

        try {
            // 1. Parse the string into a JSON tree
            JsonNode rootNode = objectMapper.readTree(rawContent);

            // 2. Strip sensitive data from MCQs
            if (rootNode.has("mcqs") && rootNode.get("mcqs").isArray()) {
                ArrayNode mcqs = (ArrayNode) rootNode.get("mcqs");
                for (JsonNode mcq : mcqs) {
                    ObjectNode mcqObj = (ObjectNode) mcq;
                    mcqObj.remove("correctOptionIndex"); // Delete answer
                    mcqObj.remove("explanation");        // Delete explanation
                }
            }

            // 3. Strip sensitive data from Coding Tasks
            if (rootNode.has("codingTasks") && rootNode.get("codingTasks").isArray()) {
                ArrayNode codingTasks = (ArrayNode) rootNode.get("codingTasks");
                for (JsonNode task : codingTasks) {
                    ObjectNode taskObj = (ObjectNode) task;
                    taskObj.remove("solutionTemplate");  // Delete solution
                }
            }

            // 4. Return the safe, sanitized JSON string
            return objectMapper.writeValueAsString(rootNode);

        } catch (Exception e) {
            throw new RuntimeException("Error securing assessment content", e);
        }
    }

    @Transactional
    public void submitAssessment(UserSubmissionDTO dto, Long currentUserId) {
        UserAssessment ua = userAssessmentRepository.findById(dto.getUserAssessmentId())
                .orElseThrow(() -> new ResourceNotFoundException("UserAssessment", "id", dto.getUserAssessmentId()));

        if (currentUserId != null && !ua.getUserId().equals(currentUserId)) {
            throw new AccessDeniedException("You do not have permission to submit this assessment.");
        }

        if (ua.getEvaluation() != null) {
            throw new RuntimeException("This assessment has already been evaluated.");
        }

        ua.setStatus(UserAssessment.AssignmentStatus.SUBMITTED);
        ua.setCompletedAt(LocalDateTime.now());

        userAssessmentRepository.save(ua);
    }

    @Transactional
    public void submitAssessment(UserSubmissionDTO dto) {
        submitAssessment(dto, null);
    }

    @Transactional(readOnly = true)
    public AssessmentEvaluation getEvaluationResult(Long assignmentId, User currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        UserAssessment ua = userAssessmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("UserAssessment", "id", assignmentId));

        if (currentUser.getRole() == Role.CANDIDATE) {
            if (!ua.getUserId().equals(currentUser.getId())) {
                throw new AccessDeniedException("You do not have permission to view another candidate's results.");
            }
        } else if (currentUser.getRole() == Role.ADMIN || currentUser.getRole() == Role.MANAGER) {
            Long userOrgId = (currentUser.getOrganization() != null) ? currentUser.getOrganization().getId() : null;
            Long assessmentOrgId = (ua.getAssessment() != null && ua.getAssessment().getOrganization() != null)
                    ? ua.getAssessment().getOrganization().getId()
                    : null;
            if (userOrgId == null || !userOrgId.equals(assessmentOrgId)) {
                throw new AccessDeniedException("Organization does not own this assessment session.");
            }
        } else {
            throw new AccessDeniedException("You do not have permission to view this result.");
        }

        return evaluationRepository.findByUserAssessmentId(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("AssessmentEvaluation", "userAssessmentId", assignmentId));
    }
}
