import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import postgres from "postgres";

const APP_PORT = 32173;
const DEFAULT_DB_PORT = 55473;
const DEFAULT_DB_USER = "postgres";
const DEFAULT_DB_PASSWORD = "postgres";
const DEFAULT_DB_NAME = "nvltrnslt";
const PROJECT_NAME = "nvltrnslt-local";
const PREPARE_ONLY = process.argv.includes("--prepare-only");

const rootDir = process.cwd();
const envExamplePath = path.join(rootDir, ".env.example");
const envLocalPath = path.join(rootDir, ".env.local");
const drizzleDir = path.join(rootDir, "drizzle");
const drizzleKitBinPath = path.join(rootDir, "node_modules", "drizzle-kit", "bin.cjs");
const dbSeedPath = path.join(rootDir, "scripts", "db-seed.mjs");
const nextBinPath = path.join(rootDir, "node_modules", "next", "dist", "bin", "next");

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function commandExists(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "ignore",
    shell: false,
  });
  return result.status === 0;
}

function ensureDocker() {
  if (!commandExists("docker", ["--version"])) {
    fail("Docker не найден в PATH. Установите Docker Desktop и повторите команду.");
  }

  if (!commandExists("docker", ["compose", "version"])) {
    fail("Команда `docker compose` недоступна. Проверьте установку Docker Compose.");
  }
}

function parseEnv(text) {
  const lines = text.split(/\r?\n/);
  const entries = new Map();

  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    entries.set(key, value);
  }

  return entries;
}

function serializeEnv(entries) {
  return `${Array.from(entries.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
}

function defaultDatabaseUrl() {
  return `postgres://${DEFAULT_DB_USER}:${DEFAULT_DB_PASSWORD}@127.0.0.1:${DEFAULT_DB_PORT}/${DEFAULT_DB_NAME}`;
}

function formatDatabaseUrl(config) {
  return `postgres://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@127.0.0.1:${config.port}/${config.database}`;
}

function hasCommittedMigrations() {
  if (!existsSync(drizzleDir)) {
    return false;
  }

  return readdirSync(drizzleDir, { withFileTypes: true }).some(
    (entry) => entry.isFile() && entry.name.endsWith(".sql"),
  );
}

function shouldRegenerateAuthSecret(value) {
  if (!value) return true;
  if (value.length < 32) return true;

  const normalized = value.toLowerCase();
  return normalized.includes("replace-with") || normalized === "dev-local-secret-123";
}

function isPlaceholderYandexValue(value) {
  if (!value) return false;

  const normalized = value.toLowerCase();
  return (
    normalized.includes("replace-with") ||
    normalized.includes("your_") ||
    normalized.includes("твой_") ||
    normalized.includes("example")
  );
}

function isPlaceholderBootstrapValue(value) {
  if (!value) return true;

  const normalized = value.toLowerCase();
  return normalized.includes("replace-with") || normalized.includes("change-me");
}

function ensureLocalEnv() {
  const sourceText = existsSync(envLocalPath)
    ? readFileSync(envLocalPath, "utf8")
    : existsSync(envExamplePath)
      ? readFileSync(envExamplePath, "utf8")
      : "";

  const entries = parseEnv(sourceText);

  if (shouldRegenerateAuthSecret(entries.get("AUTH_SECRET"))) {
    entries.set("AUTH_SECRET", randomBytes(32).toString("hex"));
  }

  if (!entries.get("DATABASE_URL")) {
    entries.set("DATABASE_URL", defaultDatabaseUrl());
  }

  if (isPlaceholderYandexValue(entries.get("YANDEX_TRANSLATE_API_KEY"))) {
    entries.set("YANDEX_TRANSLATE_API_KEY", "");
  }

  if (isPlaceholderYandexValue(entries.get("YANDEX_TRANSLATE_FOLDER_ID"))) {
    entries.set("YANDEX_TRANSLATE_FOLDER_ID", "");
  }

  if (!entries.has("YANDEX_TRANSLATE_API_KEY")) {
    entries.set("YANDEX_TRANSLATE_API_KEY", "");
  }

  if (!entries.has("YANDEX_TRANSLATE_FOLDER_ID")) {
    entries.set("YANDEX_TRANSLATE_FOLDER_ID", "");
  }

  if (!entries.has("TRANSLATION_TIMEOUT_MS")) {
    entries.set("TRANSLATION_TIMEOUT_MS", "8000");
  }

  if (!entries.has("TRANSLATION_MAX_RETRIES")) {
    entries.set("TRANSLATION_MAX_RETRIES", "2");
  }

  if (!entries.has("TRANSLATION_RETRY_DELAY_MS")) {
    entries.set("TRANSLATION_RETRY_DELAY_MS", "400");
  }

  if (!entries.has("TRANSLATION_DEGRADED_MODE")) {
    entries.set("TRANSLATION_DEGRADED_MODE", "fallback");
  }

  if (isPlaceholderBootstrapValue(entries.get("BOOTSTRAP_ADMIN_NAME"))) {
    entries.set("BOOTSTRAP_ADMIN_NAME", "Local Admin");
  }

  if (isPlaceholderBootstrapValue(entries.get("BOOTSTRAP_ADMIN_EMAIL"))) {
    entries.set("BOOTSTRAP_ADMIN_EMAIL", "admin@nvl.local");
  }

  if (isPlaceholderBootstrapValue(entries.get("BOOTSTRAP_ADMIN_PASSWORD"))) {
    entries.set("BOOTSTRAP_ADMIN_PASSWORD", randomBytes(24).toString("hex"));
  }

  writeFileSync(envLocalPath, serializeEnv(entries), "utf8");

  return entries;
}

function getDatabaseRuntimeConfig(databaseUrl) {
  let parsed;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    fail(
      "DATABASE_URL в .env.local некорректен. Ожидается строка вроде postgres://postgres:postgres@127.0.0.1:55473/nvltrnslt",
    );
  }

  const port = parsed.port ? Number(parsed.port) : 5432;
  if (!Number.isInteger(port) || port <= 0) {
    fail("Не удалось определить порт Postgres из DATABASE_URL.");
  }

  return {
    host: parsed.hostname || "127.0.0.1",
    port: String(port),
    portNumber: port,
    user: decodeURIComponent(parsed.username || DEFAULT_DB_USER),
    password: decodeURIComponent(parsed.password || DEFAULT_DB_PASSWORD),
    database: parsed.pathname.replace(/^\/+/, "") || DEFAULT_DB_NAME,
  };
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.unref();
    server.on("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort, maxAttempts = 50) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;
    if (await isPortFree(candidate)) {
      return candidate;
    }
  }

  fail(`Не удалось найти свободный порт, начиная с ${startPort}.`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function dockerComposeEnv(config) {
  return {
    ...process.env,
    LOCAL_POSTGRES_PORT: config.port,
    LOCAL_POSTGRES_USER: config.user,
    LOCAL_POSTGRES_PASSWORD: config.password,
    LOCAL_POSTGRES_DB: config.database,
  };
}

function startPostgres(config) {
  run("docker", ["compose", "-p", PROJECT_NAME, "up", "-d", "--wait", "postgres"], {
    env: dockerComposeEnv(config),
  });
}

function hasRunningPostgresContainer(config) {
  const result = spawnSync("docker", ["compose", "-p", PROJECT_NAME, "ps", "--status", "running", "-q", "postgres"], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "ignore"],
    shell: false,
    env: dockerComposeEnv(config),
    encoding: "utf8",
  });

  return result.status === 0 && Boolean(result.stdout?.trim());
}

async function inspectMigrationState(databaseUrl) {
  const sql = postgres(databaseUrl, {
    prepare: false,
    max: 1,
  });

  try {
    const [migrationTableRow] = await sql`
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = '__drizzle_migrations'
      ) as "exists"
    `;
    const [publicTablesRow] = await sql`
      select count(*)::int as "count"
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
        and table_name <> '__drizzle_migrations'
    `;

    return {
      hasMigrationTable: Boolean(migrationTableRow?.exists),
      publicTablesCount: publicTablesRow?.count ?? 0,
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function runDbMigrate() {
  run(process.execPath, [drizzleKitBinPath, "migrate"]);
}

function runDbSeed() {
  run(process.execPath, [dbSeedPath]);
}

function startDevServer(appPort) {
  const child = spawn(process.execPath, [nextBinPath, "dev", "--port", String(appPort)], {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

async function main() {
  ensureDocker();

  if (!hasCommittedMigrations()) {
    fail(
      "В репозитории не найдены committed Drizzle migrations в ./drizzle. Сначала сгенерируйте и закоммитьте миграции через `npm run db:generate -- --name <migration-name>`.",
    );
  }

  const envEntries = ensureLocalEnv();
  const dbConfig = getDatabaseRuntimeConfig(envEntries.get("DATABASE_URL") ?? defaultDatabaseUrl());
  const requestedDbPort = dbConfig.portNumber;
  const hasExistingContainer = hasRunningPostgresContainer(dbConfig);
  const resolvedDbPort = hasExistingContainer
    ? requestedDbPort
    : await findAvailablePort(requestedDbPort);
  const resolvedAppPort = await findAvailablePort(APP_PORT);
  const shouldPersistResolvedDbPort = resolvedDbPort !== requestedDbPort;

  if (shouldPersistResolvedDbPort) {
    dbConfig.port = String(resolvedDbPort);
    dbConfig.portNumber = resolvedDbPort;
    log(`Порт ${requestedDbPort} для Postgres был занят, переключаюсь на ${resolvedDbPort}.`);
  }

  if (resolvedAppPort !== APP_PORT) {
    log(`Порт ${APP_PORT} для Next.js занят, запускаю приложение на ${resolvedAppPort}.`);
  }

  log(`Использую локальный URL приложения: http://127.0.0.1:${resolvedAppPort}`);
  log(`Поднимаю Postgres на порту ${dbConfig.port}...`);

  startPostgres(dbConfig);
  if (shouldPersistResolvedDbPort) {
    envEntries.set("DATABASE_URL", formatDatabaseUrl(dbConfig));
    writeFileSync(envLocalPath, serializeEnv(envEntries), "utf8");
  }

  const migrationState = await inspectMigrationState(formatDatabaseUrl(dbConfig));
  if (migrationState.publicTablesCount > 0 && !migrationState.hasMigrationTable) {
    fail(
      "Обнаружена локальная база со старой схемой без таблицы миграций Drizzle. Похоже, она была создана через legacy db:push flow. Для перехода на migration-based workflow выполните `npm run local:reset-db`, затем повторите `npm run local:up`.",
    );
  }

  log("Применяю Drizzle migrations...");
  runDbMigrate();
  log("Применяю bootstrap seed...");
  runDbSeed();

  if (PREPARE_ONLY) {
    log("Подготовка завершена. Dev-сервер не запущен из-за флага --prepare-only.");
    return;
  }

  log(`Запускаю Next.js dev server на порту ${resolvedAppPort}...`);
  log("Для остановки приложения нажмите Ctrl+C. База останется запущенной.");
  startDevServer(resolvedAppPort);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "LOCAL_UP_FAILED");
});
