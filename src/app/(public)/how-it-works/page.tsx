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

export const metadata = {
  title: "Как это работает — NVL Translate",
};

const steps = [
  {
    icon: Download,
    title: "Скачайте мод",
    description: "Загрузите мод NVL Translate для вашей платформы со страницы загрузки.",
  },
  {
    icon: FolderOpen,
    title: "Поместите в папку игры",
    description: "Скопируйте файлы мода в папку game/ вашей визуальной новеллы на Ren'Py.",
  },
  {
    icon: Gamepad2,
    title: "Откройте игру",
    description: "Запустите визуальную новеллу. Мод автоматически инициализируется при старте.",
  },
  {
    icon: KeyRound,
    title: "Введите код доступа",
    description: "В меню мода введите код доступа из вашего личного кабинета на сайте.",
  },
  {
    icon: CheckCircle,
    title: "Подтвердите подключение",
    description: "Дождитесь подтверждения связи. Мод готов к работе — переводите прямо в игре!",
  },
];

const gameFeatures = [
  {
    icon: Languages,
    title: "Перевод слова",
    description: "Выделите незнакомое слово и мгновенно получите его перевод.",
  },
  {
    icon: MessageSquareText,
    title: "Перевод фразы",
    description: "Переведите целую фразу или предложение для лучшего понимания контекста.",
  },
  {
    icon: Bookmark,
    title: "Сохранение слова",
    description: "Добавьте слово в личный словарь одним нажатием для дальнейшего изучения.",
  },
  {
    icon: BookmarkPlus,
    title: "Сохранение фразы",
    description: "Сохраните полезную фразу вместе с контекстом из игры.",
  },
  {
    icon: History,
    title: "Просмотр истории",
    description: "Просматривайте историю всех ваших переводов прямо в меню мода.",
  },
  {
    icon: HardDrive,
    title: "Локальный кэш",
    description: "Ранее переведённые слова доступны мгновенно без повторного запроса.",
  },
];

const siteFeatures = [
  {
    icon: Library,
    title: "Словарь",
    description: "Все сохранённые слова с переводами, транскрипцией и примерами использования.",
  },
  {
    icon: ListChecks,
    title: "Фразы",
    description: "Коллекция сохранённых фраз с контекстом из визуальных новелл.",
  },
  {
    icon: Tag,
    title: "Статусы",
    description: "Отмечайте слова как «новое», «изучаю», «выучено» для отслеживания прогресса.",
  },
  {
    icon: Clock,
    title: "История",
    description: "Полная история переводов с датами, источниками и контекстом.",
  },
  {
    icon: TrendingUp,
    title: "Прогресс",
    description: "Наглядная статистика: сколько слов выучено, ежедневная активность, цели.",
  },
  {
    icon: GraduationCap,
    title: "Обучение",
    description: "Карточки, упражнения и тесты для закрепления выученных слов.",
  },
];

const tiers = [
  {
    name: "Бесплатно",
    price: "0 ₽",
    features: {
      "Переводов в день": "30–50",
      "Словарь": "Ограниченный",
      "Перевод слов": true,
      "Перевод фраз": true,
      "Синхронизация": true,
      "История переводов": "Базовая",
      "Карточки": "Базовые",
      "Поиск и фильтры": false,
      "Упражнения": false,
      "Расширенная статистика": false,
      "Авто-перевод предложений": false,
      "Приоритетная обработка": false,
    },
  },
  {
    name: "Базовый",
    price: "$4.99/мес",
    features: {
      "Переводов в день": "200",
      "Словарь": "Полный",
      "Перевод слов": true,
      "Перевод фраз": true,
      "Синхронизация": true,
      "История переводов": "Полная",
      "Карточки": "Расширенные",
      "Поиск и фильтры": true,
      "Упражнения": true,
      "Расширенная статистика": false,
      "Авто-перевод предложений": false,
      "Приоритетная обработка": false,
    },
  },
  {
    name: "Расширенный",
    price: "$9.99/мес",
    features: {
      "Переводов в день": "Безлимит",
      "Словарь": "Полный",
      "Перевод слов": true,
      "Перевод фраз": true,
      "Синхронизация": true,
      "История переводов": "Полная",
      "Карточки": "Все виды",
      "Поиск и фильтры": true,
      "Упражнения": true,
      "Расширенная статистика": true,
      "Авто-перевод предложений": true,
      "Приоритетная обработка": true,
    },
  },
];

const featureKeys = Object.keys(tiers[0].features);

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto space-y-24">
        {/* Section 1: Что это */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-accent-light text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            О платформе
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Как это работает
          </h1>
          <p className="text-lg text-foreground-secondary leading-relaxed">
            NVL Translate — это платформа для изучения английского языка через визуальные новеллы.
            Мод для Ren&apos;Py позволяет переводить слова и фразы прямо во время игры, сохранять их
            в личный словарь и повторять на сайте с помощью карточек и упражнений. Всё синхронизируется
            автоматически между игрой и вашим аккаунтом.
          </p>
        </section>

        {/* Section 2: Как подключить */}
        <section>
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Как подключить
          </h2>
          <div className="grid gap-6 md:gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-5 bg-background-card border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-accent-light rounded-xl flex items-center justify-center relative">
                  <step.icon className="w-5 h-5 text-accent" />
                  <span className="absolute -top-2 -left-2 w-6 h-6 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-foreground-secondary">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Что можно делать в игре */}
        <section>
          <h2 className="text-3xl font-bold text-foreground text-center mb-4">
            Что можно делать в игре
          </h2>
          <p className="text-foreground-secondary text-center mb-12 max-w-2xl mx-auto">
            Мод добавляет удобные инструменты перевода прямо в интерфейс визуальной новеллы.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gameFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-background-card border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
              >
                <div className="w-10 h-10 bg-accent-secondary-light rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-accent-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-foreground-secondary text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Что появляется на сайте */}
        <section>
          <h2 className="text-3xl font-bold text-foreground text-center mb-4">
            Что появляется на сайте
          </h2>
          <p className="text-foreground-secondary text-center mb-12 max-w-2xl mx-auto">
            Все данные из игры автоматически синхронизируются с вашим аккаунтом на сайте.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {siteFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-background-card border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
              >
                <div className="w-10 h-10 bg-accent-light rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-foreground-secondary text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Что даёт каждый тариф */}
        <section>
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Что даёт каждый тариф
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-foreground-secondary text-sm font-medium p-4 border-b border-border">
                    Функция
                  </th>
                  {tiers.map((tier) => (
                    <th
                      key={tier.name}
                      className="text-center p-4 border-b border-border"
                    >
                      <div className="text-foreground font-semibold">{tier.name}</div>
                      <div className="text-accent text-sm mt-1">{tier.price}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureKeys.map((key) => (
                  <tr key={key} className="hover:bg-background-hover transition-colors">
                    <td className="text-foreground-secondary text-sm p-4 border-b border-border">
                      {key}
                    </td>
                    {tiers.map((tier) => {
                      const value = tier.features[key as keyof typeof tier.features];
                      return (
                        <td
                          key={tier.name}
                          className="text-center p-4 border-b border-border"
                        >
                          {value === true ? (
                            <Check className="w-5 h-5 text-success mx-auto" />
                          ) : value === false ? (
                            <X className="w-5 h-5 text-foreground-muted mx-auto" />
                          ) : (
                            <span className="text-foreground text-sm">{value}</span>
                          )}
                        </td>
                      );
                    })}
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
