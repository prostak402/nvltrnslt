import type { NextRequest } from "next/server";

import { adminCompatibilityBodySchema } from "@/lib/server/api-schemas";
import { requireAdmin } from "@/lib/server/auth";
import { getAdminCompatibilityData, saveCompatibilityGame } from "@/lib/server/service";
import { failForRouteError, ok, parseJson } from "@/lib/server/routes";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getAdminCompatibilityData());
  } catch (error) {
    return failForRouteError(error, "ADMIN_COMPATIBILITY_LOAD_FAILED", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await parseJson(request, adminCompatibilityBodySchema);

    return ok(
      await saveCompatibilityGame(admin.id, {
        id: body.id,
        name: body.name,
        renpyVersion: body.renpyVersion,
        status: body.status,
        comment: body.comment,
      }),
    );
  } catch (error) {
    return failForRouteError(error, "COMPATIBILITY_SAVE_FAILED", 400);
  }
}
