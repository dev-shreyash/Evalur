import api from "@/api/axios";

// --- 1. INTERFACES ---

export interface Cohort {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  candidateCount?: number;
}

export interface CreateCohortRequest {
  name: string;
  description?: string;
}

export interface UpdateCohortRequest {
  name: string;
  description?: string;
}

export interface AssignCohortRequest {
  cohortId?: number | null;
  userIds?: number[];
  candidateIds?: number[];
}

export interface Assessment {
  id: number;
  title: string;
  role?: string;
  seniority?: string;
  content: string; // JSON string containing MCQs and Coding Tasks
  status?: string;
  createdAt?: string;
}

export interface UserAssessment {
  id: number;
  userId: number;
  status: "ASSIGNED" | "STARTED" | "SUBMITTED";
  evaluationStatus: "PENDING" | "COMPLETED" | "FAILED";
  objectiveScore: number | null;
  logicDna: string | null;      // Stringified JSON for Radar Chart
  aiLogicFeedback: string | null;
  assessment: Assessment;      // Nested assessment details
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Candidate {
  id: number;
  name: string;
  email: string;
  userRole: string;
  seniorityLevel?: string;
  cohortId?: number | null;
  cohortName?: string | null;
  userAssessments: UserAssessment[]; // Handle multiple sessions per candidate
}

export interface AssessmentRequest {
  title: string;
  role?: string;
  seniority?: string;
  documentIds: string[];
  topics?: string[];
  assessmentFocus?: string[];
  questionTypes?: string[];
  questionCount?: number;
  jobDescription?: string;
}

export interface AssignmentRequest {
  assessmentId: number;
  candidateIds?: number[];
  cohortId?: number;
}

export interface SubmissionRequest {
  userAssessmentId: number; // Use the specific session ID
  mcqAnswers: number[];
  codingSolution: string;
}

// --- 2. SERVICE METHODS ---

const assessmentService = {
  // --- MANAGER: ASSESSMENT TEMPLATE METHODS ---
  
  getAssessments: async () => {
    const response = await api.get("/assessments");
    return response.data.data;
  },

  generateAssessment: async (payload: AssessmentRequest) => {
    const response = await api.post("/assessments/generate", payload);
    return response.data;
  },

  getCompleteAssessments: async () => {
    const response = await api.get("/assessments/get-complete-assessments");
    return response.data.data;
  },

  getDocumentTopics: async (documentIds: string[]): Promise<string[]> => {
    const response = await api.post("/assessments/topics", { documentIds });
    return response.data.data?.topics || [];
  },

  // --- MANAGER: COHORT METHODS ---

  getCohorts: async (): Promise<Cohort[]> => {
    const response = await api.get("/cohorts");
    return response.data.data || [];
  },

  getCohortById: async (id: number): Promise<Cohort> => {
    const response = await api.get(`/cohorts/${id}`);
    return response.data.data;
  },

  getCohortMembers: async (id: number): Promise<Candidate[]> => {
    const response = await api.get(`/cohorts/${id}/members`);
    return response.data.data || [];
  },

  createCohort: async (payload: CreateCohortRequest): Promise<Cohort> => {
    const response = await api.post("/cohorts", payload);
    return response.data.data;
  },

  updateCohort: async (id: number, payload: UpdateCohortRequest): Promise<Cohort> => {
    const response = await api.put(`/cohorts/${id}`, payload);
    return response.data.data;
  },

  assignCandidatesToCohort: async (payload: AssignCohortRequest): Promise<void> => {
    const candidateIds = payload.candidateIds || payload.userIds || [];
    const response = await api.post("/cohorts/assign", {
      cohortId: payload.cohortId ?? null,
      candidateIds,
      userIds: candidateIds,
    });
    return response.data;
  },

  syncCohortMembers: async (cohortId: number, candidateIds: number[]): Promise<void> => {
    const response = await api.put(`/cohorts/${cohortId}/members`, {
      candidateIds,
      userIds: candidateIds,
    });
    return response.data;
  },

  removeCandidateFromCohort: async (candidateId: number, cohortId?: number): Promise<void> => {
    if (cohortId) {
      await api.delete(`/cohorts/${cohortId}/members/${candidateId}`);
    } else {
      await api.delete(`/cohorts/members/${candidateId}`);
    }
  },

  // --- MANAGER: CANDIDATE & ASSIGNMENT METHODS ---

  /** 
   * Fetches all members with their nested userAssessments array.
   * This is the core method for your "Candidate Registry" table.
   */
  getOrgMembers: async (): Promise<Candidate[]> => {
    const response = await api.get("/org/members");
    return response.data.data || response.data;
  },

  assignAssessment: async (payload: AssignmentRequest) => {
    const response = await api.post("/user-assessments/assign", payload);
    return response.data;
  },

  // --- MANAGER: KNOWLEDGE BASE METHODS ---

  getLibraryDocuments: async () => {
    const response = await api.get("/ai/docs");
    return response.data.data;
  },

  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await api.post("/ai/docs/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // --- CANDIDATE: TEST EXECUTION METHODS ---

  /** 
   * Fetches the specific assessment content (MCQs/Tasks) for a session.
   * Used when a candidate clicks "Start Test".
   */
 

  submitAssessment: async (payload: SubmissionRequest) => {
    const response = await api.post("/user-assessments/submit", payload);
    return response.data;
  },

  // --- SHARED: RESULTS & EVALUATION ---

  /** 
   * Fetches the AI evaluation result, Logic DNA, and Objective score.
   * Matches Postman: GET /api/v1/user-assessments/{id}/result
   */
 // --- SHARED: RESULTS & EVALUATION ---
 // --- CANDIDATE: TEST EXECUTION METHODS ---
  getAssessmentSession: async (userAssessmentId: string | number) => {
    const response = await api.get(`/user-assessments/${userAssessmentId}/start`);
    
    // 1. Safely bypass the extra 'userAssessment' wrapper if it exists
    const payload = response.data?.data?.userAssessment || response.data?.data || response.data;
    if (!payload) return null;

    // 2. Parse the stringified content so the Tabs show the questions instead of 0
    if (payload.assessment && typeof payload.assessment.content === 'string') {
      try {
        payload.assessment.content = JSON.parse(payload.assessment.content);
      } catch (e) {
        console.error("Failed to parse assessment content", e);
      }
    }
    
    return payload;
  },

  // --- SHARED: RESULTS & EVALUATION ---
  getAssessmentResult: async (userAssessmentId: string | number): Promise<any> => {
    const response = await api.get(`/user-assessments/${userAssessmentId}/result`);
    
    // 1. Safely bypass the extra 'userAssessment' wrapper
    const payload = response.data?.data?.userAssessment || response.data?.data || response.data;
    if (!payload) return null;

    // 2. Flatten the nested evaluation object so the Result page can read it directly
    if (payload.evaluation) {
      payload.objectiveScore = payload.evaluation.objectiveScore;
      payload.logicDna = payload.evaluation.logicDna;
      payload.aiLogicFeedback = payload.evaluation.aiLogicFeedback;
    }

    // 3. Parse the content just in case this page needs to show the questions too
    if (payload.assessment && typeof payload.assessment.content === 'string') {
      try {
        payload.assessment.content = JSON.parse(payload.assessment.content);
      } catch (e) {
        console.error("Failed to parse assessment content", e);
      }
    }

    return payload;
  }
};

export default assessmentService;