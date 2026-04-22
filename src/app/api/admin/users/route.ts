import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { adminUserAccessBodySchema } from "@/lib/server/api-schemas";
import { getAdminUsersData, updateAdminUserAccess } from "@/lib/server/service";
import { failForRouteError, ok, parseJson } from "@/lib/server/routes";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getAdminUsersData());
  } catch (error) {
    return failForRouteError(error, "ADMIN_USERS_LOAD_FAILED", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await parseJson(request, adminUserAccessBodySchema);
    return ok(await updateAdminUserAccess(admin.id, body));
  } catch (error) {
    return failForRouteError(error, "ADMIN_USER_UPDATE_FAILED", 400);
  }
}
