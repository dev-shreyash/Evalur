"use client";

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCandidates,
  useCohorts,
  useCreateCohort,
  useAssignCandidatesToCohort
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
  Square
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
  const assignCohortMutation = useAssignCandidatesToCohort();

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

  // Assign cohort to candidate modal state
  const [showAssignCohortDialog, setShowAssignCohortDialog] = useState(false);
  const [targetCohort, setTargetCohort] = useState<Cohort | null>(null);
  const [selectedCandidateIdsForCohort, setSelectedCandidateIdsForCohort] = useState<number[]>([]);

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

  const handleOpenAssignCohortModal = (cohort: Cohort) => {
    setTargetCohort(cohort);
    const enrolledIds = candidates
      .filter((c: Candidate) => c.cohortId === cohort.id)
      .map((c: Candidate) => c.id);
    setSelectedCandidateIdsForCohort(enrolledIds);
    setShowAssignCohortDialog(true);
  };

  const handleExecuteAssignCohort = () => {
    if (!targetCohort) return;
    assignCohortMutation.mutate(
      {
        cohortId: targetCohort.id,
        userIds: selectedCandidateIdsForCohort,
      },
      {
        onSuccess: () => {
          setShowAssignCohortDialog(false);
          refetch();
          refetchCohorts();
        }
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <TabsTrigger
            value="candidates"
            className="text-xs font-medium px-4 py-1.5 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-xs"
          >
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Candidate Roster ({candidates.length})
          </TabsTrigger>
          <TabsTrigger
            value="cohorts"
            className="text-xs font-medium px-4 py-1.5 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-xs"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Cohorts & Groups ({cohorts.length})
          </TabsTrigger>
        </TabsList>

        {/* --- TAB 1: CANDIDATES --- */}
        <TabsContent value="candidates" className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search candidates by name or email..."
                className="pl-9 h-9 text-xs border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-56">
              <Select
                value={selectedCohortFilter}
                onValueChange={setSelectedCohortFilter}
              >
                <SelectTrigger className="h-9 text-xs border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Filter by Cohort" />
                </SelectTrigger>
                <SelectContent className="text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <SelectItem value="ALL">All Cohorts ({candidates.length})</SelectItem>
                  <SelectItem value="UNASSIGNED">Unassigned to Cohort</SelectItem>
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
          <Card className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs bg-white dark:bg-slate-900">
            <Table>
              <TableHeader className="bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                <TableRow>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 w-[280px]">Candidate</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 w-[200px]">Cohort / Group</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned Assessments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="animate-spin h-5 w-5 text-slate-600" />
                        <span className="text-xs">Loading candidates...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-16 text-xs text-slate-400">
                      No candidates match the specified search or filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((candidate: Candidate) => (
                    <TableRow key={candidate.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/60">
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700">
                            <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                              {candidate.name ? candidate.name[0] : "C"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-none">
                              {candidate.name}
                            </span>
                            <span className="text-[11px] text-slate-500 mt-1">
                              {candidate.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        {candidate.cohortName ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {candidate.cohortName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Unassigned
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="flex flex-wrap gap-2 items-center">
                          {candidate.userAssessments?.length > 0 ? (
                            candidate.userAssessments.map((ua: any) => (
                              <div
                                key={ua.id}
                                className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors bg-white dark:bg-slate-900 hover:border-slate-400",
                                  ua.evaluationStatus === "COMPLETED" && "border-emerald-200 dark:border-emerald-800",
                                  ua.evaluationStatus === "SUBMITTED" && "border-blue-200 dark:border-blue-800"
                                )}
                                onClick={() =>
                                  ua.evaluationStatus === "COMPLETED" &&
                                  navigate(`/admin/assessments/view/${ua.id}/result`)
                                }
                              >
                                <FileText className="h-3 w-3 text-slate-400" />
                                <span className="font-medium text-slate-800 dark:text-slate-200 max-w-[150px] truncate">
                                  {ua.assessment.title}
                                </span>
                                {getEvaluationBadge(ua.evaluationStatus)}
                                {ua.objectiveScore !== null && (
                                  <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                                    {ua.objectiveScore}%
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No assessments assigned</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* --- TAB 2: COHORTS & GROUPS --- */}
        <TabsContent value="cohorts" className="space-y-4">
          {cohorts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <Layers className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No cohorts or groups created yet.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Group candidates into cohorts (e.g. "MCA Batch 2026" or "Engineering Interns Q3") to streamline bulk assessment assignment.
              </p>
              <Button
                size="sm"
                onClick={() => setShowCreateCohortDialog(true)}
                className="mt-4 h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create First Cohort
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cohorts.map((cohort: Cohort) => {
                const count = cohortCandidateCounts.get(cohort.id) || 0;
                return (
                  <Card
                    key={cohort.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[11px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          COHORT #{cohort.id}
                        </span>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {count} member{count === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {cohort.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {cohort.description || "No description provided."}
                        </p>
                      </div>

                      {cohort.createdAt && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                          <Calendar className="h-3 w-3" />
                          Created {new Date(cohort.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAssignCohortModal(cohort)}
                        className="h-8 text-xs rounded-md border-slate-300 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300"
                      >
                        <Users className="h-3.5 w-3.5 mr-1 text-slate-500" />
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
              {candidates.map((c: Candidate) => {
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
              disabled={assignCohortMutation.isPending}
              className="h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium"
            >
              {assignCohortMutation.isPending ? (
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
    </div>
  );
}
