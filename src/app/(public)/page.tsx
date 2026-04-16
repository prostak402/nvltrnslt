import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  Download,
  Gauge,
  GraduationCap,
  HardDrive,
  History,
  KeyRound,
  Layers,
  MessageSquareText,
  MousePointerClick,
  Puzzle,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  TextSelect,
  TrendingUp,
  X,
} from "lucide-react";

import { FAQAccordion } from "./faq-accordion";
import {
  activationFlowSummary,
  deviceLimitSummary,
  freePlanSummary,
  paidPlansSummary,
  publicPlanCards,
} from "@/lib/product";

function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-light via-background to-background" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="max-w-xl">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Учите английский через визуальные новеллы на Ren&apos;Py
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-foreground-secondary">
              Переводите слова и фразы прямо в игре, сохраняйте их в личный
              словарь и повторяйте на сайте с отслеживанием прогресса.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#download"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-medium text-white transition hover:bg-accent-hover"
              >
                <Download className="h-5 w-5" />
                Скачать мод
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium text-foreground transition hover:border-border-hover hover:bg-background-hover"
              >
                Как это работает
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="rounded-xl border border-border bg-background-card p-4 shadow-2xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-danger" />
                <span className="h-3 w-3 rounded-full bg-warning" />
                <span className="h-3 w-3 rounded-full bg-success" />
                <span className="ml-2 text-xs text-foreground-muted">
                  visual_novel.rpy
                </span>
              </div>

              <div className="relative rounded-lg bg-background-secondary p-6">
                <p className="font-mono text-sm leading-relaxed text-foreground-secondary">
                  &quot;The{" "}
                  <span className="rounded bg-accent-light px-1 text-accent">
                    ancient
                  </span>{" "}
                  library held secrets that no one dared to explore.&quot;
                </p>

                <div className="mt-3 inline-block rounded-lg border border-accent bg-background-card px-4 py-2 shadow-lg">
                  <p className="text-xs font-semibold text-accent">ancient</p>
                  <p className="text-sm text-foreground">древний, старинный</p>
                  <div className="mt-1 flex gap-2">
                    <span className="rounded bg-accent px-2 py-0.5 text-xs text-white">
                      Сохранить
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -right-4 w-56 rounded-xl border border-border bg-background-card p-4 shadow-xl sm:-right-8">
              <p className="mb-2 text-xs font-semibold text-foreground-muted">
                Личный кабинет
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-secondary">Карточки</span>
                  <span className="text-xs font-bold text-accent">128</span>
                </div>
                <div className="h-1.5 rounded-full bg-background-secondary">
                  <div className="h-1.5 w-3/4 rounded-full bg-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-secondary">Прогресс</span>
                  <span className="text-xs font-bold text-success">72%</span>
                </div>
                <div className="h-1.5 rounded-full bg-background-secondary">
                  <div className="h-1.5 w-[72%] rounded-full bg-success" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    icon: Download,
    title: "Установите мод",
    description:
      "Скачайте мод и поместите файлы в папку game/ вашей визуальной новеллы.",
  },
  {
    icon: KeyRound,
    title: "Скачайте ключ-файл",
    description: activationFlowSummary(),
  },
  {
    icon: Bookmark,
    title: "Сохраняйте слова во время чтения",
    description:
      "Кликайте на незнакомые слова и фразы, получайте перевод и сохраняйте материал в словарь одной кнопкой.",
  },
  {
    icon: GraduationCap,
    title: "Повторяйте на сайте",
    description:
      "Открывайте кабинет, тренируйте карточки, следите за историей и прогрессом.",
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          Как это работает
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-foreground-secondary">
          Четыре простых шага от установки до первого сохранённого слова
        </p>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-xl border border-border bg-background-card p-6 transition hover:border-border-hover hover:bg-background-hover"
            >
              <span className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                {index + 1}
              </span>
              <step.icon className="mt-2 h-8 w-8 text-accent" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const modFeatures = [
  {
    icon: MousePointerClick,
    title: "Перевод слова",
    description: "Кликните по слову в диалоге и сразу получите перевод.",
  },
  {
    icon: TextSelect,
    title: "Перевод выделенной фразы",
    description: "Выделите несколько слов для перевода всей фразы целиком.",
  },
  {
    icon: Bookmark,
    title: "Сохранение слов",
    description: "Добавляйте полезные слова в словарь прямо во время чтения.",
  },
  {
    icon: MessageSquareText,
    title: "Сохранение фраз",
    description: "Сохраняйте фразы вместе с контекстом из новеллы.",
  },
  {
    icon: RefreshCw,
    title: "Синхронизация с кабинетом",
    description: "Слова и фразы автоматически появляются в вашем аккаунте.",
  },
  {
    icon: HardDrive,
    title: "Локальный кэш",
    description: "Уже переведённые фрагменты доступны быстрее и без лишних запросов.",
  },
  {
    icon: History,
    title: "История",
    description: "Вы видите недавние переводы и не теряете контекст чтения.",
  },
  {
    icon: Sparkles,
    title: "Автоперевод предложений",
    description:
      "На расширенном тарифе доступен автоперевод целых предложений.",
    badge: "Расширенный тариф",
  },
];

function ModFeaturesSection() {
  return (
    <section id="download" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          Что умеет мод
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-foreground-secondary">
          Всё, что нужно для комфортного чтения и сбора слов прямо в игре
        </p>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-background-card p-6 transition hover:border-border-hover hover:bg-background-hover"
            >
              <div className="flex items-start justify-between">
                <feature.icon className="h-7 w-7 text-accent" />
                {"badge" in feature ? (
                  <span className="rounded-full bg-accent-light px-3 py-0.5 text-xs font-medium text-accent">
                    {feature.badge}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const dashboardFeatures = [
  {
    icon: BookOpen,
    title: "Словарь",
    description: "Все сохранённые слова и фразы в одном месте.",
  },
  {
    icon: Search,
    title: "Поиск и фильтры",
    description: "Быстрый поиск и сортировка по статусу изучения.",
  },
  {
    icon: Layers,
    title: "Карточки",
    description: "Повторяйте слова через привычные карточки.",
  },
  {
    icon: Puzzle,
    title: "Упражнения",
    description: "Дополнительные режимы закрепления на платных тарифах.",
  },
  {
    icon: TrendingUp,
    title: "Прогресс",
    description: "Следите за динамикой и количеством выученных слов.",
  },
  {
    icon: History,
    title: "История",
    description: "Смотрите недавние переводы и действия в кабинете.",
  },
  {
    icon: Gauge,
    title: "Лимиты и тариф",
    description: "Контролируйте использование квоты и план аккаунта.",
  },
  {
    icon: Smartphone,
    title: "Устройства",
    description: deviceLimitSummary(),
  },
];

function DashboardFeaturesSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          Что есть в кабинете
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-foreground-secondary">
          Личный кабинет для повторения слов, контроля лимитов и отслеживания
          прогресса
        </p>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dashboardFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-background-card p-6 transition hover:border-border-hover hover:bg-background-hover"
            >
              <feature.icon className="h-7 w-7 text-accent-secondary" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const withoutService = [
  "Выходить из игры и открывать переводчик в браузере",
  "Копировать и вставлять слова вручную",
  "Терять контекст сцены во время чтения",
  "Вести словарь в заметках отдельно от игры",
];

const withService = [
  "Кликать по слову прямо в игре",
  "Сохранять слово или фразу одной кнопкой",
  "Повторять материал в кабинете с карточками и историей",
  "Читать без постоянных переключений между окнами",
];

function ComparisonSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          Почему это удобнее
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-foreground-secondary">
          Сравните обычный процесс перевода с работой через NVLingo
        </p>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border border-danger/30 bg-danger-light p-8">
            <h3 className="text-xl font-semibold text-danger">Без сервиса</h3>
            <ul className="mt-6 space-y-4">
              {withoutService.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                  <span className="text-foreground-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-success/30 bg-[rgba(0,184,148,0.1)] p-8">
            <h3 className="text-xl font-semibold text-success">С сервисом</h3>
            <ul className="mt-6 space-y-4">
              {withService.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span className="text-foreground-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = publicPlanCards();

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          Тарифы
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-foreground-secondary">
          Те же правила, лимиты и цены вы увидите и в кабинете
        </p>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-8 transition ${
                plan.highlighted
                  ? "border-accent bg-accent-light shadow-lg shadow-accent/10"
                  : "border-border bg-background-card hover:border-border-hover"
              }`}
            >
              <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold text-foreground">{plan.price}</p>
              <ul className="mt-6 space-y-3">
                {plan.previewFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-foreground-secondary"
                  >
                    <Check className="h-4 w-4 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-accent transition hover:text-accent-hover"
          >
            Смотреть все тарифы
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CompatibilitySection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-background-card p-8 text-center md:p-12">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Совместимость с новеллами
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-foreground-secondary">
            Мод работает с большинством визуальных новелл на движке Ren&apos;Py
            7 и 8. Список проверенных игр и их статус есть на отдельной
            странице.
          </p>
          <Link
            href="/compatibility"
            className="mt-6 inline-flex items-center gap-2 text-accent transition hover:text-accent-hover"
          >
            Проверить совместимость
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

const faqItems = [
  {
    question: "Мод бесплатный?",
    answer: `Да. ${freePlanSummary()} Для расширенных возможностей доступны платные тарифы.`,
  },
  {
    question: "Как установить мод?",
    answer: activationFlowSummary(),
  },
  {
    question: "Нужен ли интернет для работы?",
    answer:
      "Для новых переводов нужен интернет. Уже полученные переводы мод может взять из локального кэша.",
  },
  {
    question: "Можно ли использовать мод на нескольких компьютерах?",
    answer: `${deviceLimitSummary()} Привязанными устройствами можно управлять в кабинете.`,
  },
  {
    question: "Чем отличаются платные тарифы?",
    answer: paidPlansSummary(),
  },
];

function FAQSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          Частые вопросы
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-foreground-secondary">
          Коротко о тарифах, установке и синхронизации
        </p>

        <div className="mx-auto mt-14 max-w-3xl">
          <FAQAccordion items={faqItems} />
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <HowItWorksSection />
      <ModFeaturesSection />
      <DashboardFeaturesSection />
      <ComparisonSection />
      <PricingSection />
      <CompatibilitySection />
      <FAQSection />
    </main>
  );
}
