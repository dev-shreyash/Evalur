import { useParams } from "react-router-dom";
import { FileDown, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogicRadarChart } from "@/components/ui/LogicRadarChart";
import { useAssessmentResult } from "@/feature/dashboard/hooks/useAssessment";
import { downloadAssessmentReport } from "@/feature/dashboard/api/reportService"; 
export default function AssessmentResultPage() {
  const { id } = useParams();

  // 1. Fetch data using your React Query hook
  const { data: result, isLoading, error } = useAssessmentResult(id as string);

// 2. Handle PDF Download
  const handleDownload = async () => {
    // Grab the actual evaluation ID from the unwrapped data
    const evaluationId = result?.evaluation?.id || result?.id; // Fallback to result.id if evaluationId is not directly available

    if (!evaluationId) {
      toast.error("Evaluation ID missing. Cannot generate report.");
      return;
    }

    // Automatically handles the loading spinner, success message, and error catching!
    toast.promise(downloadAssessmentReport(evaluationId), {
      loading: "Generating your technical report...",
      success: "Report downloaded successfully!",
      error: "Could not generate PDF. Please try again.",
    });
  };

  // 3. Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-slate-900" />
        <p className="text-slate-500 font-medium animate-pulse">Fetching assessment data...</p>
      </div>
    );
  }

  // 4. Error State
  if (error || !result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-slate-800">Something went wrong</h2>
        <p className="text-slate-500">
          {error instanceof Error ? error.message : "No result found for this session."}
        </p>
      </div>
    );
  }

  // 5. Safe Parsing for Logic DNA (Prevents chart crashes)
  let parsedDna = null;
  try {
    parsedDna = typeof result.logicDna === 'string' ? JSON.parse(result.logicDna) : result.logicDna;
  } catch (e) {
    console.error("Failed to parse Logic DNA string:", e);
  }

  // 6. Main Render
  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Assessment Findings</h1>
          <p className="text-slate-500 mt-1">Detailed evaluation for session #{result.id}</p>
        </div>
        <Button onClick={handleDownload} variant="outline" className="shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50">
          <FileDown className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1: Objective Score */}
        <Card className="flex flex-col items-center justify-center p-6 border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Overall Score
          </span>
          <div className="text-7xl font-black mt-2 text-slate-900">
            {result.objectiveScore || 0}%
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center px-4">
            Historical scores may include a legacy code-length heuristic and may not be directly comparable with scores calculated under the current scoring formula.
          </p>
        </Card>

        {/* Metric 2: Logic DNA Radar Chart */}
       <Card className="md:col-span-2 overflow-hidden flex flex-col p-6 border-slate-200 shadow-sm min-h-[350px]">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-2">
            Logic DNA Profile
          </span>
          <div className="flex-1 w-full h-full min-h-[250px]">
            {parsedDna ? (
              <LogicRadarChart dnaString={result.logicDna} parsedData={parsedDna} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-400 italic text-sm">No valid Logic DNA available to chart.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* AI Qualitative Feedback Card */}
      <Card className="bg-[#0f172a] text-slate-50 border-none shadow-lg">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="flex items-center gap-2 mb-6 text-slate-300">
            <Sparkles className="h-5 w-5" />
            <span className="font-bold uppercase text-xs tracking-widest">
              AI Logic Consultant Analysis
            </span>
          </div>
          <blockquote className="text-lg leading-relaxed font-medium text-slate-200">
            {result.aiLogicFeedback ? `"${result.aiLogicFeedback}"` : "No qualitative feedback provided for this session."}
          </blockquote>
        </CardContent>
      </Card>

    </div>
  );
}