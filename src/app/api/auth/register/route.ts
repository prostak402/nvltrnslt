import type { NextRequest } from "next/server";

import {
  buildRequestRateLimitKey,
  enforceRateLimit,
} from "@/lib/security";
import { registerBodySchema } from "@/lib/server/api-schemas";
import { registerUser, setSessionCookie } from "@/lib/server/auth";
import { fail, failForRouteError, ok, parseJson } from "@/lib/server/routes";
import {
  assertRegistrationOpen,
  assertSiteAccessAllowed,
} from "@/lib/server/services/site-settings";

export async function POST(request: NextRequest) {
  let responseInit: ResponseInit | undefined;

  try {
    await assertSiteAccessAllowed("user");
    await assertRegistrationOpen();

    const body = await parseJson(request, registerBodySchema);
    const rateLimit = enforceRateLimit({
      bucket: "auth-register",
      key: buildRequestRateLimitKey(request),
      limit: 5,
      windowMs: 60 * 60 * 1000,
      message:
        "Слишком много попыток регистрации. Подождите немного и попробуйте снова.",
    });
    responseInit = {
      headers: rateLimit.headers,
    };

    const user = await registerUser({
      name: body.name,
      email: body.email.toLowerCase(),
      password: body.password,
    });

    await setSessionCookie({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

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
    const message = error instanceof Error ? error.message : "REGISTER_FAILED";
    if (message === "EMAIL_EXISTS") {
      return fail(
        "Пользователь с такой почтой уже существует",
        400,
        undefined,
        responseInit,
      );
    }

    return failForRouteError(error, "REGISTER_FAILED", 400, responseInit);
  }
}
