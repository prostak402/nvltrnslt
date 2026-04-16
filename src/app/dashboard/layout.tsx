import { redirect } from "next/navigation";

import { MaintenanceView } from "@/components/MaintenanceView";
import { DashboardShell } from "@/components/DashboardShell";
import type { DashboardShellSummary } from "@/lib/contracts/dashboard";
import type { SessionSummary } from "@/lib/contracts/session";
import { getCurrentUser } from "@/lib/server/auth";
import { getDashboardShellSummary } from "@/lib/server/services/study";
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

  if (maintenanceMode) {
    return <MaintenanceView />;
  }

  const shellSummary: DashboardShellSummary = await getDashboardShellSummary(user.id);

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

  return (
    <DashboardShell session={session} shellSummary={shellSummary}>
      {children}
    </DashboardShell>
  );
}
