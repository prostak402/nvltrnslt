"use client";

import { Card } from "@/components/ui/Card";
import {
  Users,
  TrendingUp,
  CreditCard,
  Globe,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const registrationData = [
  { month: "Окт", value: 42 },
  { month: "Ноя", value: 68 },
  { month: "Дек", value: 95 },
  { month: "Янв", value: 134 },
  { month: "Фев", value: 187 },
  { month: "Мар", value: 256 },
  { month: "Апр", value: 312 },
];

const translationVolume = [
  { day: "Пн", value: 1240 },
  { day: "Вт", value: 1580 },
  { day: "Ср", value: 1120 },
  { day: "Чт", value: 1890 },
  { day: "Пт", value: 1450 },
  { day: "Сб", value: 2100 },
  { day: "Вс", value: 1670 },
];

const topNovels = [
  { name: "Doki Doki Literature Club", users: 412, words: 18420, pct: 28 },
  { name: "Everlasting Summer", users: 287, words: 12350, pct: 19 },
  { name: "Katawa Shoujo", users: 234, words: 9870, pct: 15 },
  { name: "Clannad", users: 189, words: 8240, pct: 13 },
  { name: "Steins;Gate", users: 156, words: 6920, pct: 11 },
  { name: "The Fruit of Grisaia", users: 98, words: 4310, pct: 7 },
  { name: "Umineko no Naku Koro ni", users: 67, words: 3280, pct: 5 },
  { name: "Другие", users: 124, words: 2410, pct: 2 },
];

const retentionData = [
  { label: "День 1", value: 72 },
  { label: "День 7", value: 48 },
  { label: "День 14", value: 35 },
  { label: "День 30", value: 24 },
  { label: "День 60", value: 18 },
  { label: "День 90", value: 14 },
];

const kpis = [
  { label: "Всего пользователей", value: "1,247", change: "+23%", positive: true, icon: Users },
  { label: "DAU / MAU", value: "27.4%", change: "+2.1%", positive: true, icon: TrendingUp },
  { label: "ARPU", value: "$3.08", change: "+5%", positive: true, icon: CreditCard },
  { label: "Переводов за месяц", value: "184K", change: "+12%", positive: true, icon: Globe },
  { label: "Слов сохранено (всего)", value: "64.2K", change: "+18%", positive: true, icon: BookOpen },
  { label: "Средний словарь", value: "51.5", change: "+3", positive: true, icon: BookOpen },
];

export default function AnalyticsPage() {
  const maxReg = Math.max(...registrationData.map((d) => d.value));
  const maxTrans = Math.max(...translationVolume.map((d) => d.value));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Аналитика</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-background-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-4 h-4 text-foreground-muted" />
                <span className={`flex items-center gap-0.5 text-xs font-medium ${k.positive ? "text-success" : "text-danger"}`}>
                  {k.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {k.change}
                </span>
              </div>
              <p className="text-xl font-bold">{k.value}</p>
              <p className="text-xs text-foreground-muted mt-1">{k.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Registration trend */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Регистрации по месяцам</h2>
          <div className="flex items-end gap-3 h-48">
            {registrationData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-foreground-secondary">{d.value}</span>
                <div className="w-full flex flex-col justify-end h-36">
                  <div
                    className="bg-accent rounded-t-md w-full transition-all"
                    style={{ height: `${(d.value / maxReg) * 100}%`, minHeight: "4px" }}
                  />
                </div>
                <span className="text-xs text-foreground-muted">{d.month}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Translation volume */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Объём переводов (за неделю)</h2>
          <div className="flex items-end gap-3 h-48">
            {translationVolume.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-foreground-secondary">{(d.value / 1000).toFixed(1)}K</span>
                <div className="w-full flex flex-col justify-end h-36">
                  <div
                    className="bg-accent-secondary rounded-t-md w-full transition-all"
                    style={{ height: `${(d.value / maxTrans) * 100}%`, minHeight: "4px" }}
                  />
                </div>
                <span className="text-xs text-foreground-muted">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top novels */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Популярные новеллы</h2>
          <div className="space-y-3">
            {topNovels.map((novel, i) => (
              <div key={novel.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-foreground-muted w-5">{i + 1}.</span>
                    <span className="font-medium">{novel.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-foreground-muted">
                    <span>{novel.users} чел.</span>
                    <span>{novel.words.toLocaleString()} слов</span>
                  </div>
                </div>
                <div className="h-2 bg-background-hover rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${novel.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Retention */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Удержание пользователей</h2>
          <div className="space-y-4">
            {retentionData.map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">{r.label}</span>
                  <span className="text-sm font-medium">{r.value}%</span>
                </div>
                <div className="h-3 bg-background-hover rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${r.value > 40 ? "bg-success" : r.value > 20 ? "bg-warning" : "bg-danger"}`}
                    style={{ width: `${r.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-success">72%</p>
                <p className="text-xs text-foreground-muted">D1</p>
              </div>
              <div>
                <p className="text-lg font-bold text-warning">24%</p>
                <p className="text-xs text-foreground-muted">D30</p>
              </div>
              <div>
                <p className="text-lg font-bold text-danger">14%</p>
                <p className="text-xs text-foreground-muted">D90</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
