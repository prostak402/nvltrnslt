import { requireAdmin } from "@/lib/server/auth";
import { getAdminAnalyticsData } from "@/lib/server/service";
import { failForRouteError, ok } from "@/lib/server/routes";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getAdminAnalyticsData());
  } catch (error) {
    return failForRouteError(error, "ADMIN_ANALYTICS_LOAD_FAILED", 500);
  }
}
