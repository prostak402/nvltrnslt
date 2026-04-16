import path from "node:path";
import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_RETRY_DELAY_MS = 2_000;

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readTrimmedEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function requireDatabaseUrl() {
  const databaseUrl = readTrimmedEnv("DATABASE_URL");

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run db:migrate.");
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

function readPositiveIntegerEnv(name, fallback) {
  const rawValue = readTrimmedEnv(name);
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForDatabase(databaseUrl, timeoutMs, retryDelayMs) {
  const startedAt = Date.now();
  let lastErrorMessage = "DATABASE_UNAVAILABLE";

  while (Date.now() - startedAt < timeoutMs) {
    const client = postgres(databaseUrl, {
      prepare: false,
      max: 1,
    });

    try {
      await client`select 1 as ok`;
      return;
    } catch (error) {
      lastErrorMessage =
        error instanceof Error && error.message
          ? error.message
          : "DATABASE_UNAVAILABLE";
      await sleep(retryDelayMs);
    } finally {
      await client.end({ timeout: 5 }).catch(() => null);
    }
  }

  throw new Error(
    `DATABASE_UNAVAILABLE: ${lastErrorMessage}. Waited ${Math.round(timeoutMs / 1000)}s for the database.`,
  );
}

async function main() {
  const databaseUrl = requireDatabaseUrl();
  const startupTimeoutMs =
    readPositiveIntegerEnv("DB_STARTUP_TIMEOUT_SECONDS", 60) * 1000;
  const retryDelayMs = readPositiveIntegerEnv(
    "DB_STARTUP_RETRY_DELAY_MS",
    DEFAULT_RETRY_DELAY_MS,
  );

  log("Waiting for database before running migrations...");
  await waitForDatabase(databaseUrl, startupTimeoutMs, retryDelayMs);

  const client = postgres(databaseUrl, {
    prepare: false,
    max: 1,
  });

  try {
    const db = drizzle(client);
    await migrate(db, {
      migrationsFolder: path.join(rootDir, "drizzle"),
    });
    log("db:migrate completed successfully.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "DB_MIGRATE_FAILED");
});
