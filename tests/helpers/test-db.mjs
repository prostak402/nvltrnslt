import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import postgres from "postgres";

const rootDir = process.cwd();
const drizzleKitBinPath = path.join(rootDir, "node_modules", "drizzle-kit", "bin.cjs");
const dbSeedPath = path.join(rootDir, "scripts", "db-seed.mjs");

function parseEnvFile(text) {
  const entries = new Map();

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    entries.set(line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim());
  }

  return entries;
}

function readLocalEnvFile() {
  const envLocalPath = path.join(rootDir, ".env.local");
  if (!existsSync(envLocalPath)) {
    return new Map();
  }

  return parseEnvFile(readFileSync(envLocalPath, "utf8"));
}

function readRequiredEnv(name, fallbackEntries, fallbackValue) {
  const value = process.env[name]?.trim() || fallbackEntries.get(name)?.trim() || fallbackValue;
  if (!value) {
    throw new Error(`${name} is required for integration tests.`);
  }

  return value;
}

function replaceDatabaseName(databaseUrl, databaseName) {
  const parsed = new URL(databaseUrl);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

function maintenanceDatabaseUrl(databaseUrl) {
  return replaceDatabaseName(databaseUrl, "postgres");
}

function randomDatabaseName(prefix) {
  return `${prefix}_${Date.now()}_${randomBytes(4).toString("hex")}`.toLowerCase();
}

function runNodeCommand(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          [
            `Command failed with exit code ${code}: ${process.execPath} ${args.join(" ")}`,
            stdout.trim(),
            stderr.trim(),
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      );
    });
  });
}

export function resolveTestEnvironment() {
  const localEnv = readLocalEnvFile();

  return {
    NODE_ENV: "test",
    NEXT_TELEMETRY_DISABLED: "1",
    AUTH_SECRET: readRequiredEnv(
      "AUTH_SECRET",
      localEnv,
      "test-auth-secret-at-least-32-characters-long",
    ),
    DATABASE_URL: readRequiredEnv("DATABASE_URL", localEnv),
    BOOTSTRAP_ADMIN_NAME: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Test Admin",
    BOOTSTRAP_ADMIN_EMAIL:
      process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() || "admin.integration@nvl.local",
    BOOTSTRAP_ADMIN_PASSWORD:
      process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim() || "integration-admin-password-123",
    BILLING_MODE: process.env.BILLING_MODE?.trim() || "disabled",
    YANDEX_TRANSLATE_API_KEY: process.env.YANDEX_TRANSLATE_API_KEY?.trim() || "",
    YANDEX_TRANSLATE_FOLDER_ID: process.env.YANDEX_TRANSLATE_FOLDER_ID?.trim() || "",
    TRANSLATION_TIMEOUT_MS: process.env.TRANSLATION_TIMEOUT_MS?.trim() || "8000",
    TRANSLATION_MAX_RETRIES: process.env.TRANSLATION_MAX_RETRIES?.trim() || "0",
    TRANSLATION_RETRY_DELAY_MS: process.env.TRANSLATION_RETRY_DELAY_MS?.trim() || "0",
    TRANSLATION_DEGRADED_MODE: process.env.TRANSLATION_DEGRADED_MODE?.trim() || "fallback",
  };
}

export async function createIntegrationDatabase(prefix = "nvltrnslt_test") {
  const baseEnv = resolveTestEnvironment();
  const databaseName = randomDatabaseName(prefix);
  const databaseUrl = replaceDatabaseName(baseEnv.DATABASE_URL, databaseName);
  const adminSql = postgres(maintenanceDatabaseUrl(baseEnv.DATABASE_URL), {
    prepare: false,
    max: 1,
  });

  await adminSql.unsafe(`create database "${databaseName}"`);

  const env = {
    ...process.env,
    ...baseEnv,
    DATABASE_URL: databaseUrl,
  };

  try {
    await runNodeCommand([drizzleKitBinPath, "migrate"], env);
    await runNodeCommand([dbSeedPath], env);
  } catch (error) {
    await adminSql.unsafe(`drop database if exists "${databaseName}"`);
    await adminSql.end({ timeout: 5 });
    throw error;
  }

  async function cleanup() {
    const cleanupSql = postgres(maintenanceDatabaseUrl(baseEnv.DATABASE_URL), {
      prepare: false,
      max: 1,
    });

    try {
      await cleanupSql.unsafe(`
        select pg_terminate_backend(pid)
        from pg_stat_activity
        where datname = '${databaseName}'
          and pid <> pg_backend_pid()
      `);
      await cleanupSql.unsafe(`drop database if exists "${databaseName}"`);
    } finally {
      await cleanupSql.end({ timeout: 5 });
    }
  }

  await adminSql.end({ timeout: 5 });

  return {
    databaseName,
    databaseUrl,
    env,
    bootstrapAdmin: {
      email: env.BOOTSTRAP_ADMIN_EMAIL,
      password: env.BOOTSTRAP_ADMIN_PASSWORD,
    },
    cleanup,
  };
}
