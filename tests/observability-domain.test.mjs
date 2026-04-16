import assert from "node:assert/strict";
import test from "node:test";

import {
  appendObservedError,
  applyProbeUpdate,
  defaultObservabilityState,
  summarizeObservability,
} from "../src/lib/server/observability-domain.mjs";

test("appendObservedError stores recent server errors for later summaries", () => {
  const startedAt = new Date("2026-04-15T10:00:00.000Z");
  const nextState = appendObservedError(
    defaultObservabilityState(),
    {
      source: "LOGIN_FAILED",
      code: "LOGIN_FAILED",
      status: 500,
      message: "Unexpected auth failure",
    },
    startedAt,
  );

  const summary = summarizeObservability(nextState, startedAt);
  assert.equal(summary.recentErrors15m, 1);
  assert.equal(summary.recentErrors24h, 1);
  assert.equal(summary.lastError?.source, "LOGIN_FAILED");
  assert.equal(summary.lastError?.status, 500);
});

test("applyProbeUpdate tracks degradation and recovery for readiness", () => {
  const degradedAt = new Date("2026-04-15T11:00:00.000Z");
  const degraded = applyProbeUpdate(
    defaultObservabilityState(),
    {
      kind: "readiness",
      status: "not_ready",
      checks: {
        database: {
          status: "error",
        },
      },
      warnings: [],
    },
    degradedAt,
  );

  assert.equal(degraded.transition, "degraded");
  assert.equal(degraded.state.readiness.status, "not_ready");
  assert.equal(degraded.state.readiness.consecutiveFailures, 1);
  assert.equal(degraded.state.readiness.lastFailureAt, degradedAt.toISOString());

  const recoveredAt = new Date("2026-04-15T11:05:00.000Z");
  const recovered = applyProbeUpdate(
    degraded.state,
    {
      kind: "readiness",
      status: "ready",
      checks: {
        database: {
          status: "ok",
        },
      },
      warnings: ["fallback translation only"],
    },
    recoveredAt,
  );

  assert.equal(recovered.transition, "recovered");
  assert.equal(recovered.state.readiness.status, "ready");
  assert.equal(recovered.state.readiness.consecutiveFailures, 0);
  assert.equal(
    recovered.state.readiness.lastRecoveryAt,
    recoveredAt.toISOString(),
  );
  assert.deepEqual(recovered.state.readiness.warnings, [
    "fallback translation only",
  ]);
});
