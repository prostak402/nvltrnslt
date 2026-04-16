import { requireAdmin } from "@/lib/server/auth";
import { getAdminUsersData } from "@/lib/server/service";
import { failForRouteError, ok } from "@/lib/server/routes";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getAdminUsersData());
  } catch (error) {
    return failForRouteError(error, "ADMIN_USERS_LOAD_FAILED", 500);
  }
}
