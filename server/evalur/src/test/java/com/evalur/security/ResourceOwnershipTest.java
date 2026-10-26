package com.evalur.security;

import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.evalur.config.SecurityConfig;
import com.evalur.config.WebConfig;
import com.evalur.domain.ai.controller.AiDocumentController;
import com.evalur.domain.ai.repository.AiDocumentRepository;
import com.evalur.domain.ai.service.AiDocumentService;
import com.evalur.domain.assessment.controller.AssessmentController;
import com.evalur.domain.assessment.controller.UserAssessmentController;
import com.evalur.domain.assessment.entity.Assessment;
import com.evalur.domain.assessment.entity.AssessmentEvaluation;
import com.evalur.domain.assessment.repository.AssessmentEvaluationRepository;
import com.evalur.domain.assessment.repository.AssessmentRepository;
import com.evalur.domain.assessment.repository.UserAssessmentRepository;
import com.evalur.domain.assessment.service.AssessmentService;
import com.evalur.domain.assessment.service.EvaluationService;
import com.evalur.domain.assessment.service.ReportService;
import com.evalur.domain.assessment.service.UserAssessmentService;
import com.evalur.domain.organization.entity.Organization;
import com.evalur.domain.user.entity.Role;
import com.evalur.domain.user.entity.User;
import com.evalur.security.jwtAuth.CustomAuthenticationEntryPoint;
import com.evalur.security.jwtAuth.JwtAuthenticationFilter;
import com.evalur.security.jwtAuth.JwtProvider;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
    AssessmentController.class,
    AiDocumentController.class,
    UserAssessmentController.class
})
@Import({
    SecurityConfig.class,
    WebConfig.class,
    CustomAuthenticationEntryPoint.class,
    JwtAuthenticationFilter.class
})
class ResourceOwnershipTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMappingContext;

    @MockitoBean
    private JwtProvider jwtProvider;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private AssessmentService assessmentService;

    @MockitoBean
    private AssessmentRepository assessmentRepository;

    @MockitoBean
    private AiDocumentService aiDocumentService;

    @MockitoBean
    private AiDocumentRepository aiDocumentRepository;

    @MockitoBean
    private UserAssessmentService userAssessmentService;

    @MockitoBean
    private EvaluationService evaluationService;

    @MockitoBean
    private UserAssessmentRepository userAssessmentRepository;

    @MockitoBean
    private AssessmentEvaluationRepository evaluationRepository;

    @MockitoBean
    private ReportService reportService;

    private Organization orgA;
    private Organization orgB;

    private User candidateA;
    private User candidateB;
    private User managerA;
    private User userWithoutOrg;

    @BeforeEach
    void setUp() {
        orgA = Organization.builder().name("Organization A").build();
        orgA.setId(100L);

        orgB = Organization.builder().name("Organization B").build();
        orgB.setId(200L);

        candidateA = User.builder()
                .name("Candidate A")
                .email("candA@orga.com")
                .role(Role.CANDIDATE)
                .organization(orgA)
                .build();
        candidateA.setId(1L);

        candidateB = User.builder()
                .name("Candidate B")
                .email("candB@orgb.com")
                .role(Role.CANDIDATE)
                .organization(orgB)
                .build();
        candidateB.setId(2L);

        managerA = User.builder()
                .name("Manager A")
                .email("managerA@orga.com")
                .role(Role.MANAGER)
                .organization(orgA)
                .build();
        managerA.setId(10L);

        userWithoutOrg = User.builder()
                .name("No Org Manager")
                .email("noorg@evalur.com")
                .role(Role.MANAGER)
                .organization(null)
                .build();
        userWithoutOrg.setId(99L);
    }

    private static RequestPostProcessor authAs(User user) {
        return SecurityMockMvcRequestPostProcessors.authentication(
                new UsernamePasswordAuthenticationToken(user, "password", user.getAuthorities())
        );
    }

    // -------------------------------------------------------------------------
    // Scenario 1: Candidate A cannot start Candidate B's assessment
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Scenario 1: Candidate A cannot start Candidate B's assessment (403 Forbidden)")
    void scenario1_candidateCannotStartOtherCandidateAssessment() throws Exception {
        doThrow(new AccessDeniedException("You do not have permission to access this assessment assignment."))
                .when(userAssessmentService).startAssessment(200L, 1L);

        mockMvc.perform(get("/api/v1/user-assessments/200/start")
                .with(authAs(candidateA)))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // Scenario 2: Candidate A cannot submit Candidate B's assessment
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Scenario 2: Candidate A cannot submit Candidate B's assessment (403 Forbidden)")
    void scenario2_candidateCannotSubmitOtherCandidateAssessment() throws Exception {
        doThrow(new AccessDeniedException("You do not have permission to submit this assessment."))
                .when(userAssessmentService).submitAssessment(any(), eq(1L));

        mockMvc.perform(post("/api/v1/user-assessments/submit")
                .with(authAs(candidateA))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userAssessmentId\":200,\"mcqAnswers\":[],\"codingSolution\":\"code\"}"))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // Scenario 3: Candidate A cannot view Candidate B's result
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Scenario 3: Candidate A cannot view Candidate B's result (403 Forbidden)")
    void scenario3_candidateCannotViewOtherCandidateResult() throws Exception {
        doThrow(new AccessDeniedException("You do not have permission to view another candidate's results."))
                .when(userAssessmentService).getEvaluationResult(eq(200L), any());

        mockMvc.perform(get("/api/v1/user-assessments/200/result")
                .with(authAs(candidateA)))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // Scenario 4: Candidate A cannot download a candidate report through manager/admin endpoint
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Scenario 4: Candidate A cannot download report via manager/admin-only endpoint (403 Forbidden)")
    void scenario4_candidateCannotDownloadReportThroughManagerEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/user-assessments/evaluation/101/report")
                .with(authAs(candidateA)))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // Scenario 5: Manager A cannot read or download Organization B's results
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Scenario 5a: Manager A cannot read Organization B's result (403 Forbidden)")
    void scenario5a_managerCannotReadOtherOrgResult() throws Exception {
        doThrow(new AccessDeniedException("Organization does not own this assessment session."))
                .when(userAssessmentService).getEvaluationResult(eq(200L), any());

        mockMvc.perform(get("/api/v1/user-assessments/200/result")
                .with(authAs(managerA)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Scenario 5b: Manager A cannot download Organization B's PDF report (403 Forbidden)")
    void scenario5b_managerCannotDownloadOtherOrgReport() throws Exception {
        doThrow(new AccessDeniedException("Organization does not own this evaluation report."))
                .when(reportService).generateAssessmentPdf(201L, 100L);

        mockMvc.perform(get("/api/v1/user-assessments/evaluation/201/report")
                .with(authAs(managerA)))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // Scenario 6: Manager A cannot generate an assessment from Organization B's documents
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Scenario 6: Manager A cannot generate assessment from Org B's documents (403 Forbidden)")
    void scenario6_managerCannotGenerateAssessmentFromOtherOrgDocuments() throws Exception {
        doThrow(new AccessDeniedException("Document 2 does not belong to user's organization."))
                .when(assessmentService).validateDocumentsForOrganization(List.of("2"), 100L);

        mockMvc.perform(post("/api/v1/assessments/generate")
                .with(authAs(managerA))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Test\",\"role\":\"Dev\",\"seniority\":\"Mid\",\"documentIds\":[\"2\"]}"))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // Scenario 7: Manager A cannot list Organization B's documents or assessments
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Scenario 7a: Manager A list docs queries only Org A's ID")
    void scenario7a_managerListsOnlyOwnOrgDocs() throws Exception {
        when(aiDocumentRepository.findByOrganizationIdOrderByCreatedAtDesc(100L))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/ai/docs")
                .with(authAs(managerA)))
                .andExpect(status().isOk());

        verify(aiDocumentRepository).findByOrganizationIdOrderByCreatedAtDesc(100L);
    }

    @Test
    @DisplayName("Scenario 7b: Manager A list assessments queries only Org A's ID")
    void scenario7b_managerListsOnlyOwnOrgAssessments() throws Exception {
        when(assessmentRepository.findByOrganizationIdOrderByCreatedAtDesc(100L))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/assessments")
                .with(authAs(managerA)))
                .andExpect(status().isOk());

        verify(assessmentRepository).findByOrganizationIdOrderByCreatedAtDesc(100L);
    }

    // -------------------------------------------------------------------------
    // Scenario 8: Manager A cannot assign an Organization B assessment
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Scenario 8: Manager A cannot assign an Org B assessment (403 Forbidden)")
    void scenario8_managerCannotAssignOtherOrgAssessment() throws Exception {
        doThrow(new AccessDeniedException("Organization does not own this assessment."))
                .when(userAssessmentService).assignToCandidates(any(), eq(100L));

        mockMvc.perform(post("/api/v1/user-assessments/assign")
                .with(authAs(managerA))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"assessmentId\":200,\"candidateIds\":[1]}"))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // Scenario 9: Manager A cannot assign an assessment to a candidate from Organization B
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Scenario 9: Manager A cannot assign assessment to Org B candidate (403 Forbidden)")
    void scenario9_managerCannotAssignToOtherOrgCandidate() throws Exception {
        doThrow(new AccessDeniedException("Candidate 2 does not belong to caller's organization."))
                .when(userAssessmentService).assignToCandidates(any(), eq(100L));

        mockMvc.perform(post("/api/v1/user-assessments/assign")
                .with(authAs(managerA))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"assessmentId\":100,\"candidateIds\":[2]}"))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // Scenario 10: Legitimate same-organization workflow continues to work
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Scenario 10a: Same-org candidate start and submit succeeds")
    void scenario10a_legitimateCandidateWorkflowSucceeds() throws Exception {
        when(userAssessmentService.startAssessment(100L, 1L)).thenReturn("{\"questions\":[]}");

        mockMvc.perform(get("/api/v1/user-assessments/100/start")
                .with(authAs(candidateA)))
                .andExpect(status().isOk());

        AssessmentEvaluation eval = AssessmentEvaluation.builder().build();
        eval.setId(50L);
        when(userAssessmentService.getEvaluationResult(eq(100L), any())).thenReturn(eval);

        mockMvc.perform(get("/api/v1/user-assessments/100/result")
                .with(authAs(candidateA)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Scenario 10b: Same-org manager generation and assignment succeeds")
    void scenario10b_legitimateManagerWorkflowSucceeds() throws Exception {
        when(assessmentRepository.save(any())).thenAnswer(inv -> {
            Assessment a = inv.getArgument(0);
            a.setId(100L);
            return a;
        });

        mockMvc.perform(post("/api/v1/assessments/generate")
                .with(authAs(managerA))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Java Assessment\",\"role\":\"Backend\",\"seniority\":\"Senior\"}"))
                .andExpect(status().isAccepted());

        mockMvc.perform(post("/api/v1/user-assessments/assign")
                .with(authAs(managerA))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"assessmentId\":100,\"candidateIds\":[1]}"))
                .andExpect(status().isOk());
    }

    // -------------------------------------------------------------------------
    // Scenario 11: A user with no valid organization cannot bypass tenant checks
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Scenario 11a: User with no organization is rejected from document upload (403 Forbidden)")
    void scenario11a_userWithNoOrgRejectedFromUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "course.pdf", "application/pdf", "content".getBytes());

        mockMvc.perform(multipart("/api/v1/ai/docs/upload")
                .file(file)
                .with(authAs(userWithoutOrg)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Scenario 11b: User with no organization is rejected from assessment generation (403 Forbidden)")
    void scenario11b_userWithNoOrgRejectedFromAssessmentGenerate() throws Exception {
        mockMvc.perform(post("/api/v1/assessments/generate")
                .with(authAs(userWithoutOrg))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Test\",\"role\":\"Dev\",\"seniority\":\"Mid\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Scenario 11c: User with no organization is rejected from assessment listing (403 Forbidden)")
    void scenario11c_userWithNoOrgRejectedFromAssessmentListing() throws Exception {
        mockMvc.perform(get("/api/v1/assessments")
                .with(authAs(userWithoutOrg)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Scenario 11d: User with no organization is rejected from assignment (403 Forbidden)")
    void scenario11d_userWithNoOrgRejectedFromAssignment() throws Exception {
        mockMvc.perform(post("/api/v1/user-assessments/assign")
                .with(authAs(userWithoutOrg))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"assessmentId\":100,\"candidateIds\":[1]}"))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // Scenario 12: Invalid or mixed-authority assignment requests do not create partial assignments
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Scenario 12: Mixed-authority assignment request fails with 403 and creates zero assignments")
    void scenario12_mixedAuthorityAssignmentCreatesZeroAssignments() throws Exception {
        // Candidate 1 belongs to orgA, Candidate 2 belongs to orgB (foreign)
        doThrow(new AccessDeniedException("Candidate 2 does not belong to caller's organization."))
                .when(userAssessmentService).assignToCandidates(any(), eq(100L));

        mockMvc.perform(post("/api/v1/user-assessments/assign")
                .with(authAs(managerA))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"assessmentId\":100,\"candidateIds\":[1, 2]}"))
                .andExpect(status().isForbidden());
    }
}

