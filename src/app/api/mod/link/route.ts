import type { NextRequest } from "next/server";

import {
  buildRequestRateLimitKey,
  enforceRateLimit,
} from "@/lib/security";
import { modLinkBodySchema } from "@/lib/server/api-schemas";
import { failForRouteError, ok, parseJson } from "@/lib/server/routes";
import {
  linkDeviceFromActivationKey,
  linkDeviceFromCode,
} from "@/lib/server/service";

export async function POST(request: NextRequest) {
  let responseInit: ResponseInit | undefined;

  try {
    const body = await parseJson(request, modLinkBodySchema);
    const identity = body.code ?? body.activationKey ?? "unknown";
    const rateLimit = enforceRateLimit({
      bucket: "mod-link",
      key: buildRequestRateLimitKey(request, identity),
      limit: 10,
      windowMs: 10 * 60 * 1000,
      message:
        "Слишком много попыток привязки устройства. Подождите немного и попробуйте снова.",
    });
    responseInit = {
      headers: rateLimit.headers,
    };

    if (body.activationKey) {
      return ok(
        await linkDeviceFromActivationKey({
          activationKey: body.activationKey,
          deviceLabel: body.deviceLabel,
        }),
        responseInit,
      );
    }

    return ok(
      await linkDeviceFromCode({
        code: body.code ?? "",
        deviceLabel: body.deviceLabel,
      }),
      responseInit,
    );
  } catch (error) {
    return failForRouteError(error, "MOD_LINK_FAILED", 400, responseInit);
  }
}
