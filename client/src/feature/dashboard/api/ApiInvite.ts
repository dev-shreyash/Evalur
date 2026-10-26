import api from "@/api/axios";

export const sendInvite = async (data: {
  role: string;
  seniorityLevel?: string;
  cohortId?: number;
}) => {
  const res = await api.post("/org/invite", data);
  return res.data;
};