import "server-only";

import { count, eq, sql } from "drizzle-orm";

import { APP_NAME, APP_VERSION } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import {
  devices,
  studyItems,
  supportTickets,
  systemState,
  translationUsageDaily,
  users,
} from "@/lib/db/schema";
import { nowIso, startOfDayKey } from "@/lib/server/utils";

import {
  applyProbeUpdate,
  appendObservedError,
  normalizeObservabilityState,
  summarizeObservability,
} from "@/lib/server/observability-domain.mjs";

import { getBackupStatusRecord } from "./backups";
import { logAdmin } from "./shared";
import { getAdminSettingsRecord } from "./site-settings";
import { sendAlertDelivery } from "./alert-delivery";

const OBSERVABILITY_STATE_KEY = "observability_state";
const PROBE_WRITE_INTERVAL_MS = 60 * 1000;

type ProbeKind = "health" | "readiness";

type ProbePayload = {
  status: "ok" | "degraded" | "unknown" | "ready" | "not_ready";
  checks: Record<string, unknown>;
  warnings?: string[];
};

export async function getObservabilityState() {
  const [entry] = await getDb()
    .select({ payload: systemState.payload })
    .from(systemState)
    .where(eq(systemState.key, OBSERVABILITY_STATE_KEY))
    .limit(1);

  return normalizeObservabilityState(entry?.payload);
}

async function saveObservabilityState(state: unknown) {
  await getDb()
    .insert(systemState)
    .values({
      key: OBSERVABILITY_STATE_KEY,
      payload: state,
    })
    .onConflictDoUpdate({
      target: systemState.key,
      set: {
        payload: state,
      },
    });
}

function shouldPersistProbe(previousCheckedAt: string | null, nextStatus: string) {
  if (!previousCheckedAt) {
    return true;
  }

  const previousCheckedMs = new Date(previousCheckedAt).getTime();
  if (Number.isNaN(previousCheckedMs)) {
    return true;
  }

  if (nextStatus === "degraded" || nextStatus === "not_ready") {
    return true;
  }

  return Date.now() - previousCheckedMs >= PROBE_WRITE_INTERVAL_MS;
}

function summarizeChecks(checks: Record<string, unknown>) {
  return Object.entries(checks)
    .map(([key, value]) => {
      const status =
        value && typeof value === "object" && "status" in value
          ? String((value as { status?: unknown }).status ?? "unknown")
          : "unknown";
      return `${key}=${status}`;
    })
    .join(", ");
}

export async function recordServiceProbe(kind: ProbeKind, payload: ProbePayload) {
  const currentState = await getObservabilityState();
  const currentProbe = currentState[kind];
  const next = applyProbeUpdate(currentState, {
    kind,
    status: payload.status,
    checks: payload.checks,
    warnings: payload.warnings ?? [],
  });

  if (
    next.transition === null &&
    !shouldPersistProbe(currentProbe.checkedAt, payload.status)
  ) {
    return next.state;
  }

  await saveObservabilityState(next.state);

  if (!next.transition) {
    return next.state;
  }

  await getDb().transaction(async (tx) => {
    await logAdmin(tx, {
      adminUserId: null,
      type: "system",
      action:
        next.transition === "recovered"
          ? kind === "health"
            ? "Health-check снова в норме"
            : "Readiness снова в норме"
          : kind === "health"
            ? "Health-check сигнализирует деградацию"
            : "Readiness сигнализирует неготовность",
      detail: summarizeChecks(payload.checks),
      level: next.transition === "recovered" ? "success" : "warning",
    });
  });

  const settings = await getAdminSettingsRecord();
  if (settings.errorAlerts) {
    await sendAlertDelivery({
      category: "error",
      title:
        next.transition === "recovered"
          ? kind === "health"
            ? "Health-check снова в норме"
            : "Readiness снова в норме"
          : kind === "health"
            ? "Health-check сигнализирует деградацию"
            : "Readiness сигнализирует неготовность",
      lines: [summarizeChecks(payload.checks)],
      dedupeKey: `${kind}:${payload.status}`,
      minIntervalMs: 60_000,
    });
  }

  return next.state;
}

export async function captureObservedError(params: {
  source: string;
  code: string;
  status: number;
  message: string;
}) {
  if (params.status < 500) {
    return;
  }

  const nextState = appendObservedError(await getObservabilityState(), params);
  await saveObservabilityState(nextState);

  await getDb().transaction(async (tx) => {
    await logAdmin(tx, {
      adminUserId: null,
      type: "system",
      action: "Зафиксирована серверная ошибка",
      detail: `${params.source} [${params.code}] ${params.message}`,
      level: "error",
    });
  });

  const settings = await getAdminSettingsRecord();
  if (settings.errorAlerts) {
    await sendAlertDelivery({
      category: "error",
      title: "Зафиксирована серверная ошибка",
      lines: [
        `source: ${params.source}`,
        `code: ${params.code}`,
        `status: ${params.status}`,
        `message: ${params.message}`,
      ],
      dedupeKey: `error:${params.source}:${params.code}:${params.status}`,
      minIntervalMs: 300_000,
    });
  }
}

export async function getObservabilitySummary() {
  return summarizeObservability(await getObservabilityState());
}

export async function getMetricsSnapshot() {
  const todayKey = startOfDayKey();
  const [usersTotalRow, activeDevicesRow, studyItemsRow, openTicketsRow, translationsTodayRows, backupStatus, observability] =
    await Promise.all([
      getDb().select({ value: count() }).from(users),
      getDb()
        .select({ value: count() })
        .from(devices)
        .where(eq(devices.status, "active")),
      getDb().select({ value: count() }).from(studyItems),
      getDb()
        .select({ value: count() })
        .from(supportTickets)
        .where(eq(supportTickets.status, "open")),
      getDb()
        .select({ total: sql<number>`coalesce(sum(${translationUsageDaily.count}), 0)` })
        .from(translationUsageDaily)
        .where(eq(translationUsageDaily.dayKey, todayKey)),
      getBackupStatusRecord(),
      getObservabilitySummary(),
    ]);

  return {
    generatedAt: nowIso(),
    service: APP_NAME,
    version: APP_VERSION,
    health: observability.health,
    readiness: observability.readiness,
    recentErrors15m: observability.recentErrors15m,
    recentErrors24h: observability.recentErrors24h,
    lastError: observability.lastError,
    counters: {
      usersTotal: usersTotalRow[0]?.value ?? 0,
      activeDevicesTotal: activeDevicesRow[0]?.value ?? 0,
      studyItemsTotal: studyItemsRow[0]?.value ?? 0,
      openSupportTicketsTotal: openTicketsRow[0]?.value ?? 0,
      translationsTodayTotal: Number(translationsTodayRows[0]?.total ?? 0),
    },
    backup: {
      lastSuccessAt: backupStatus.lastSuccessAt,
      lastErrorAt: backupStatus.lastErrorAt,
    },
  };
}

function timestampSeconds(value: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
}

export async function renderPrometheusMetrics() {
  const snapshot = await getMetricsSnapshot();
  const lines = [
    "# HELP nvltrnslt_observability_scrape_success Whether the last metrics snapshot was collected successfully",
    "# TYPE nvltrnslt_observability_scrape_success gauge",
    "nvltrnslt_observability_scrape_success 1",
    "# HELP nvltrnslt_health_status Current health status (1 = ok, 0 = degraded)",
    "# TYPE nvltrnslt_health_status gauge",
    `nvltrnslt_health_status ${snapshot.health.status === "ok" ? 1 : 0}`,
    "# HELP nvltrnslt_readiness_status Current readiness status (1 = ready, 0 = not ready)",
    "# TYPE nvltrnslt_readiness_status gauge",
    `nvltrnslt_readiness_status ${snapshot.readiness.status === "ready" ? 1 : 0}`,
    "# HELP nvltrnslt_users_total Total users",
    "# TYPE nvltrnslt_users_total gauge",
    `nvltrnslt_users_total ${snapshot.counters.usersTotal}`,
    "# HELP nvltrnslt_active_devices_total Active devices",
    "# TYPE nvltrnslt_active_devices_total gauge",
    `nvltrnslt_active_devices_total ${snapshot.counters.activeDevicesTotal}`,
    "# HELP nvltrnslt_study_items_total Saved study items",
    "# TYPE nvltrnslt_study_items_total gauge",
    `nvltrnslt_study_items_total ${snapshot.counters.studyItemsTotal}`,
    "# HELP nvltrnslt_open_support_tickets_total Open support tickets",
    "# TYPE nvltrnslt_open_support_tickets_total gauge",
    `nvltrnslt_open_support_tickets_total ${snapshot.counters.openSupportTicketsTotal}`,
    "# HELP nvltrnslt_translations_today_total Translation units used today",
    "# TYPE nvltrnslt_translations_today_total gauge",
    `nvltrnslt_translations_today_total ${snapshot.counters.translationsTodayTotal}`,
    "# HELP nvltrnslt_recent_errors_total Recent tracked server errors",
    "# TYPE nvltrnslt_recent_errors_total gauge",
    `nvltrnslt_recent_errors_total{window="15m"} ${snapshot.recentErrors15m}`,
    `nvltrnslt_recent_errors_total{window="24h"} ${snapshot.recentErrors24h}`,
    "# HELP nvltrnslt_backup_last_success_timestamp_seconds Last successful backup timestamp",
    "# TYPE nvltrnslt_backup_last_success_timestamp_seconds gauge",
    `nvltrnslt_backup_last_success_timestamp_seconds ${timestampSeconds(snapshot.backup.lastSuccessAt)}`,
    "# HELP nvltrnslt_backup_last_error_timestamp_seconds Last backup error timestamp",
    "# TYPE nvltrnslt_backup_last_error_timestamp_seconds gauge",
    `nvltrnslt_backup_last_error_timestamp_seconds ${timestampSeconds(snapshot.backup.lastErrorAt)}`,
  ];

  return `${lines.join("\n")}\n`;
}
