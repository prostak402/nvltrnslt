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

  const maxRegistrations = Math.max(...data.registrationData.map((entry) => entry.value), 1);
  const maxTranslations = Math.max(...data.translationVolume.map((entry) => entry.value), 1);

  const kpis = [
    { label: "Р’СЃРµРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№", value: data.kpis.totalUsers, icon: Users },
    { label: "DAU / MAU", value: data.kpis.dauMau, icon: TrendingUp },
    { label: "ARPU", value: data.kpis.arpu, icon: CreditCard },
    {
      label: "РџРµСЂРµРІРѕРґРѕРІ Р·Р° РјРµСЃСЏС†",
      value: new Intl.NumberFormat("ru-RU").format(data.kpis.translationsMonth),
      icon: Globe,
    },
    {
      label: "РЎРѕС…СЂР°РЅРµРЅРѕ РєР°СЂС‚РѕС‡РµРє",
      value: new Intl.NumberFormat("ru-RU").format(data.kpis.wordsSaved),
      icon: BookOpen,
    },
    { label: "РЎСЂРµРґРЅРёР№ СЃР»РѕРІР°СЂСЊ", value: data.kpis.averageDictionary, icon: BookOpen },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">РђРЅР°Р»РёС‚РёРєР°</h1>

      {error ? (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р°РЅР°Р»РёС‚РёРєСѓ: {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-background-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-4 h-4 text-foreground-muted" />
                <span className="flex items-center gap-0.5 text-xs font-medium text-success">
                  <ArrowUpRight className="w-3 h-3" />
                  live
                </span>
              </div>
              <p className="text-xl font-bold">{item.value}</p>
              <p className="text-xs text-foreground-muted mt-1">{item.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h2 className="text-lg font-semibold mb-4">Р РµРіРёСЃС‚СЂР°С†РёРё РїРѕ РјРµСЃСЏС†Р°Рј</h2>
          <div className="flex items-end gap-3 h-48">
            {data.registrationData.map((entry) => (
              <div key={entry.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-foreground-secondary">{entry.value}</span>
                <div className="w-full flex flex-col justify-end h-36">
                  <div
                    className="bg-accent rounded-t-md w-full transition-all"
                    style={{ height: `${(entry.value / maxRegistrations) * 100}%`, minHeight: "4px" }}
                  />
                </div>
                <span className="text-xs text-foreground-muted">{entry.month}</span>
              </div>
            ))}
          </div>
          {data.registrationData.length === 0 ? (
            <p className="mt-4 text-sm text-foreground-muted">Р”Р°РЅРЅС‹С… Рѕ СЂРµРіРёСЃС‚СЂР°С†РёСЏС… РїРѕРєР° РЅРµС‚.</p>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">РћР±СЉС‘Рј РїРµСЂРµРІРѕРґРѕРІ Р·Р° РЅРµРґРµР»СЋ</h2>
          <div className="flex items-end gap-3 h-48">
            {data.translationVolume.map((entry) => (
              <div key={entry.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-foreground-secondary">
                  {entry.value >= 1000 ? `${(entry.value / 1000).toFixed(1)}K` : entry.value}
                </span>
                <div className="w-full flex flex-col justify-end h-36">
                  <div
                    className="bg-accent-secondary rounded-t-md w-full transition-all"
                    style={{ height: `${(entry.value / maxTranslations) * 100}%`, minHeight: "4px" }}
                  />
                </div>
                <span className="text-xs text-foreground-muted">{entry.day}</span>
              </div>
            ))}
          </div>
          {data.translationVolume.length === 0 ? (
            <p className="mt-4 text-sm text-foreground-muted">Р”Р°РЅРЅС‹С… РїРѕ РїРµСЂРµРІРѕРґСѓ РїРѕРєР° РЅРµС‚.</p>
          ) : null}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold mb-4">РџРѕРїСѓР»СЏСЂРЅС‹Рµ РЅРѕРІРµР»Р»С‹</h2>
          <div className="space-y-3">
            {data.topNovels.map((novel, index) => (
              <div key={novel.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-foreground-muted w-5">{index + 1}.</span>
                    <span className="font-medium">{novel.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-foreground-muted">
                    <span>{novel.users} С‡РµР».</span>
                    <span>{new Intl.NumberFormat("ru-RU").format(novel.words)} СЃРѕС…СЂР°РЅРµРЅРёР№</span>
                  </div>
                </div>
                <div className="h-2 bg-background-hover rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${novel.pct}%` }} />
                </div>
              </div>
            ))}
            {data.topNovels.length === 0 ? (
              <p className="text-sm text-foreground-muted">РџРѕРєР° РЅРµС‚ РґР°РЅРЅС‹С… РїРѕ РЅРѕРІРµР»Р»Р°Рј.</p>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">РЈРґРµСЂР¶Р°РЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№</h2>
          <div className="space-y-4">
            {data.retentionData.map((entry) => (
              <div key={entry.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">{entry.label}</span>
                  <span className="text-sm font-medium">{entry.value}%</span>
                </div>
                <div className="h-3 bg-background-hover rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      entry.value > 40 ? "bg-success" : entry.value > 20 ? "bg-warning" : "bg-danger"
                    }`}
                    style={{ width: `${entry.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {data.retentionData.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-success">{data.retentionData[0]?.value ?? 0}%</p>
                  <p className="text-xs text-foreground-muted">{data.retentionData[0]?.label ?? "Р”РµРЅСЊ 1"}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-warning">
                    {data.retentionData.find((entry) => entry.label.includes("30"))?.value ?? 0}%
                  </p>
                  <p className="text-xs text-foreground-muted">Р”РµРЅСЊ 30</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-danger">
                    {data.retentionData[data.retentionData.length - 1]?.value ?? 0}%
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {data.retentionData[data.retentionData.length - 1]?.label ?? "Р”РµРЅСЊ 90"}
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
