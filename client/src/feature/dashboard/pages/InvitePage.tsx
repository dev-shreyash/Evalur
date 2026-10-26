import { useState } from "react";
import { useInvite } from "../hooks/useInvite";
import { useCohorts } from "../hooks/useAssessment";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserPlus, Copy, CheckCircle, Loader2 } from "lucide-react";
import type { Cohort } from "../api/assessmentApi";

export default function InviteForm() {
  const { mutate, isPending } = useInvite();
  const { data: cohorts = [] } = useCohorts();

  const [role, setRole] = useState("CANDIDATE");
  const [seniorityLevel, setSeniorityLevel] = useState("Standard");
  const [cohortId, setCohortId] = useState<string>("NONE");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const handleInvite = () => {
    const targetCohortId = cohortId === "NONE" ? undefined : Number(cohortId);
    mutate(
      { role, seniorityLevel, cohortId: targetCohortId },
      {
        onSuccess: (data) => {
          setInviteLink(data.inviteLink);
          toast.success("Invitation link generated successfully");
        },
      }
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="w-full max-w-xl mx-auto shadow-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
      <CardHeader className="bg-slate-50/70 dark:bg-slate-950/60 p-5 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-slate-600" />
          Generate Invitation Link
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Create a secure, organization-bound registration link for team members or candidates.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Account Role
          </Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full h-9 text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent className="text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <SelectItem value="CANDIDATE">Candidate / Participant</SelectItem>
              <SelectItem value="MANAGER">Manager</SelectItem>
              <SelectItem value="STAFF">Staff Member</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {role === "CANDIDATE" && cohorts.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assign to Cohort / Group (Optional)
            </Label>
            <Select value={cohortId} onValueChange={setCohortId}>
              <SelectTrigger className="w-full h-9 text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md">
                <SelectValue placeholder="Select target cohort" />
              </SelectTrigger>
              <SelectContent className="text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <SelectItem value="NONE">No specific cohort (general invite)</SelectItem>
                {cohorts.map((ch: Cohort) => (
                  <SelectItem key={ch.id} value={ch.id.toString()}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          onClick={handleInvite}
          disabled={isPending}
          className="w-full h-9 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 rounded-md shadow-xs mt-2"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5" />
              Generating Link...
            </>
          ) : (
            "Generate Invitation Link"
          )}
        </Button>

        {inviteLink && (
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Generated Invitation Link</Label>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="h-9 text-xs bg-slate-50 dark:bg-slate-950 font-mono text-slate-800 dark:text-slate-200"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-9 text-xs border-slate-300 dark:border-slate-700 shrink-0"
              >
                {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
