import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTelegramAlertMessage,
  shouldSendTelegramAlert,
} from "../src/lib/server/telegram-alerts-domain.mjs";

test("buildTelegramAlertMessage formats a compact plain-text payload", () => {
  const message = buildTelegramAlertMessage({
    appName: "NVLingo",
    category: "error",
    title: "Health-check сигнализирует деградацию",
    lines: ["database=error", "backup=ok"],
    occurredAt: "2026-04-16T12:00:00.000Z",
  });

  assert.match(message, /\[NVLingo\] error:/);
  assert.match(message, /database=error/);
  assert.match(message, /time: 2026-04-16T12:00:00.000Z/);
});

test("shouldSendTelegramAlert suppresses duplicates within the interval", () => {
  const now = new Date("2026-04-16T12:05:00.000Z");

  assert.equal(
    shouldSendTelegramAlert("2026-04-16T12:01:00.000Z", now, 5 * 60 * 1000),
    false,
  );
  assert.equal(
    shouldSendTelegramAlert("2026-04-16T11:59:59.000Z", now, 5 * 60 * 1000),
    true,
  );
  assert.equal(shouldSendTelegramAlert(null, now, 5 * 60 * 1000), true);
});
