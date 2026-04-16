import type { NextRequest } from "next/server";

import { getHealthHeaders } from "@/lib/server/health.mjs";
import { withApiSecurityHeaders } from "@/lib/server/routes";
import {
  captureObservedError,
  renderPrometheusMetrics,
} from "@/lib/server/services/observability";
import { requestIsFromTrustedLocalhost } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!requestIsFromTrustedLocalhost(request)) {
    return new Response("metrics endpoint is restricted to trusted local requests\n", {
      ...withApiSecurityHeaders({
        status: 403,
        headers: {
          ...getHealthHeaders(),
          "Content-Type": "text/plain; charset=utf-8",
        },
      }),
    });
  }

  try {
    const body = await renderPrometheusMetrics();

    return new Response(body, {
      ...withApiSecurityHeaders({
        status: 200,
        headers: {
          ...getHealthHeaders(),
          "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        },
      }),
    });
  } catch (error) {
    void captureObservedError({
      source: "METRICS_RENDER_FAILED",
      code: "METRICS_RENDER_FAILED",
      status: 500,
      message:
        error instanceof Error ? error.message : "Metrics render failed",
    }).catch(() => null);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const fallbackBody = [
      "# HELP nvltrnslt_observability_scrape_success Whether the last metrics snapshot was collected successfully",
      "# TYPE nvltrnslt_observability_scrape_success gauge",
      "nvltrnslt_observability_scrape_success 0",
      "# HELP nvltrnslt_observability_scrape_failure_timestamp_seconds Unix timestamp of the latest scrape failure",
      "# TYPE nvltrnslt_observability_scrape_failure_timestamp_seconds gauge",
      `nvltrnslt_observability_scrape_failure_timestamp_seconds ${nowSeconds}`,
    ].join("\n");

    return new Response(`${fallbackBody}\n`, {
      ...withApiSecurityHeaders({
        status: 200,
        headers: {
          ...getHealthHeaders(),
          "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        },
      }),
    });
  }
}
