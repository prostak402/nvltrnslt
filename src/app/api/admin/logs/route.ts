import { requireAdmin } from "@/lib/server/auth";
import { getAdminLogsData } from "@/lib/server/service";
import { failForRouteError, ok } from "@/lib/server/routes";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getAdminLogsData());
  } catch (error) {
    return failForRouteError(error, "ADMIN_LOGS_LOAD_FAILED", 500);
  }
}
