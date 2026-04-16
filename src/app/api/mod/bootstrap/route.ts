import type { NextRequest } from "next/server";

import {
  buildRequestRateLimitKey,
  enforceRateLimit,
} from "@/lib/security";
import { deviceTokenSchema } from "@/lib/server/api-schemas";
import {
  deviceTokenFromRequest,
  failForRouteError,
  ok,
  parseWithSchema,
} from "@/lib/server/routes";
import { getDeviceBootstrap } from "@/lib/server/service";

export async function GET(request: NextRequest) {
  let responseInit: ResponseInit | undefined;

  try {
    const deviceToken = parseWithSchema(
      deviceTokenFromRequest(request),
      deviceTokenSchema,
    );
    const rateLimit = enforceRateLimit({
      bucket: "mod-bootstrap",
      key: buildRequestRateLimitKey(request, deviceToken),
      limit: 30,
      windowMs: 60 * 1000,
      message:
        "Слишком много запросов bootstrap. Подождите немного и попробуйте снова.",
    });
    responseInit = {
      headers: rateLimit.headers,
    };

    return ok(await getDeviceBootstrap(deviceToken), responseInit);
  } catch (error) {
    return failForRouteError(error, "MOD_BOOTSTRAP_FAILED", 500, responseInit);
  }
}
