import { redirect } from "next/navigation";

import { MaintenanceView } from "@/components/MaintenanceView";
import { DashboardShell } from "@/components/DashboardShell";
import type { SessionSummary } from "@/lib/contracts/session";
import { getCurrentUser } from "@/lib/server/auth";
import { isMaintenanceModeEnabled } from "@/lib/server/services/site-settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, maintenanceMode] = await Promise.all([
    getCurrentUser(),
    isMaintenanceModeEnabled(),
  ]);

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role === "admin") {
    redirect("/admin");
  }

  if (maintenanceMode) {
    return <MaintenanceView />;
  }

  const session: SessionSummary = {
    isAuthenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
    },
  };

  return <DashboardShell session={session}>{children}</DashboardShell>;
}
