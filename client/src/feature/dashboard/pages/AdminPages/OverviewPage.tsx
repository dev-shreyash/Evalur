"use client";

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Users,
  Plus,
  Upload,
  UserPlus,
  ArrowRight,
  Eye,
  Loader2,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Briefcase
} from "lucide-react";
import { useAuth } from "@/feature/auth/hooks/useAuth";
import {
  useAssessments,
  useCandidates,
  useCohorts,
  useLibraryDocuments
} from "@/feature/dashboard/hooks/useAssessment";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/feature/dashboard/api/assessmentApi";

export default function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Real TanStack Query data
  const { data: assessments = [], isLoading: loadingAssessments } = useAssessments();
  const { data: candidates = [], isLoading: loadingCandidates } = useCandidates();
  const { data: cohorts = [], isLoading: loadingCohorts } = useCohorts();
  const { data: documents = [], isLoading: loadingDocs } = useLibraryDocuments();

  const isLoading = loadingAssessments || loadingCandidates || loadingCohorts || loadingDocs;

  // Real Submissions extracted from candidate userAssessments
  const recentSubmissions = useMemo(() => {
    const list: Array<{
      id: number;
      candidateName: string;
      candidateEmail: string;
      assessmentTitle: string;
      status: string;
      evaluationStatus: string;
      score: number | null;
      assignedAt: string;
      userAssessmentId: number;
    }> = [];

    candidates.forEach((cand: Candidate) => {
      if (cand.userAssessments && cand.userAssessments.length > 0) {
        cand.userAssessments.forEach((ua: any) => {
          list.push({
            id: ua.id,
            candidateName: cand.name,
            candidateEmail: cand.email,
            assessmentTitle: ua.assessment?.title || "Assessment",
            status: ua.status,
            evaluationStatus: ua.evaluationStatus,
            score: ua.objectiveScore,
            assignedAt: ua.assignedAt,
            userAssessmentId: ua.id,
          });
        });
      }
    });

    return list.sort((a, b) => b.id - a.id).slice(0, 5);
  }, [candidates]);

  // Real recent assessments
  const recentAssessments = useMemo(() => {
    return [...assessments].slice(-5).reverse();
  }, [assessments]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        <p className="text-xs font-medium">Loading organization metrics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            System Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.name || "Administrator"}</span>. Monitor assessment activity, candidate progress, and knowledge assets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs border border-slate-200 dark:border-slate-700">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium">System Ready</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Assessments", value: assessments.length, icon: FileText, sub: "ready to assign" },
          { label: "Registered Candidates", value: candidates.length, icon: Users, sub: "in organization" },
          { label: "Cohorts & Groups", value: cohorts.length, icon: Layers, sub: "active batches" },
          { label: "Source Documents", value: documents.length, icon: BookOpen, sub: "ingested references" },
        ].map((stat, i) => (
          <Card key={i} className="border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl bg-white dark:bg-slate-900">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2 tracking-tight">
                {stat.value}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {stat.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { title: "New Assessment", desc: "Build course or role-based evaluations", icon: Plus, path: "/admin/assessments" },
          { title: "Knowledge Base", desc: "Upload and manage source documents", icon: Upload, path: "/admin/knowledge" },
          { title: "Candidates & Cohorts", desc: "Manage rosters and send invitations", icon: UserPlus, path: "/admin/candidates" },
        ].map((action, i) => (
          <Button
            key={i}
            variant="outline"
            onClick={() => navigate(action.path)}
            className="h-auto p-4 justify-start rounded-xl border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 group transition-all text-left shadow-xs"
          >
            <div className="flex items-start gap-3 w-full">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-slate-100 dark:group-hover:text-slate-900 transition-colors shrink-0">
                <action.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>{action.title}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{action.desc}</p>
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Dual Column Content: Recent Evaluations & Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Assessments */}
        <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent Assessments ({assessments.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/assessments")}
              className="h-7 text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              View all →
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentAssessments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No assessments configured yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentAssessments.map((a: any) => (
                  <div key={a.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {a.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>#{a.id}</span>
                        <span>•</span>
                        <span>{a.role || "Technical Evaluation"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {a.status}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-slate-900"
                        onClick={() => navigate(`/admin/assessments/view/${a.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Recent Submissions */}
        <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent Submissions & Assignments
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/candidates")}
              className="h-7 text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              Candidate Roster →
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentSubmissions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No assessment assignments or submissions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentSubmissions.map((sub) => (
                  <div key={sub.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {sub.candidateName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {sub.assessmentTitle}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sub.score !== null && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200">
                          {sub.score}%
                        </span>
                      )}
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border",
                        sub.evaluationStatus === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : sub.status === "SUBMITTED"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      )}>
                        {sub.evaluationStatus || sub.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
