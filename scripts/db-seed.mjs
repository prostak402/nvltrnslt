import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

import nextEnv from "@next/env";
import bcrypt from "bcryptjs";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;

const DEFAULT_BOOTSTRAP_ADMIN_NAME = "Local Admin";
const DEFAULT_BOOTSTRAP_ADMIN_EMAIL = "admin@nvl.local";
const DEFAULT_BOOTSTRAP_ADMIN_PLAN = "extended";

loadEnvConfig(process.cwd());

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readTrimmedEnvFrom(env, name) {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

export function requireDatabaseUrlFromEnv(env = process.env) {
  const databaseUrl = readTrimmedEnvFrom(env, "DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run db:seed.");
  }

  try {
    const parsed = new URL(databaseUrl);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      throw new Error("DATABASE_URL must start with postgres:// or postgresql://.");
    }
  } catch {
    throw new Error("DATABASE_URL must be a valid postgres URL.");
  }

  return databaseUrl;
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function makeActivationKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (count) =>
    Array.from({ length: count }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");

  return `NVLKEY-${pick(6)}-${pick(6)}-${pick(6)}`;
}

export function generatePassword() {
  return crypto.randomBytes(24).toString("hex");
}

export function resolveBootstrapAdminFromEnv(env = process.env) {
  const name = readTrimmedEnvFrom(env, "BOOTSTRAP_ADMIN_NAME") ?? DEFAULT_BOOTSTRAP_ADMIN_NAME;
  const email = normalizeEmail(
    readTrimmedEnvFrom(env, "BOOTSTRAP_ADMIN_EMAIL") ?? DEFAULT_BOOTSTRAP_ADMIN_EMAIL,
  );
  const providedPassword = readTrimmedEnvFrom(env, "BOOTSTRAP_ADMIN_PASSWORD");
  const password = providedPassword ?? generatePassword();

  if (!name) {
    throw new Error("BOOTSTRAP_ADMIN_NAME must not be empty.");
  }

  if (!isValidEmail(email)) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL must be a valid email address.");
  }

  if (password.length < 12) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters long.");
  }

  return {
    name,
    email,
    password,
    passwordWasGenerated: !providedPassword,
  };
}

async function main() {
  const databaseUrl = requireDatabaseUrlFromEnv();
  const bootstrapAdmin = resolveBootstrapAdminFromEnv();
  const sql = postgres(databaseUrl, {
    prepare: false,
    max: 1,
  });

  try {
    const result = await sql.begin(async (tx) => {
      const [userCountRow] = await tx`
        select count(*)::int as "count"
        from users
      `;

      if ((userCountRow?.count ?? 0) > 0) {
        return {
          seeded: false,
        };
      }

      const now = new Date();
      const passwordHash = await bcrypt.hash(bootstrapAdmin.password, 10);
      const activationKey = makeActivationKey();
      const [userRow] = await tx`
        insert into users (
          name,
          email,
          password_hash,
          activation_key,
          role,
          plan,
          status,
          registered_at,
          last_active_at
        )
        values (
          ${bootstrapAdmin.name},
          ${bootstrapAdmin.email},
          ${passwordHash},
          ${activationKey},
          'admin',
          ${DEFAULT_BOOTSTRAP_ADMIN_PLAN},
          'active',
          ${now},
          ${now}
        )
        returning id, email, activation_key as "activationKey"
      `;

      if (!userRow) {
        throw new Error("BOOTSTRAP_ADMIN_CREATE_FAILED");
      }

      await tx`
        insert into user_settings (
          user_id,
          daily_words,
          prioritize_difficult,
          include_phrases,
          auto_sync,
          poor_connection,
          reminder_enabled,
          email_notifications
        )
        values (
          ${userRow.id},
          20,
          true,
          true,
          true,
          'queue',
          true,
          true
        )
      `;

      await tx`
        insert into subscriptions (
          user_id,
          plan,
          status,
          started_at,
          renewal_at,
          ended_at
        )
        values (
          ${userRow.id},
          ${DEFAULT_BOOTSTRAP_ADMIN_PLAN},
          'active',
          ${now},
          null,
          null
        )
      `;

      await tx`
        insert into admin_audit_logs (
          admin_user_id,
          type,
          action,
          detail,
          level,
          created_at
        )
        values (
          ${userRow.id},
          'admin',
          'Bootstrap admin created',
          ${`Initial admin user ${userRow.email} was created by db:seed.`},
          'success',
          ${now}
        )
      `;

      await tx`
        insert into activity_events (
          user_id,
          type,
          action,
          detail,
          level,
          created_at
        )
        values (
          ${userRow.id},
          'system',
          'Bootstrap account created',
          'Initial admin account was created by db:seed.',
          'success',
          ${now}
        )
      `;

      return {
        seeded: true,
        email: userRow.email,
        activationKey: userRow.activationKey,
      };
    });

    if (!result.seeded) {
      log("Skipping db:seed because the database is not empty.");
      return;
    }

    log(`Bootstrap admin created: ${result.email}`);
    log(`Bootstrap admin plan: ${DEFAULT_BOOTSTRAP_ADMIN_PLAN}`);
    if (bootstrapAdmin.passwordWasGenerated) {
      log(`Generated bootstrap admin password: ${bootstrapAdmin.password}`);
    } else {
      log("Bootstrap admin password source: BOOTSTRAP_ADMIN_PASSWORD");
    }
    log(`Bootstrap activation key: ${result.activationKey}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const isMainModule =
  Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMainModule) {
  main().catch((error) => {
    fail(error instanceof Error ? error.message : "DB_SEED_FAILED");
  });
}
