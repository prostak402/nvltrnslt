import type { NextRequest } from "next/server";

import { requireUser } from "@/lib/server/auth";
import {
  failForRouteError,
  withApiSecurityHeaders,
} from "@/lib/server/routes";
import { getActivationFilePayload } from "@/lib/server/service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const payload = await getActivationFilePayload(user.id, request.nextUrl.origin);

    return new Response(`${JSON.stringify(payload, null, 2)}\n`, {
      ...withApiSecurityHeaders({
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="nvl_translate_key.json"',
          "Cache-Control": "no-store",
        },
      }),
    });
  } catch (error) {
    return failForRouteError(error, "ACTIVATION_FILE_LOAD_FAILED", 500);
  }
}
