import type { NextRequest } from "next/server";

import { gameIdParamsSchema } from "@/lib/server/api-schemas";
import { requireAdmin } from "@/lib/server/auth";
import { deleteCompatibilityGame } from "@/lib/server/service";
import { failForRouteError, ok, parseWithSchema } from "@/lib/server/routes";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { gameId } = parseWithSchema(await params, gameIdParamsSchema);
    await deleteCompatibilityGame(admin.id, gameId);
    return ok({ deleted: true });
  } catch (error) {
    return failForRouteError(error, "COMPATIBILITY_DELETE_FAILED", 400);
  }
}
