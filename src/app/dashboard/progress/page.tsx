"use client";

import { BookOpen, TrendingUp, AlertTriangle, Plus, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";

const weeklyData = [
  { day: "Пн", saved: 5, reviewed: 8 },
  { day: "Вт", saved: 8, reviewed: 12 },
  { day: "Ср", saved: 3, reviewed: 6 },
  { day: "Чт", saved: 7, reviewed: 15 },
  { day: "Пт", saved: 4, reviewed: 9 },
  { day: "Сб", saved: 12, reviewed: 18 },
  { day: "Вс", saved: 6, reviewed: 10 },
];

const novelStats = [
  { name: "Everlasting Summer", words: 52, learned: 18, difficult: 9, newW: 25 },
  { name: "Doki Doki Literature Club", words: 45, learned: 20, difficult: 8, newW: 17 },
  { name: "Katawa Shoujo", words: 38, learned: 15, difficult: 6, newW: 17 },
  { name: "Clannad", words: 34, learned: 12, difficult: 7, newW: 15 },
  { name: "Steins;Gate", words: 28, learned: 10, difficult: 4, newW: 14 },
];

const statusBreakdown = [
  { label: "Новые", count: 124, color: "bg-accent" },
  { label: "Сложные", count: 34, color: "bg-warning" },
  { label: "Выученные", count: 89, color: "bg-success" },
];

const totalWords = 247;

// Generate 30 days of activity
const activityDays = Array.from({ length: 30 }, (_, i) => {
  const active = Math.random() > 0.3;
  const intensity = active ? Math.ceil(Math.random() * 3) : 0;
  return { day: i + 1, intensity };
});

export default function ProgressPage() {
  const maxActivity = Math.max(...weeklyData.map((d) => Math.max(d.saved, d.reviewed)));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Прогресс</h1>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Слов всего" value="247" />
        <StatCard icon={TrendingUp} label="Выучено" value="89" change={{ value: "+12", positive: true }} />
        <StatCard icon={AlertTriangle} label="Сложных" value="34" />
        <StatCard icon={Plus} label="За неделю добавлено" value="28" change={{ value: "+5", positive: true }} />
        <StatCard icon={RotateCcw} label="За неделю повторено" value="45" change={{ value: "+8", positive: true }} />
      </div>

      {/* Weekly Chart */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Активность за неделю</h2>
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent" /> Сохранено
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent-secondary" /> Повторено
          </span>
        </div>
        <div className="flex items-end gap-3 h-48">
          {weeklyData.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-1 w-full h-40">
                <div className="flex-1 flex flex-col justify-end">
                  <div
                    className="bg-accent rounded-t-sm w-full transition-all"
                    style={{ height: `${(d.saved / maxActivity) * 100}%`, minHeight: d.saved > 0 ? "4px" : "0" }}
                  />
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <div
                    className="bg-accent-secondary rounded-t-sm w-full transition-all"
                    style={{ height: `${(d.reviewed / maxActivity) * 100}%`, minHeight: d.reviewed > 0 ? "4px" : "0" }}
                  />
                </div>
              </div>
              <span className="text-xs text-foreground-muted">{d.day}</span>
              <div className="flex gap-1 text-xs text-foreground-muted">
                <span>{d.saved}</span>/<span>{d.reviewed}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* By Status */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">По статусам</h2>
          <div className="space-y-4">
            {statusBreakdown.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-sm text-foreground-secondary">
                    {s.count} ({Math.round((s.count / totalWords) * 100)}%)
                  </span>
                </div>
                <div className="h-3 bg-background-hover rounded-full overflow-hidden">
                  <div
                    className={`h-full ${s.color} rounded-full transition-all`}
                    style={{ width: `${(s.count / totalWords) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-secondary">Всего слов</span>
              <span className="font-semibold">{totalWords}</span>
            </div>
          </div>
        </Card>

        {/* Activity Streak */}
        <Card>
          <h2 className="text-lg font-semibold mb-2">Серия активности</h2>
          <p className="text-3xl font-bold text-accent mb-4">7 <span className="text-base font-normal text-foreground-secondary">дней подряд</span></p>
          <div className="grid grid-cols-10 gap-1.5">
            {activityDays.map((d) => (
              <div
                key={d.day}
                className={`aspect-square rounded-sm ${
                  d.intensity === 0
                    ? "bg-background-hover"
                    : d.intensity === 1
                    ? "bg-accent/30"
                    : d.intensity === 2
                    ? "bg-accent/60"
                    : "bg-accent"
                }`}
                title={`День ${d.day}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-foreground-muted">
            <span>Меньше</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-background-hover" />
              <div className="w-3 h-3 rounded-sm bg-accent/30" />
              <div className="w-3 h-3 rounded-sm bg-accent/60" />
              <div className="w-3 h-3 rounded-sm bg-accent" />
            </div>
            <span>Больше</span>
          </div>
        </Card>
      </div>

      {/* By Novel */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">По новеллам</h2>
        <div className="space-y-4">
          {novelStats.map((novel) => (
            <div key={novel.name} className="p-4 bg-background-hover/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <span className="font-medium">{novel.name}</span>
                </div>
                <span className="text-foreground-secondary text-sm">{novel.words} слов</span>
              </div>
              <div className="flex gap-1 h-2.5 rounded-full overflow-hidden bg-background-card">
                <div className="bg-success rounded-l-full" style={{ width: `${(novel.learned / novel.words) * 100}%` }} />
                <div className="bg-warning" style={{ width: `${(novel.difficult / novel.words) * 100}%` }} />
                <div className="bg-accent rounded-r-full" style={{ width: `${(novel.newW / novel.words) * 100}%` }} />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-foreground-muted">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-success" /> Выучено: {novel.learned}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-warning" /> Сложные: {novel.difficult}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-accent" /> Новые: {novel.newW}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
