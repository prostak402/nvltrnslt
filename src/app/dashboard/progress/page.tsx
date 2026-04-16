import { AlertTriangle, BookOpen, Clock, Plus, RotateCcw, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import type { DashboardProgressResponse } from "@/lib/contracts/dashboard";
import { requireDashboardPageUser } from "@/lib/server/page-auth";
import { getProgressPageData } from "@/lib/server/services/study";

export default async function ProgressPage() {
  const user = await requireDashboardPageUser();
  const data: DashboardProgressResponse = await getProgressPageData(user.id);
  const maxActivity = data.weeklyData.reduce((max, day) => Math.max(max, day.saved, day.reviewed), 0) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Прогресс</h1>
        <p className="mt-1 text-sm text-foreground-muted">Статистика по карточкам, сериям и новеллам.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={BookOpen} label="Карточек всего" value={data.totalWords} />
        <StatCard icon={TrendingUp} label="Точность" value={`${data.accuracy}%`} />
        <StatCard icon={AlertTriangle} label="К повторению" value={data.dueItems} />
        <StatCard icon={Plus} label="За неделю добавлено" value={data.weeklyAdded} />
        <StatCard icon={RotateCcw} label="За неделю повторено" value={data.weeklyReviewed} />
        <StatCard icon={Clock} label="Серия дней" value={data.streak} />
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Активность за неделю</h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-accent" /> Сохранено
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-accent-secondary" /> Повторено
          </span>
        </div>
        <div className="flex h-48 items-end gap-3">
          {data.weeklyData.map((day) => (
            <div key={day.day} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-40 w-full items-end gap-1">
                <div className="flex flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t-sm bg-accent transition-all"
                    style={{
                      height: `${(day.saved / maxActivity) * 100}%`,
                      minHeight: day.saved > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <div className="flex flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t-sm bg-accent-secondary transition-all"
                    style={{
                      height: `${(day.reviewed / maxActivity) * 100}%`,
                      minHeight: day.reviewed > 0 ? "4px" : "0",
                    }}
                  />
                </div>
              </div>
              <span className="text-xs text-foreground-muted">{day.day}</span>
              <div className="flex gap-1 text-xs text-foreground-muted">
                <span>{day.saved}</span>/<span>{day.reviewed}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-foreground">По статусам</h2>
          <div className="space-y-4">
            {data.statusBreakdown.map((status) => (
              <div key={status.label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{status.label}</span>
                  <span className="text-sm text-foreground-secondary">
                    {status.count} ({Math.round((status.count / Math.max(data.totalWords, 1)) * 100)}%)
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-background-hover">
                  <div
                    className={`h-full ${status.color} rounded-full transition-all`}
                    style={{ width: `${(status.count / Math.max(data.totalWords, 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-secondary">Всего карточек</span>
              <span className="font-semibold text-foreground">{data.totalWords}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Серия активности</h2>
          <p className="mb-4 text-3xl font-bold text-accent">
            {data.streak} <span className="text-base font-normal text-foreground-secondary">дней подряд</span>
          </p>
          <p className="text-sm text-foreground-secondary">
            Показатель точности по последним ревью: <span className="font-semibold text-foreground">{data.accuracy}%</span>
          </p>
          <p className="mt-2 text-sm text-foreground-secondary">
            Карточек, готовых к повторению прямо сейчас: <span className="font-semibold text-foreground">{data.dueItems}</span>
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-foreground">По новеллам</h2>
        <div className="space-y-4">
          {data.novelStats.map((novel) => (
            <div key={novel.name} className="rounded-lg bg-background-hover/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-accent" />
                  <span className="font-medium text-foreground">{novel.name}</span>
                </div>
                <span className="text-sm text-foreground-secondary">{novel.words} карточек</span>
              </div>
              <div className="flex gap-1 overflow-hidden rounded-full bg-background-card">
                <div className="rounded-l-full bg-success" style={{ width: `${(novel.learned / Math.max(novel.words, 1)) * 100}%` }} />
                <div className="bg-warning" style={{ width: `${(novel.difficult / Math.max(novel.words, 1)) * 100}%` }} />
                <div className="rounded-r-full bg-accent" style={{ width: `${(novel.newW / Math.max(novel.words, 1)) * 100}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-foreground-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded bg-success" /> Выучено: {novel.learned}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded bg-warning" /> Сложные: {novel.difficult}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded bg-accent" /> Новые: {novel.newW}
                </span>
              </div>
            </div>
          ))}
          {data.novelStats.length === 0 ? (
            <p className="text-sm text-foreground-muted">Статистика по новеллам появится после первых синхронизаций.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
