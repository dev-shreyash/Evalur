"use client";

import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  BookOpen,
  Briefcase,
  Users,
  Code2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileText,
  Sliders,
  Layers,
  Sparkles
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img src={logo} className="w-8 h-8 rounded-lg object-contain" alt="Evalur Logo" />
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">Evalur</span>
              <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Skills Evaluation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth/login")}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/auth/register")}
              className="h-9 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold shadow-xs"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-24 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Technical Assessment & Skills Evaluation Platform
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              Objective technical assessments grounded in your material and requirements.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Evalur helps educational programs, bootcamps, and technical teams generate syllabus-aligned or role-specific evaluations, conduct secure timed tests, and measure real coding ability.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth/register")}
                className="h-11 px-6 rounded-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold shadow-sm"
              >
                Create Account
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/auth/login")}
                className="h-11 px-6 rounded-md border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Sign In to Workspace
              </Button>
            </div>
          </div>
        </section>

        {/* Dual Use-Case Section */}
        <section className="py-16 md:py-20 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
          <div className="mx-auto max-w-7xl space-y-12">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Built For Multiple Contexts
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                One platform for course benchmarks and industry skill verification
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Context 1: Education */}
              <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-5">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Courses & Training Programs
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Generate structured tests from uploaded lecture slides, notes, and documentation. Select exact topics to measure what participants have learned.
                  </p>
                </div>

                <ul className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Automatic topic extraction from uploaded documentation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Cohort & batch management for classes or training groups</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Granular objective checklists with custom learning targets</span>
                  </li>
                </ul>
              </div>

              {/* Context 2: Organizations */}
              <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-5">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Hiring & Engineering Teams
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Evaluate role-specific competencies, technical understanding, and practical debugging skills across candidates, interns, and employees.
                  </p>
                </div>

                <ul className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Role-aligned evaluations calibrated by seniority</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Multi-aspect assessment: code reading, debugging, and refactoring</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Automated test evaluation with objective scoring</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-20 px-6 bg-slate-50/50 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl space-y-12">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Evaluation Workflow
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                How Evalur works
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: "01",
                  title: "Select Context",
                  desc: "Choose between course-aligned material, role-based requirements, or combined technical documentation.",
                  icon: BookOpen
                },
                {
                  step: "02",
                  title: "Configure Topics & Focus",
                  desc: "Select specific competencies, pedagogical goals (conceptual, debugging, refactoring), and question types.",
                  icon: Sliders
                },
                {
                  step: "03",
                  title: "Delegate & Supervise",
                  desc: "Assign to candidates or entire cohorts with multi-select, search, and duplicate prevention.",
                  icon: Users
                },
                {
                  step: "04",
                  title: "Review Results",
                  desc: "Inspect objective MCQ scoring, code solutions, and comprehensive multi-dimensional feedback.",
                  icon: ShieldCheck
                }
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 font-mono">{item.step}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-6 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <img src={logo} className="w-5 h-5 rounded object-contain" alt="Logo" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Evalur</span>
            <span>•</span>
            <span>Technical Assessment & Skills Evaluation Platform</span>
          </div>
          <div>
            © {new Date().getFullYear()} Evalur. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
