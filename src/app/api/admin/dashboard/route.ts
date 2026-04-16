import { requireAdmin } from "@/lib/server/auth";
import { getAdminDashboardData } from "@/lib/server/service";
import { failForRouteError, ok } from "@/lib/server/routes";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getAdminDashboardData());
  } catch (error) {
    return failForRouteError(error, "ADMIN_DASHBOARD_LOAD_FAILED", 500);
  }
}
