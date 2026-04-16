/* eslint-disable react/no-unescaped-entities */

import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  CreditCard,
  Globe,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type {
  AdminDashboardResponse,
  TranslationDegradeReason,
  TranslationMode,
  TranslationSource,
  TranslationStatus,
} from "@/lib/contracts/admin";
import { requireAdminPageUser } from "@/lib/server/page-auth";
import { getAdminDashboardData } from "@/lib/server/services/admin";
import { planLabel, ticketStatusMeta } from "@/lib/client/presentation";

const initialData: AdminDashboardResponse = {
  stats: {
    totalUsers: 0,
    activeToday: 0,
    newThisWeek: 0,
    monthlyRevenue: "0.00",
    translationsToday: 0,
    openTickets: 0,
  },
  recentUsers: [],
  recentTickets: [],
  translationHealth: {
    upstreamProvider: "local",
    providerConfigured: false,
    degradedMode: "fallback",
    currentStatus: "not_configured",
    currentSource: null,
    lastTranslationAt: null,
    lastHealthyAt: null,
    lastDegradedAt: null,
    lastDegradeReason: null,
    recentRequests24h: 0,
    degradedEvents24h: 0,
    degradedReasons24h: [],
  },
  observability: {
    health: {
      status: "unknown",
      checkedAt: null,
      consecutiveFailures: 0,
    },
    readiness: {
      status: "unknown",
      checkedAt: null,
      warnings: [],
    },
    recentErrors15m: 0,
    recentErrors24h: 0,
    lastError: null,
  },
  alerts: [],
};

const translationStatusMeta: Record<
  TranslationStatus,
  { label: string; variant: "success" | "warning" | "danger"; description: string }
> = {
  healthy: {
    label: "Норма",
    variant: "success",
    description: "Внешний переводчик отвечает штатно.",
  },
  degraded: {
    label: "Деградация",
    variant: "warning",
    description: "Недавние запросы уходили в fallback.",
  },
  not_configured: {
    label: "Не настроен",
    variant: "danger",
    description: "Внешний переводчик не подключён.",
  },
};

const translationSourceLabels: Record<Exclude<TranslationSource, null>, string> = {
  yandex: "Yandex Cloud",
  local: "Локальный fallback",
  cache: "Кэш",
};

const translationModeLabels: Record<TranslationMode, string> = {
  fallback: "fallback",
  error: "strict error",
};

const translationReasonLabels: Record<TranslationDegradeReason, string> = {
  provider_not_configured: "Провайдер не настроен",
  provider_timeout: "Таймаут провайдера",
  provider_rate_limited: "Лимит провайдера",
  provider_http_error: "HTTP-ошибка провайдера",
  provider_auth_error: "Ошибка ключа или folderId",
  provider_invalid_response: "Некорректный ответ провайдера",
  provider_network_error: "Сетевая ошибка провайдера",
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "ещё не было";
  }

  return new Date(value).toLocaleString("ru-RU");
}

function sourceLabel(source: TranslationSource) {
  if (!source) {
    return "Нет данных";
  }

  return translationSourceLabels[source];
}

export default async function AdminDashboard() {
  await requireAdminPageUser();

  let data: AdminDashboardResponse = initialData;
  let error: string | null = null;

  try {
    data = await getAdminDashboardData();
  } catch {
    error = "Не удалось загрузить админ-дашборд.";
  }

  const loading = false;

  const stats = [
    { label: "Всего пользователей", value: data.stats.totalUsers, icon: Users },
    { label: "Активных сегодня", value: data.stats.activeToday, icon: TrendingUp },
    { label: "Новых за неделю", value: data.stats.newThisWeek, icon: UserPlus },
    {
      label: "Выручка за месяц",
      value: `$${data.stats.monthlyRevenue}`,
      icon: CreditCard,
    },
    { label: "Переводов сегодня", value: data.stats.translationsToday, icon: Globe },
    { label: "Открытых тикетов", value: data.stats.openTickets, icon: MessageSquare },
  ];

  const translationStatus = translationStatusMeta[data.translationHealth.currentStatus];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Дашборд</h1>

      {error ? (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Не удалось загрузить админ-дашборд: {error}
        </div>
      ) : null}

      {data.alerts.length > 0 ? (
        <div className="mb-6 space-y-2">
          {data.alerts.map((alert) => (
            <div
              key={alert}
              className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {alert}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-background-card p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <Icon className="h-4 w-4 text-foreground-muted" />
                <span className="flex items-center gap-0.5 text-xs font-medium text-success">
                  <ArrowUpRight className="h-3 w-3" />
                  live
                </span>
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="mt-1 text-xs text-foreground-muted">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <Card className="mb-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Observability</h2>
            <p className="text-sm text-foreground-secondary">
              Health, readiness и последние серверные ошибки в одном месте.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                data.observability.health.status === "ok"
                  ? "success"
                  : data.observability.health.status === "degraded"
                    ? "warning"
                    : "default"
              }
            >
              Health: {data.observability.health.status}
            </Badge>
            <Badge
              variant={
                data.observability.readiness.status === "ready"
                  ? "success"
                  : data.observability.readiness.status === "not_ready"
                    ? "danger"
                    : "default"
              }
            >
              Readiness: {data.observability.readiness.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-background-hover/40 p-4">
            <p className="text-xs uppercase tracking-wider text-foreground-muted">
              Последний health-check
            </p>
            <p className="mt-2 text-sm font-medium">
              {formatTimestamp(data.observability.health.checkedAt)}
            </p>
            <p className="mt-1 text-sm text-foreground-secondary">
              Сбоев подряд: {data.observability.health.consecutiveFailures}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background-hover/40 p-4">
            <p className="text-xs uppercase tracking-wider text-foreground-muted">
              Последний readiness-check
            </p>
            <p className="mt-2 text-sm font-medium">
              {formatTimestamp(data.observability.readiness.checkedAt)}
            </p>
            <p className="mt-1 text-sm text-foreground-secondary">
              Warning'ов: {data.observability.readiness.warnings.length}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background-hover/40 p-4">
            <p className="text-xs uppercase tracking-wider text-foreground-muted">
              Server errors
            </p>
            <p className="mt-2 text-2xl font-bold">
              {data.observability.recentErrors15m}
            </p>
            <p className="mt-1 text-sm text-foreground-secondary">
              за 15 минут, {data.observability.recentErrors24h} за 24 часа
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background-hover/40 p-4">
            <p className="text-xs uppercase tracking-wider text-foreground-muted">
              Последняя ошибка
            </p>
            <p className="mt-2 text-sm font-medium">
              {data.observability.lastError
                ? `${data.observability.lastError.source} / ${data.observability.lastError.code}`
                : "не зафиксировано"}
            </p>
            <p className="mt-1 text-sm text-foreground-secondary">
              {data.observability.lastError
                ? formatTimestamp(data.observability.lastError.at)
                : "—"}
            </p>
          </div>
        </div>

        {data.observability.readiness.warnings.length > 0 ? (
          <div className="mt-4 space-y-2">
            {data.observability.readiness.warnings.map((warning) => (
              <div
                key={warning}
                className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
              >
                {warning}
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card className="mb-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg font-semibold">Состояние переводчика</h2>
              <Badge variant={translationStatus.variant}>
                {translationStatus.label}
              </Badge>
            </div>
            <p className="text-sm text-foreground-secondary">
              {translationStatus.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={data.translationHealth.providerConfigured ? "accent" : "danger"}>
              Апстрим: {sourceLabel(data.translationHealth.upstreamProvider)}
            </Badge>
            <Badge variant="default">
              Режим: {translationModeLabels[data.translationHealth.degradedMode]}
            </Badge>
            <Badge variant="default">
              Последний источник: {sourceLabel(data.translationHealth.currentSource)}
            </Badge>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-background-hover/40 p-4">
            <p className="text-xs uppercase tracking-wider text-foreground-muted">
              Fallback за 24ч
            </p>
            <p className="mt-2 text-2xl font-bold">
              {data.translationHealth.degradedEvents24h}
            </p>
            <p className="mt-1 text-sm text-foreground-secondary">
              из {data.translationHealth.recentRequests24h} translation-запросов
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background-hover/40 p-4">
            <p className="text-xs uppercase tracking-wider text-foreground-muted">
              Последняя деградация
            </p>
            <p className="mt-2 text-sm font-medium">
              {formatTimestamp(data.translationHealth.lastDegradedAt)}
            </p>
            <p className="mt-1 text-sm text-foreground-secondary">
              {data.translationHealth.lastDegradeReason
                ? translationReasonLabels[data.translationHealth.lastDegradeReason]
                : "не зафиксирована"}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background-hover/40 p-4">
            <p className="text-xs uppercase tracking-wider text-foreground-muted">
              Последний успешный upstream
            </p>
            <p className="mt-2 text-sm font-medium">
              {formatTimestamp(data.translationHealth.lastHealthyAt)}
            </p>
            <p className="mt-1 text-sm text-foreground-secondary">
              Только ответы от Yandex Cloud
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background-hover/40 p-4">
            <p className="text-xs uppercase tracking-wider text-foreground-muted">
              Последний translation-запрос
            </p>
            <p className="mt-2 text-sm font-medium">
              {formatTimestamp(data.translationHealth.lastTranslationAt)}
            </p>
            <p className="mt-1 text-sm text-foreground-secondary">
              <Clock3 className="mr-1 inline h-3.5 w-3.5" />
              Источник: {sourceLabel(data.translationHealth.currentSource)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
              Причины деградации за 24 часа
            </h3>
            {data.translationHealth.degradedReasons24h.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.translationHealth.degradedReasons24h.map((entry) => (
                  <Badge key={entry.reason} variant="warning">
                    {translationReasonLabels[entry.reason]}: {entry.count}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-secondary">
                Деградация за последние 24 часа не зафиксирована.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border/70 bg-background-hover/40 p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-foreground-muted">
              Что это значит
            </p>
            <p className="text-sm text-foreground-secondary">
              Если статус в норме, переводы идут через внешний провайдер. Если
              здесь деградация, часть запросов уже ушла в fallback или внешний
              переводчик не настроен.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Новые пользователи</h2>
            <Link
              href="/admin/users"
              className="text-sm text-accent transition-colors hover:text-accent-hover"
            >
              Все пользователи
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-foreground-muted">
                  <th className="pb-2 font-medium">Пользователь</th>
                  <th className="pb-2 font-medium">Тариф</th>
                  <th className="pb-2 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {data.recentUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/50">
                    <td className="py-2.5">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-foreground-muted">{user.email}</p>
                    </td>
                    <td className="py-2.5 text-sm text-foreground-secondary">
                      {planLabel(user.plan)}
                    </td>
                    <td className="py-2.5 text-xs text-foreground-muted">
                      {new Date(user.registeredAt).toLocaleDateString("ru-RU")}
                    </td>
                  </tr>
                ))}
                {!loading && data.recentUsers.length === 0 ? (
                  <tr>
                    <td className="py-4 text-foreground-muted" colSpan={3}>
                      Пока нет данных о новых пользователях.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Последние тикеты</h2>
            <Link
              href="/admin/tickets"
              className="text-sm text-accent transition-colors hover:text-accent-hover"
            >
              Все тикеты
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentTickets.map((ticket) => {
              const badge = ticketStatusMeta[ticket.status];

              return (
                <div
                  key={ticket.id}
                  className="flex items-start justify-between gap-3 border-b border-border/50 py-2.5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      #{ticket.id} {ticket.subject}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground-muted">
                      user #{ticket.userId} ·{" "}
                      {new Date(ticket.updatedAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      badge.variant === "success"
                        ? "bg-success/15 text-success"
                        : badge.variant === "warning"
                          ? "bg-warning/15 text-warning"
                          : badge.variant === "accent"
                            ? "bg-accent-light text-accent"
                            : "bg-background-hover text-foreground-secondary"
                    }`}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
            {!loading && data.recentTickets.length === 0 ? (
              <p className="text-sm text-foreground-muted">Тикетов пока нет.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
