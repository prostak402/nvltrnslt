import "server-only";

import { serverEnv } from "@/lib/env";

export type SecurityAuditFinding = {
  code: string;
  severity: "warning" | "critical";
  message: string;
};

function authSecretLooksPlaceholder(secret: string) {
  const normalized = secret.trim().toLowerCase();

  return (
    normalized.includes("replace-with") ||
    normalized.includes("changeme") ||
    normalized.includes("example") ||
    normalized.includes("placeholder")
  );
}

function getDatabaseCredentialsFinding() {
  try {
    const url = new URL(serverEnv.DATABASE_URL);
    const username = decodeURIComponent(url.username).trim().toLowerCase();
    const password = decodeURIComponent(url.password).trim();

    if (username === "postgres" && password === "postgres") {
      return {
        code: "DATABASE_DEFAULT_CREDENTIALS",
        severity:
          process.env.NODE_ENV === "production"
            ? ("critical" as const)
            : ("warning" as const),
        message:
          "Security: DATABASE_URL still uses default postgres/postgres credentials.",
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function getSecurityAuditFindings(): SecurityAuditFinding[] {
  const findings: SecurityAuditFinding[] = [];

  if (serverEnv.AUTH_SECRET.trim().length < 32) {
    findings.push({
      code: "AUTH_SECRET_TOO_SHORT",
      severity: "critical",
      message:
        "Security: AUTH_SECRET must be at least 32 characters long.",
    });
  }

  if (authSecretLooksPlaceholder(serverEnv.AUTH_SECRET)) {
    findings.push({
      code: "AUTH_SECRET_PLACEHOLDER",
      severity: "critical",
      message:
        "Security: AUTH_SECRET looks like a placeholder and should be replaced before production use.",
    });
  }

  const databaseCredentialsFinding = getDatabaseCredentialsFinding();
  if (databaseCredentialsFinding) {
    findings.push(databaseCredentialsFinding);
  }

  return findings;
}

export function getSecurityAuditSummary() {
  const findings = getSecurityAuditFindings();
  const criticalFindings = findings.filter(
    (finding) => finding.severity === "critical",
  );

  return {
    findings,
    status: criticalFindings.length > 0 ? ("error" as const) : ("ok" as const),
    warnings: findings.map((finding) => finding.message),
    primaryErrorCode: criticalFindings[0]?.code ?? null,
  };
}
