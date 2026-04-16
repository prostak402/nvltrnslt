import { requireAdmin } from "@/lib/server/auth";
import { getAdminSubscriptionsData } from "@/lib/server/service";
import { failForRouteError, ok } from "@/lib/server/routes";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getAdminSubscriptionsData());
  } catch (error) {
    return failForRouteError(error, "ADMIN_SUBSCRIPTIONS_LOAD_FAILED", 500);
  }
}
