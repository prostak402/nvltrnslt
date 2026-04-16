import type { NextRequest } from "next/server";

import {
  buildRequestRateLimitKey,
  enforceRateLimit,
} from "@/lib/security";
import { modActivateBodySchema } from "@/lib/server/api-schemas";
import { failForRouteError, ok, parseJson } from "@/lib/server/routes";
import { linkDeviceFromActivationKey } from "@/lib/server/service";

export async function POST(request: NextRequest) {
  let responseInit: ResponseInit | undefined;

  try {
    const body = await parseJson(request, modActivateBodySchema);
    const rateLimit = enforceRateLimit({
      bucket: "mod-activate",
      key: buildRequestRateLimitKey(request, body.activationKey),
      limit: 8,
      windowMs: 10 * 60 * 1000,
      message:
        "Слишком много попыток активации. Подождите немного и попробуйте снова.",
    });
    responseInit = {
      headers: rateLimit.headers,
    };

    return ok(
      await linkDeviceFromActivationKey({
        activationKey: body.activationKey,
        deviceLabel: body.deviceLabel,
      }),
      responseInit,
    );
  } catch (error) {
    return failForRouteError(error, "MOD_ACTIVATION_FAILED", 400, responseInit);
  }
}
