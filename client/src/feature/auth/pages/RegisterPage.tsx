import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useRegister } from "../hooks/useRegister";
import { registerSchema, type RegisterFormData } from "../schema/registerSchema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");
  const isInvite = Boolean(inviteToken);

  const getDecodedPayload = () => {
    if (!inviteToken) return null;
    try {
      const base64Url = inviteToken.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const decoded = getDecodedPayload();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: decoded?.sub || decoded?.email || "",
      password: "",
      orgName: decoded?.orgName || "",
      role: decoded?.role || "ADMIN",
    },
  });

  const { mutate, isPending } = useRegister();

  const onSubmit: SubmitHandler<RegisterFormData> = (data) => {
    mutate(
      {
        ...data,
        seniorityLevel: decoded?.seniority || "STANDARD",
        inviteToken: inviteToken || null,
      },
      {
        onSuccess: () => {
          navigate("/auth/login");
        },
      }
    );
  };

  return (
    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
      {/* BRANDING PANEL */}
      <div className="hidden md:flex flex-col justify-between p-10 bg-slate-900 text-white">
        <div>
          <div className="flex items-center gap-3">
            <img src={logo} className="w-9 h-9 rounded-lg object-contain bg-white/10 p-1" alt="Evalur Logo" />
            <span className="text-2xl font-bold tracking-tight text-white">Evalur</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-8 leading-snug">
            {isInvite && decoded?.orgName
              ? `Join ${decoded.orgName} on Evalur.`
              : "Technical skills evaluation for education and industry."}
          </h2>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            {isInvite
              ? "Your technical assessment portal is ready. Complete your profile registration to access your assessments."
              : "Create an organization workspace to create course assessments, job-role benchmarks, and evaluate candidates."}
          </p>
        </div>

        <div className="space-y-3 pt-8 border-t border-slate-800">
          
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <span>Copyright © {new Date().getFullYear()} Evalur. All rights reserved.</span>
          </div>
        </div>
      </div>

      {/* REGISTRATION FORM PANEL */}
      <div className="flex flex-col justify-center p-8 sm:p-10 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isInvite ? "Complete Registration" : "Create Account"}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5">
            {isInvite
              ? "Fill in your profile details to accept your invitation."
              : "Set up your admin profile to begin creating evaluations."}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          {/* FULL NAME */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Full Name</label>
            <Input 
              {...register("name")} 
              placeholder="e.g. Alex Morgan" 
              className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>

          {/* EMAIL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Email Address</label>
            <Input 
              type="email" 
              {...register("email")} 
              placeholder="name@organization.com"
              disabled={isInvite && Boolean(decoded?.sub || decoded?.email)}
              className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
          </div>

          {/* ORGANIZATION (if not invite) */}
          {!isInvite && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Organization or Institution</label>
              <Input 
                {...register("orgName")} 
                placeholder="e.g. Acme Tech / University Dept"
                className={errors.orgName ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.orgName && <p className="text-red-500 text-xs">{errors.orgName.message}</p>}
            </div>
          )}

          {/* PASSWORD */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Password</label>
            <Input 
              type="password" 
              {...register("password")} 
              placeholder="••••••••"
              className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-10 shadow-sm mt-2" 
            disabled={isPending}
          >
            {isPending ? "Creating account..." : isInvite ? "Join Organization" : "Create Organization Account"}
          </Button>
        </form>

        <div className="text-center mt-6 pt-5 border-t border-slate-100">
          <p className="text-xs text-slate-600">
            Already have an account?{" "}
            <Link to="/auth/login" className="font-semibold text-slate-900 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
