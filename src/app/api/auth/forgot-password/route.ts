import type { NextRequest } from "next/server";

import {
  buildRequestRateLimitKey,
  enforceRateLimit,
} from "@/lib/security";
import { forgotPasswordBodySchema } from "@/lib/server/api-schemas";
import { requestPasswordReset } from "@/lib/server/auth";
import { failForRouteError, ok, parseJson } from "@/lib/server/routes";
import { assertSiteAccessAllowed } from "@/lib/server/services/site-settings";

export async function POST(request: NextRequest) {
  let responseInit: ResponseInit | undefined;

  try {
    await assertSiteAccessAllowed("user");

    const body = await parseJson(request, forgotPasswordBodySchema);
    const rateLimit = enforceRateLimit({
      bucket: "auth-forgot-password",
      key: buildRequestRateLimitKey(request, body.email.toLowerCase()),
      limit: 5,
      windowMs: 60 * 60 * 1000,
      message:
        "Слишком много запросов на восстановление доступа. Подождите немного и попробуйте снова.",
    });
    responseInit = {
      headers: rateLimit.headers,
    };

    return ok(
      await requestPasswordReset({
        email: body.email,
        origin: request.nextUrl.origin,
      }),
      responseInit,
    );
  } catch (error) {
    return failForRouteError(error, "FORGOT_PASSWORD_FAILED", 400, responseInit);
  }
}
