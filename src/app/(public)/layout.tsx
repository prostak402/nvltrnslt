import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MaintenanceView } from "@/components/MaintenanceView";
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

  return (
    <>
      <Header />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </>
  );
}
