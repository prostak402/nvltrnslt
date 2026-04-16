import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { createIntegrationDatabase } from "./test-db.mjs";

const rootDir = process.cwd();
const nextBinPath = path.join(rootDir, "node_modules", "next", "dist", "bin", "next");

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

async function findAvailablePort(startPort = 34100, maxAttempts = 100) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;
    if (await isPortFree(candidate)) {
      return candidate;
    }
  }

  throw new Error(`No free port found starting from ${startPort}.`);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForServer(url, getLogs, timeoutMs = 120000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for test app.\n${getLogs()}`);
}

function stopProcessTree(pid) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"], {
      cwd: rootDir,
      stdio: "ignore",
      shell: false,
    });
    return;
  }

  process.kill(pid, "SIGTERM");
}

class CookieClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  cookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  storeCookies(setCookies) {
    for (const cookie of setCookies) {
      const [pair] = cookie.split(";");
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const name = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1);

      if (!value) {
        this.cookies.delete(name);
        continue;
      }

      this.cookies.set(name, value);
    }
  }

  async request({
    path,
    method = "GET",
    json,
    headers,
  }) {
    const requestHeaders = new Headers(headers ?? {});
    const cookieHeader = this.cookieHeader();
    if (cookieHeader) {
      requestHeaders.set("cookie", cookieHeader);
    }

    let body;
    if (json !== undefined) {
      requestHeaders.set("content-type", "application/json");
      body = JSON.stringify(json);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    this.storeCookies(response.headers.getSetCookie?.() ?? []);

    const text = await response.text();
    let parsedJson = null;
    if (text) {
      try {
        parsedJson = JSON.parse(text);
      } catch {
        parsedJson = null;
      }
    }

    return {
      status: response.status,
      headers: response.headers,
      text,
      json: parsedJson,
    };
  }
}

export async function createTestApp() {
  const database = await createIntegrationDatabase();
  const port = await findAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  let stdout = "";
  let stderr = "";

  const child = spawn(
    process.execPath,
    [nextBinPath, "dev", "--port", String(port), "--hostname", "127.0.0.1"],
    {
      cwd: rootDir,
      env: {
        ...database.env,
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const logs = () =>
    [`[next stdout]`, stdout.trim(), `[next stderr]`, stderr.trim()]
      .filter(Boolean)
      .join("\n");

  try {
    await waitForServer(`${baseUrl}/api/health`, logs);
  } catch (error) {
    stopProcessTree(child.pid);
    await database.cleanup();
    throw error;
  }

  return {
    baseUrl,
    databaseName: database.databaseName,
    databaseUrl: database.databaseUrl,
    bootstrapAdmin: database.bootstrapAdmin,
    createClient() {
      return new CookieClient(baseUrl);
    },
    async close() {
      stopProcessTree(child.pid);
      await sleep(1000);
      await database.cleanup();
    },
  };
}
