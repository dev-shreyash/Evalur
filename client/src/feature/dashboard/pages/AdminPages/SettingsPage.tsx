"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import api from "@/api/axios";

import { Settings, FileText, Shield, Globe, Phone, Building2, Loader2, Save } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Organization name is required"),
  industry: z.string().min(2, "Industry is required"),
  website: z.string().url("Invalid URL format").or(z.literal("")),
  contactPhone: z.string().min(10, "Invalid phone number"),
  logoUrl: z.string().optional(),

  // Internal App Settings
  mcqDuration: z.string().default("30"),
  codingDuration: z.string().default("45"),
  passingScore: z.string().default("60"),
  allowSignup: z.boolean().default(false),
  inviteOnly: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export default function SettingsPage() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const watchSignup = watch("allowSignup");
  const watchInvite = watch("inviteOnly");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/org/profile");
        const data = res.data.data;
        reset(data);
        if (data.logoUrl) setLogoPreview(data.logoUrl);
      } catch (error) {
        reset({
          name: "Evalur Organization",
          industry: "Technology & Education",
          website: "https://evalur.io",
          contactPhone: "+1 555-0199",
          mcqDuration: "30",
          codingDuration: "45",
          passingScore: "60",
          allowSignup: false,
          inviteOnly: true,
        });
      }
    };
    fetchSettings();
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.patch("/org/profile", {
        name: data.name,
        industry: data.industry,
        website: data.website,
        logoUrl: data.logoUrl,
        contactPhone: data.contactPhone
      });

      if (res.status === 200) {
        toast.success("Organization profile updated successfully");
      }
    } catch (error) {
      toast.error("Failed to update organization profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fakeUrl = URL.createObjectURL(file);
      setLogoPreview(fakeUrl);
      setValue("logoUrl", fakeUrl);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure your organization profile, assessment defaults, and access policies.</p>
        </div>
        <Button 
          type="submit" 
          disabled={loading} 
          size="sm"
          className="h-9 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <TabsTrigger value="general" className="text-xs font-medium px-4 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
            <Settings className="h-3.5 w-3.5 mr-1.5" /> General
          </TabsTrigger>
          <TabsTrigger value="assessment" className="text-xs font-medium px-4 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
            <FileText className="h-3.5 w-3.5 mr-1.5" /> Assessment Defaults
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs font-medium px-4 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
            <Shield className="h-3.5 w-3.5 mr-1.5" /> Security & Access
          </TabsTrigger>
        </TabsList>

        {/* GENERAL TAB */}
        <TabsContent value="general" className="space-y-6">
          <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-950/60 p-5 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">Organization Profile</CardTitle>
              <CardDescription className="text-xs text-slate-500">Public profile and organization contact details.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Organization Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input {...register("name")} className="pl-9 h-9 text-xs" />
                  </div>
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Industry / Domain</Label>
                  <Input {...register("industry")} className="h-9 text-xs" placeholder="e.g. Technology / Higher Education" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input {...register("website")} className="pl-9 h-9 text-xs" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contact Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input {...register("contactPhone")} className="pl-9 h-9 text-xs" />
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-800" />

              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border border-slate-200 dark:border-slate-700">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-slate-900 text-white font-bold text-sm">EV</AvatarFallback>
                  )}
                </Avatar>
                <div className="space-y-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('logo-up')?.click()} className="text-xs h-8">
                    Change Logo
                  </Button>
                  <input id="logo-up" type="file" hidden onChange={handleLogoUpload} accept="image/*" />
                  <p className="text-[11px] text-slate-400">Square PNG or JPG recommended.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASSESSMENT TAB */}
        <TabsContent value="assessment">
          <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-950/60 p-5 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">Default Assessment Parameters</CardTitle>
              <CardDescription className="text-xs text-slate-500">Set default timeouts and minimum benchmark scores.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">MCQ Section Duration (Mins)</Label>
                  <Input type="number" {...register("mcqDuration")} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Coding Section Duration (Mins)</Label>
                  <Input type="number" {...register("codingDuration")} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Passing Benchmark (%)</Label>
                  <Input type="number" {...register("passingScore")} className="h-9 text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security">
          <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-950/60 p-5 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">Access Policies</CardTitle>
              <CardDescription className="text-xs text-slate-500">Configure registration policies and tenant boundaries.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Invite-Only Access</p>
                  <p className="text-[11px] text-slate-500">Only candidates and participants with an explicit invitation link can register.</p>
                </div>
                <Switch checked={watchInvite} onCheckedChange={(v) => setValue("inviteOnly", v)} />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Public Self-Registration</p>
                  <p className="text-[11px] text-slate-500">Allow users to register freely without an invitation token.</p>
                </div>
                <Switch checked={watchSignup} onCheckedChange={(v) => setValue("allowSignup", v)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
}
