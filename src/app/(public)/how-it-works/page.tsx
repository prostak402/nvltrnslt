import {
  BookOpen,
  Download,
  FolderOpen,
  Gamepad2,
  KeyRound,
  CheckCircle,
  Languages,
  MessageSquareText,
  Bookmark,
  BookmarkPlus,
  History,
  HardDrive,
  Library,
  ListChecks,
  Tag,
  Clock,
  TrendingUp,
  GraduationCap,
  Check,
  X,
} from "lucide-react";

import { ACTIVATION_KEY_FILE } from "@/lib/config";
import { planComparisonRows } from "@/lib/product";

export const metadata = {
  title: "Как это работает — NVLingo",
};

const steps = [
  {
    icon: Download,
    title: "Скачайте мод",
    description: "Загрузите архив NVLingo со страницы загрузки.",
  },
  {
    icon: FolderOpen,
    title: "Поместите файлы в игру",
    description:
      "Скопируйте файлы мода в папку game/ вашей визуальной новеллы на Ren'Py.",
  },
  {
    icon: KeyRound,
    title: "Скачайте ключ-файл",
    description: `Скачайте ${ACTIVATION_KEY_FILE} в кабинете и положите его в ту же папку game/.`,
  },
  {
    icon: Gamepad2,
    title: "Запустите игру",
    description:
      "При старте игры мод читает ключ-файл, активируется и подключает аккаунт автоматически.",
  },
  {
    icon: CheckCircle,
    title: "Начните читать и сохранять",
    description:
      "Переводите слова и фразы, сохраняйте карточки и повторяйте их уже в кабинете.",
  },
];

const gameFeatures = [
  {
    icon: Languages,
    title: "Перевод слова",
    description:
      "Выделите незнакомое слово и сразу получите перевод в контексте сцены.",
  },
  {
    icon: MessageSquareText,
    title: "Перевод фразы",
    description:
      "Можно переводить не только отдельные слова, но и фразы целиком.",
  },
  {
    icon: Bookmark,
    title: "Сохранение слова",
    description:
      "Добавьте слово в словарь одним нажатием для дальнейшего повторения.",
  },
  {
    icon: BookmarkPlus,
    title: "Сохранение фразы",
    description:
      "Сохраните полезную фразу вместе с контекстом из игры.",
  },
  {
    icon: History,
    title: "История",
    description:
      "Недавние переводы и действия остаются доступны во время текущего чтения.",
  },
  {
    icon: HardDrive,
    title: "Локальный кэш",
    description:
      "Ранее переведённые фрагменты открываются быстрее и без лишних запросов.",
  },
];

const siteFeatures = [
  {
    icon: Library,
    title: "Словарь",
    description:
      "Все сохранённые слова с переводом, заметками и примерами использования.",
  },
  {
    icon: ListChecks,
    title: "Фразы",
    description:
      "Отдельный список фраз с контекстом из визуальных новелл.",
  },
  {
    icon: Tag,
    title: "Статусы изучения",
    description:
      "Отмечайте слова как новые, сложные или выученные.",
  },
  {
    icon: Clock,
    title: "История",
    description:
      "Хронология переводов и действий по аккаунту.",
  },
  {
    icon: TrendingUp,
    title: "Прогресс",
    description:
      "Статистика по повторам, активности и накоплению словаря.",
  },
  {
    icon: GraduationCap,
    title: "Обучение",
    description:
      "Карточки и упражнения для закрепления слов, собранных в игре.",
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="mx-auto h-5 w-5 text-success" />;
  }

  if (value === false) {
    return <X className="mx-auto h-5 w-5 text-foreground-muted" />;
  }

  return <span className="text-sm text-foreground">{value}</span>;
}

export default function HowItWorksPage() {
  const comparisonRows = planComparisonRows();

  return (
    <main className="min-h-screen px-4 py-16">
      <div className="mx-auto max-w-7xl space-y-24">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent-light px-4 py-1.5 text-sm font-medium text-accent">
            <BookOpen className="h-4 w-4" />
            О платформе
          </div>
          <h1 className="mb-6 text-4xl font-bold text-foreground md:text-5xl">
            Как это работает
          </h1>
          <p className="text-lg leading-relaxed text-foreground-secondary">
            NVLingo связывает игру на Ren&apos;Py и ваш кабинет на сайте:
            вы переводите и сохраняете материал в игре, а затем повторяете его
            уже в словаре и карточках.
          </p>
        </section>

        <section>
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Как подключить
          </h2>
          <div className="grid gap-6 md:gap-8">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="flex items-start gap-5 rounded-xl border border-border bg-background-card p-6 transition-colors hover:border-border-hover"
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-light">
                  <step.icon className="h-5 w-5 text-accent" />
                  <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-foreground-secondary">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">
            Что можно делать в игре
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-foreground-secondary">
            Мод добавляет перевод и сохранение слов прямо в интерфейс визуальной
            новеллы.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gameFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-background-card p-6 transition-colors hover:border-border-hover"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-secondary-light">
                  <feature.icon className="h-5 w-5 text-accent-secondary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-foreground-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">
            Что появляется на сайте
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-foreground-secondary">
            Все данные из игры автоматически оказываются в аккаунте и становятся
            основой для повторения.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {siteFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-background-card p-6 transition-colors hover:border-border-hover"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light">
                  <feature.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-foreground-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Что даёт каждый тариф
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-border p-4 text-left text-sm font-medium text-foreground-secondary">
                    Функция
                  </th>
                  <th className="border-b border-border p-4 text-center text-sm font-medium text-foreground">
                    Бесплатный
                  </th>
                  <th className="border-b border-border p-4 text-center text-sm font-medium text-accent">
                    Базовый
                  </th>
                  <th className="border-b border-border p-4 text-center text-sm font-medium text-foreground">
                    Расширенный
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.name} className="transition-colors hover:bg-background-hover">
                    <td className="border-b border-border p-4 text-sm text-foreground-secondary">
                      {row.name}
                    </td>
                    <td className="border-b border-border p-4 text-center">
                      <CellValue value={row.free} />
                    </td>
                    <td className="border-b border-border p-4 text-center">
                      <CellValue value={row.basic} />
                    </td>
                    <td className="border-b border-border p-4 text-center">
                      <CellValue value={row.extended} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
