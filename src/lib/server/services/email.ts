import "server-only";

import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";

import { APP_NAME } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { systemState } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";
import { nowIso } from "@/lib/server/utils";
import {
  buildAlertEmailSubject,
  buildAlertEmailText,
} from "@/lib/server/email-alerts-domain.mjs";
import { shouldSendTelegramAlert } from "@/lib/server/telegram-alerts-domain.mjs";

const EMAIL_ALERT_STATE_PREFIX = "email_alert:";

type EmailAlertCategory = "admin" | "error";

type EmailAlertParams = {
  category: EmailAlertCategory;
  title: string;
  lines?: string[];
  dedupeKey?: string;
  minIntervalMs?: number;
};

type EmailAlertState = {
  sentAt: string | null;
};

type EmailConfig = {
  to: string[];
  from: string;
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
};

const globalForEmailAlerts = globalThis as typeof globalThis & {
  __nvltrnsltEmailTransporter?: nodemailer.Transporter | null;
};

function emailConfig(): EmailConfig | null {
  const to = serverEnv.ALERT_EMAIL_TO;
  const from = serverEnv.ALERT_EMAIL_FROM;
  const host = serverEnv.SMTP_HOST;
  const port = serverEnv.SMTP_PORT;
  const secure = serverEnv.SMTP_SECURE;

  if (!to?.length || !from || !host || !port || secure === undefined) {
    return null;
  }

  if (serverEnv.SMTP_USER && serverEnv.SMTP_PASSWORD) {
    return {
      to,
      from,
      host,
      port,
      secure,
      auth: {
        user: serverEnv.SMTP_USER,
        pass: serverEnv.SMTP_PASSWORD,
      },
    };
  }

  return {
    to,
    from,
    host,
    port,
    secure,
  };
}

function getTransporter() {
  if (globalForEmailAlerts.__nvltrnsltEmailTransporter) {
    return globalForEmailAlerts.__nvltrnsltEmailTransporter;
  }

  const config = emailConfig();
  if (!config) {
    return null;
  }

  globalForEmailAlerts.__nvltrnsltEmailTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return globalForEmailAlerts.__nvltrnsltEmailTransporter;
}

function dedupeStateKey(dedupeKey: string) {
  return `${EMAIL_ALERT_STATE_PREFIX}${dedupeKey}`;
}

async function readAlertState(dedupeKey: string): Promise<EmailAlertState> {
  const [entry] = await getDb()
    .select({ payload: systemState.payload })
    .from(systemState)
    .where(eq(systemState.key, dedupeStateKey(dedupeKey)))
    .limit(1);

  const payload = entry?.payload;
  if (!payload || typeof payload !== "object") {
    return { sentAt: null };
  }

  return {
    sentAt:
      typeof (payload as Record<string, unknown>).sentAt === "string"
        ? (payload as Record<string, string>).sentAt
        : null,
  };
}

async function writeAlertState(dedupeKey: string, sentAt: string) {
  await getDb()
    .insert(systemState)
    .values({
      key: dedupeStateKey(dedupeKey),
      payload: {
        sentAt,
      },
    })
    .onConflictDoUpdate({
      target: systemState.key,
      set: {
        payload: {
          sentAt,
        },
      },
    });
}

export function emailAlertsAreConfigured() {
  return Boolean(emailConfig());
}

export async function sendAlertEmail(params: EmailAlertParams) {
  const config = emailConfig();
  const transporter = getTransporter();

  if (!config || !transporter) {
    return { delivered: false as const, reason: "not_configured" as const };
  }

  const occurredAt = nowIso();
  if (params.dedupeKey) {
    const previous = await readAlertState(params.dedupeKey);
    if (
      !shouldSendTelegramAlert(
        previous.sentAt,
        new Date(occurredAt),
        params.minIntervalMs ?? 0,
      )
    ) {
      return { delivered: false as const, reason: "deduped" as const };
    }
  }

  await transporter.sendMail({
    from: config.from,
    to: config.to.join(", "),
    subject: buildAlertEmailSubject({
      appName: APP_NAME,
      category: params.category,
      title: params.title,
    }),
    text: buildAlertEmailText({
      appName: APP_NAME,
      category: params.category,
      title: params.title,
      lines: params.lines ?? [],
      occurredAt,
    }),
  });

  if (params.dedupeKey) {
    await writeAlertState(params.dedupeKey, occurredAt);
  }

  return { delivered: true as const, reason: "sent" as const };
}
