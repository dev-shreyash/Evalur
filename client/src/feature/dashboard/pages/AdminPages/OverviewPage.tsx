"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Users, 
  Plus, 
  Upload, 
  UserPlus, 
  ArrowRight, 
  Eye, 
  BarChart3, 
  Loader2, 
  TrendingUp, 
  Award, 
  Clock 
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from "recharts";
import { useAuth } from "@/feature/auth/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalAssessments: 24,
    totalCandidates: 156,
    pendingReviews: 12,
    averageScore: 78,
  });
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      setRecentAssessments([
        { id: "23", title: "SQL Developer", role: "Backend Developer", candidates: 14, status: "READY" },
        { id: "22", title: "Cyber Security Intern", role: "Security Analyst", candidates: 8, status: "READY" },
        { id: "20", title: "Java Spring Boot", role: "Backend Developer", candidates: 32, status: "GENERATING" },
      ]);

      setRecentSubmissions([
        { id: "1", name: "Shreyash Bhosale", email: "shreyash@evalur.com", title: "SQL Developer", score: 85, date: "2026-05-04T10:30:00" },
        { id: "2", name: "Sahil Disale", email: "sahil@mail.com", title: "SQL Developer", score: 0, date: "2026-05-04T09:15:00", status: "PENDING" },
      ]);

      setActivityData([
        { month: "Jan", candidates: 40 },
        { month: "Feb", candidates: 55 },
        { month: "Mar", candidates: 70 },
        { month: "Apr", candidates: 110 },
        { month: "May", candidates: 156 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-slate-900 opacity-20" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Syncing Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">System Overview</h1>
          <p className="text-slate-500 mt-1 font-medium">
            Welcome back, <span className="text-slate-900 font-bold">{user?.name || "Shreyash"}</span>. Organization metrics are stable.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border-2 border-slate-200">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Production v1.2</span>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Evaluations", value: stats.totalAssessments, icon: FileText, color: "text-slate-900", bg: "bg-slate-100" },
          { label: "Registered Students", value: stats.totalCandidates, icon: Users, color: "text-slate-900", bg: "bg-slate-100" },
          { label: "Average Proficiency", value: `${stats.averageScore}%`, icon: Award, color: "text-slate-900", bg: "bg-slate-100" },
          { label: "Pending Reviews", value: stats.pendingReviews, icon: Clock, color: "text-red-600", bg: "bg-red-50" },
        ].map((stat, i) => (
          <Card key={i} className="border-2 border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className={cn("p-2.5 rounded-xl inline-flex mb-4", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "New Assessment", desc: "Build AI-powered evaluations", icon: Plus, path: "/admin/assessments", color: "bg-slate-900" },
          { title: "Ingest Knowledge", desc: "Update RAG database", icon: Upload, path: "/admin/knowledge", color: "bg-slate-800" },
          { title: "Invite Students", desc: "Generate registration links", icon: UserPlus, path: "/admin/candidates", color: "bg-slate-700" },
        ].map((action, i) => (
          <Button 
            key={i}
            variant="ghost" 
            onClick={() => navigate(action.path)}
            className="h-auto p-0 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-slate-900"
          >
            <div className="flex items-center w-full bg-white p-5 gap-5">
              <div className={cn("p-4 rounded-xl text-white shadow-lg transition-transform group-hover:scale-105", action.color)}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900 text-lg leading-tight">{action.title}</p>
                <p className="text-xs text-slate-400 font-semibold">{action.desc}</p>
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-2 border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-6 bg-slate-50/50 border-b-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight text-slate-900 uppercase">Candidate Growth</CardTitle>
                <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Monthly Registration Trend</CardDescription>
              </div>
              <TrendingUp className="h-5 w-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorCand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '2px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }}
                  />
                  <Area type="monotone" dataKey="candidates" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#colorCand)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-6 bg-slate-50/50 border-b-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight text-slate-900 uppercase">Score Distribution</CardTitle>
                <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Overall Performance Tiers</CardDescription>
              </div>
              <BarChart3 className="h-5 w-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { range: "0-40", count: 12 },
                  { range: "41-60", count: 28 },
                  { range: "61-80", count: 42 },
                  { range: "81-100", count: 31 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: '2px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Tabs */}
      <Tabs defaultValue="submissions" className="space-y-6">
        <TabsList className="h-12 bg-slate-100 rounded-xl p-1 border-2 border-slate-200">
          <TabsTrigger value="submissions" className="rounded-lg px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            Recent Submissions
          </TabsTrigger>
          <TabsTrigger value="assessments" className="rounded-lg px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            Active Protocols
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          <Card className="border-2 border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="divide-y-2 divide-slate-50">
              {recentSubmissions.map((sub) => (
                <div key={sub.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-5">
                    <Avatar className="h-11 w-11 border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-slate-900 text-white font-black text-xs">{sub.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-slate-900">{sub.name}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{sub.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      {sub.score > 0 ? (
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">{sub.score}%</p>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[9px] font-black rounded-lg">PENDING</Badge>
                      )}
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{new Date(sub.date).toLocaleDateString()}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="assessments">
          <Card className="border-2 border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="divide-y-2 divide-slate-50">
              {recentAssessments.map((a) => (
                <div key={a.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className="h-11 w-11 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-lg tracking-tight">{a.title}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{a.role} • {a.candidates} Candidates</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={cn(
                      "uppercase text-[9px] font-black tracking-tighter px-3 py-1 rounded-lg border-2",
                      a.status === 'READY' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                    )}>
                      {a.status}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/assessments/view/${a.id}`)} className="rounded-xl border-2 font-bold px-4">
                      <Eye className="h-4 w-4 mr-2" /> View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}