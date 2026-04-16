import type { NextRequest } from "next/server";

import {
  buildRequestRateLimitKey,
  enforceRateLimit,
} from "@/lib/security";
import { deviceTokenSchema, modTranslateBodySchema } from "@/lib/server/api-schemas";
import {
  deviceTokenFromRequest,
  fail,
  failForRouteError,
  ok,
  parseJson,
  parseWithSchema,
} from "@/lib/server/routes";
import { translateForDevice } from "@/lib/server/service";
import { captureObservedError } from "@/lib/server/services/observability";

export async function POST(request: NextRequest) {
  let responseInit: ResponseInit | undefined;

  try {
    const body = await parseJson(request, modTranslateBodySchema);
    const deviceToken = parseWithSchema(
      deviceTokenFromRequest(request),
      deviceTokenSchema,
    );
    const rateLimit = enforceRateLimit({
      bucket: "mod-translate",
      key: buildRequestRateLimitKey(request, deviceToken),
      limit: 60,
      windowMs: 60 * 1000,
      message:
        "Слишком много запросов на перевод. Подождите немного и попробуйте снова.",
    });
    responseInit = {
      headers: rateLimit.headers,
    };

    return ok(
      await translateForDevice({
        deviceToken,
        text: body.text,
      }),
      responseInit,
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "TRANSLATION_LIMIT_REACHED") {
        return fail(
          "Дневной лимит перевода исчерпан. Попробуйте позже или обновите тариф.",
          429,
          { errorCode: error.message },
          responseInit,
        );
      }

      if (error.message === "TRANSLATION_PROVIDER_UNAVAILABLE") {
        void captureObservedError({
          source: "MOD_TRANSLATE_FAILED",
          code: error.message,
          status: 503,
          message: "Translation provider unavailable",
        }).catch(() => null);
        return fail(
          "Сервис перевода временно недоступен. Повторите попытку позже.",
          503,
          { errorCode: error.message },
          responseInit,
        );
      }

      if (error.message === "TRANSLATION_PROVIDER_MISCONFIGURED") {
        void captureObservedError({
          source: "MOD_TRANSLATE_FAILED",
          code: error.message,
          status: 503,
          message: "Translation provider misconfigured",
        }).catch(() => null);
        return fail(
          "Сервис перевода сейчас недоступен. Попробуйте позже.",
          503,
          { errorCode: error.message },
          responseInit,
        );
      }
    }

    return failForRouteError(error, "MOD_TRANSLATE_FAILED", 400, responseInit);
  }
}
