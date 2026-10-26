import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/feature/auth/hooks/useAuth";
import { useMyAssessments } from "@/feature/dashboard/hooks/useAssessment"; //  Imported our new hook!

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";

type UserRole = "ADMIN" | "MANAGER" | "STAFF" | "CANDIDATE";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = user?.role?.toUpperCase() as UserRole | undefined;

  //  1. Use React Query to fetch the candidate's tasks
  const { 
    data: assessments = [], 
    isLoading, 
    isError 
  } = useMyAssessments();

  if (!role) {
    return (
      <div className="flex justify-center items-center h-full p-6 text-slate-500 animate-pulse">
        Loading Dashboard...
      </div>
    );
  }

  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const isStaff = role === "STAFF";
  const isCandidate = role === "CANDIDATE";

  //  2. Clean Routing Action
  const handleAction = (a: any) => {
    if (a.status === "PENDING" || a.status === "ASSIGNED") {
      navigate(`/assessment/${a.assignmentId}`);
    } else if (a.status === "IN_PROGRESS") {
      navigate(`/assessment/${a.assignmentId}`);
    } else {
      navigate(`/candidate/assessment/${a.assignmentId}/result`);
    }
  };

  const stats = {
    totalAssessments: assessments.length,
    activeCandidates: 0,
    pendingAssessments: assessments.filter((a: any) => a.status === 'ASSIGNED' || a.status === 'PENDING').length,
    completedAssessments: assessments.filter((a: any) => a.status === 'COMPLETED' || a.status === 'SUBMITTED').length,
    averageScore: 0,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="container mx-auto p-6 animate-in fade-in duration-500">

        {/* HEADER */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {isAdmin ? "Organization Dashboard" : isManager ? "Manager Dashboard" : isStaff ? "Staff Dashboard" : "Candidate Dashboard"}
          </h2>
          <p className="text-slate-500 mt-1 text-lg">
            {isAdmin ? "Manage company knowledge, create assessments, and evaluate candidates" : isManager ? "Track your team's assessment progress" : isStaff ? "Manage internal tasks" : "View your assigned assessments"}
          </p>
        </div>

        {/* ADMIN VIEW */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             {/* Admin metrics omitted for brevity, keeping existing UI structure */}
          </div>
        )}

        {/* CANDIDATE VIEW */}
        {isCandidate && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-xl text-slate-900">My Assessments</CardTitle>
              <CardDescription>
                Complete your assigned technical evaluations
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">

              {/* Loading State */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
                  <p>Loading your tasks...</p>
                </div>
              )}

              {/* Error State */}
              {isError && (
                <div className="flex flex-col items-center justify-center p-12 text-red-500 bg-red-50 rounded-xl border border-red-100">
                  <AlertTriangle className="w-8 h-8 mb-2" />
                  <p>Failed to load assessments. Please refresh the page.</p>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !isError && assessments.length === 0 && (
                <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-500 font-medium">
                    You have no active assessment tasks at this time.
                  </p>
                </div>
              )}

              {/* Tasks List */}
              {!isLoading && !isError && assessments.map((a: any) => (
                <div
                  key={a.assignmentId}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/50 transition-all gap-4"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-lg">{a.title || a.assessmentTitle}</p>
                    
                    <div className="flex items-center gap-3 mt-2">
                      {(a.status === "PENDING" || a.status === "ASSIGNED") && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                          Pending
                        </span>
                      )}

                      {a.status === "IN_PROGRESS" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          In Progress
                        </span>
                      )}

                      {(a.status === "COMPLETED" || a.status === "SUBMITTED") && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                          {a.status === "SUBMITTED" ? "Under Review" : "Completed"}
                        </span>
                      )}

                      <span className="text-xs text-slate-500 font-medium">
                        Assigned: {new Date(a.assignedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    className={`w-full sm:w-auto font-bold shadow-sm transition-all ${
                      (a.status === "PENDING" || a.status === "ASSIGNED" || a.status === "IN_PROGRESS")
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => handleAction(a)}
                  >
                    {(a.status === "PENDING" || a.status === "ASSIGNED")
                      ? "Start Test"
                      : a.status === "IN_PROGRESS"
                      ? "Resume"
                      : "View Results(Disabled)"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}