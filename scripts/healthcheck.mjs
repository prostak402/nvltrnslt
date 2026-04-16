const port = process.env.PORT ?? "3000";
const healthcheckUrl = process.env.HEALTHCHECK_URL ?? `http://127.0.0.1:${port}/api/health`;

async function main() {
  const response = await fetch(healthcheckUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`HEALTHCHECK_HTTP_${response.status}`);
  }

  const payload = await response.json();
  if (payload?.status !== "ok") {
    throw new Error("HEALTHCHECK_NOT_OK");
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "HEALTHCHECK_FAILED"}\n`);
  process.exit(1);
});
