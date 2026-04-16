import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHealthPayload,
  getHealthHeaders,
  getHealthHttpStatus,
} from "../src/lib/server/health.mjs";

test("buildHealthPayload returns ok when every check passes", () => {
  const payload = buildHealthPayload({
    now: new Date("2026-04-14T20:00:00.000Z"),
    uptimeSeconds: 42.9,
    checks: {
      database: {
        status: "ok",
        latencyMs: 12,
      },
    },
  });

  assert.equal(payload.status, "ok");
  assert.equal(payload.timestamp, "2026-04-14T20:00:00.000Z");
  assert.equal(payload.uptimeSeconds, 42);
  assert.deepEqual(payload.checks, {
    database: {
      status: "ok",
      latencyMs: 12,
    },
  });
});

test("buildHealthPayload degrades when any check fails", () => {
  const payload = buildHealthPayload({
    now: new Date("2026-04-14T20:00:00.000Z"),
    uptimeSeconds: 3,
    checks: {
      database: {
        status: "error",
        latencyMs: 250,
        error: "DATABASE_UNAVAILABLE",
      },
    },
  });

  assert.equal(payload.status, "degraded");
  assert.equal(getHealthHttpStatus(payload.status), 503);
});

test("health headers disable caching", () => {
  assert.deepEqual(getHealthHeaders(), {
    "cache-control": "no-store, no-cache, must-revalidate",
  });
});
