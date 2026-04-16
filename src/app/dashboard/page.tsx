import {
  ArrowRight,
  Activity,
  AlertTriangle,
  BookMarked,
  BookOpen,
  Brain,
  CheckCircle,
  Clock,
  Download,
  KeyRound,
  MessageSquare,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { planLabel, studyStatusMeta } from "@/lib/client/presentation";
import type { DashboardOverviewResponse } from "@/lib/contracts/dashboard";
import { requireDashboardPageUser } from "@/lib/server/page-auth";
import { getDashboardOverview } from "@/lib/server/services/study";

export default async function DashboardPage() {
  const user = await requireDashboardPageUser();
  const data: DashboardOverviewResponse = await getDashboardOverview(user.id);
  const weeklyMax =
    data.weeklyActivity.reduce((max, day) => Math.max(max, day.saved, day.reviewed), 0) || 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-light">
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Привет, {data.user.name}!</h1>
            <p className="text-sm text-foreground-muted">
              Сайт и мод теперь работают через единый словарь и sync-контур.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="accent">{planLabel(data.user.plan)} план</Badge>
          <span className="text-sm text-foreground-secondary">
            Сегодня: <span className="font-medium text-foreground">{data.summary.translationsToday}</span> из{" "}
            <span className="font-medium text-foreground">{data.summary.translationsLimit ?? "∞"}</span>{" "}
            переводов
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={BookOpen} label="Слов сохранено" value={data.summary.wordsCount} />
        <StatCard icon={MessageSquare} label="Фраз сохранено" value={data.summary.phrasesCount} />
        <StatCard icon={Sparkles} label="Новых карточек" value={data.summary.newCount} />
        <StatCard icon={CheckCircle} label="Выучено" value={data.summary.learnedCount} />
        <StatCard icon={AlertTriangle} label="Сложных" value={data.summary.hardCount} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Activity className="h-5 w-5 text-accent" />
            Активность за сегодня
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-background-hover p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{data.summary.translationsToday}</p>
              <p className="mt-1 text-xs text-foreground-muted">Переводов</p>
            </div>
            <div className="rounded-lg bg-background-hover p-4 text-center">
              <Save className="mx-auto h-4 w-4 text-accent-secondary" />
              <p className="text-2xl font-bold text-foreground">{data.summary.savesToday}</p>
              <p className="mt-1 text-xs text-foreground-muted">Сохранений</p>
            </div>
            <div className="rounded-lg bg-background-hover p-4 text-center">
              <RotateCcw className="mx-auto h-4 w-4 text-success" />
              <p className="text-2xl font-bold text-foreground">{data.summary.reviewsToday}</p>
              <p className="mt-1 text-xs text-foreground-muted">Повторений</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <ArrowRight className="h-5 w-5 text-accent" />
            Быстрые действия
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" href="/dashboard/words" className="flex items-center gap-2 !justify-start">
              <BookMarked className="h-5 w-5 text-accent" />
              Открыть словарь
            </Button>
            <Button variant="secondary" size="lg" href="/dashboard/learning" className="flex items-center gap-2 !justify-start">
              <Brain className="h-5 w-5 text-accent-secondary" />
              Начать повторение
            </Button>
            <Button variant="secondary" size="lg" href="/dashboard/devices" className="flex items-center gap-2 !justify-start">
              <KeyRound className="h-5 w-5 text-warning" />
              Скачать ключ-файл
            </Button>
            <Button variant="secondary" size="lg" href="/download" className="flex items-center gap-2 !justify-start">
              <Download className="h-5 w-5 text-success" />
              Скачать мод
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <BookOpen className="h-5 w-5 text-accent" />
            Последние слова
          </h2>
          <Button variant="ghost" size="sm" href="/dashboard/words">
            Все слова <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-foreground-muted">
                <th className="px-2 py-3 text-left font-medium">Слово</th>
                <th className="px-2 py-3 text-left font-medium">Перевод</th>
                <th className="hidden px-2 py-3 text-left font-medium sm:table-cell">Новелла</th>
                <th className="hidden px-2 py-3 text-left font-medium md:table-cell">Когда</th>
                <th className="px-2 py-3 text-left font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {data.recentWords.map((word) => (
                <tr key={word.id} className="border-b border-border/50 transition-colors hover:bg-background-hover">
                  <td className="px-2 py-3 font-medium text-foreground">{word.word}</td>
                  <td className="px-2 py-3 text-foreground-secondary">{word.translation}</td>
                  <td className="hidden px-2 py-3 text-foreground-muted sm:table-cell">{word.novel}</td>
                  <td className="hidden px-2 py-3 text-foreground-muted md:table-cell">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {word.relativeDate}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant={studyStatusMeta[word.status].variant}>{studyStatusMeta[word.status].label}</Badge>
                  </td>
                </tr>
              ))}
              {data.recentWords.length === 0 ? (
                <tr>
                  <td className="px-2 py-4 text-foreground-muted" colSpan={5}>
                    Пока нет сохранённых слов. После первой синхронизации из мода они появятся здесь.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <MessageSquare className="h-5 w-5 text-accent" />
              Последние фразы
            </h2>
            <Button variant="ghost" size="sm" href="/dashboard/phrases">
              Все фразы <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            {data.recentPhrases.map((phrase) => (
              <div key={phrase.id} className="space-y-2 rounded-lg bg-background-hover p-3">
                <p className="text-sm leading-relaxed text-foreground">&ldquo;{phrase.phrase}&rdquo;</p>
                <p className="text-sm leading-relaxed text-foreground-secondary">&ldquo;{phrase.translation}&rdquo;</p>
                <p className="text-xs text-foreground-muted">{phrase.novel}</p>
              </div>
            ))}
            {data.recentPhrases.length === 0 ? (
              <p className="text-sm text-foreground-muted">Фразы появятся после первых сохранений из мода.</p>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Activity className="h-5 w-5 text-accent" />
            Активность за неделю
          </h2>
          <div className="mb-4 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-accent" /> Сохранено
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-accent-secondary" /> Повторено
            </span>
          </div>
          <div className="flex h-48 items-end justify-between gap-2 px-2">
            {data.weeklyActivity.map((day) => (
              <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex h-[160px] w-full items-end justify-center gap-1">
                  <div
                    className="w-full max-w-[18px] rounded-t-md bg-accent/80"
                    style={{ height: `${(day.saved / weeklyMax) * 100}%` }}
                  />
                  <div
                    className="w-full max-w-[18px] rounded-t-md bg-accent-secondary/80"
                    style={{ height: `${(day.reviewed / weeklyMax) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-foreground-muted">{day.day}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
