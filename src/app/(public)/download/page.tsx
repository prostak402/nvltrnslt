import {
  AlertTriangle,
  Apple,
  Download,
  FolderOpen,
  Gamepad2,
  HelpCircle,
  KeyRound,
  Laptop,
  MessageCircle,
  Monitor,
  RefreshCw,
  Terminal,
} from "lucide-react";

import { ACTIVATION_KEY_FILE, MOD_DOWNLOAD_PATH, MOD_VERSION } from "@/lib/config";
import { modDesktopSupportSummary } from "@/lib/product";

export const metadata = {
  title: "Скачать мод — NVLingo",
};

const desktopPlatforms = [
  {
    name: "Windows",
    icon: Monitor,
  },
  {
    name: "Linux",
    icon: Terminal,
  },
  {
    name: "macOS",
    icon: Apple,
  },
] as const;

const installSteps = [
  {
    icon: Download,
    title: "Скачайте архив",
    description: "Сохраните zip-архив с релизом мода на компьютер.",
  },
  {
    icon: FolderOpen,
    title: "Распакуйте в папку game/",
    description:
      "Скопируйте файлы мода в папку game/ вашей визуальной новеллы на Ren'Py.",
  },
  {
    icon: KeyRound,
    title: "Скачайте файл активации",
    description: `Скачайте ${ACTIVATION_KEY_FILE} в кабинете и положите его в ту же папку game/.`,
  },
  {
    icon: Gamepad2,
    title: "Запустите игру",
    description:
      "Мод сам прочитает ключ-файл, активируется и подключит аккаунт.",
  },
];

const troubleshooting = [
  {
    icon: RefreshCw,
    title: "Проверьте версию игры",
    description:
      "Рекомендуются Ren'Py 7.x и 8.x. На нестандартных сборках возможны ограничения.",
  },
  {
    icon: AlertTriangle,
    title: "Проверьте совместимость",
    description:
      "Если у игры кастомный интерфейс или необычная сборка, сначала загляните на страницу совместимости.",
  },
  {
    icon: HelpCircle,
    title: "Откройте F6",
    description:
      "Если мод не подтянул ключ автоматически, откройте окно мода через F6 и проверьте настройки синхронизации.",
  },
  {
    icon: MessageCircle,
    title: "Обратитесь в поддержку",
    description:
      "Если проблема повторяется, создайте тикет в кабинете NVLingo.",
  },
];

export default function DownloadPage() {
  return (
    <main className="min-h-screen px-4 py-16">
      <div className="mx-auto max-w-7xl space-y-24">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent-light px-4 py-1.5 text-sm font-medium text-accent">
            <Download className="h-4 w-4" />
            Скачать
          </div>
          <h1 className="mb-6 text-4xl font-bold text-foreground md:text-5xl">
            Скачать мод
          </h1>
          <p className="text-lg leading-relaxed text-foreground-secondary">
            Установите NVLingo в вашу визуальную новеллу на Ren&apos;Py и
            подключите её к сайту через постоянный ключ-файл. Лимиты и доступные
            функции зависят от тарифа аккаунта.
          </p>
        </section>

        <section>
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Desktop-сборка
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-foreground-secondary">
            {modDesktopSupportSummary()} Внутри архива только файлы мода для папки
            {" "}
            <code className="rounded bg-background-hover px-1.5 py-0.5 text-xs text-accent-secondary">
              game/
            </code>
            , поэтому отдельные сборки по ОС сейчас не нужны.
          </p>
          <div className="mx-auto max-w-4xl">
            <div className="relative rounded-2xl border border-accent bg-background-card p-8 shadow-[0_0_30px_rgba(108,92,231,0.15)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white">
                Доступно сейчас
              </div>

              <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <div className="text-center md:text-left">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-light md:mx-0">
                    <Laptop className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">
                    Универсальный desktop-архив
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm text-foreground-secondary">
                    {modDesktopSupportSummary()}
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                    {desktopPlatforms.map((platform) => (
                      <div
                        key={platform.name}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background-hover px-3 py-1.5 text-sm text-foreground"
                      >
                        <platform.icon className="h-4 w-4 text-accent" />
                        {platform.name}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-foreground-muted md:justify-start">
                    <span>{`v${MOD_VERSION}`}</span>
                    <span className="h-1 w-1 rounded-full bg-foreground-muted" />
                    <span>zip-архив</span>
                    <span className="h-1 w-1 rounded-full bg-foreground-muted" />
                    <span>файлы для папки game/</span>
                  </div>
                </div>

                <a
                  href={MOD_DOWNLOAD_PATH}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  <Download className="h-4 w-4" />
                  Скачать архив
                </a>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">
            Установка мода
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-foreground-secondary">
            Четыре шага, чтобы связать мод, игру и ваш аккаунт.
          </p>
          <div className="mx-auto grid max-w-3xl gap-6">
            {installSteps.map((step, index) => (
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
          <div className="rounded-2xl border border-border bg-background-card p-8 md:p-12">
            <div className="mb-8 flex items-center justify-center gap-3">
              <AlertTriangle className="h-6 w-6 text-warning" />
              <h2 className="text-2xl font-bold text-foreground">
                Если что-то не работает
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {troubleshooting.map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background-hover">
                    <item.icon className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-base font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-sm text-foreground-secondary">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
