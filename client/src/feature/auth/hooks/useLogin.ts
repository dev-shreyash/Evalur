import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginUser } from "../../auth/api/ApiLogin";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/feature/auth/hooks/useAuth";

export const useLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      const userObj = {
        name: data.email.split('@')[0],
        email: data.email,
        role: data.role,
        organizationName: "",
      };

      // Update Redux state and localStorage
      login(data.token, userObj);

      // Invalidate existing server queries on login
      queryClient.invalidateQueries();

      toast.success("Login Successful");
      navigate("/dashboard");
    },
    onError: (error: any) => {
      toast.error("Login Failed", {
        description: error?.response?.data?.message || "Invalid credentials",
      });
    },
  });
};
