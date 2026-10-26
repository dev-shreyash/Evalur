import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft, RefreshCw, Sparkles, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogicRadarChart } from "@/components/ui/LogicRadarChart";
import { useAssessmentResult } from "@/feature/dashboard/hooks/useAssessment";

export default function AssessmentResult() {
  const { assignmentId, id } = useParams<{ assignmentId?: string; id?: string }>();
  const activeId = assignmentId || id;
  const navigate = useNavigate();

  const { data: result, isLoading, error, refetch, isFetching } = useAssessmentResult(activeId || "");

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-slate-800" />
        <p className="text-slate-600 font-medium">Loading your assessment result...</p>
      </div>
    );
  }

  // 2. Error or Missing State
  if (error || !result) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Unable to Load Assessment Result</h2>
        <p className="text-slate-600">
          {error instanceof Error
            ? error.message
            : "We could not find an evaluation result for this assessment session."}
        </p>
        <Button onClick={() => navigate("/candidate")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Return to Dashboard
        </Button>
      </div>
    );
  }

  const evaluationStatus = (
    result.evaluationStatus ||
    result.evaluation?.evaluationStatus ||
    result.status ||
    "PENDING"
  ).toUpperCase();

  const objectiveScore = result.objectiveScore ?? result.evaluation?.objectiveScore;
  const rawLogicDna = result.logicDna ?? result.evaluation?.logicDna;
  const aiLogicFeedback = result.aiLogicFeedback ?? result.evaluation?.aiLogicFeedback;

  let parsedDna: Record<string, number> | null = null;
  if (rawLogicDna) {
    try {
      parsedDna = typeof rawLogicDna === "string" ? JSON.parse(rawLogicDna) : rawLogicDna;
    } catch (e) {
      console.error("Failed to parse Logic DNA string:", e);
    }
  }

  const isEvaluating = evaluationStatus === "EVALUATING" || evaluationStatus === "PENDING";
  const isFailed = evaluationStatus === "FAILED";
  const isCompleted = evaluationStatus === "COMPLETED";

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Assessment Result
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Assignment #{activeId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 text-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate("/candidate")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Async State Banner: Evaluating */}
      {isEvaluating && (
        <Card className="border-amber-200 bg-amber-50/70 text-amber-900">
          <CardContent className="pt-6 pb-6 flex items-start gap-4">
            <Clock className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5 animate-spin" />
            <div className="space-y-1">
              <h3 className="font-semibold text-amber-900">AI Qualitative Analysis in Progress</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                Your objective answers have been recorded. Automated qualitative code reasoning is processing in the background. You can refresh this page or return later to review qualitative feedback.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Async State Banner: Failed */}
      {isFailed && (
        <Card className="border-slate-200 bg-slate-50 text-slate-800">
          <CardContent className="pt-6 pb-6 flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900">Qualitative Analysis Notice</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Automated qualitative code reasoning could not be completed for this submission. Your objective assessment score has been recorded and preserved.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Score Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Assessment Score
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center pb-8 pt-2">
          <div className="text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight">
            {objectiveScore != null ? `${objectiveScore}%` : "—"}
          </div>
          <p className="text-xs text-slate-500 mt-4 max-w-md mx-auto leading-relaxed">
            Historical scores may include a legacy code-length heuristic and may not be directly comparable with scores calculated under the current scoring formula.
          </p>
        </CardContent>
      </Card>

      {/* Completed State: Radar Chart and AI Feedback */}
      {isCompleted && (
        <div className="space-y-6">
          {parsedDna && Object.keys(parsedDna).length > 0 && (
            <Card className="border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Logic Profile
                </span>
                <Badge variant="outline" className="text-xs text-slate-600">
                  AI Qualitative Analysis
                </Badge>
              </div>
              <div className="w-full h-72 md:h-80">
                <LogicRadarChart parsedData={parsedDna} />
              </div>
              <p className="text-xs text-slate-400 text-center mt-3">
                Qualitative logic dimensions reflect automated code reasoning across patterns and conventions, not verified test-suite execution.
              </p>
            </Card>
          )}

          {aiLogicFeedback && (
            <Card className="bg-[#0f172a] text-slate-50 border-none shadow-md">
              <CardContent className="pt-6 pb-6 px-6 md:px-8 space-y-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold uppercase text-xs tracking-wider">
                    Qualitative Feedback
                  </span>
                </div>
                <blockquote className="text-sm md:text-base leading-relaxed text-slate-200 italic">
                  "{aiLogicFeedback}"
                </blockquote>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex justify-center pt-4">
        <Button
          variant="outline"
          onClick={() => navigate("/candidate")}
          className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
