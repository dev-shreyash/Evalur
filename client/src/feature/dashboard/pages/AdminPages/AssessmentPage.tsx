"use client";

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAssessments,
  useLibraryDocuments,
  useCandidates,
  useGenerateAssessment,
  useAssignAssessment,
  useDocumentTopics,
  useCohorts
} from "@/feature/dashboard/hooks/useAssessment";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sparkles,
  FileText,
  Briefcase,
  UserPlus,
  Calendar,
  Send,
  Loader2,
  RefreshCw,
  Check,
  X,
  Eye,
  BookOpen,
  Search,
  Plus,
  GraduationCap,
  Target,
  Sliders,
  AlertCircle,
  CheckSquare,
  Square,
  Layers,
  Code2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AssessmentRequest, Candidate } from "@/feature/dashboard/api/assessmentApi";

type AssessmentContextType = "course" | "role" | "combined";

const ASSESSMENT_FOCUS_OPTIONS = [
  { id: "conceptual", label: "Conceptual understanding", desc: "Core theory, semantics, and language rules" },
  { id: "comprehension", label: "Code reading and comprehension", desc: "Analyzing logic traces and predicting output" },
  { id: "debugging", label: "Debugging faulty code", desc: "Isolating errors, edge cases, and runtime bugs" },
  { id: "refactoring", label: "Code improvement and refactoring", desc: "Clean architecture, performance, and idiomatic patterns" },
  { id: "application", label: "Practical application", desc: "Implementing real-world requirements" },
  { id: "test-design", label: "Edge cases and test design", desc: "Validating boundary conditions and invariant checks" },
];

const QUESTION_TYPES = [
  { id: "MCQ", label: "Multiple-Choice (MCQ)", desc: "Conceptual understanding & syntax verification" },
  { id: "CODING", label: "Code Snippet & Debugging", desc: "Hands-on implementation and bug remediation" },
];

const STANDARD_ROLES = [
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "Software Engineer",
  "DevOps Engineer",
  "Data Engineer",
  "QA & Test Engineer",
];

const SENIORITY_LEVELS = [
  "Intern / Trainee",
  "Junior",
  "Mid-Level",
  "Senior",
  "Lead",
];

const getStatusBadge = (status: string) => {
  const s = status?.toUpperCase();
  if (s === "READY") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Ready</span>;
  }
  if (s === "PENDING" || s === "GENERATING") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">Generating</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">{status || "Draft"}</span>;
};

export default function AssessmentsPage() {
  const navigate = useNavigate();

  // Queries
  const { data: assessments = [], isFetching: isSyncing, isLoading: isAssessmentsLoading, refetch: refreshAssessments } = useAssessments();
  const { data: documents = [] } = useLibraryDocuments();
  const { data: candidates = [] } = useCandidates();
  const { data: cohorts = [] } = useCohorts();

  // Mutations
  const generateMutation = useGenerateAssessment();
  const assignMutation = useAssignAssessment();

  // Modal / Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [targetAssessment, setTargetAssessment] = useState<any>(null);

  // Assessment Creation Config
  const [contextType, setContextType] = useState<AssessmentContextType>("course");
  const [title, setTitle] = useState("");
  const [selectedRole, setSelectedRole] = useState("Full Stack Developer");
  const [selectedSeniority, setSelectedSeniority] = useState("Junior");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopicInput, setCustomTopicInput] = useState("");
  const [selectedFocus, setSelectedFocus] = useState<string[]>([
    "Conceptual understanding",
    "Code reading and comprehension",
    "Debugging faulty code"
  ]);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(["MCQ", "CODING"]);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [notesDescription, setNotesDescription] = useState("");

  // Extracted topics query from selected documents
  const { data: extractedTopics = [], isLoading: isExtractingTopics } = useDocumentTopics(selectedDocIds);

  // Combined topic pool: extracted topics + any custom added topics
  const [customTopics, setCustomTopics] = useState<string[]>([]);
  const allAvailableTopics = useMemo(() => {
    const set = new Set<string>();
    extractedTopics.forEach((t: string) => set.add(t));
    customTopics.forEach((t: string) => set.add(t));
    return Array.from(set);
  }, [extractedTopics, customTopics]);

  // Bulk Assignment State
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedCohortFilter, setSelectedCohortFilter] = useState<string>("ALL");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);

  // Validation
  const titleTooLong = title.length > 255;
  const isTitleValid = title.trim().length > 0 && !titleTooLong;

  // Handlers for Topic Checklist
  const handleSelectAllTopics = () => {
    setSelectedTopics(allAvailableTopics);
  };

  const handleClearAllTopics = () => {
    setSelectedTopics([]);
  };

  const handleToggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleAddCustomTopic = () => {
    const trimmed = customTopicInput.trim();
    if (!trimmed) return;
    if (!customTopics.includes(trimmed) && !extractedTopics.includes(trimmed)) {
      setCustomTopics(prev => [...prev, trimmed]);
    }
    if (!selectedTopics.includes(trimmed)) {
      setSelectedTopics(prev => [...prev, trimmed]);
    }
    setCustomTopicInput("");
  };

  const handleToggleFocus = (focusLabel: string) => {
    setSelectedFocus(prev =>
      prev.includes(focusLabel)
        ? prev.filter(f => f !== focusLabel)
        : [...prev, focusLabel]
    );
  };

  const handleToggleQuestionType = (typeId: string) => {
    setSelectedQuestionTypes(prev => {
      if (prev.includes(typeId)) {
        if (prev.length === 1) {
          toast.error("At least one question type must be selected");
          return prev;
        }
        return prev.filter(t => t !== typeId);
      }
      return [...prev, typeId];
    });
  };

  // Submit Generation
  const handleGenerate = () => {
    if (!isTitleValid) {
      toast.error(titleTooLong ? "Title cannot exceed 255 characters" : "Please enter an assessment title");
      return;
    }

    if (contextType === "course" || contextType === "combined") {
      if (selectedDocIds.length === 0) {
        toast.error("Please select at least one source document");
        return;
      }
      if (selectedTopics.length === 0) {
        toast.error("Please select at least one topic or competency to assess");
        return;
      }
    }

    if (contextType === "role") {
      if (!selectedRole) {
        toast.error("Please select a target role or competency domain");
        return;
      }
    }

    const payload: AssessmentRequest = {
      title: title.trim(),
      role: contextType === "course" ? "Course Assessment" : selectedRole,
      seniority: contextType === "course" ? "Standard" : selectedSeniority,
      documentIds: selectedDocIds,
      topics: (contextType === "course" || contextType === "combined") ? selectedTopics : undefined,
      assessmentFocus: selectedFocus,
      questionTypes: selectedQuestionTypes,
      questionCount: questionCount,
      jobDescription: notesDescription || undefined,
    };

    generateMutation.mutate(payload, {
      onSuccess: () => {
        setShowCreateForm(false);
        resetForm();
        toast.success("Assessment generation started successfully!");
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || "Failed to generate assessment");
      }
    });
  };

  const resetForm = () => {
    setTitle("");
    setSelectedDocIds([]);
    setSelectedTopics([]);
    setCustomTopics([]);
    setCustomTopicInput("");
    setNotesDescription("");
    setSelectedRole("Full Stack Developer");
    setSelectedSeniority("Junior");
    setSelectedFocus(["Conceptual understanding", "Code reading and comprehension", "Debugging faulty code"]);
    setSelectedQuestionTypes(["MCQ", "CODING"]);
    setQuestionCount(10);
    setContextType("course");
  };

  // Bulk Candidate Assignment Logic
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c: Candidate) => {
      const matchesSearch =
        c.name.toLowerCase().includes(candidateSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(candidateSearch.toLowerCase());
      const matchesCohort =
        selectedCohortFilter === "ALL" ||
        (selectedCohortFilter === "NO_COHORT" && !c.cohortId) ||
        (c.cohortId && c.cohortId.toString() === selectedCohortFilter);
      return matchesSearch && matchesCohort;
    });
  }, [candidates, candidateSearch, selectedCohortFilter]);

  const isAlreadyAssigned = (candidate: Candidate) => {
    if (!targetAssessment) return false;
    return candidate.userAssessments?.some(
      (ua: any) => ua.assessment?.id === targetAssessment.id
    );
  };

  const handleSelectAllVisible = () => {
    const visibleAssignableIds = filteredCandidates
      .filter((c: Candidate) => !isAlreadyAssigned(c))
      .map((c: Candidate) => c.id);
    setSelectedCandidateIds(prev => {
      const merged = new Set([...prev, ...visibleAssignableIds]);
      return Array.from(merged);
    });
  };

  const handleClearSelected = () => {
    setSelectedCandidateIds([]);
  };

  const handleToggleCandidate = (candidateId: number) => {
    setSelectedCandidateIds(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleRemoveCandidateChip = (candidateId: number) => {
    setSelectedCandidateIds(prev => prev.filter(id => id !== candidateId));
  };

  // Summary message computation
  const assignmentSummary = useMemo(() => {
    if (selectedCandidateIds.length === 0) return null;
    const selectedList = candidates.filter((c: Candidate) => selectedCandidateIds.includes(c.id));
    const cohortsInvolved = new Set(
      selectedList.map((c: Candidate) => c.cohortName || "General Roster")
    );
    return `Assigning to ${selectedCandidateIds.length} candidate${selectedCandidateIds.length > 1 ? "s" : ""} across ${cohortsInvolved.size} group${cohortsInvolved.size > 1 ? "s" : ""}.`;
  }, [selectedCandidateIds, candidates]);

  const handleExecuteAssignment = () => {
    if (!targetAssessment || selectedCandidateIds.length === 0) return;
    assignMutation.mutate(
      {
        assessmentId: Number(targetAssessment.id),
        candidateIds: selectedCandidateIds,
      },
      {
        onSuccess: () => {
          setShowAssignDialog(false);
          setSelectedCandidateIds([]);
          toast.success(`Assessment assigned to ${selectedCandidateIds.length} candidates.`);
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Assignment failed. Please try again.");
        }
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Assessments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, manage, and assign technical assessments for education courses and organizational competencies.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshAssessments()}
            className="h-9 px-3 rounded-md border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isSyncing && "animate-spin")} />
            Sync
          </Button>
          {!showCreateForm && (
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
              className="h-9 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Assessment
            </Button>
          )}
        </div>
      </div>

      {/* Assessment Creation Form */}
      {showCreateForm && (
        <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 py-4 px-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Create New Assessment
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Select your assessment context, target competencies, and evaluation parameters.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateForm(false)}
                className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Context Selector: Course / Role / Combined */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Assessment Context
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setContextType("course")}
                  className={cn(
                    "flex flex-col text-left p-3.5 rounded-lg border transition-all",
                    contextType === "course"
                      ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800 ring-1 ring-slate-900/10"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">Course / Learning Material</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Grounded in uploaded lecture materials, slides, or technical documents.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setContextType("role")}
                  className={cn(
                    "flex flex-col text-left p-3.5 rounded-lg border transition-all",
                    contextType === "role"
                      ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800 ring-1 ring-slate-900/10"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">Role & Skills Verification</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Standardized technical competency evaluation calibrated by job role & level.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setContextType("combined")}
                  className={cn(
                    "flex flex-col text-left p-3.5 rounded-lg border transition-all",
                    contextType === "combined"
                      ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800 ring-1 ring-slate-900/10"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">Combined Assessment</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Target job competencies grounded directly in proprietary project documentation.
                  </p>
                </button>
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Assessment Title <span className="text-red-500">*</span>
                </Label>
                <span className={cn(
                  "text-xs font-mono",
                  titleTooLong ? "text-red-600 font-bold" : "text-slate-400"
                )}>
                  {title.length} / 255
                </span>
              </div>
              <Input
                placeholder={
                  contextType === "course"
                    ? "e.g. CS201 - Data Structures & Algorithms Benchmark"
                    : contextType === "role"
                    ? "e.g. Senior Backend Engineer - Technical Evaluation"
                    : "e.g. Cloud Platform Engineer - Core System Knowledge"
                }
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={260}
                className={cn(
                  "h-10 text-xs sm:text-sm border-slate-300 dark:border-slate-700 rounded-md",
                  titleTooLong && "border-red-500 focus-visible:ring-red-500"
                )}
              />
              {titleTooLong && (
                <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3" />
                  Title cannot exceed 255 characters.
                </p>
              )}
            </div>

            {/* Role & Seniority (Disclosed when context is 'role' or 'combined') */}
            {(contextType === "role" || contextType === "combined") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Role / Discipline</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="h-9 text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md">
                      <SelectValue placeholder="Select target role" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900">
                      {STANDARD_ROLES.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Competency Level</Label>
                  <Select value={selectedSeniority} onValueChange={setSelectedSeniority}>
                    <SelectTrigger className="h-9 text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md">
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900">
                      {SENIORITY_LEVELS.map(lvl => (
                        <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Source Documents (Disclosed when context is 'course' or 'combined', or optional for 'role') */}
            {(contextType === "course" || contextType === "combined") && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    Source Documents & Knowledge Base <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedDocIds.length} selected
                  </span>
                </div>

                {documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/40">
                    {documents.map((doc: any) => {
                      const isChecked = selectedDocIds.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => {
                            setSelectedDocIds(prev =>
                              isChecked ? prev.filter(id => id !== doc.id) : [...prev, doc.id]
                            );
                          }}
                          className={cn(
                            "flex items-center gap-2.5 p-2 rounded-md border text-xs cursor-pointer transition-colors",
                            isChecked
                              ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => {}}
                            className={cn(
                              "h-3.5 w-3.5 rounded",
                              isChecked && "border-white bg-white text-slate-900"
                            )}
                          />
                          <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate font-medium">{doc.filename}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/30">
                    <FileText className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">No source documents uploaded yet.</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs mt-1 h-auto p-0 text-slate-900 dark:text-slate-100 font-medium"
                      onClick={() => navigate("/admin/knowledge")}
                    >
                      Upload documentation in Knowledge Base →
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Topic & Learning Objectives Checklist (For course or combined) */}
            {(contextType === "course" || contextType === "combined") && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      Topics & Competency Focus <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Select extracted topics from your documents or add custom objectives.
                    </p>
                  </div>
                  {allAvailableTopics.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAllTopics}
                        className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <CheckSquare className="h-3 w-3 mr-1" />
                        Select all
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAllTopics}
                        className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Square className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                      <span className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-slate-600">
                        {selectedTopics.length}/{allAvailableTopics.length} selected
                      </span>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-950/40 min-h-[120px] max-h-56 overflow-y-auto space-y-2">
                  {isExtractingTopics ? (
                    <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                      <span className="text-xs">Extracting topics from documents...</span>
                    </div>
                  ) : allAvailableTopics.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {allAvailableTopics.map((topic) => {
                        const isChecked = selectedTopics.includes(topic);
                        return (
                          <div
                            key={topic}
                            onClick={() => handleToggleTopic(topic)}
                            className={cn(
                              "flex items-start gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors",
                              isChecked
                                ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                            )}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => {}}
                              className={cn(
                                "mt-0.5 h-3.5 w-3.5 rounded",
                                isChecked && "border-white bg-white text-slate-900"
                              )}
                            />
                            <span className="truncate leading-tight font-medium" title={topic}>
                              {topic}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No topics automatically extracted. Add custom learning objectives or competencies below.
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    placeholder="Add custom objective or competency (e.g. Memory Management & Garbage Collection)..."
                    value={customTopicInput}
                    onChange={e => setCustomTopicInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomTopic();
                      }
                    }}
                    className="h-9 text-xs border-slate-300 dark:border-slate-700 rounded-md"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomTopic}
                    disabled={!customTopicInput.trim()}
                    className="h-9 px-3 rounded-md text-xs font-medium border-slate-300 dark:border-slate-700 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Objective
                  </Button>
                </div>
              </div>
            )}

            {/* Assessment Focus Approaches */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5" />
                Assessment Focus Approaches
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {ASSESSMENT_FOCUS_OPTIONS.map((f) => {
                  const isChecked = selectedFocus.includes(f.label);
                  return (
                    <div
                      key={f.id}
                      onClick={() => handleToggleFocus(f.label)}
                      className={cn(
                        "p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between",
                        isChecked
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{f.label}</span>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => {}}
                          className={cn(
                            "h-3.5 w-3.5 rounded",
                            isChecked && "border-white bg-white text-slate-900"
                          )}
                        />
                      </div>
                      <p className={cn(
                        "text-[11px] mt-1 line-clamp-1",
                        isChecked ? "text-slate-300 dark:text-slate-600" : "text-slate-400"
                      )}>
                        {f.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question Formats & Target Question Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Question Formats
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  {QUESTION_TYPES.map(q => {
                    const isChecked = selectedQuestionTypes.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => handleToggleQuestionType(q.id)}
                        className={cn(
                          "flex-1 p-2.5 rounded-lg border cursor-pointer flex items-center justify-between text-xs",
                          isChecked
                            ? "border-slate-900 bg-slate-100 text-slate-900 dark:border-slate-100 dark:bg-slate-800 dark:text-slate-100 font-semibold"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        <span>{q.label}</span>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => {}}
                          className="h-3.5 w-3.5 rounded"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Total Questions
                </Label>
                <Select
                  value={questionCount.toString()}
                  onValueChange={v => setQuestionCount(Number(v))}
                >
                  <SelectTrigger className="h-10 text-xs border-slate-300 dark:border-slate-700 rounded-md font-medium">
                    <SelectValue placeholder="Select question count" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900">
                    <SelectItem value="5">5 Questions (Sprint Assessment)</SelectItem>
                    <SelectItem value="8">8 Questions (Standard Evaluation)</SelectItem>
                    <SelectItem value="10">10 Questions (Comprehensive Benchmark)</SelectItem>
                    <SelectItem value="15">15 Questions (In-Depth Assessment)</SelectItem>
                    <SelectItem value="20">20 Questions (Exhaustive Evaluation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Optional Additional Guidance */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Additional Directives / Context (Optional)
              </Label>
              <Textarea
                placeholder="e.g. Focus on Java 21 LTS features; emphasize exception handling and thread safety."
                value={notesDescription}
                onChange={e => setNotesDescription(e.target.value)}
                className="text-xs border-slate-300 dark:border-slate-700 rounded-md h-16 resize-none"
              />
            </div>

            {/* Footer Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(false)}
                className="h-9 px-4 rounded-md border-slate-300 dark:border-slate-700 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !isTitleValid}
                className="h-9 px-5 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium shadow-xs"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />
                    Generating Assessment...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Generate Assessment
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Registry */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            All Assessments ({assessments.length})
          </h2>
        </div>

        {isAssessmentsLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
            <p className="text-xs font-medium">Loading assessments...</p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <FileText className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No assessments created yet.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create your first assessment from course materials or target job roles.
            </p>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
              className="mt-4 h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create First Assessment
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((a: any) => (
              <Card
                key={a.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-[11px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      #{a.id}
                    </span>
                    {getStatusBadge(a.status)}
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                      {a.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <span className="truncate max-w-[150px] font-medium">
                        {a.role || "Technical Evaluation"}
                      </span>
                      <span>•</span>
                      <span>
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "Active"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 rounded-md text-xs font-medium border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
                    onClick={() => navigate(`/admin/assessments/view/${a.id}`)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                    Review
                  </Button>
                  {a.status === "READY" && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium"
                      onClick={() => {
                        setTargetAssessment(a);
                        setSelectedCandidateIds([]);
                        setShowAssignDialog(true);
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Assign
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Candidate Assignment Modal */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden">
          <DialogHeader className="p-5 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-slate-600" />
              Assign Assessment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Assign <span className="font-semibold text-slate-800 dark:text-slate-200">"{targetAssessment?.title}"</span> to candidates, participants, or cohorts.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search by candidate name or email..."
                  value={candidateSearch}
                  onChange={e => setCandidateSearch(e.target.value)}
                  className="pl-9 h-9 text-xs border-slate-300 dark:border-slate-700 rounded-md"
                />
              </div>

              <div className="w-full sm:w-52">
                <Select
                  value={selectedCohortFilter}
                  onValueChange={setSelectedCohortFilter}
                >
                  <SelectTrigger className="h-9 text-xs border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Filter by Cohort" />
                  </SelectTrigger>
                  <SelectContent className="text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <SelectItem value="ALL">All Cohorts / Groups</SelectItem>
                    <SelectItem value="NO_COHORT">Unassigned to Cohort</SelectItem>
                    {cohorts.map((ch: any) => (
                      <SelectItem key={ch.id} value={ch.id.toString()}>
                        {ch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllVisible}
                  className="h-7 px-2 text-xs hover:text-slate-900"
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Select all visible ({filteredCandidates.length})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelected}
                  disabled={selectedCandidateIds.length === 0}
                  className="h-7 px-2 text-xs hover:text-slate-900"
                >
                  <Square className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>

              <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {selectedCandidateIds.length} selected
              </span>
            </div>

            {/* Selected Candidates Chip Tray */}
            {selectedCandidateIds.length > 0 && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 max-h-24 overflow-y-auto flex flex-wrap gap-1.5">
                {selectedCandidateIds.map(cid => {
                  const cand = candidates.find((c: Candidate) => c.id === cid);
                  if (!cand) return null;
                  return (
                    <span
                      key={cid}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[11px] font-medium"
                    >
                      <span className="truncate max-w-[120px]">{cand.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCandidateChip(cid)}
                        className="hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Candidates Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              {filteredCandidates.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No candidates match the filter criteria.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCandidates.map((cand: Candidate) => {
                    const alreadyAssigned = isAlreadyAssigned(cand);
                    const isSelected = selectedCandidateIds.includes(cand.id);

                    return (
                      <div
                        key={cand.id}
                        onClick={() => !alreadyAssigned && handleToggleCandidate(cand.id)}
                        className={cn(
                          "flex items-center justify-between p-3 text-xs transition-colors",
                          alreadyAssigned
                            ? "bg-slate-50/60 dark:bg-slate-950/40 opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "bg-slate-100/70 dark:bg-slate-800/40 cursor-pointer"
                            : "hover:bg-slate-50 dark:hover:bg-slate-950/30 cursor-pointer"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            disabled={alreadyAssigned}
                            onCheckedChange={() => {}}
                            className="h-4 w-4 rounded"
                          />
                          <Avatar className="h-7 w-7 text-[10px]">
                            <AvatarFallback className="bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                              {cand.name ? cand.name[0] : "C"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {cand.name}
                              {cand.cohortName && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  {cand.cohortName}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{cand.email}</div>
                          </div>
                        </div>

                        <div>
                          {alreadyAssigned ? (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Already Assigned
                            </span>
                          ) : isSelected ? (
                            <span className="text-[10px] font-semibold text-slate-900 dark:text-slate-100">
                              Selected
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirmation Summary */}
            {assignmentSummary && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{assignmentSummary}</span>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAssignDialog(false)}
              className="h-8 rounded-md text-xs border-slate-300 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteAssignment}
              disabled={assignMutation.isPending || selectedCandidateIds.length === 0}
              className="h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium"
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />
                  Assigning...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Confirm Assignment ({selectedCandidateIds.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
