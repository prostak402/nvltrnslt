import type { NextRequest } from "next/server";

import { adminSettingsBodySchema } from "@/lib/server/api-schemas";
import { requireAdmin } from "@/lib/server/auth";
import { getAdminSettingsData, saveAdminSettings } from "@/lib/server/service";
import { failForRouteError, ok, parseJson } from "@/lib/server/routes";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getAdminSettingsData());
  } catch (error) {
    return failForRouteError(error, "ADMIN_SETTINGS_LOAD_FAILED", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await parseJson(request, adminSettingsBodySchema);
    return ok(await saveAdminSettings(admin.id, body));
  } catch (error) {
    return failForRouteError(error, "ADMIN_SETTINGS_SAVE_FAILED", 400);
  }
}
