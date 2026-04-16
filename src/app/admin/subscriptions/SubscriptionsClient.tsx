"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Crown, Gift, Search, Zap } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { AdminSubscriptionPaymentRow } from "@/lib/contracts/admin";
import { planLabel, planTranslationLimit } from "@/lib/client/presentation";
import { PLANS } from "@/lib/config";
import type { PlanId, SubscriptionStatus } from "@/lib/types";

type PaymentRow = AdminSubscriptionPaymentRow;

type SubscriptionRow = {
  id: number;
  userId: number;
  userName: string;
  email: string;
  plan: PlanId;
  status: SubscriptionStatus;
  startedAt: string;
  renewalAt: string | null;
  endedAt: string | null;
  translationsToday: number;
  payments: PaymentRow[];
};

const statusMeta: Record<SubscriptionStatus, { label: string; variant: "success" | "warning" | "default" | "accent" }> =
  {
    active: { label: "Активна", variant: "success" },
    trial: { label: "Пробный период", variant: "accent" },
    cancelled: { label: "Отменена", variant: "warning" },
    expired: { label: "Истекла", variant: "default" },
  };

const planIcons = {
  free: Gift,
  basic: Zap,
  extended: Crown,
} as const;

export default function SubscriptionsClient({
  data,
  error,
}: {
  data: SubscriptionRow[];
  error?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all" | PlanId>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | SubscriptionStatus>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      data.filter((subscription) => {
        const term = search.trim().toLowerCase();
        if (
          term &&
          !subscription.userName.toLowerCase().includes(term) &&
          !subscription.email.toLowerCase().includes(term) &&
          !String(subscription.userId).includes(term)
        ) {
          return false;
        }
        if (filterPlan !== "all" && subscription.plan !== filterPlan) {
          return false;
        }
        if (filterStatus !== "all" && subscription.status !== filterStatus) {
          return false;
        }
        return true;
      }),
    [data, filterPlan, filterStatus, search],
  );

  const activeSubscriptions = data.filter((subscription) => subscription.status === "active");
  const monthlyRevenue = activeSubscriptions.reduce((sum, subscription) => {
    const paidPayment = [...subscription.payments]
      .filter((payment) => payment.status === "paid")
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    return sum + Number(paidPayment?.amount ?? 0);
  }, 0);
  const cancelledCount = data.filter((subscription) => subscription.status === "cancelled").length;
  const paidCount = data.filter((subscription) => subscription.plan !== "free").length;
  const conversion = data.length > 0 ? `${((paidCount / data.length) * 100).toFixed(1)}%` : "0%";

  const stats = [
    { label: "Активных подписок", value: activeSubscriptions.length.toString() },
    {
      label: "MRR",
      value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(monthlyRevenue),
    },
    { label: "Отменено", value: cancelledCount.toString() },
    { label: "Конверсия Free → Paid", value: conversion },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Подписки</h1>

      {error ? (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Не удалось загрузить подписки: {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((item) => (
          <div key={item.label} className="bg-background-card border border-border rounded-xl p-4">
            <p className="text-xs text-foreground-muted mb-1">{item.label}</p>
            <p className="text-xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Поиск по имени, email или ID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-card border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={filterPlan}
          onChange={(event) => setFilterPlan(event.target.value as "all" | PlanId)}
          className="px-3 py-2.5 bg-background-card border border-border rounded-lg text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
        >
          <option value="all">Все тарифы</option>
          <option value="free">Бесплатный</option>
          <option value="basic">Базовый</option>
          <option value="extended">Расширенный</option>
        </select>
        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value as "all" | SubscriptionStatus)}
          className="px-3 py-2.5 bg-background-card border border-border rounded-lg text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активна</option>
          <option value="trial">Пробный период</option>
          <option value="cancelled">Отменена</option>
          <option value="expired">Истекла</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((subscription) => {
          const Icon = planIcons[subscription.plan];
          const expanded = expandedId === subscription.id;
          const meta = statusMeta[subscription.status];
          const latestPayment = [...subscription.payments]
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
          const translationLimit = planTranslationLimit(subscription.plan);

          return (
            <div key={subscription.id} className="bg-background-card border border-border rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-background-hover/50 transition-colors"
                onClick={() => setExpandedId(expanded ? null : subscription.id)}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    subscription.plan === "extended"
                      ? "text-accent-secondary"
                      : subscription.plan === "basic"
                        ? "text-accent"
                        : "text-foreground-muted"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{subscription.userName}</span>
                    <span className="text-xs text-foreground-muted">#{subscription.userId}</span>
                  </div>
                  <p className="text-xs text-foreground-muted">{subscription.email}</p>
                </div>
                <Badge variant={subscription.plan === "extended" ? "accent" : subscription.plan === "basic" ? "warning" : "default"}>
                  {planLabel(subscription.plan)}
                </Badge>
                <Badge variant={meta.variant} className="hidden sm:inline-flex">
                  {meta.label}
                </Badge>
                <span className="text-sm text-foreground-secondary hidden lg:inline">
                  {subscription.renewalAt
                    ? `Следующее списание: ${new Date(subscription.renewalAt).toLocaleDateString("ru-RU")}`
                    : "Автосписание выключено"}
                </span>
                {expanded ? <ChevronUp className="w-4 h-4 text-foreground-muted" /> : <ChevronDown className="w-4 h-4 text-foreground-muted" />}
              </div>

              {expanded ? (
                <div className="px-4 pb-4 border-t border-border/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 py-4 text-sm">
                    <Card className="p-4">
                      <p className="text-xs text-foreground-muted mb-1">Старт подписки</p>
                      <p>{new Date(subscription.startedAt).toLocaleDateString("ru-RU")}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-foreground-muted mb-1">Лимит переводов</p>
                      <p>
                        {subscription.translationsToday} / {translationLimit}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-foreground-muted mb-1">Последний платёж</p>
                      <p>
                        {latestPayment
                          ? `${latestPayment.amount} ${latestPayment.currency} · ${new Date(latestPayment.createdAt).toLocaleDateString("ru-RU")}`
                          : "Платежей пока нет"}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-foreground-muted mb-1">Платежей всего</p>
                      <p>{subscription.payments.length}</p>
                    </Card>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted mb-3">
                    <span>Тариф: {PLANS[subscription.plan].price}</span>
                    <span>•</span>
                    <span>
                      Продление:{" "}
                      {subscription.renewalAt ? new Date(subscription.renewalAt).toLocaleString("ru-RU") : "не запланировано"}
                    </span>
                    <span>•</span>
                    <span>
                      Завершение:{" "}
                      {subscription.endedAt ? new Date(subscription.endedAt).toLocaleString("ru-RU") : "ещё не завершена"}
                    </span>
                  </div>

                  {subscription.payments.length > 0 ? (
                    <div className="space-y-2">
                      {subscription.payments
                        .slice()
                        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                        .map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-background-hover/50 px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-medium">
                                {payment.amount} {payment.currency}
                              </p>
                              <p className="text-xs text-foreground-muted">
                                {new Date(payment.createdAt).toLocaleString("ru-RU")}
                              </p>
                            </div>
                            <Badge
                              variant={
                                payment.status === "paid"
                                  ? "success"
                                  : payment.status === "pending"
                                    ? "warning"
                                    : payment.status === "failed"
                                      ? "danger"
                                      : "default"
                              }
                            >
                              {payment.status === "paid"
                                ? "Оплачено"
                                : payment.status === "pending"
                                  ? "Ожидает"
                                  : payment.status === "failed"
                                    ? "Ошибка"
                                    : "Возврат"}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-foreground-muted">
                      История платежей появится здесь. Дальнейшие действия по биллингу можно будет делать из этой же страницы.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-foreground-muted">Подписки по выбранным фильтрам не найдены.</div>
      ) : null}
    </div>
  );
}
