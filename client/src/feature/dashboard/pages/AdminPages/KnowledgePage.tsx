"use client";

import { useState, useRef } from "react";
import { useLibraryDocuments, useUploadDocument } from "@/feature/dashboard/hooks/useAssessment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  UploadCloud, 
  FileText, 
  Database, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Loader2,
  FileUp,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function KnowledgePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: documents = [], isLoading, isFetching, refetch } = useLibraryDocuments();
  const uploadMutation = useUploadDocument();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const filteredDocs = documents.filter((doc: any) => 
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Knowledge Base</h1>
          <p className="text-sm text-slate-500 mt-1">Upload technical documentation, course notes, and syllabus materials to ground AI evaluations.</p>
        </div>
        <div className="flex gap-2.5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            className="h-9 px-3 rounded-md border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
            Sync
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Upload & Stats Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden rounded-xl">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 py-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upload Source Documents</CardTitle>
              <CardDescription className="text-xs text-slate-500">Supports PDF, TXT, or Markdown files</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div 
                className="w-full aspect-square max-w-[180px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/40 group hover:border-slate-400 transition-colors cursor-pointer mb-5" 
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="h-8 w-8 text-slate-400 group-hover:text-slate-600 transition-colors mb-2" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Click or Drop File</span>
              </div>
              
              <Input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileSelect}
                accept=".pdf,.txt,.md"
              />
              
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium h-9 rounded-md shadow-xs"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5" />
                    Processing Document...
                  </>
                ) : (
                  <>
                    <FileUp className="mr-1.5 h-3.5 w-3.5" />
                    Select Document
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <Database className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">Repository Volume</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">{documents.length}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Ingested Reference Documents</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Active
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Document Registry List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input 
              placeholder="Search uploaded documents..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md"
            />
          </div>

          <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 py-3.5 px-5">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Document Repository</CardTitle>
                <span className="text-xs text-slate-400">{filteredDocs.length} total</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="animate-spin h-5 w-5 text-slate-600" />
                  <span className="text-xs">Loading documents...</span>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No documents found matching your search.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDocs.map((doc: any) => (
                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{doc.filename}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>ID: #{doc.id}</span>
                            {doc.extractedTopics?.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{doc.extractedTopics.length} topics extracted</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Indexed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
