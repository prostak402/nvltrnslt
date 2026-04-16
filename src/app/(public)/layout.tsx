import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MaintenanceView } from "@/components/MaintenanceView";
import type { SessionSummary } from "@/lib/contracts/session";
import { getCurrentUser } from "@/lib/server/auth";
import { isMaintenanceModeEnabled } from "@/lib/server/services/site-settings";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, maintenanceMode] = await Promise.all([
    getCurrentUser(),
    isMaintenanceModeEnabled(),
  ]);

  if (maintenanceMode && user?.role !== "admin") {
    return <MaintenanceView />;
  }

  const session: SessionSummary = {
    isAuthenticated: Boolean(user),
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
        }
      : null,
  };

  return (
    <>
      <Header session={session} />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </>
  );
}
