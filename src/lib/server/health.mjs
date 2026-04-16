const DEFAULT_SERVICE_NAME = "nvltrnslt";
const HEALTH_CACHE_CONTROL = "no-store, no-cache, must-revalidate";

export function getOverallHealthStatus(checks) {
  return Object.values(checks).every((check) => check.status === "ok")
    ? "ok"
    : "degraded";
}

export function getHealthHttpStatus(status) {
  return status === "ok" ? 200 : 503;
}

export function getOverallReadinessStatus(checks) {
  return Object.values(checks).every((check) => check.status === "ok")
    ? "ready"
    : "not_ready";
}

export function getReadinessHttpStatus(status) {
  return status === "ready" ? 200 : 503;
}

export function getHealthHeaders(extraHeaders = {}) {
  return {
    "cache-control": HEALTH_CACHE_CONTROL,
    ...extraHeaders,
  };
}

/**
 * @param {{
 *   checks: Record<string, { status: string }>,
 *   now?: Date,
 *   service?: string,
 *   uptimeSeconds?: number,
 * }} params
 */
export function buildHealthPayload({
  checks,
  now = new Date(),
  service = DEFAULT_SERVICE_NAME,
  uptimeSeconds = process.uptime(),
}) {
  return {
    status: getOverallHealthStatus(checks),
    service,
    timestamp: now.toISOString(),
    uptimeSeconds: Math.floor(uptimeSeconds),
    checks,
  };
}

/**
 * @param {{
 *   checks: Record<string, { status: string }>,
 *   warnings?: string[],
 *   now?: Date,
 *   service?: string,
 * }} params
 */
export function buildReadinessPayload({
  checks,
  warnings = [],
  now = new Date(),
  service = DEFAULT_SERVICE_NAME,
}) {
  return {
    status: getOverallReadinessStatus(checks),
    service,
    timestamp: now.toISOString(),
    checks,
    warnings,
  };
}
