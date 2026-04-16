import type { ApiFieldErrors, ApiIssue } from "@/lib/contracts/api";
import type { NextRequest } from "next/server";
import type { ZodIssue } from "zod";

import {
  buildRequestRateLimitKey,
  enforceRateLimit,
} from "@/lib/security";
import { resetPasswordBodySchema } from "@/lib/server/api-schemas";
import { resetPasswordWithToken } from "@/lib/server/auth";
import { fail, failForRouteError, ok, parseJson } from "@/lib/server/routes";
import { assertSiteAccessAllowed } from "@/lib/server/services/site-settings";

function validationMessageForIssue(issue: ZodIssue) {
  const path = String(issue.path[0] ?? "body");

  if (path === "token") {
    return "Ссылка восстановления недействительна";
  }

  if (path === "newPassword") {
    if (issue.code === "too_small") {
      return "Пароль должен быть не короче 6 символов";
    }

    return issue.message || "Введите новый пароль";
  }

  if (path === "confirmPassword") {
    if (issue.code === "custom") {
      return issue.message;
    }

    if (issue.code === "too_small" || issue.code === "invalid_type") {
      return "Подтвердите новый пароль";
    }

    return issue.message || "Подтвердите новый пароль";
  }

  return issue.message || "Проверьте данные и попробуйте еще раз";
}

function failWithField(
  path: string,
  message: string,
  errorCode: string,
  init?: ResponseInit,
) {
  const issues: ApiIssue[] = [{ path, message }];
  const fieldErrors: ApiFieldErrors = {
    [path]: [message],
  };

  return fail(
    message,
    400,
    {
      errorCode,
      issues,
      fieldErrors,
    },
    init,
  );
}

function failResetValidation(issues: ZodIssue[], init?: ResponseInit) {
  const normalizedIssues: ApiIssue[] = issues.map((issue) => ({
    path: String(issue.path[0] ?? "body"),
    message: validationMessageForIssue(issue),
  }));

  const fieldErrors = normalizedIssues.reduce<ApiFieldErrors>((acc, issue) => {
    acc[issue.path] = [...(acc[issue.path] ?? []), issue.message];
    return acc;
  }, {});

  return fail(
    normalizedIssues[0]?.message ?? "Проверьте данные и попробуйте еще раз",
    400,
    {
      issues: normalizedIssues,
      fieldErrors,
    },
    init,
  );
}

export async function POST(request: NextRequest) {
  let responseInit: ResponseInit | undefined;

  try {
    await assertSiteAccessAllowed("user");

    const payload = await parseJson<unknown>(request);
    const parsed = resetPasswordBodySchema.safeParse(payload);
    if (!parsed.success) {
      return failResetValidation(parsed.error.issues, responseInit);
    }

    const rateLimit = enforceRateLimit({
      bucket: "auth-reset-password",
      key: buildRequestRateLimitKey(request, parsed.data.token.slice(0, 12)),
      limit: 8,
      windowMs: 10 * 60 * 1000,
      message:
        "Слишком много попыток сброса пароля. Подождите немного и попробуйте снова.",
    });
    responseInit = {
      headers: rateLimit.headers,
    };

    const user = await resetPasswordWithToken({
      token: parsed.data.token,
      newPassword: parsed.data.newPassword,
    });

    return ok(
      {
        updated: true,
        email: user.email,
      },
      responseInit,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "PASSWORD_RESET_TOKEN_INVALID") {
      return failWithField(
        "token",
        "Ссылка сброса недействительна или уже истекла",
        error.message,
        responseInit,
      );
    }

    if (error instanceof Error && error.message === "PASSWORD_UNCHANGED") {
      return failWithField(
        "newPassword",
        "Новый пароль должен отличаться от текущего",
        error.message,
        responseInit,
      );
    }

    return failForRouteError(error, "RESET_PASSWORD_FAILED", 400, responseInit);
  }
}
