import type { NextRequest } from "next/server";

import {
  buildRequestRateLimitKey,
  enforceRateLimit,
} from "@/lib/security";
import { deviceTokenSchema, modItemBodySchema } from "@/lib/server/api-schemas";
import {
  deviceTokenFromRequest,
  failForRouteError,
  ok,
  parseJson,
  parseWithSchema,
} from "@/lib/server/routes";
import { saveDeviceStudyItem } from "@/lib/server/service";

export async function POST(request: NextRequest) {
  let responseInit: ResponseInit | undefined;

  try {
    const body = await parseJson(request, modItemBodySchema);
    const deviceToken = parseWithSchema(
      deviceTokenFromRequest(request),
      deviceTokenSchema,
    );
    const rateLimit = enforceRateLimit({
      bucket: "mod-items",
      key: buildRequestRateLimitKey(request, deviceToken),
      limit: 30,
      windowMs: 60 * 1000,
      message:
        "Слишком много запросов на сохранение карточек. Подождите немного и попробуйте снова.",
    });
    responseInit = {
      headers: rateLimit.headers,
    };

    return ok(
      await saveDeviceStudyItem({
        deviceToken,
        kind: body.kind,
        text: body.text,
      translation: body.translation,
      note: body.note,
      contextOriginal: body.contextOriginal,
      contextTranslation: body.contextTranslation,
      contextWordPosition: body.contextWordPosition,
      novelTitle: body.novelTitle,
    }),
      responseInit,
    );
  } catch (error) {
    return failForRouteError(error, "MOD_ITEMS_FAILED", 400, responseInit);
  }
}
