import "server-only";

import { APP_NAME } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { systemState } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";
import { nowIso } from "@/lib/server/utils";
import {
  buildTelegramAlertMessage,
  shouldSendTelegramAlert,
} from "@/lib/server/telegram-alerts-domain.mjs";
import { eq } from "drizzle-orm";

const TELEGRAM_ALERT_STATE_PREFIX = "telegram_alert:";

type TelegramAlertCategory = "admin" | "error";

type TelegramAlertParams = {
  category: TelegramAlertCategory;
  title: string;
  lines?: string[];
  dedupeKey?: string;
  minIntervalMs?: number;
};

type TelegramAlertState = {
  sentAt: string | null;
};

function telegramConfig() {
  const token = serverEnv.TELEGRAM_BOT_TOKEN;
  const chatId = serverEnv.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return null;
  }

  return {
    token,
    chatId,
    messageThreadId: serverEnv.TELEGRAM_MESSAGE_THREAD_ID,
  };
}

function dedupeStateKey(dedupeKey: string) {
  return `${TELEGRAM_ALERT_STATE_PREFIX}${dedupeKey}`;
}

async function readAlertState(dedupeKey: string): Promise<TelegramAlertState> {
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

export function telegramAlertsAreConfigured() {
  return Boolean(telegramConfig());
}

export async function sendTelegramAlert(params: TelegramAlertParams) {
  const config = telegramConfig();
  if (!config) {
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

  const message = buildTelegramAlertMessage({
    appName: APP_NAME,
    category: params.category,
    title: params.title,
    lines: params.lines ?? [],
    occurredAt,
  });

  const response = await fetch(
    `https://api.telegram.org/bot${config.token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        message_thread_id: config.messageThreadId ?? undefined,
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let description = `Telegram API responded with HTTP ${response.status}.`;

    try {
      const payload = (await response.json()) as {
        description?: string;
      };
      if (payload.description) {
        description = payload.description;
      }
    } catch {
      // Keep the generic description above.
    }

    throw new Error(`TELEGRAM_SEND_FAILED: ${description}`);
  }

  if (params.dedupeKey) {
    await writeAlertState(params.dedupeKey, occurredAt);
  }

  return { delivered: true as const, reason: "sent" as const };
}
