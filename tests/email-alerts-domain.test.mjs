import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAlertEmailSubject,
  buildAlertEmailText,
} from "../src/lib/server/email-alerts-domain.mjs";

test("buildAlertEmailSubject produces a compact prefix for inbox scanning", () => {
  const subject = buildAlertEmailSubject({
    appName: "NVLingo",
    category: "admin",
    title: "Новый тикет поддержки",
  });

  assert.equal(subject, "[NVLingo] admin: Новый тикет поддержки");
});

test("buildAlertEmailText includes title, lines, and timestamp", () => {
  const text = buildAlertEmailText({
    appName: "NVLingo",
    category: "error",
    title: "Зафиксирована серверная ошибка",
    lines: ["source: api/support", "status: 500"],
    occurredAt: "2026-04-17T00:00:00.000Z",
  });

  assert.match(text, /^NVLingo error alert/m);
  assert.match(text, /Зафиксирована серверная ошибка/);
  assert.match(text, /source: api\/support/);
  assert.match(text, /time: 2026-04-17T00:00:00.000Z/);
});
