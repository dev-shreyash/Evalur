"use client";

import { useParams, useNavigate } from "react-router-dom";
import { useCompleteAssessment } from "@/feature/dashboard/hooks/useAssessment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, 
  Loader2, 
  HelpCircle, 
  Code2, 
  Clock, 
  CheckCircle2,
  Trophy,
  AlertCircle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ViewAssessmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: assessment, isLoading } = useCompleteAssessment(id!);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full gap-3 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        <p className="text-xs font-medium">Loading assessment details...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <p className="text-sm font-semibold text-slate-800">Assessment not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/assessments")}>
          Return to Assessments
        </Button>
      </div>
    );
  }

  const { mcqs = [], codingTasks = [] } = assessment?.content || {};

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate(-1)} 
          className="text-xs font-medium text-slate-600 hover:text-slate-900 -ml-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> 
          Back to Assessments
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">Assessment ID: #{id}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            {assessment.status || "Ready"}
          </span>
        </div>
      </div>

      {/* Hero Header Card */}
      <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
        <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {assessment.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {assessment.role || "Technical Evaluation"}
              </span>
              <span>•</span>
              <span>{assessment.seniority || "Standard"} Level</span>
              <span>•</span>
              <span>Created {assessment.createdAt ? new Date(assessment.createdAt).toLocaleDateString() : "Active"}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Total Items</span>
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {mcqs.length + codingTasks.length}
              </span>
            </div>
            <div className="text-xs text-slate-400 pl-2 border-l border-slate-200 dark:border-slate-700">
              <p>{mcqs.length} MCQs</p>
              <p>{codingTasks.length} Coding</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Tabs */}
      <Tabs defaultValue="mcqs" className="w-full space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <TabsTrigger value="mcqs" className="text-xs font-medium px-4 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
            <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
            Multiple-Choice Questions ({mcqs.length})
          </TabsTrigger>
          <TabsTrigger value="coding" className="text-xs font-medium px-4 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
            <Code2 className="h-3.5 w-3.5 mr-1.5" />
            Practical Coding Tasks ({codingTasks.length})
          </TabsTrigger>
        </TabsList>

        {/* MCQs Content */}
        <TabsContent value="mcqs" className="space-y-4">
          {mcqs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed rounded-xl">
              No multiple-choice questions configured in this assessment.
            </div>
          ) : mcqs.map((mcq: any, idx: number) => (
            <Card key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-950/60 p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 h-6 w-6 rounded flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                      {mcq.question}
                    </h3>
                  </div>
                </div>
                {mcq.timeEstimateMinutes && (
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {mcq.timeEstimateMinutes} min
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mcq.options?.map((opt: string, optIdx: number) => {
                    const isCorrect = optIdx === mcq.correctAnswer;
                    return (
                      <div 
                        key={optIdx} 
                        className={cn(
                          "p-3 rounded-lg border text-xs font-medium transition-colors flex items-center justify-between",
                          isCorrect 
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-400">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span>{opt}</span>
                        </div>
                        {isCorrect && (
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              {mcq.explanation && (
                <CardFooter className="bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mr-1.5">Explanation:</span> {mcq.explanation}
                </CardFooter>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Coding Tasks Content */}
        <TabsContent value="coding" className="space-y-6">
          {codingTasks.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed rounded-xl">
              No coding tasks configured in this assessment.
            </div>
          ) : codingTasks.map((task: any, idx: number) => (
            <Card key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-950/60 p-5 border-b border-slate-200 dark:border-slate-800 flex flex-row items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Coding Challenge {idx + 1}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {task.difficulty || "Standard"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {task.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {task.description}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {task.constraints && (
                  <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                    <span className="font-semibold flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      <AlertCircle className="h-3.5 w-3.5" /> Technical Constraints
                    </span>
                    <p className="leading-relaxed whitespace-pre-wrap">{task.constraints}</p>
                  </div>
                )}

                {task.initialCode && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Starter Code Template
                    </span>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-200 overflow-x-auto">
                      <pre className="leading-relaxed">{task.initialCode}</pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
