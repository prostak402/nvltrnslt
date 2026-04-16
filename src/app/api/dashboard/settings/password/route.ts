import type { NextRequest } from "next/server";

import {
  buildRequestRateLimitKey,
  enforceRateLimit,
} from "@/lib/security";
import { dashboardPasswordChangeBodySchema } from "@/lib/server/api-schemas";
import {
  changeUserPassword,
  requireUser,
  setSessionCookie,
} from "@/lib/server/auth";
import { fail, failForRouteError, ok, parseJson } from "@/lib/server/routes";

function failPasswordField(
  path: "currentPassword" | "newPassword",
  message: string,
  errorCode: string,
  init?: ResponseInit,
) {
  return fail(
    message,
    400,
    {
      errorCode,
      issues: [{ path, message }],
      fieldErrors: {
        [path]: [message],
      },
    },
    init,
  );
}

export async function POST(request: NextRequest) {
  let responseInit: ResponseInit | undefined;

  try {
    const user = await requireUser();
    const body = await parseJson(request, dashboardPasswordChangeBodySchema);
    const rateLimit = enforceRateLimit({
      bucket: "dashboard-settings-password",
      key: buildRequestRateLimitKey(request, user.id),
      limit: 5,
      windowMs: 10 * 60 * 1000,
      message:
        "Слишком много попыток смены пароля. Подождите немного и попробуйте снова.",
    });
    responseInit = {
      headers: rateLimit.headers,
    };

    const updatedUser = await changeUserPassword(user.id, {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });

    await setSessionCookie({
      userId: updatedUser.id,
      role: updatedUser.role,
      email: updatedUser.email,
    });

    return ok(
      {
        updated: true,
      },
      responseInit,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "CURRENT_PASSWORD_INVALID") {
      return failPasswordField(
        "currentPassword",
        "Текущий пароль указан неверно",
        error.message,
        responseInit,
      );
    }

    if (error instanceof Error && error.message === "PASSWORD_UNCHANGED") {
      return failPasswordField(
        "newPassword",
        "Новый пароль должен отличаться от текущего",
        error.message,
        responseInit,
      );
    }

    return failForRouteError(error, "PASSWORD_CHANGE_FAILED", 400, responseInit);
  }
}
