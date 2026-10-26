package com.evalur.security;

import java.util.Collections;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.evalur.config.SecurityConfig;
import com.evalur.config.WebConfig;
import com.evalur.domain.ai.controller.AiDocumentController;
import com.evalur.domain.ai.entity.AiDocument;
import com.evalur.domain.ai.repository.AiDocumentRepository;
import com.evalur.domain.ai.service.AiDocumentService;
import com.evalur.domain.assessment.controller.AssessmentController;
import com.evalur.domain.assessment.controller.UserAssessmentController;
import com.evalur.domain.assessment.entity.Assessment;
import com.evalur.domain.assessment.entity.AssessmentEvaluation;
import com.evalur.domain.assessment.entity.UserAssessment;
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
class EndpointAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    // Infrastructure Mocks
    @MockitoBean
    private JpaMetamodelMappingContext jpaMappingContext;

    @MockitoBean
    private JwtProvider jwtProvider;

    @MockitoBean
    private UserDetailsService userDetailsService;

    // Domain Service & Repository Mocks
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

    private Organization testOrg;
    private User adminUser;
    private User managerUser;
    private User candidateUser;
    private User staffUser;

    @BeforeEach
    void setUp() {
        testOrg = Organization.builder().name("Test Org").build();
        testOrg.setId(100L);

        adminUser = User.builder()
                .name("Admin User")
                .email("admin@evalur.com")
                .password("encoded_pass")
                .role(Role.ADMIN)
                .organization(testOrg)
                .build();
        adminUser.setId(1L);

        managerUser = User.builder()
                .name("Manager User")
                .email("manager@evalur.com")
                .password("encoded_pass")
                .role(Role.MANAGER)
                .organization(testOrg)
                .build();
        managerUser.setId(2L);

        candidateUser = User.builder()
                .name("Candidate User")
                .email("candidate@evalur.com")
                .password("encoded_pass")
                .role(Role.CANDIDATE)
                .organization(testOrg)
                .build();
        candidateUser.setId(3L);

        staffUser = User.builder()
                .name("Staff User")
                .email("staff@evalur.com")
                .password("encoded_pass")
                .role(Role.STAFF)
                .organization(testOrg)
                .build();
        staffUser.setId(4L);
    }

    private static RequestPostProcessor authAs(User user) {
        return SecurityMockMvcRequestPostProcessors.authentication(
                new UsernamePasswordAuthenticationToken(user, "password", user.getAuthorities())
        );
    }

    // =========================================================================
    // 1. Assessment Management (/api/v1/assessments/**)
    // =========================================================================
    @Nested
    @DisplayName("Assessment Management Endpoints")
    class AssessmentManagementTests {

        @Test
        @DisplayName("POST /generate - Unauthenticated returns 401")
        void generate_unauthenticated_returns401() throws Exception {
            mockMvc.perform(post("/api/v1/assessments/generate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"Java Lead\",\"role\":\"Backend\",\"seniority\":\"Senior\"}"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("POST /generate - Candidate returns 403 Forbidden")
        void generate_candidate_returns403() throws Exception {
            mockMvc.perform(post("/api/v1/assessments/generate")
                    .with(authAs(candidateUser))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"Java Lead\",\"role\":\"Backend\",\"seniority\":\"Senior\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("POST /generate - Manager is permitted (202 Accepted)")
        void generate_manager_isPermitted() throws Exception {
            when(assessmentRepository.save(any())).thenAnswer(inv -> {
                Assessment a = inv.getArgument(0);
                a.setId(10L);
                return a;
            });

            mockMvc.perform(post("/api/v1/assessments/generate")
                    .with(authAs(managerUser))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"Java Lead\",\"role\":\"Backend\",\"seniority\":\"Senior\"}"))
                    .andExpect(status().isAccepted());
        }

        @Test
        @DisplayName("POST /generate - Admin is permitted via Role Hierarchy (202 Accepted)")
        void generate_admin_isPermittedViaHierarchy() throws Exception {
            when(assessmentRepository.save(any())).thenAnswer(inv -> {
                Assessment a = inv.getArgument(0);
                a.setId(11L);
                return a;
            });

            mockMvc.perform(post("/api/v1/assessments/generate")
                    .with(authAs(adminUser))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"Java Lead\",\"role\":\"Backend\",\"seniority\":\"Senior\"}"))
                    .andExpect(status().isAccepted());
        }

        @Test
        @DisplayName("GET /get-complete-assessments - Candidate returns 403 Forbidden")
        void getCompleteAssessments_candidate_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/assessments/get-complete-assessments")
                    .with(authAs(candidateUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET /get-complete-assessments - Manager is permitted")
        void getCompleteAssessments_manager_isPermitted() throws Exception {
            when(assessmentRepository.findByOrganizationIdOrderByCreatedAtDesc(any()))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/assessments/get-complete-assessments")
                    .with(authAs(managerUser)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET /get-complete-assessments - Admin is permitted via hierarchy")
        void getCompleteAssessments_admin_isPermittedViaHierarchy() throws Exception {
            when(assessmentRepository.findByOrganizationIdOrderByCreatedAtDesc(any()))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/assessments/get-complete-assessments")
                    .with(authAs(adminUser)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET / - Candidate returns 403 Forbidden")
        void listAssessments_candidate_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/assessments")
                    .with(authAs(candidateUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET / - Manager is permitted")
        void listAssessments_manager_isPermitted() throws Exception {
            when(assessmentRepository.findByOrganizationIdOrderByCreatedAtDesc(any()))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/assessments")
                    .with(authAs(managerUser)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET / - Admin is permitted via hierarchy")
        void listAssessments_admin_isPermittedViaHierarchy() throws Exception {
            when(assessmentRepository.findByOrganizationIdOrderByCreatedAtDesc(any()))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/assessments")
                    .with(authAs(adminUser)))
                    .andExpect(status().isOk());
        }
    }

    // =========================================================================
    // 2. Document Management (/api/v1/ai/docs/**)
    // =========================================================================
    @Nested
    @DisplayName("Document Management Endpoints")
    class DocumentManagementTests {

        private MockMultipartFile sampleFile() {
            return new MockMultipartFile(
                    "file",
                    "syllabus.pdf",
                    "application/pdf",
                    "dummy syllabus content".getBytes()
            );
        }

        @Test
        @DisplayName("POST /upload - Unauthenticated returns 401")
        void upload_unauthenticated_returns401() throws Exception {
            mockMvc.perform(multipart("/api/v1/ai/docs/upload").file(sampleFile()))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("POST /upload - Candidate returns 403 Forbidden")
        void upload_candidate_returns403() throws Exception {
            mockMvc.perform(multipart("/api/v1/ai/docs/upload")
                    .file(sampleFile())
                    .with(authAs(candidateUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("POST /upload - Manager is permitted (202 Accepted)")
        void upload_manager_isPermitted() throws Exception {
            when(aiDocumentRepository.save(any())).thenAnswer(inv -> {
                AiDocument doc = inv.getArgument(0);
                doc.setId(20L);
                return doc;
            });

            mockMvc.perform(multipart("/api/v1/ai/docs/upload")
                    .file(sampleFile())
                    .with(authAs(managerUser)))
                    .andExpect(status().isAccepted());
        }

        @Test
        @DisplayName("POST /upload - Admin is permitted via hierarchy (202 Accepted)")
        void upload_admin_isPermittedViaHierarchy() throws Exception {
            when(aiDocumentRepository.save(any())).thenAnswer(inv -> {
                AiDocument doc = inv.getArgument(0);
                doc.setId(21L);
                return doc;
            });

            mockMvc.perform(multipart("/api/v1/ai/docs/upload")
                    .file(sampleFile())
                    .with(authAs(adminUser)))
                    .andExpect(status().isAccepted());
        }

        @Test
        @DisplayName("GET / - Candidate returns 403 Forbidden")
        void listDocs_candidate_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/ai/docs")
                    .with(authAs(candidateUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET / - Manager is permitted")
        void listDocs_manager_isPermitted() throws Exception {
            when(aiDocumentRepository.findByOrganizationIdOrderByCreatedAtDesc(any()))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/ai/docs")
                    .with(authAs(managerUser)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET / - Admin is permitted via hierarchy")
        void listDocs_admin_isPermittedViaHierarchy() throws Exception {
            when(aiDocumentRepository.findByOrganizationIdOrderByCreatedAtDesc(any()))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/ai/docs")
                    .with(authAs(adminUser)))
                    .andExpect(status().isOk());
        }
    }

    // =========================================================================
    // 3. Candidate Assessment Operations (/api/v1/user-assessments/**)
    // =========================================================================
    @Nested
    @DisplayName("Candidate Assessment Operations")
    class CandidateAssessmentOperationTests {

        @Test
        @DisplayName("POST /assign - Unauthenticated returns 401")
        void assign_unauthenticated_returns401() throws Exception {
            mockMvc.perform(post("/api/v1/user-assessments/assign")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"assessmentId\":1,\"candidateIds\":[3]}"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("POST /assign - Candidate cannot assign (403 Forbidden)")
        void assign_candidate_returns403() throws Exception {
            mockMvc.perform(post("/api/v1/user-assessments/assign")
                    .with(authAs(candidateUser))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"assessmentId\":1,\"candidateIds\":[3]}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("POST /assign - Manager is permitted")
        void assign_manager_isPermitted() throws Exception {
            mockMvc.perform(post("/api/v1/user-assessments/assign")
                    .with(authAs(managerUser))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"assessmentId\":1,\"candidateIds\":[3]}"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("POST /assign - Admin is permitted via hierarchy")
        void assign_admin_isPermittedViaHierarchy() throws Exception {
            mockMvc.perform(post("/api/v1/user-assessments/assign")
                    .with(authAs(adminUser))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"assessmentId\":1,\"candidateIds\":[3]}"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET /my-tasks - Unauthenticated returns 401")
        void myTasks_unauthenticated_returns401() throws Exception {
            mockMvc.perform(get("/api/v1/user-assessments/my-tasks"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /my-tasks - Manager receives 403 (does not inherit CANDIDATE)")
        void myTasks_manager_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/user-assessments/my-tasks")
                    .with(authAs(managerUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET /my-tasks - Admin receives 403 (does not inherit CANDIDATE)")
        void myTasks_admin_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/user-assessments/my-tasks")
                    .with(authAs(adminUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET /my-tasks - Candidate is permitted")
        void myTasks_candidate_isPermitted() throws Exception {
            when(userAssessmentService.getCandidateDashboard(candidateUser.getId()))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/user-assessments/my-tasks")
                    .with(authAs(candidateUser)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET /{id}/start - Manager receives 403")
        void start_manager_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/user-assessments/50/start")
                    .with(authAs(managerUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET /{id}/start - Admin receives 403")
        void start_admin_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/user-assessments/50/start")
                    .with(authAs(adminUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET /{id}/start - Candidate is permitted")
        void start_candidate_isPermitted() throws Exception {
            when(userAssessmentService.startAssessment(50L, candidateUser.getId()))
                    .thenReturn("{\"questions\":[]}");

            mockMvc.perform(get("/api/v1/user-assessments/50/start")
                    .with(authAs(candidateUser)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("POST /submit - Manager receives 403")
        void submit_manager_returns403() throws Exception {
            mockMvc.perform(post("/api/v1/user-assessments/submit")
                    .with(authAs(managerUser))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"userAssessmentId\":50,\"mcqAnswers\":[],\"codeAnswers\":[]}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("POST /submit - Admin receives 403")
        void submit_admin_returns403() throws Exception {
            mockMvc.perform(post("/api/v1/user-assessments/submit")
                    .with(authAs(adminUser))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"userAssessmentId\":50,\"mcqAnswers\":[],\"codeAnswers\":[]}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("POST /submit - Candidate is permitted")
        void submit_candidate_isPermitted() throws Exception {
            UserAssessment mockUa = UserAssessment.builder().build();
            mockUa.setId(50L);
            when(userAssessmentRepository.findById(50L)).thenReturn(Optional.of(mockUa));

            mockMvc.perform(post("/api/v1/user-assessments/submit")
                    .with(authAs(candidateUser))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"userAssessmentId\":50,\"mcqAnswers\":[],\"codeAnswers\":[]}"))
                    .andExpect(status().isOk());
        }
    }

    // =========================================================================
    // 4. Results & PDF Reports (/api/v1/user-assessments/**)
    // =========================================================================
    @Nested
    @DisplayName("Results and Report Endpoints")
    class ResultsAndReportTests {

        @Test
        @DisplayName("GET /{id}/result - Unauthenticated returns 401")
        void result_unauthenticated_returns401() throws Exception {
            mockMvc.perform(get("/api/v1/user-assessments/50/result"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /{id}/result - Staff returns 403 Forbidden")
        void result_staff_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/user-assessments/50/result")
                    .with(authAs(staffUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET /{id}/result - Candidate is permitted")
        void result_candidate_isPermitted() throws Exception {
            AssessmentEvaluation eval = AssessmentEvaluation.builder().build();
            eval.setId(101L);
            when(evaluationRepository.findByUserAssessmentId(50L)).thenReturn(Optional.of(eval));

            mockMvc.perform(get("/api/v1/user-assessments/50/result")
                    .with(authAs(candidateUser)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET /{id}/result - Manager is permitted")
        void result_manager_isPermitted() throws Exception {
            AssessmentEvaluation eval = AssessmentEvaluation.builder().build();
            eval.setId(101L);
            when(evaluationRepository.findByUserAssessmentId(50L)).thenReturn(Optional.of(eval));

            mockMvc.perform(get("/api/v1/user-assessments/50/result")
                    .with(authAs(managerUser)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET /{id}/result - Admin is permitted via hierarchy")
        void result_admin_isPermittedViaHierarchy() throws Exception {
            AssessmentEvaluation eval = AssessmentEvaluation.builder().build();
            eval.setId(101L);
            when(evaluationRepository.findByUserAssessmentId(50L)).thenReturn(Optional.of(eval));

            mockMvc.perform(get("/api/v1/user-assessments/50/result")
                    .with(authAs(adminUser)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET /evaluation/{id}/report - Unauthenticated returns 401")
        void report_unauthenticated_returns401() throws Exception {
            mockMvc.perform(get("/api/v1/user-assessments/evaluation/101/report"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /evaluation/{id}/report - Candidate returns 403 Forbidden")
        void report_candidate_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/user-assessments/evaluation/101/report")
                    .with(authAs(candidateUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET /evaluation/{id}/report - Staff returns 403 Forbidden")
        void report_staff_returns403() throws Exception {
            mockMvc.perform(get("/api/v1/user-assessments/evaluation/101/report")
                    .with(authAs(staffUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("GET /evaluation/{id}/report - Manager is permitted (200 OK + PDF)")
        void report_manager_isPermitted() throws Exception {
            when(reportService.generateAssessmentPdf(101L)).thenReturn(new byte[]{1, 2, 3});

            mockMvc.perform(get("/api/v1/user-assessments/evaluation/101/report")
                    .with(authAs(managerUser)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("GET /evaluation/{id}/report - Admin is permitted via hierarchy")
        void report_admin_isPermittedViaHierarchy() throws Exception {
            when(reportService.generateAssessmentPdf(101L)).thenReturn(new byte[]{1, 2, 3});

            mockMvc.perform(get("/api/v1/user-assessments/evaluation/101/report")
                    .with(authAs(adminUser)))
                    .andExpect(status().isOk());
        }
    }
}

