import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT_NAME = "nvltrnslt-local";
const REMOVE_VOLUMES = process.argv.includes("--volumes");
const rootDir = process.cwd();
const envLocalPath = path.join(rootDir, ".env.local");

function parseEnv(text) {
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

function getDatabaseRuntimeConfig() {
  try {
    const envText = readFileSync(envLocalPath, "utf8");
    const envEntries = parseEnv(envText);
    const databaseUrl = envEntries.get("DATABASE_URL");

    if (!databaseUrl) {
      return {
        LOCAL_POSTGRES_PORT: "55473",
        LOCAL_POSTGRES_USER: "postgres",
        LOCAL_POSTGRES_PASSWORD: "postgres",
        LOCAL_POSTGRES_DB: "nvltrnslt",
      };
    }

    const parsed = new URL(databaseUrl);

    return {
      LOCAL_POSTGRES_PORT: parsed.port || "5432",
      LOCAL_POSTGRES_USER: decodeURIComponent(parsed.username || "postgres"),
      LOCAL_POSTGRES_PASSWORD: decodeURIComponent(parsed.password || "postgres"),
      LOCAL_POSTGRES_DB: parsed.pathname.replace(/^\/+/, "") || "nvltrnslt",
    };
  } catch {
    return {
      LOCAL_POSTGRES_PORT: "55473",
      LOCAL_POSTGRES_USER: "postgres",
      LOCAL_POSTGRES_PASSWORD: "postgres",
      LOCAL_POSTGRES_DB: "nvltrnslt",
    };
  }
}

const downArgs = ["compose", "-p", PROJECT_NAME, "down"];
if (REMOVE_VOLUMES) {
  downArgs.push("-v");
}

const result = spawnSync("docker", downArgs, {
  cwd: rootDir,
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    ...getDatabaseRuntimeConfig(),
  },
});

process.exit(result.status ?? 0);
