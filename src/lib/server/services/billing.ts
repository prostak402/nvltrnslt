import "server-only";

import { desc, eq } from "drizzle-orm";

import { PLANS } from "@/lib/config";
import type {
  AdminSubscriptionRow,
} from "@/lib/contracts/admin";
import type { DashboardPlanResponse } from "@/lib/contracts/dashboard";
import { getDb } from "@/lib/db/client";
import { serverEnv } from "@/lib/env";
import {
  paymentEvents,
  studyItems,
  subscriptions,
  translationUsageDaily,
  users,
} from "@/lib/db/schema";
import type { PaymentEventRecord, SubscriptionRecord } from "@/lib/types";
import { formatDateRu, nowIso, startOfDayKey } from "@/lib/server/utils";
import {
  deriveSubscriptionLifecycle,
  getBillingAvailability,
} from "@/lib/server/billing-domain.mjs";

import {
  findUserById,
  getUserDictionaryLimit,
  getUserTranslationLimit,
  getUsageRecord,
  toIsoString,
} from "./shared";
import { getAdminSettingsRecord } from "./site-settings";

function mapSubscriptionRow(row: typeof subscriptions.$inferSelect): SubscriptionRecord {
  const renewalAt = toIsoString(row.renewalAt);
  const endedAt = toIsoString(row.endedAt);
  const currentPeriodEnd = toIsoString(row.currentPeriodEnd);

  return {
    id: row.id,
    userId: row.userId,
    plan: row.plan as SubscriptionRecord["plan"],
    status: row.status as SubscriptionRecord["status"],
    startedAt: toIsoString(row.startedAt) ?? "",
    renewalAt,
    endedAt,
    billingProvider: row.billingProvider ?? null,
    externalSubscriptionId: row.externalSubscriptionId ?? null,
    currentPeriodStart: toIsoString(row.currentPeriodStart),
    currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    cancelledAt: toIsoString(row.cancelledAt),
    lifecycle: deriveSubscriptionLifecycle({
      status: row.status,
      renewalAt,
      endedAt,
      currentPeriodEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    }) as NonNullable<SubscriptionRecord["lifecycle"]>,
  };
}

function mapPaymentRow(row: typeof paymentEvents.$inferSelect): PaymentEventRecord {
  return {
    id: row.id,
    userId: row.userId,
    subscriptionId: row.subscriptionId ?? null,
    amount: row.amount,
    currency: row.currency,
    status: row.status as PaymentEventRecord["status"],
    createdAt: toIsoString(row.createdAt) ?? "",
    billingProvider: row.billingProvider ?? null,
    externalPaymentId: row.externalPaymentId ?? null,
    externalCheckoutId: row.externalCheckoutId ?? null,
    externalEventId: row.externalEventId ?? null,
    occurredAt: toIsoString(row.occurredAt),
    errorMessage: row.errorMessage,
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : null,
  };
}

export async function getPlanPageData(
  userId: number,
): Promise<DashboardPlanResponse> {
  const [user, subscriptionRows, usage, itemRows, paymentRows, adminSettings] = await Promise.all([
    findUserById(getDb(), userId),
    getDb()
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.startedAt)),
    getUsageRecord(getDb(), userId),
    getDb().select({ id: studyItems.id }).from(studyItems).where(eq(studyItems.userId, userId)),
    getDb()
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.userId, userId))
      .orderBy(desc(paymentEvents.createdAt)),
    getAdminSettingsRecord(getDb()),
  ]);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const latestSubscription = subscriptionRows[0];
  const normalizedSubscription = latestSubscription
    ? mapSubscriptionRow(latestSubscription)
    : null;
  const nextBillingIso =
    normalizedSubscription?.currentPeriodEnd ?? normalizedSubscription?.renewalAt;
  const dictionaryLimit = getUserDictionaryLimit(user, adminSettings);

  return {
    currentPlan: {
      name: PLANS[user.plan].label,
      price: PLANS[user.plan].shortPrice,
      nextBilling: nextBillingIso
        ? formatDateRu(nextBillingIso, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "Coming soon",
      translationsLimit: getUserTranslationLimit(user, adminSettings),
      translationsUsed: usage.count,
      wordsLimit: dictionaryLimit,
      wordsUsed: itemRows.length,
    },
    subscription: normalizedSubscription,
    billing: getBillingAvailability(serverEnv.BILLING_MODE),
    payments: paymentRows.map((entry) => ({
      date: formatDateRu(toIsoString(entry.createdAt) ?? nowIso()),
      amount: `${entry.amount} ${entry.currency}`,
      status:
        entry.status === "paid"
          ? "РћРїР»Р°С‡РµРЅРѕ"
          : entry.status === "failed"
            ? "РћС€РёР±РєР°"
            : entry.status === "refunded"
              ? "Р’РѕР·РІСЂР°С‚"
              : "Р’ РѕР¶РёРґР°РЅРёРё",
    })),
  };
}

export async function getAdminSubscriptionsData(): Promise<
  AdminSubscriptionRow[]
> {
  const todayKey = startOfDayKey();
  const [subscriptionRows, userRows, usageRows, paymentRows] = await Promise.all([
    getDb().select().from(subscriptions).orderBy(desc(subscriptions.startedAt)),
    getDb().select().from(users),
    getDb()
      .select()
      .from(translationUsageDaily)
      .where(eq(translationUsageDaily.dayKey, todayKey)),
    getDb().select().from(paymentEvents),
  ]);

  const userMap = new Map(userRows.map((user) => [user.id, user]));
  const usageByUser = new Map(usageRows.map((entry) => [entry.userId, entry.count]));
  const paymentsBySubscription = new Map<number, PaymentEventRecord[]>();

  for (const payment of paymentRows) {
    if (payment.subscriptionId === null) {
      continue;
    }

    const list = paymentsBySubscription.get(payment.subscriptionId) ?? [];
    list.push(mapPaymentRow(payment));
    paymentsBySubscription.set(payment.subscriptionId, list);
  }

  return subscriptionRows.map((subscription) => {
    const normalized = mapSubscriptionRow(subscription);
    const user = userMap.get(subscription.userId);

    return {
      ...normalized,
      userName: user?.name ?? "РќРµРёР·РІРµСЃС‚РЅРѕ",
      email: user?.email ?? "",
      translationsToday: usageByUser.get(subscription.userId) ?? 0,
      payments: paymentsBySubscription.get(subscription.id) ?? [],
    };
  });
}
