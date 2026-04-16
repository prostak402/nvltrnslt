const ERROR_RETENTION_MS = 24 * 60 * 60 * 1000;
const ERROR_RETENTION_LIMIT = 200;

function isObject(value) {
  return Boolean(value) && typeof value === "object";
}

function toIsoOrNull(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isHealthStatus(value) {
  return value === "ok" || value === "degraded" || value === "unknown";
}

function isReadinessStatus(value) {
  return value === "ready" || value === "not_ready" || value === "unknown";
}

function isGoodProbeStatus(kind, status) {
  return (kind === "health" && status === "ok") ||
    (kind === "readiness" && status === "ready");
}

function normalizeProbeState(payload, kind) {
  if (!isObject(payload)) {
    return {
      status: "unknown",
      checkedAt: null,
      lastFailureAt: null,
      lastRecoveryAt: null,
      consecutiveFailures: 0,
      checks: {},
      warnings: [],
    };
  }

  const status =
    kind === "health"
      ? isHealthStatus(payload.status)
        ? payload.status
        : "unknown"
      : isReadinessStatus(payload.status)
        ? payload.status
        : "unknown";

  return {
    status,
    checkedAt: toIsoOrNull(payload.checkedAt),
    lastFailureAt: toIsoOrNull(payload.lastFailureAt),
    lastRecoveryAt: toIsoOrNull(payload.lastRecoveryAt),
    consecutiveFailures:
      typeof payload.consecutiveFailures === "number" &&
      Number.isInteger(payload.consecutiveFailures) &&
      payload.consecutiveFailures >= 0
        ? payload.consecutiveFailures
        : 0,
    checks: isObject(payload.checks) ? payload.checks : {},
    warnings: Array.isArray(payload.warnings)
      ? payload.warnings.filter((entry) => typeof entry === "string")
      : [],
  };
}

export function defaultObservabilityState() {
  return {
    recentErrors: [],
    health: normalizeProbeState(null, "health"),
    readiness: normalizeProbeState(null, "readiness"),
  };
}

export function normalizeObservabilityState(payload) {
  if (!isObject(payload)) {
    return defaultObservabilityState();
  }

  const recentErrors = Array.isArray(payload.recentErrors)
    ? payload.recentErrors
        .filter((entry) => isObject(entry))
        .map((entry) => ({
          id:
            typeof entry.id === "string" && entry.id.trim()
              ? entry.id
              : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          source:
            typeof entry.source === "string" && entry.source.trim()
              ? entry.source
              : "UNKNOWN",
          code:
            typeof entry.code === "string" && entry.code.trim()
              ? entry.code
              : "UNKNOWN",
          status:
            typeof entry.status === "number" && Number.isInteger(entry.status)
              ? entry.status
              : 500,
          message:
            typeof entry.message === "string" ? entry.message : "Unexpected error",
          at: toIsoOrNull(entry.at) ?? new Date().toISOString(),
        }))
        .sort((left, right) => right.at.localeCompare(left.at))
        .slice(0, ERROR_RETENTION_LIMIT)
    : [];

  return {
    recentErrors,
    health: normalizeProbeState(payload.health, "health"),
    readiness: normalizeProbeState(payload.readiness, "readiness"),
  };
}

export function appendObservedError(
  state,
  { source, code, status, message },
  now = new Date(),
) {
  const normalized = normalizeObservabilityState(state);
  const nowIso = now.toISOString();
  const cutoffMs = now.getTime() - ERROR_RETENTION_MS;

  const recentErrors = normalized.recentErrors
    .filter((entry) => new Date(entry.at).getTime() >= cutoffMs)
    .slice(0, ERROR_RETENTION_LIMIT - 1);

  recentErrors.unshift({
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    source,
    code,
    status,
    message,
    at: nowIso,
  });

  return {
    ...normalized,
    recentErrors,
  };
}

/**
 * @param {unknown} state
 * @param {{
 *   kind: "health" | "readiness",
 *   status: "ok" | "degraded" | "unknown" | "ready" | "not_ready",
 *   checks: Record<string, unknown>,
 *   warnings?: string[],
 * }} params
 * @param {Date} [now]
 */
export function applyProbeUpdate(
  state,
  { kind, status, checks, warnings = [] },
  now = new Date(),
) {
  const normalized = normalizeObservabilityState(state);
  const currentProbe = normalized[kind];
  const nowIso = now.toISOString();
  const wasHealthy = isGoodProbeStatus(kind, currentProbe.status);
  const isHealthy = isGoodProbeStatus(kind, status);

  const nextProbe = {
    ...currentProbe,
    status,
    checkedAt: nowIso,
    checks: isObject(checks) ? checks : {},
    warnings: warnings.filter((entry) => typeof entry === "string"),
    consecutiveFailures: isHealthy
      ? 0
      : wasHealthy
        ? 1
        : currentProbe.consecutiveFailures + 1,
    lastFailureAt: isHealthy ? currentProbe.lastFailureAt : nowIso,
    lastRecoveryAt:
      isHealthy && !wasHealthy ? nowIso : currentProbe.lastRecoveryAt,
  };

  const transition =
    currentProbe.checkedAt === null
      ? isHealthy
        ? null
        : "degraded"
      : wasHealthy === isHealthy
      ? null
      : isHealthy
        ? "recovered"
        : "degraded";

  return {
    state: {
      ...normalized,
      [kind]: nextProbe,
    },
    transition,
  };
}

export function summarizeObservability(state, now = new Date()) {
  const normalized = normalizeObservabilityState(state);
  const nowMs = now.getTime();
  const window15m = nowMs - 15 * 60 * 1000;
  const window24h = nowMs - ERROR_RETENTION_MS;

  const recentErrors15m = normalized.recentErrors.filter(
    (entry) => new Date(entry.at).getTime() >= window15m,
  );
  const recentErrors24h = normalized.recentErrors.filter(
    (entry) => new Date(entry.at).getTime() >= window24h,
  );

  return {
    health: normalized.health,
    readiness: normalized.readiness,
    recentErrors15m: recentErrors15m.length,
    recentErrors24h: recentErrors24h.length,
    lastError: normalized.recentErrors[0] ?? null,
    recentErrors: normalized.recentErrors,
  };
}
