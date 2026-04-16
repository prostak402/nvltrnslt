import type { NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import { requireUser } from "@/lib/server/auth";
import {
  failForRouteError,
  withApiSecurityHeaders,
} from "@/lib/server/routes";
import { getActivationFilePayload } from "@/lib/server/service";

function resolvePublicSiteUrl(request: NextRequest) {
  if (serverEnv.SITE_URL) {
    return serverEnv.SITE_URL;
  }

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const protocol =
    forwardedProto ||
    request.nextUrl.protocol.replace(/:$/, "") ||
    "https";

  if (host && !/^0\.0\.0\.0(?::\d+)?$/.test(host)) {
    return `${protocol}://${host}`.replace(/\/+$/, "");
  }

  return request.nextUrl.origin.replace(/\/+$/, "");
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const payload = await getActivationFilePayload(
      user.id,
      resolvePublicSiteUrl(request),
    );

    return new Response(`${JSON.stringify(payload, null, 2)}\n`, {
      ...withApiSecurityHeaders({
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="nvl_translate_key.json"',
          "Cache-Control": "no-store",
        },
      }),
    });
  } catch (error) {
    return failForRouteError(error, "ACTIVATION_FILE_LOAD_FAILED", 500);
  }
}
