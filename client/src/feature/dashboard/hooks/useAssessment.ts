import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import assessmentService from "../api/assessmentApi"; // Ensure this path correctly points to your API file
import { toast } from "sonner";
import type { 
  AssessmentRequest, 
  AssignmentRequest,
  SubmissionRequest,
  CreateCohortRequest,
  UpdateCohortRequest,
  AssignCohortRequest
} from "@/feature/dashboard/api/assessmentApi"; 

import { candidateApi } from "../api/candidateApi";
/** 
 * QUERIES (Data Syncing)
 */

// 1. Fetch all assessments for the organization
export const useAssessments = () => {
  return useQuery({
    queryKey: ["assessments"],
    queryFn: assessmentService.getAssessments, // Hits /assessments
  });
};

// 2. Fetch knowledge library (uploaded PDFs) for the selection dropdown
export const useLibraryDocuments = () => {
  return useQuery({
    queryKey: ["docs"],
    queryFn: assessmentService.getLibraryDocuments, // Hits /ai/docs
  });
};

// 3. Fetch all members and filter specifically for CANDIDATEs
export const useCandidates = () => {
  return useQuery({
    queryKey: ["candidates"],
    queryFn: async () => {
      const members = await assessmentService.getOrgMembers();
      
      // Ensure we have an array before filtering
      const memberArray = Array.isArray(members) ? members : [];
      return memberArray.filter((m: any) => m.role === "CANDIDATE");
    },
  });
};

// 4. Fetch a specific assessment's full details (Questions/Structure)
export const useAssessment = (id: string | number) => {
  return useQuery({
    queryKey: ["assessment", id],
    //  FIX: Changed from getAssessment to getAssessmentSession to match API file
    queryFn: () => assessmentService.getAssessmentSession(id), 
    enabled: !!id, 
  });
};

// 5. Fetch result/score for a completed assessment
export const useAssessmentResult = (id: string | number) => {
  return useQuery({
    queryKey: ["assessment-result", id],
    queryFn: () => assessmentService.getAssessmentResult(id),
    enabled: !!id,
  });
};

export const useCompleteAssessment = (id: string) => {
  return useQuery({
    queryKey: ["complete-assessment", id],
    queryFn: async () => {
      const allComplete = await assessmentService.getCompleteAssessments();
      const found = allComplete.find((a: any) => a.id.toString() === id);
      if (found && typeof found.content === "string") {
        found.content = JSON.parse(found.content);
      }
      return found;
    },
    enabled: !!id,
  });
};

// Fetch topics from selected documents for assessment generation
export const useDocumentTopics = (documentIds: string[]) => {
  return useQuery({
    queryKey: ["doc-topics", documentIds],
    queryFn: () => assessmentService.getDocumentTopics(documentIds),
    enabled: documentIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch cohorts for the organization
export const useCohorts = () => {
  return useQuery({
    queryKey: ["cohorts"],
    queryFn: assessmentService.getCohorts,
  });
};

export const useCohortDetails = (id: number | null) => {
  return useQuery({
    queryKey: ["cohort", id],
    queryFn: () => assessmentService.getCohortById(id!),
    enabled: !!id,
  });
};

export const useCohortMembers = (id: number | null) => {
  return useQuery({
    queryKey: ["cohort-members", id],
    queryFn: () => assessmentService.getCohortMembers(id!),
    enabled: !!id,
  });
};

/** 
 * MUTATIONS (Actions)
 */

// 6. Trigger the AI Assessment Generation Pipeline
export const useGenerateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssessmentRequest) => assessmentService.generateAssessment(payload),
    onSuccess: () => {
      toast.success("AI Generation pipeline started!");
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: () => {
      toast.error("Failed to start generation. Please try again.");
    },
  });
};

// 7. Assign Assessment to Candidate (Numeric IDs)
export const useAssignAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssignmentRequest) => assessmentService.assignAssessment(payload),
    onSuccess: () => {
      toast.success("Assessment assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["candidates"] }); //  Refetch candidates to show new badges
    },
    onError: () => {
      toast.error("Assignment failed. Check if candidate is already assigned.");
    },
  });
};

// 8. Upload Document
export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => assessmentService.uploadDocument(file),
    onSuccess: () => {
      toast.success("Document ingested successfully!");
      queryClient.invalidateQueries({ queryKey: ["docs"] });
    },
    onError: () => {
      toast.error("Failed to ingest document. Ensure it's a valid PDF/Text file.");
    },
  });
};

// Cohort mutations
export const useCreateCohort = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCohortRequest) => assessmentService.createCohort(payload),
    onSuccess: () => {
      toast.success("Cohort created successfully!");
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create cohort.");
    },
  });
};

export const useUpdateCohort = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCohortRequest }) =>
      assessmentService.updateCohort(id, payload),
    onSuccess: () => {
      toast.success("Cohort updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update cohort.");
    },
  });
};

export const useAssignCandidatesToCohort = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssignCohortRequest) => assessmentService.assignCandidatesToCohort(payload),
    onSuccess: () => {
      toast.success("Cohort membership updated!");
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update cohort membership.");
    },
  });
};

export const useSyncCohortMembers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cohortId, candidateIds }: { cohortId: number; candidateIds: number[] }) =>
      assessmentService.syncCohortMembers(cohortId, candidateIds),
    onSuccess: () => {
      toast.success("Cohort members updated!");
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to sync cohort members.");
    },
  });
};

export const useRemoveCandidateFromCohort = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ candidateId, cohortId }: { candidateId: number; cohortId?: number }) =>
      assessmentService.removeCandidateFromCohort(candidateId, cohortId),
    onSuccess: () => {
      toast.success("Candidate unassigned from cohort!");
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to unassign candidate.");
    },
  });
};

// // 9. Submit candidate answers for evaluation ( Uncommented and Fixed)
// export const useSubmitAssessment = () => {
//   return useMutation({
//     //  FIX: Mapped to the specific SubmissionRequest type from your API file
//     mutationFn: (payload: SubmissionRequest) => assessmentService.submitAssessment(payload),
//     onSuccess: () => {
//       toast.success("Assessment submitted successfully! Evaluating logic...");
//     },
//     onError: () => {
//       toast.error("Submission failed. Check your connection.");
//     },
//   });
// };


// ==========================================
// CANDIDATE HOOKS
// ==========================================

export const useMyAssessments = () => {
  return useQuery({
    queryKey: ["my-assessments"],
    queryFn: candidateApi.getMyAssessments,
  });
};

export const useStartAssessment = (assignmentId: number) => {
  return useQuery({
    queryKey: ["assessment-player", assignmentId],
    queryFn: () => candidateApi.startAssessment(assignmentId),
    enabled: !!assignmentId, // Only run if we have an ID
    refetchOnWindowFocus: false, // CRITICAL: Prevents test reloading if they switch tabs
    staleTime: Infinity, // Keeps the test in memory so they don't lose progress
  });
};

export const useSubmitAssessment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: candidateApi.submitAssessment,
    onSuccess: () => {
      toast.success("Assessment submitted successfully!");
      // Refresh the dashboard so the test shows as "Under Review"
      queryClient.invalidateQueries({ queryKey: ["my-assessments"] }); 
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to submit assessment. Please try again.");
    }
  });
};