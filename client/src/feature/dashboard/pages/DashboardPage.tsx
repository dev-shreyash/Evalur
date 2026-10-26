import { useNavigate } from "react-router-dom";
import { useAuth } from "@/feature/auth/hooks/useAuth";
import { useMyAssessments } from "@/feature/dashboard/hooks/useAssessment";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, AlertTriangle, FileText, CheckCircle2, Clock, Calendar, ArrowRight, Briefcase, Users, Database } from "lucide-react";
import { cn } from "@/lib/utils";

type UserRole = "ADMIN" | "MANAGER" | "STAFF" | "CANDIDATE";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = user?.role?.toUpperCase() as UserRole | undefined;

  // React Query to fetch the candidate's tasks
  const { 
    data: assessments = [], 
    isLoading, 
    isError 
  } = useMyAssessments();

  if (!role) {
    return (
      <div className="flex justify-center items-center h-full min-h-[60vh] p-6 text-slate-400 text-xs gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
        <span>Loading session...</span>
      </div>
    );
  }

  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const isCandidate = role === "CANDIDATE";

  // Routing Action for Candidate
  const handleAction = (a: any) => {
    if (a.status === "PENDING" || a.status === "ASSIGNED" || a.status === "IN_PROGRESS") {
      navigate(`/assessment/${a.assignmentId}`);
    } else {
      navigate(`/candidate/assessment/${a.assignmentId}/result`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isAdmin 
                ? "Organization Workspace" 
                : isManager 
                ? "Evaluations & Candidate Workspace" 
                : "My Assessments"}
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {role.toLowerCase()}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin 
              ? "Create technical assessments, manage cohorts, and evaluate candidate results." 
              : isManager 
              ? "Track candidate progress and review skill evaluations across groups." 
              : "Review and complete your technical assessments and skills evaluations."}
          </p>
        </div>
      </div>

      {/* Candidate View */}
      {isCandidate && (
        <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="p-5 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-600" />
              Assigned Assessments ({assessments.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Technical evaluations and competency benchmarks assigned to you.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                <p className="text-xs">Loading assigned assessments...</p>
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="flex flex-col items-center justify-center p-8 text-red-600 gap-2">
                <AlertTriangle className="w-6 h-6" />
                <p className="text-xs font-medium">Failed to load assessments. Please refresh your browser.</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && assessments.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-xs">
                No active assessment tasks assigned at this time.
              </div>
            )}

            {/* Tasks List */}
            {!isLoading && !isError && assessments.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {assessments.map((a: any) => {
                  const isReadyToStart = a.status === "PENDING" || a.status === "ASSIGNED";
                  const isInProgress = a.status === "IN_PROGRESS";
                  const isSubmitted = a.status === "SUBMITTED";
                  const isCompleted = a.status === "COMPLETED";

                  return (
                    <div
                      key={a.assignmentId}
                      className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            #{a.assignmentId}
                          </span>
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {a.title || a.assessmentTitle}
                          </h3>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {isReadyToStart && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Assigned
                            </span>
                          )}

                          {isInProgress && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              In Progress
                            </span>
                          )}

                          {isSubmitted && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              Under Review
                            </span>
                          )}

                          {isCompleted && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Completed
                            </span>
                          )}

                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {a.assignedAt ? new Date(a.assignedAt).toLocaleDateString() : "Assigned"}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className={cn(
                          "h-8 px-4 rounded-md text-xs font-medium shrink-0",
                          isReadyToStart || isInProgress
                            ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                            : "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        )}
                        onClick={() => handleAction(a)}
                      >
                        {isReadyToStart ? (
                          <>
                            Start Assessment
                            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                          </>
                        ) : isInProgress ? (
                          <>
                            Resume Assessment
                            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                          </>
                        ) : (
                          "View Results"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin / Manager Quick Cards */}
      {(isAdmin || isManager) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            onClick={() => navigate("/admin/assessments")}
            className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 cursor-pointer transition-all bg-white dark:bg-slate-900 shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <FileText className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-3">Assessments</h3>
            <p className="text-xs text-slate-500 mt-1">Configure and assign course or role-based evaluations.</p>
          </Card>

          <Card 
            onClick={() => navigate("/admin/candidates")}
            className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 cursor-pointer transition-all bg-white dark:bg-slate-900 shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Users className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-3">Candidates & Cohorts</h3>
            <p className="text-xs text-slate-500 mt-1">Manage candidate rosters, cohorts, and invitations.</p>
          </Card>

          <Card 
            onClick={() => navigate("/admin/knowledge")}
            className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 cursor-pointer transition-all bg-white dark:bg-slate-900 shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Database className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-3">Knowledge Base</h3>
            <p className="text-xs text-slate-500 mt-1">Upload technical documentation, slides, and syllabus material.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
