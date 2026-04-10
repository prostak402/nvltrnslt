import {
  BookOpen,
  MessageSquare,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Activity,
  Save,
  RotateCcw,
  ArrowRight,
  BookMarked,
  Brain,
  KeyRound,
  Download,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";

const recentWords = [
  { word: "Inevitable", translation: "Неизбежный", novel: "Steins;Gate", date: "Сегодня", status: "новое" as const },
  { word: "Reluctant", translation: "Неохотный", novel: "Fate/Stay Night", date: "Сегодня", status: "сложное" as const },
  { word: "Consciousness", translation: "Сознание", novel: "Ever17", date: "Вчера", status: "выучено" as const },
  { word: "Contradiction", translation: "Противоречие", novel: "Umineko", date: "Вчера", status: "новое" as const },
  { word: "Perceive", translation: "Воспринимать", novel: "Clannad", date: "2 дня назад", status: "сложное" as const },
];

const recentPhrases = [
  {
    original: "The weight of myستقبل sins is not something I can simply cast aside.",
    correctedOriginal: "The weight of my sins is not something I can simply cast aside.",
    translation: "Тяжесть моих грехов — это не то, что я могу просто отбросить.",
    novel: "Fate/Stay Night",
  },
  {
    original: "No matter how many times I repeat this moment, the outcome never changes.",
    translation: "Сколько бы раз я ни повторял этот момент, результат никогда не меняется.",
    novel: "Steins;Gate",
  },
  {
    original: "Perhaps the truth we seek is hidden in plain sight.",
    translation: "Возможно, истина, которую мы ищем, скрыта на виду.",
    novel: "Umineko",
  },
];

const weeklyActivity = [
  { day: "Пн", value: 65 },
  { day: "Вт", value: 40 },
  { day: "Ср", value: 85 },
  { day: "Чт", value: 55 },
  { day: "Пт", value: 70 },
  { day: "Сб", value: 30 },
  { day: "Вс", value: 90 },
];

const statusBadgeVariant = {
  "новое": "accent",
  "сложное": "warning",
  "выучено": "success",
} as const;

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome bar */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Привет, Алексей!</h1>
            <p className="text-sm text-foreground-muted">Продолжай в том же духе</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="accent">Бесплатный план</Badge>
          <span className="text-sm text-foreground-secondary">
            Сегодня: <span className="text-foreground font-medium">18</span> из <span className="text-foreground font-medium">50</span> переводов
          </span>
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={BookOpen}
          label="Слов сохранено"
          value={247}
          change={{ value: "+12%", positive: true }}
        />
        <StatCard
          icon={MessageSquare}
          label="Фраз сохранено"
          value={38}
          change={{ value: "+8%", positive: true }}
        />
        <StatCard
          icon={Sparkles}
          label="Новых сегодня"
          value={12}
          change={{ value: "+3", positive: true }}
        />
        <StatCard
          icon={CheckCircle}
          label="Выучено"
          value={89}
          change={{ value: "+5%", positive: true }}
        />
        <StatCard
          icon={AlertTriangle}
          label="Сложных"
          value={34}
          change={{ value: "-2", positive: true }}
        />
      </div>

      {/* Today's activity + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's activity */}
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Активность за сегодня
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-background-hover">
              <p className="text-2xl font-bold text-foreground">18</p>
              <p className="text-xs text-foreground-muted mt-1">Переводов</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background-hover">
              <div className="flex items-center justify-center gap-1">
                <Save className="w-4 h-4 text-accent-secondary" />
              </div>
              <p className="text-2xl font-bold text-foreground">7</p>
              <p className="text-xs text-foreground-muted mt-1">Сохранений</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background-hover">
              <div className="flex items-center justify-center gap-1">
                <RotateCcw className="w-4 h-4 text-success" />
              </div>
              <p className="text-2xl font-bold text-foreground">15</p>
              <p className="text-xs text-foreground-muted mt-1">Повторений</p>
            </div>
          </div>
        </Card>

        {/* Quick actions */}
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-accent" />
            Быстрые действия
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" href="/dashboard/words" className="flex items-center gap-2 !justify-start">
              <BookMarked className="w-5 h-5 text-accent" />
              Открыть словарь
            </Button>
            <Button variant="secondary" size="lg" href="/dashboard/review" className="flex items-center gap-2 !justify-start">
              <Brain className="w-5 h-5 text-accent-secondary" />
              Начать повторение
            </Button>
            <Button variant="secondary" size="lg" href="/dashboard/access" className="flex items-center gap-2 !justify-start">
              <KeyRound className="w-5 h-5 text-warning" />
              Получить код доступа
            </Button>
            <Button variant="secondary" size="lg" href="/download" className="flex items-center gap-2 !justify-start">
              <Download className="w-5 h-5 text-success" />
              Скачать мод
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent words */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent" />
            Последние слова
          </h2>
          <Button variant="ghost" size="sm" href="/dashboard/words">
            Все слова <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-foreground-muted">
                <th className="text-left py-3 px-2 font-medium">Слово</th>
                <th className="text-left py-3 px-2 font-medium">Перевод</th>
                <th className="text-left py-3 px-2 font-medium hidden sm:table-cell">Новелла</th>
                <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Дата</th>
                <th className="text-left py-3 px-2 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {recentWords.map((w) => (
                <tr key={w.word} className="border-b border-border/50 hover:bg-background-hover transition-colors">
                  <td className="py-3 px-2 font-medium text-foreground">{w.word}</td>
                  <td className="py-3 px-2 text-foreground-secondary">{w.translation}</td>
                  <td className="py-3 px-2 text-foreground-muted hidden sm:table-cell">{w.novel}</td>
                  <td className="py-3 px-2 text-foreground-muted hidden md:table-cell">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {w.date}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <Badge variant={statusBadgeVariant[w.status]}>{w.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent phrases + Weekly chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent phrases */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-accent" />
              Последние фразы
            </h2>
            <Button variant="ghost" size="sm" href="/dashboard/phrases">
              Все фразы <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-4">
            {recentPhrases.map((p, i) => (
              <div key={i} className="p-3 rounded-lg bg-background-hover space-y-2">
                <p className="text-sm text-foreground leading-relaxed">
                  &ldquo;{p.correctedOriginal ?? p.original}&rdquo;
                </p>
                <p className="text-sm text-foreground-secondary leading-relaxed">
                  &ldquo;{p.translation}&rdquo;
                </p>
                <p className="text-xs text-foreground-muted">{p.novel}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Weekly activity chart */}
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Активность за неделю
          </h2>
          <div className="flex items-end justify-between gap-2 h-48 px-2">
            {weeklyActivity.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full relative flex items-end justify-center" style={{ height: "160px" }}>
                  <div
                    className="w-full max-w-[40px] rounded-t-md bg-accent/80 hover:bg-accent transition-colors"
                    style={{ height: `${d.value}%` }}
                  />
                </div>
                <span className="text-xs text-foreground-muted">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
