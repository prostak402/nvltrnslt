import { redirect } from "next/navigation";

import { AdminLayoutShell } from "@/components/AdminLayoutShell";
import type { SessionSummary } from "@/lib/contracts/session";
import { getCurrentUser } from "@/lib/server/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
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

  return <AdminLayoutShell session={session}>{children}</AdminLayoutShell>;
}
