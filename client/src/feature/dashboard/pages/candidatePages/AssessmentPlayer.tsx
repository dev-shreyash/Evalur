import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStartAssessment, useSubmitAssessment } from "@/feature/dashboard/hooks/useAssessment";
import Editor from "@monaco-editor/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Lock, ChevronRight, Loader2, CheckCircle, AlertTriangle, Timer, Zap } from "lucide-react";
import { toast } from "sonner";

export default function AssessmentPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();

  // API HOOKS
  const { data: assessmentData, isLoading, isError } = useStartAssessment(Number(id));
  const submitMutation = useSubmitAssessment();

  // STATE
  const [hasStarted, setHasStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); 
  const [mcqAnswers, setMcqAnswers] = useState<number[]>([]);
  const [codingSolution, setCodingSolution] = useState("");
  
  // TIME STATES
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // Total Exam Time
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null); // Individual Question Time
  const [initialQuestionTime, setInitialQuestionTime] = useState<number>(0); // Constant for % calculation

  // Track latest state for the auto-submit event listener
  const stateRef = useRef({ mcqAnswers, codingSolution, id, hasStarted, currentStep });
  useEffect(() => {
    stateRef.current = { mcqAnswers, codingSolution, id, hasStarted, currentStep };
  }, [mcqAnswers, codingSolution, id, hasStarted, currentStep]);

  // 1. INITIALIZE TOTAL TIMER (Minutes * 0.65 multiplier)
  useEffect(() => {
    if (assessmentData && timeLeft === null) {
      const mcqs = assessmentData.mcqs || [];
      const codingTasks = assessmentData.codingTasks || [];
      const totalMinutes = [...mcqs, ...codingTasks].reduce((acc, curr) => acc + (curr.timeEstimateMinutes || 0), 0);
      const totalSeconds = Math.floor(totalMinutes * 0.65 * 60);
      setTimeLeft(totalSeconds);
    }
  }, [assessmentData, timeLeft]);

  // 2. RESET INDIVIDUAL QUESTION TIMER (When step changes)
  useEffect(() => {
    if (assessmentData && hasStarted) {
      const mcqs = assessmentData.mcqs || [];
      const codingTasks = assessmentData.codingTasks || [];
      
      const currentItem = currentStep < mcqs.length ? mcqs[currentStep] : codingTasks[0];
      
      if (currentItem) {
        const seconds = Math.floor((currentItem.timeEstimateMinutes || 1) * 0.65 * 60);
        setQuestionTimeLeft(seconds);
        setInitialQuestionTime(seconds);
      }
    }
  }, [currentStep, hasStarted, assessmentData]);

  // 3. MASTER COUNTDOWN (Ticks both Total and Question timers)
  useEffect(() => {
    if (!hasStarted) return;

    const timerId = setInterval(() => {
      // Tick Total Exam Timer
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          triggerAutoSubmit("Total assessment time expired");
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });

      // Tick Individual Question Timer
      setQuestionTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          handleQuestionTimeout();
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [hasStarted]);

  // 4. AUTO-ADVANCE LOGIC
  const handleQuestionTimeout = () => {
    const mcqs = assessmentData?.mcqs || [];
    const codingTasks = assessmentData?.codingTasks || [];
    const totalSteps = mcqs.length + (codingTasks.length > 0 ? 1 : 0);

    if (currentStep < totalSteps - 1) {
      toast.warning("Time's up! Force-advancing to next question.", { 
        icon: <Zap className="text-yellow-500"/> 
      });
      setCurrentStep(prev => prev + 1);
    } else {
      triggerAutoSubmit("Time limit reached on final task");
    }
  };

  // CONSOLIDATED AUTO-SUBMIT TRIGGER
  const triggerAutoSubmit = (reason: string) => {
    const { mcqAnswers: latestMcq, codingSolution: latestCode, id: assessId, hasStarted: active } = stateRef.current;
    
    if (!active || submitMutation.isPending) return;

    toast.error(`SECURITY ALERT: ${reason}. Assessment automatically submitted.`, {
      duration: 8000,
      style: { background: "#ef4444", color: "white", border: "none" }
    });

    submitMutation.mutate({
      userAssessmentId: Number(assessId),
      mcqAnswers: latestMcq,
      codingSolution: latestCode
    }, {
      onSuccess: () => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        navigate(`/candidate/assessment/${assessId}/result`);
      }
    });
  };

  // SECURITY PROTOCOLS (Anti-Cheat & Auto-Submit)
  useEffect(() => {
    if (!hasStarted) return;

    const preventAction = (e: Event) => {
      e.preventDefault();
      toast.error("Copy, paste, and right-click are disabled during the assessment.");
    };

    document.addEventListener("copy", preventAction);
    document.addEventListener("paste", preventAction);
    document.addEventListener("contextmenu", preventAction);

    const handleVisibilityChange = () => {
      if (document.hidden) triggerAutoSubmit("Tab switched or minimized");
    };

    const handleBlur = () => {
      triggerAutoSubmit("Window focus lost (minimizing or clicking away)");
    };

    const handleFullscreenExit = () => {
      if (!document.fullscreenElement) {
        triggerAutoSubmit("Exited full-screen mode");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenExit);

    return () => {
      document.removeEventListener("copy", preventAction);
      document.removeEventListener("paste", preventAction);
      document.removeEventListener("contextmenu", preventAction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenExit);
    };
  }, [hasStarted, submitMutation, navigate]);

  // START TEST
  const handleStart = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.log("Fullscreen request dismissed or unsupported", err);
    }
    setHasStarted(true);
    toast.success("Assessment environment activated. Good luck!");
  };

  // MANUAL SUBMIT ASSESSMENT
  const handleSubmit = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(err => console.log(err));
    }

    submitMutation.mutate({
      userAssessmentId: Number(id),
      mcqAnswers: mcqAnswers,
      codingSolution: codingSolution
    }, {
      onSuccess: () => {
        navigate(`/candidate/assessment/${id}/result`); 
      }
    });
  };

  // TIME FORMATTER
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Detect language based on question string
  const detectLanguage = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("sql") || lower.includes("postgresql")) return "sql";
    if (lower.includes("python")) return "python";
    if (lower.includes("java") && !lower.includes("javascript")) return "java";
    if (lower.includes("javascript") || lower.includes("node")) return "javascript";
    if (lower.includes("go ") || lower.includes("golang")) return "go";
    return "plaintext";
  };

  // RENDER: LOADING/ERROR
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-12 h-12 text-blue-600" /></div>;
  if (isError || !assessmentData) return <div className="min-h-screen flex flex-col items-center justify-center text-slate-500"><AlertTriangle className="w-12 h-12 text-red-500 mb-4" /><p>Failed to load assessment environment.</p><Button onClick={() => navigate("/candidate")} className="mt-4">Return to Dashboard</Button></div>;

  // RENDER: PRE-FLIGHT SCREEN
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <Card className="max-w-xl w-full bg-slate-800 border-slate-700 text-white shadow-2xl">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3 text-red-400 mb-6">
              <ShieldAlert className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Secure Assessment Environment</h1>
            </div>
            
            <p className="text-slate-300">
              You are about to begin your technical evaluation. 
              Total time allocated: <span className="text-white font-bold">{formatTime(timeLeft)}</span>.
            </p>

            <ul className="space-y-4 text-sm text-slate-400">
              <li className="flex gap-3 text-orange-300"><Zap className="w-5 h-5 shrink-0" /> Each question has an individual time limit.</li>
              <li className="flex gap-3"><Lock className="w-5 h-5 text-slate-500 shrink-0" /> Full-screen mode is recommended.</li>
              <li className="flex gap-3"><AlertTriangle className="w-5 h-5 text-red-400 shrink-0" /> <span className="text-red-400 font-semibold">Exiting full-screen, switching tabs, or minimizing the window will automatically submit your test.</span></li>
            </ul>

            <Button onClick={handleStart} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold mt-4">
              Begin Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ACTIVE ASSESSMENT SETUP
  const mcqs = assessmentData.mcqs || [];
  const codingTasks = assessmentData.codingTasks || [];
  const totalSteps = mcqs.length + (codingTasks.length > 0 ? 1 : 0);
  const isCodingStep = currentStep >= mcqs.length;
  
  const detectedEditorLang = codingTasks.length > 0 
    ? detectLanguage(codingTasks[0].description + " " + (codingTasks[0].constraints || "")) 
    : "plaintext";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col select-none relative overflow-hidden">
      
      {/* REVERSE PROGRESSION BAR */}
      {hasStarted && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-200 z-[60]">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${
              (questionTimeLeft || 0) < 15 ? 'bg-red-500' : 'bg-blue-600'
            }`}
            style={{ width: `${((questionTimeLeft || 0) / initialQuestionTime) * 100}%` }}
          />
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <ShieldAlert className="w-5 h-5 text-blue-600" />
          Evalur Assessment Player
        </div>

        <div className="flex items-center gap-6">
          {/* Individual Question Timer Display */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-md border font-mono text-xs font-bold transition-all ${questionTimeLeft && questionTimeLeft < 10 ? 'bg-red-100 text-red-700 animate-pulse border-red-300' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
            <Zap className="w-3 h-3" /> Q-TIME: {formatTime(questionTimeLeft)}
          </div>

          <div className="h-8 w-[1px] bg-slate-200" />

          {/* Total Timer Display */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-md border font-mono text-xs font-bold ${timeLeft && timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            <Timer className="w-3 h-3" /> TOTAL: {formatTime(timeLeft)}
          </div>

          {/* Question / Step Indicator */}
          <div className="text-xs font-bold text-slate-400">
            STEP {currentStep + 1} OF {totalSteps}
          </div>
        </div>
      </header>

      {/* Main Play Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Prompt */}
        <div className={`${isCodingStep ? 'w-1/2' : 'w-full max-w-3xl mx-auto'} p-8 overflow-y-auto border-r border-slate-200 bg-white`}>
          {!isCodingStep ? (
            // MCQ View
            <div className="space-y-6">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Question {currentStep + 1}</span>
              <h2 className="text-xl font-bold text-slate-900 leading-snug">{mcqs[currentStep]?.question}</h2>
              
              <div className="space-y-3 mt-6">
                {mcqs[currentStep]?.options?.map((option: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => {
                      const updated = [...mcqAnswers];
                      updated[currentStep] = index;
                      setMcqAnswers(updated);
                    }}
                    className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all ${
                      mcqAnswers[currentStep] === index 
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="inline-block w-6 font-bold text-slate-400">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Coding Task Description View
            <div className="space-y-6">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Practical Challenge</span>
              <h2 className="text-2xl font-bold text-slate-900">{codingTasks[0]?.title}</h2>
              <div className="prose prose-slate text-sm text-slate-600">
                <p>{codingTasks[0]?.description}</p>
                {codingTasks[0]?.constraints && (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Constraints</span>
                    <p className="mt-1 font-mono text-xs">{codingTasks[0].constraints}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Monaco Editor for Coding Step */}
        {isCodingStep && (
          <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
            <div className="h-10 bg-[#252526] flex items-center justify-between px-4 text-xs text-slate-400 select-none">
              <span>Solution Editor ({detectedEditorLang.toUpperCase()})</span>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                language={detectedEditorLang}
                theme="vs-dark"
                value={codingSolution || codingTasks[0]?.initialCode || ""}
                onChange={(value) => setCodingSolution(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Footer */}
      <footer className="h-16 bg-white border-t border-slate-200 flex items-center justify-between px-8 z-10">
        <div>
          {isCodingStep && (
            <span className="text-xs text-slate-400">
              Auto-advancing on question timeout. Submit when ready.
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {currentStep < totalSteps - 1 ? (
            <Button 
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Next Question <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={submitMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2"/>}
              {submitMutation.isPending ? "Submitting..." : "Submit Assessment"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
