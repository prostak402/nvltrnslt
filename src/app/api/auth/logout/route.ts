import type { NextRequest } from "next/server";

import { clearSessionCookie } from "@/lib/server/auth";
import { assertNoBody, failForRouteError, ok } from "@/lib/server/routes";

export async function POST(request: NextRequest) {
  try {
    await assertNoBody(request);
    await clearSessionCookie();
    return ok({ success: true });
  } catch (error) {
    return failForRouteError(error, "LOGOUT_FAILED", 400);
  }
}
