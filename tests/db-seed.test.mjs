import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeEmail,
  resolveBootstrapAdminFromEnv,
} from "../scripts/db-seed.mjs";

test("resolveBootstrapAdminFromEnv uses defaults and generates a password", () => {
  const bootstrapAdmin = resolveBootstrapAdminFromEnv({});

  assert.equal(bootstrapAdmin.name, "Local Admin");
  assert.equal(bootstrapAdmin.email, "admin@nvl.local");
  assert.equal(bootstrapAdmin.passwordWasGenerated, true);
  assert.ok(bootstrapAdmin.password.length >= 12);
});

test("resolveBootstrapAdminFromEnv normalizes a provided email", () => {
  const bootstrapAdmin = resolveBootstrapAdminFromEnv({
    BOOTSTRAP_ADMIN_NAME: "Ops Admin",
    BOOTSTRAP_ADMIN_EMAIL: " Admin@Example.COM ",
    BOOTSTRAP_ADMIN_PASSWORD: "very-secure-password-123",
  });

  assert.equal(bootstrapAdmin.name, "Ops Admin");
  assert.equal(bootstrapAdmin.email, "admin@example.com");
  assert.equal(bootstrapAdmin.password, "very-secure-password-123");
  assert.equal(bootstrapAdmin.passwordWasGenerated, false);
});

test("resolveBootstrapAdminFromEnv rejects a short password", () => {
  assert.throws(
    () =>
      resolveBootstrapAdminFromEnv({
        BOOTSTRAP_ADMIN_EMAIL: "admin@example.com",
        BOOTSTRAP_ADMIN_PASSWORD: "short",
      }),
    /at least 12 characters long/,
  );
});

test("normalizeEmail trims and lowercases email addresses", () => {
  assert.equal(normalizeEmail("  Team@Example.com "), "team@example.com");
});
