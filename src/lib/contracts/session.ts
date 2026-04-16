import type { PlanId, UserRole } from "@/lib/types";

export interface SessionUserSummary {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  plan: PlanId;
}

export interface SessionSummary {
  isAuthenticated: boolean;
  user: SessionUserSummary | null;
}
