import {
  ArrowUpRight,
  BookOpen,
  CreditCard,
  Globe,
  TrendingUp,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import type { AdminAnalyticsResponse } from "@/lib/contracts/admin";
import { requireAdminPageUser } from "@/lib/server/page-auth";
import { getAdminAnalyticsData } from "@/lib/server/services/admin";

const initialData: AdminAnalyticsResponse = {
  registrationData: [],
  translationVolume: [],
  topNovels: [],
  retentionData: [],
  kpis: {
    totalUsers: 0,
    dauMau: "0%",
    arpu: "$0.00",
    translationsMonth: 0,
    wordsSaved: 0,
    averageDictionary: "0.0",
  },
};

export default async function AnalyticsPage() {
  await requireAdminPageUser();

  let data: AdminAnalyticsResponse = initialData;
  let error: string | null = null;

  try {
    data = await getAdminAnalyticsData();
  } catch {
    error = "Не удалось загрузить аналитику.";
  }

  const maxRegistrations = Math.max(
    ...data.registrationData.map((entry) => entry.value),
    1,
  );
  const maxTranslations = Math.max(
    ...data.translationVolume.map((entry) => entry.value),
    1,
  );

  const kpis = [
    {
      label: "Всего пользователей",
      value: data.kpis.totalUsers,
      icon: Users,
    },
    { label: "DAU / MAU", value: data.kpis.dauMau, icon: TrendingUp },
    { label: "ARPU", value: data.kpis.arpu, icon: CreditCard },
    {
      label: "Переводов за месяц",
      value: new Intl.NumberFormat("ru-RU").format(data.kpis.translationsMonth),
      icon: Globe,
    },
    {
      label: "Сохранено карточек",
      value: new Intl.NumberFormat("ru-RU").format(data.kpis.wordsSaved),
      icon: BookOpen,
    },
    {
      label: "Средний словарь",
      value: data.kpis.averageDictionary,
      icon: BookOpen,
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Аналитика</h1>

      {error ? (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Не удалось загрузить аналитику: {error}
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-xl border border-border bg-background-card p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <Icon className="h-4 w-4 text-foreground-muted" />
                <span className="flex items-center gap-0.5 text-xs font-medium text-success">
                  <ArrowUpRight className="h-3 w-3" />
                  live
                </span>
              </div>
              <p className="text-xl font-bold">{item.value}</p>
              <p className="mt-1 text-xs text-foreground-muted">{item.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Регистрации по месяцам</h2>
          <div className="flex h-48 items-end gap-3">
            {data.registrationData.map((entry) => (
              <div
                key={entry.month}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span className="text-xs font-medium text-foreground-secondary">
                  {entry.value}
                </span>
                <div className="flex h-36 w-full flex-col justify-end">
                  <div
                    className="w-full rounded-t-md bg-accent transition-all"
                    style={{
                      height: `${(entry.value / maxRegistrations) * 100}%`,
                      minHeight: "4px",
                    }}
                  />
                </div>
                <span className="text-xs text-foreground-muted">{entry.month}</span>
              </div>
            ))}
          </div>
          {data.registrationData.length === 0 ? (
            <p className="mt-4 text-sm text-foreground-muted">
              Данных о регистрациях пока нет.
            </p>
          ) : null}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Объём переводов за неделю</h2>
          <div className="flex h-48 items-end gap-3">
            {data.translationVolume.map((entry) => (
              <div
                key={entry.day}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span className="text-xs font-medium text-foreground-secondary">
                  {entry.value >= 1000
                    ? `${(entry.value / 1000).toFixed(1)}K`
                    : entry.value}
                </span>
                <div className="flex h-36 w-full flex-col justify-end">
                  <div
                    className="w-full rounded-t-md bg-accent-secondary transition-all"
                    style={{
                      height: `${(entry.value / maxTranslations) * 100}%`,
                      minHeight: "4px",
                    }}
                  />
                </div>
                <span className="text-xs text-foreground-muted">{entry.day}</span>
              </div>
            ))}
          </div>
          {data.translationVolume.length === 0 ? (
            <p className="mt-4 text-sm text-foreground-muted">
              Данных по переводам пока нет.
            </p>
          ) : null}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Популярные новеллы</h2>
          <div className="space-y-3">
            {data.topNovels.map((novel, index) => (
              <div key={novel.name}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-xs text-foreground-muted">
                      {index + 1}.
                    </span>
                    <span className="font-medium">{novel.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-foreground-muted">
                    <span>{novel.users} чел.</span>
                    <span>
                      {new Intl.NumberFormat("ru-RU").format(novel.words)} сохранений
                    </span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background-hover">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${novel.pct}%` }}
                  />
                </div>
              </div>
            ))}
            {data.topNovels.length === 0 ? (
              <p className="text-sm text-foreground-muted">
                Пока нет данных по новеллам.
              </p>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Удержание пользователей</h2>
          <div className="space-y-4">
            {data.retentionData.map((entry) => (
              <div key={entry.label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm">{entry.label}</span>
                  <span className="text-sm font-medium">{entry.value}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-background-hover">
                  <div
                    className={`h-full rounded-full transition-all ${
                      entry.value > 40
                        ? "bg-success"
                        : entry.value > 20
                          ? "bg-warning"
                          : "bg-danger"
                    }`}
                    style={{ width: `${entry.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {data.retentionData.length > 0 ? (
            <div className="mt-4 border-t border-border pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-success">
                    {data.retentionData[0]?.value ?? 0}%
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {data.retentionData[0]?.label ?? "День 1"}
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold text-warning">
                    {data.retentionData.find((entry) =>
                      entry.label.includes("30"),
                    )?.value ?? 0}
                    %
                  </p>
                  <p className="text-xs text-foreground-muted">День 30</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-danger">
                    {data.retentionData[data.retentionData.length - 1]?.value ?? 0}%
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {data.retentionData[data.retentionData.length - 1]?.label ??
                      "День 90"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
