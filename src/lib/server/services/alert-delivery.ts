import "server-only";

import { sendAlertEmail } from "./email";
import { sendTelegramAlert } from "./telegram";

type AlertDeliveryCategory = "admin" | "error";

type AlertDeliveryParams = {
  category: AlertDeliveryCategory;
  title: string;
  lines?: string[];
  dedupeKey?: string;
  minIntervalMs?: number;
};

export async function sendAlertDelivery(params: AlertDeliveryParams) {
  const [telegramResult, emailResult] = await Promise.allSettled([
    sendTelegramAlert({
      category: params.category,
      title: params.title,
      lines: params.lines,
      dedupeKey: params.dedupeKey,
      minIntervalMs: params.minIntervalMs,
    }),
    sendAlertEmail({
      category: params.category,
      title: params.title,
      lines: params.lines,
      dedupeKey: params.dedupeKey,
      minIntervalMs: params.minIntervalMs,
    }),
  ]);

  if (telegramResult.status === "rejected") {
    console.error("[alert-delivery][telegram]", telegramResult.reason);
  }

  if (emailResult.status === "rejected") {
    console.error("[alert-delivery][email]", emailResult.reason);
  }

  return {
    telegram:
      telegramResult.status === "fulfilled" ? telegramResult.value : null,
    email: emailResult.status === "fulfilled" ? emailResult.value : null,
  };
}
