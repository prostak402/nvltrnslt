import { getDatabase } from "@/lib/db/client";
import { serverEnv } from "@/lib/env";
import { withApiSecurityHeaders } from "@/lib/server/routes";
import {
  buildReadinessPayload,
  getHealthHeaders,
  getReadinessHttpStatus,
} from "@/lib/server/health.mjs";
import { ensureBackupStorageAvailable } from "@/lib/server/services/backups";
import { recordServiceProbe } from "@/lib/server/services/observability";
import { getSecurityAuditSummary } from "@/lib/server/services/security-audit";
import { translationProviderIsConfigured } from "@/lib/server/services/translation";

export const dynamic = "force-dynamic";

async function getDatabaseReadinessCheck() {
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

async function getBackupStorageCheck() {
  const startedAt = performance.now();

  try {
    await ensureBackupStorageAvailable();

    return {
      status: "ok" as const,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch {
    return {
      status: "error" as const,
      latencyMs: Math.round(performance.now() - startedAt),
      error: "BACKUP_STORAGE_UNAVAILABLE",
    };
  }
}

async function getConfigCheck() {
  const startedAt = performance.now();
  const securityAudit = getSecurityAuditSummary();
  const authConfigured =
    typeof serverEnv.AUTH_SECRET === "string" &&
    serverEnv.AUTH_SECRET.trim().length >= 32;

  return {
    status:
      authConfigured && securityAudit.status === "ok"
        ? ("ok" as const)
        : ("error" as const),
    latencyMs: Math.round(performance.now() - startedAt),
    ...(authConfigured && securityAudit.status === "ok"
      ? {}
      : {
          error: securityAudit.primaryErrorCode ?? "AUTH_SECRET_INVALID",
        }),
  };
}

async function getReadinessPayload() {
  const securityAudit = getSecurityAuditSummary();
  const checks = {
    database: await getDatabaseReadinessCheck(),
    backupStorage: await getBackupStorageCheck(),
    config: await getConfigCheck(),
  };
  const warnings = [
    ...securityAudit.warnings,
    ...(translationProviderIsConfigured()
      ? []
      : [
          "Yandex Cloud РїРµСЂРµРІРѕРґС‡РёРє РЅРµ РЅР°СЃС‚СЂРѕРµРЅ. РЎРµСЂРІРёСЃ РѕСЃС‚Р°С‘С‚СЃСЏ РіРѕС‚РѕРІС‹Рј, РЅРѕ СЂР°Р±РѕС‚Р°РµС‚ СЃ fallback-РїРµСЂРµРІРѕРґРѕРј.",
        ]),
  ];

  return buildReadinessPayload({
    checks,
    warnings,
  });
}

export async function GET() {
  const payload = await getReadinessPayload();
  await recordServiceProbe("readiness", {
    status: payload.status as "ready" | "not_ready" | "unknown",
    checks: payload.checks,
    warnings: payload.warnings,
  }).catch(() => null);

  return Response.json(payload, {
    ...withApiSecurityHeaders({
      status: getReadinessHttpStatus(payload.status),
      headers: getHealthHeaders(),
    }),
  });
}

export async function HEAD() {
  const payload = await getReadinessPayload();
  await recordServiceProbe("readiness", {
    status: payload.status as "ready" | "not_ready" | "unknown",
    checks: payload.checks,
    warnings: payload.warnings,
  }).catch(() => null);

  return new Response(null, {
    ...withApiSecurityHeaders({
      status: getReadinessHttpStatus(payload.status),
      headers: getHealthHeaders(),
    }),
  });
}
