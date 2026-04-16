import { getDatabase } from "@/lib/db/client";
import { withApiSecurityHeaders } from "@/lib/server/routes";
import {
  buildHealthPayload,
  getHealthHeaders,
  getHealthHttpStatus,
} from "@/lib/server/health.mjs";
import { runScheduledBackupIfDue } from "@/lib/server/services/backups";
import { recordServiceProbe } from "@/lib/server/services/observability";

export const dynamic = "force-dynamic";

async function getDatabaseHealthCheck() {
  const startedAt = performance.now();

  try {
    await getDatabase().client`select 1 as ok`;

    return {
      status: "ok" as const,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch {
    return {
      status: "error" as const,
      latencyMs: Math.round(performance.now() - startedAt),
      error: "DATABASE_UNAVAILABLE",
    };
  }
}

async function getHealthPayload() {
  return buildHealthPayload({
    checks: {
      database: await getDatabaseHealthCheck(),
    },
  });
}

export async function GET() {
  await runScheduledBackupIfDue().catch(() => null);
  const payload = await getHealthPayload();
  await recordServiceProbe("health", {
    status: payload.status as "ok" | "degraded" | "unknown",
    checks: payload.checks,
  }).catch(() => null);

  return Response.json(payload, {
    ...withApiSecurityHeaders({
      status: getHealthHttpStatus(payload.status),
      headers: getHealthHeaders(),
    }),
  });
}

export async function HEAD() {
  const payload = await getHealthPayload();
  await recordServiceProbe("health", {
    status: payload.status as "ok" | "degraded" | "unknown",
    checks: payload.checks,
  }).catch(() => null);

  return new Response(null, {
    ...withApiSecurityHeaders({
      status: getHealthHttpStatus(payload.status),
      headers: getHealthHeaders(),
    }),
  });
}
