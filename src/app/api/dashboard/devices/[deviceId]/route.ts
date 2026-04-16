import type { NextRequest } from "next/server";

import { deviceIdParamsSchema } from "@/lib/server/api-schemas";
import { requireUser } from "@/lib/server/auth";
import { revokeDevice } from "@/lib/server/service";
import { failForRouteError, ok, parseWithSchema } from "@/lib/server/routes";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  try {
    const user = await requireUser();
    const { deviceId } = parseWithSchema(await params, deviceIdParamsSchema);
    return ok(await revokeDevice(user.id, deviceId));
  } catch (error) {
    return failForRouteError(error, "DEVICE_REVOKE_FAILED", 400);
  }
}
