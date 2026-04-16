import type { NextRequest } from "next/server";

import {
  buildRequestRateLimitKey,
  enforceRateLimit,
} from "@/lib/security";
import { loginBodySchema } from "@/lib/server/api-schemas";
import {
  authenticateUser,
  setSessionCookie,
  touchUserLastActive,
} from "@/lib/server/auth";
import { fail, failForRouteError, ok, parseJson } from "@/lib/server/routes";
import { assertSiteAccessAllowed } from "@/lib/server/services/site-settings";

export async function POST(request: NextRequest) {
  let responseInit: ResponseInit | undefined;

  try {
    const body = await parseJson(request, loginBodySchema);
    const rateLimit = enforceRateLimit({
      bucket: "auth-login",
      key: buildRequestRateLimitKey(request, body.email.toLowerCase()),
      limit: 5,
      windowMs: 10 * 60 * 1000,
      message:
        "Слишком много попыток входа. Подождите немного и попробуйте снова.",
    });
    responseInit = {
      headers: rateLimit.headers,
    };

    const user = await authenticateUser(body.email, body.password);
    if (!user) {
      return fail("Неверная почта или пароль", 401, undefined, responseInit);
    }

    await assertSiteAccessAllowed(user.role);

    await setSessionCookie({
      userId: user.id,
      role: user.role,
      email: user.email,
    });
    await touchUserLastActive(user.id);

    return ok(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
        },
      },
      responseInit,
    );
  } catch (error) {
    return failForRouteError(error, "LOGIN_FAILED", 400, responseInit);
  }
}
