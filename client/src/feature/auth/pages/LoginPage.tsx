import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useLogin } from "../../auth/hooks/useLogin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
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
            Technical assessment & skills evaluation platform.
          </h2>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            Verify technical competencies and course learning with syllabus-grounded and role-specific assessments.
          </p>
        </div>

        <div className="space-y-3 pt-8 border-t border-slate-800">
           <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <span>Copyright © {new Date().getFullYear()} Evalur. All rights reserved.</span>
          </div>
        </div>
      </div>

      {/* LOGIN FORM PANEL */}
      <div className="flex flex-col justify-center p-8 sm:p-10 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5">
            Enter your credentials to access your account dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
          {/* EMAIL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Email Address</label>
            <Input 
              type="email" 
              {...register("email")} 
              placeholder="name@organization.com" 
              className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
          </div>

          {/* PASSWORD */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Password</label>
              <a href="#" className="text-xs text-slate-500 hover:text-slate-900 font-medium">Forgot password?</a>
            </div>
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
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-10 shadow-sm" 
            disabled={isPending}
          >
            {isPending ? "Authenticating..." : "Sign In to Evalur"}
          </Button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-600">
            Need an organization account?{" "}
            <Link to="/auth/register" className="font-semibold text-slate-900 hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
