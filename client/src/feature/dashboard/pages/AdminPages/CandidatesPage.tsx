"use client";

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCandidates,
  useCohorts,
  useCreateCohort,
  useUpdateCohort,
  useAssignCandidatesToCohort,
  useSyncCohortMembers,
  useRemoveCandidateFromCohort,
} from "@/feature/dashboard/hooks/useAssessment";
import { useInvite } from "@/feature/dashboard/hooks/useInvite";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Copy,
  CheckCircle,
  Loader2,
  Search,
  RefreshCw,
  FileText,
  Users,
  Plus,
  Calendar,
  Layers,
  CheckSquare,
  Square,
  Pencil,
  UserMinus,
  FolderSync
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Candidate, Cohort } from "@/feature/dashboard/api/assessmentApi";

const getEvaluationBadge = (status: string) => {
  const s = status?.toUpperCase();
  if (s === "COMPLETED") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
  }
  if (s === "SUBMITTED") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Submitted</span>;
  }
  if (s === "STARTED") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">In Progress</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">Assigned</span>;
};

export default function CandidatesPage() {
  const navigate = useNavigate();

  // Queries
  const { data: candidates = [], isLoading, isFetching, refetch } = useCandidates();
  const { data: cohorts = [], refetch: refetchCohorts } = useCohorts();

  // Mutations
  const { mutateAsync: generateInvite, isPending: isInviting } = useInvite();
  const createCohortMutation = useCreateCohort();
  const updateCohortMutation = useUpdateCohort();
  const assignCohortMutation = useAssignCandidatesToCohort();
  const syncCohortMutation = useSyncCohortMembers();
  const removeCandidateMutation = useRemoveCandidateFromCohort();

  // Local state
  const [activeTab, setActiveTab] = useState("candidates");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCohortFilter, setSelectedCohortFilter] = useState("ALL");

  // Invite modal state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteCohortId, setInviteCohortId] = useState<string>("NONE");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Create cohort modal state
  const [showCreateCohortDialog, setShowCreateCohortDialog] = useState(false);
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortDesc, setNewCohortDesc] = useState("");

  // Edit cohort modal state
  const [showEditCohortDialog, setShowEditCohortDialog] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [editCohortName, setEditCohortName] = useState("");
  const [editCohortDesc, setEditCohortDesc] = useState("");

  // Single candidate cohort assignment / move modal state
  const [showCandidateCohortDialog, setShowCandidateCohortDialog] = useState(false);
  const [targetCandidateForCohort, setTargetCandidateForCohort] = useState<Candidate | null>(null);
  const [selectedNewCohortId, setSelectedNewCohortId] = useState<string>("UNASSIGNED");

  // Assign cohort to candidate modal state
  const [showAssignCohortDialog, setShowAssignCohortDialog] = useState(false);
  const [targetCohort, setTargetCohort] = useState<Cohort | null>(null);
  const [selectedCandidateIdsForCohort, setSelectedCandidateIdsForCohort] = useState<number[]>([]);
  const [memberModalSearch, setMemberModalSearch] = useState("");

  // Filtering candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c: Candidate) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCohort =
        selectedCohortFilter === "ALL" ||
        (selectedCohortFilter === "UNASSIGNED" && !c.cohortId) ||
        (c.cohortId && c.cohortId.toString() === selectedCohortFilter);
      return matchesSearch && matchesCohort;
    });
  }, [candidates, searchTerm, selectedCohortFilter]);

  // Compute candidates count per cohort
  const cohortCandidateCounts = useMemo(() => {
    const map = new Map<number, number>();
    candidates.forEach((c: Candidate) => {
      if (c.cohortId) {
        map.set(c.cohortId, (map.get(c.cohortId) || 0) + 1);
      }
    });
    return map;
  }, [candidates]);

  // Handlers
  const handleGenerateInvite = async () => {
    try {
      const cohortIdNum = inviteCohortId === "NONE" ? undefined : Number(inviteCohortId);
      const res = await generateInvite({
        role: "CANDIDATE",
        seniorityLevel: "Standard",
        cohortId: cohortIdNum,
      });
      setInviteLink(res.inviteLink);
      toast.success("Candidate invitation link generated!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate invitation link");
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invite link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCohort = () => {
    if (!newCohortName.trim()) {
      toast.error("Please enter a cohort / group name");
      return;
    }
    createCohortMutation.mutate(
      {
        name: newCohortName.trim(),
        description: newCohortDesc.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowCreateCohortDialog(false);
          setNewCohortName("");
          setNewCohortDesc("");
          refetchCohorts();
        }
      }
    );
  };

  const handleOpenEditCohort = (cohort: Cohort) => {
    setEditingCohort(cohort);
    setEditCohortName(cohort.name);
    setEditCohortDesc(cohort.description || "");
    setShowEditCohortDialog(true);
  };

  const handleExecuteUpdateCohort = () => {
    if (!editingCohort) return;
    if (!editCohortName.trim()) {
      toast.error("Please enter a cohort / group name");
      return;
    }
    updateCohortMutation.mutate(
      {
        id: editingCohort.id,
        payload: {
          name: editCohortName.trim(),
          description: editCohortDesc.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setShowEditCohortDialog(false);
          setEditingCohort(null);
          refetchCohorts();
          refetch();
        },
      }
    );
  };

  const handleOpenCandidateCohortModal = (candidate: Candidate) => {
    setTargetCandidateForCohort(candidate);
    setSelectedNewCohortId(candidate.cohortId ? candidate.cohortId.toString() : "UNASSIGNED");
    setShowCandidateCohortDialog(true);
  };

  const handleExecuteCandidateCohortChange = () => {
    if (!targetCandidateForCohort) return;
    if (selectedNewCohortId === "UNASSIGNED") {
      removeCandidateMutation.mutate(
        { candidateId: targetCandidateForCohort.id, cohortId: targetCandidateForCohort.cohortId ?? undefined },
        {
          onSuccess: () => {
            setShowCandidateCohortDialog(false);
            setTargetCandidateForCohort(null);
            refetch();
            refetchCohorts();
          },
        }
      );
    } else {
      const newCohortIdNum = Number(selectedNewCohortId);
      assignCohortMutation.mutate(
        {
          cohortId: newCohortIdNum,
          candidateIds: [targetCandidateForCohort.id],
        },
        {
          onSuccess: () => {
            setShowCandidateCohortDialog(false);
            setTargetCandidateForCohort(null);
            refetch();
            refetchCohorts();
          },
        }
      );
    }
  };

  const handleExecuteCandidateCohortRemove = (candidate: Candidate) => {
    removeCandidateMutation.mutate(
      { candidateId: candidate.id, cohortId: candidate.cohortId ?? undefined },
      {
        onSuccess: () => {
          refetch();
          refetchCohorts();
        },
      }
    );
  };

  const handleOpenAssignCohortModal = (cohort: Cohort) => {
    setTargetCohort(cohort);
    setMemberModalSearch("");
    const enrolledIds = candidates
      .filter((c: Candidate) => c.cohortId === cohort.id)
      .map((c: Candidate) => c.id);
    setSelectedCandidateIdsForCohort(enrolledIds);
    setShowAssignCohortDialog(true);
  };

  const handleExecuteAssignCohort = () => {
    if (!targetCohort) return;
    syncCohortMutation.mutate(
      {
        cohortId: targetCohort.id,
        candidateIds: selectedCandidateIdsForCohort,
      },
      {
        onSuccess: () => {
          setShowAssignCohortDialog(false);
          refetch();
          refetchCohorts();
        },
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Candidates & Cohorts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage candidates, assessment participants, and cohort groups across your organization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetch(); refetchCohorts(); }}
            className="h-9 px-3 rounded-md border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
            Sync
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateCohortDialog(true)}
            className="h-9 px-3.5 rounded-md border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Cohort / Group
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setInviteLink("");
              setInviteCohortId("NONE");
              setShowInviteDialog(true);
            }}
            className="h-9 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium shadow-xs"
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Invite Candidate
          </Button>
        </div>
      </div>

     
            
{/* Main Tabs */}
<Tabs
  value={activeTab}
  onValueChange={setActiveTab}
  className="flex w-full min-w-0 flex-col gap-4"
>
  {/* Two buttons at the top */}
  <TabsList className="grid h-auto min-h-11 w-full grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
    <TabsTrigger
      value="candidates"
      className="flex min-w-0 items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-medium sm:text-sm data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white"
    >
      <Users className="h-4 w-4 shrink-0" />
      <span className="truncate">
        Candidate Roster ({candidates.length})
      </span>
    </TabsTrigger>

    <TabsTrigger
      value="cohorts"
      className="flex min-w-0 items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-medium sm:text-sm data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white"
    >
      <Layers className="h-4 w-4 shrink-0" />
      <span className="truncate">
        Cohorts & Groups ({cohorts.length})
      </span>
    </TabsTrigger>
  </TabsList>

  {/* TAB 1: CANDIDATES */}
  <TabsContent value="candidates" className="mt-0 min-w-0 w-full space-y-4">
    {/* Search and Filter */}
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search candidates by name or email..."
          className="h-10 w-full rounded-lg border-slate-300 bg-white pl-10 text-sm dark:border-slate-700 dark:bg-slate-900"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="w-full min-w-0 sm:w-60 sm:shrink-0">
        <Select
          value={selectedCohortFilter}
          onValueChange={setSelectedCohortFilter}
        >
          <SelectTrigger className="h-10 w-full rounded-lg border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900">
            <SelectValue placeholder="Filter by Cohort" />
          </SelectTrigger>
          <SelectContent className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <SelectItem value="ALL">
              All Cohorts ({candidates.length})
            </SelectItem>
            <SelectItem value="UNASSIGNED">
              Unassigned to Cohort
            </SelectItem>
            {cohorts.map((ch: Cohort) => (
              <SelectItem key={ch.id} value={ch.id.toString()}>
                {ch.name} ({cohortCandidateCounts.get(ch.id) || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    {/* Candidates Table */}
    <Card className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-[760px]">
          <TableHeader className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60">
            <TableRow>
              <TableHead className="w-[280px] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Candidate
              </TableHead>
              <TableHead className="w-[200px] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cohort / Group
              </TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Assigned Assessments
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                    <span className="text-xs">Loading candidates...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCandidates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-40 text-center text-sm text-slate-400"
                >
                  No candidates match the specified search or filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredCandidates.map((candidate: Candidate) => (
                <TableRow
                  key={candidate.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 dark:border-slate-800/60 dark:hover:bg-slate-800/30"
                >
                  {/* Candidate */}
                  <TableCell className="px-4 py-4 align-middle">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0 rounded-full border border-slate-200 dark:border-slate-700">
                        <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {candidate.name ? candidate.name[0] : "C"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="break-words text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
                          {candidate.name}
                        </span>
                        <span className="break-all text-xs leading-relaxed text-slate-500">
                          {candidate.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Cohort */}
                  <TableCell className="px-4 py-4 align-middle">
                    <div className="flex items-center gap-2">
                      {candidate.cohortName ? (
                        <span className="inline-flex max-w-full items-center rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <span className="break-words">
                            {candidate.cohortName}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs italic text-slate-400">
                          Unassigned
                        </span>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenCandidateCohortModal(candidate)}
                        className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        title={candidate.cohortName ? "Move to another cohort" : "Assign to cohort"}
                      >
                        <FolderSync className="h-3.5 w-3.5 mr-1" />
                        {candidate.cohortName ? "Move" : "Assign"}
                      </Button>

                      {candidate.cohortName && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExecuteCandidateCohortRemove(candidate)}
                          disabled={removeCandidateMutation.isPending}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Remove from cohort (set unassigned)"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>

                  {/* Assigned Assessments */}
                  <TableCell className="px-4 py-4 align-middle">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {candidate.userAssessments?.length > 0 ? (
                        candidate.userAssessments.map((ua: any) => (
                          <div
                            key={ua.id}
                            role={
                              ua.evaluationStatus === "COMPLETED"
                                ? "button"
                                : undefined
                            }
                            tabIndex={
                              ua.evaluationStatus === "COMPLETED" ? 0 : -1
                            }
                            onClick={() => {
                              if (ua.evaluationStatus === "COMPLETED") {
                                navigate(
                                  `/admin/assessments/view/${ua.id}/result`
                                );
                              }
                            }}
                            onKeyDown={(e) => {
                              if (
                                ua.evaluationStatus === "COMPLETED" &&
                                (e.key === "Enter" || e.key === " ")
                              ) {
                                e.preventDefault();
                                navigate(
                                  `/admin/assessments/view/${ua.id}/result`
                                );
                              }
                            }}
                            className={cn(
                              "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-md border bg-white px-2.5 py-1.5 text-xs transition-colors dark:bg-slate-900",
                              ua.evaluationStatus === "COMPLETED" &&
                                "cursor-pointer border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-emerald-800 dark:hover:bg-emerald-950/30",
                              ua.evaluationStatus === "SUBMITTED" &&
                                "border-blue-200 dark:border-blue-800",
                              !["COMPLETED", "SUBMITTED"].includes(
                                ua.evaluationStatus
                              ) && "border-slate-200 dark:border-slate-700"
                            )}
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                            <span className="max-w-[160px] truncate font-medium text-slate-800 dark:text-slate-200">
                              {ua.assessment.title}
                            </span>

                            <span className="shrink-0">
                              {getEvaluationBadge(ua.evaluationStatus)}
                            </span>

                            {ua.objectiveScore != null && (
                              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {ua.objectiveScore}%
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs italic text-slate-400">
                          No assessments assigned
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  </TabsContent>

  {/* TAB 2: COHORTS & GROUPS */}
  <TabsContent value="cohorts" className="mt-0 min-w-0 w-full">
    {cohorts.length === 0 ? (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Layers className="h-7 w-7 text-slate-400" />
        </div>

        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          No cohorts or groups created yet.
        </p>

        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Group candidates into cohorts (e.g. "MCA Batch 2026" or
          "Engineering Interns Q3") to streamline bulk assessment assignment.
        </p>

        <Button
          size="sm"
          onClick={() => setShowCreateCohortDialog(true)}
          className="mt-5 h-9 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create First Cohort
        </Button>
      </div>
    ) : (
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cohorts.map((cohort: Cohort) => {
          const count = cohortCandidateCounts.get(cohort.id) || 0;

          return (
            <Card
              key={cohort.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex-1 space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    COHORT #{cohort.id}
                  </span>

                  <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {count} member{count === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="min-w-0">
                  <h3 className="break-words text-base font-semibold text-slate-900 dark:text-slate-100">
                    {cohort.name}
                  </h3>

                  <p className="mt-2 line-clamp-3 break-words text-sm leading-relaxed text-slate-500">
                    {cohort.description || "No description provided."}
                  </p>
                </div>

                {cohort.createdAt && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Created{" "}
                      {new Date(cohort.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditCohort(cohort)}
                  className="h-9 px-3 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit Details
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenAssignCohortModal(cohort)}
                  className="h-9 rounded-lg border-slate-300 text-sm font-medium text-slate-700 sm:w-auto dark:border-slate-700 dark:text-slate-300"
                >
                  <Users className="mr-2 h-4 w-4 text-slate-500" />
                  Manage Members
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    )}
  </TabsContent>
</Tabs>


      {/* Cohort Creation Dialog */}
      <Dialog open={showCreateCohortDialog} onOpenChange={setShowCreateCohortDialog}>
        <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-600" />
              Create Cohort / Group
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define a cohort or candidate group to simplify bulk assessment assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Cohort / Group Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. 2026 Java Bootcamp / Q3 Engineering Trainees"
                value={newCohortName}
                onChange={e => setNewCohortName(e.target.value)}
                className="h-9 text-xs border-slate-300 dark:border-slate-700 rounded-md font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Description (Optional)
              </Label>
              <Textarea
                placeholder="e.g. Participants enrolled in the advanced backend engineering curriculum."
                value={newCohortDesc}
                onChange={e => setNewCohortDesc(e.target.value)}
                className="text-xs border-slate-300 dark:border-slate-700 rounded-md h-20 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateCohortDialog(false)}
              className="h-8 rounded-md text-xs border-slate-300 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateCohort}
              disabled={createCohortMutation.isPending || !newCohortName.trim()}
              className="h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium"
            >
              {createCohortMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />
                  Creating...
                </>
              ) : (
                "Save Cohort"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Candidate Invitation Dialog with Cohort Binding */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-slate-600" />
              Invite Candidate or Participant
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Generate a secure invitation registration link bound to your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Assign to Cohort (Optional)
              </Label>
              <Select value={inviteCohortId} onValueChange={setInviteCohortId}>
                <SelectTrigger className="h-9 text-xs border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Select target cohort" />
                </SelectTrigger>
                <SelectContent className="text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <SelectItem value="NONE">No specific cohort (general invitation)</SelectItem>
                  {cohorts.map((ch: Cohort) => (
                    <SelectItem key={ch.id} value={ch.id.toString()}>
                      {ch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!inviteLink ? (
              <Button
                onClick={handleGenerateInvite}
                disabled={isInviting}
                className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 rounded-md font-medium text-xs mt-2"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Generating link...
                  </>
                ) : (
                  "Generate Invitation Link"
                )}
              </Button>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-md">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Registration Link
                  </p>
                  <code className="text-xs text-slate-800 dark:text-slate-200 break-all select-all font-mono leading-relaxed">
                    {inviteLink}
                  </code>
                </div>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="w-full h-9 rounded-md border-slate-300 dark:border-slate-700 text-xs font-medium"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      Copied to Clipboard
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy Invitation Link
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cohort Roster Assignment Dialog */}
      <Dialog open={showAssignCohortDialog} onOpenChange={setShowAssignCohortDialog}>
        <DialogContent className="max-w-lg p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden">
          <DialogHeader className="p-5 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600" />
              Manage Members for "{targetCohort?.name}"
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select candidates who should belong to this cohort.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Filter candidates by name or email..."
                value={memberModalSearch}
                onChange={e => setMemberModalSearch(e.target.value)}
                className="pl-8 h-8 text-xs border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>{selectedCandidateIdsForCohort.length} selected</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCandidateIdsForCohort(candidates.map((c: Candidate) => c.id))}
                  className="h-7 text-xs"
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCandidateIdsForCohort([])}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
              {candidates
                .filter((c: Candidate) =>
                  c.name.toLowerCase().includes(memberModalSearch.toLowerCase()) ||
                  c.email.toLowerCase().includes(memberModalSearch.toLowerCase())
                )
                .map((c: Candidate) => {
                  const isSelected = selectedCandidateIdsForCohort.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCandidateIdsForCohort(prev =>
                          isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                        );
                      }}
                      className={cn(
                        "flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors",
                        isSelected ? "bg-slate-100/70 dark:bg-slate-800/40" : "hover:bg-slate-50 dark:hover:bg-slate-950/30"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox checked={isSelected} onCheckedChange={() => {}} className="h-4 w-4 rounded" />
                        <div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{c.name}</span>
                          <span className="text-[11px] text-slate-400 ml-2">{c.email}</span>
                        </div>
                      </div>
                      {c.cohortName && c.cohortId !== targetCohort?.id && (
                        <span className="text-[10px] text-slate-400">
                          currently: {c.cohortName}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAssignCohortDialog(false)}
              className="h-8 rounded-md text-xs border-slate-300 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteAssignCohort}
              disabled={syncCohortMutation.isPending || assignCohortMutation.isPending}
              className="h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium"
            >
              {syncCohortMutation.isPending || assignCohortMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />
                  Updating...
                </>
              ) : (
                "Save Cohort Members"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cohort Dialog */}
      <Dialog open={showEditCohortDialog} onOpenChange={setShowEditCohortDialog}>
        <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Pencil className="h-4 w-4 text-slate-600" />
              Edit Cohort / Group Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update name and description for this cohort.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Cohort Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. 2026 Java Bootcamp"
                value={editCohortName}
                onChange={e => setEditCohortName(e.target.value)}
                maxLength={100}
                className="h-9 text-xs border-slate-300 dark:border-slate-700 rounded-md font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Description (Optional)
              </Label>
              <Textarea
                placeholder="Cohort description..."
                value={editCohortDesc}
                onChange={e => setEditCohortDesc(e.target.value)}
                maxLength={500}
                className="text-xs border-slate-300 dark:border-slate-700 rounded-md h-20 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditCohortDialog(false)}
              className="h-8 rounded-md text-xs border-slate-300 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteUpdateCohort}
              disabled={updateCohortMutation.isPending || !editCohortName.trim()}
              className="h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium"
            >
              {updateCohortMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign / Change Candidate Cohort Dialog */}
      <Dialog open={showCandidateCohortDialog} onOpenChange={setShowCandidateCohortDialog}>
        <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FolderSync className="h-4 w-4 text-slate-600" />
              {targetCandidateForCohort?.cohortName ? "Change Candidate Cohort" : "Assign Candidate to Cohort"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Manage cohort membership for{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {targetCandidateForCohort?.name}
              </span> ({targetCandidateForCohort?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <span className="text-slate-400">Current Cohort:</span>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {targetCandidateForCohort?.cohortName || "None (Unassigned / General Roster)"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Select Target Cohort
              </Label>
              <Select value={selectedNewCohortId} onValueChange={setSelectedNewCohortId}>
                <SelectTrigger className="h-9 text-xs border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Choose a cohort" />
                </SelectTrigger>
                <SelectContent className="text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <SelectItem value="UNASSIGNED">Unassigned (Remove from cohort)</SelectItem>
                  {cohorts.map((ch: Cohort) => (
                    <SelectItem key={ch.id} value={ch.id.toString()}>
                      {ch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCandidateCohortDialog(false)}
              className="h-8 rounded-md text-xs border-slate-300 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteCandidateCohortChange}
              disabled={assignCohortMutation.isPending || removeCandidateMutation.isPending}
              className="h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium"
            >
              {assignCohortMutation.isPending || removeCandidateMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />
                  Updating...
                </>
              ) : (
                "Update Membership"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
