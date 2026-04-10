import {
  Download,
  Monitor,
  Apple,
  Terminal,
  FolderOpen,
  Gamepad2,
  KeyRound,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  MessageCircle,
  RefreshCw,
  Clock,
} from "lucide-react";

export const metadata = {
  title: "Скачать мод — NVL Translate",
};

const platforms = [
  {
    name: "Windows",
    icon: Monitor,
    available: true,
    version: "v1.0.2",
    size: "12 МБ",
    description: "Windows 10 / 11 (64-bit)",
  },
  {
    name: "Linux",
    icon: Terminal,
    available: false,
    description: "Скоро появится",
  },
  {
    name: "macOS",
    icon: Apple,
    available: false,
    description: "Скоро появится",
  },
];

const installSteps = [
  {
    icon: Download,
    title: "Скачайте архив",
    description: "Нажмите кнопку «Скачать» выше и сохраните ZIP-архив на компьютер.",
  },
  {
    icon: FolderOpen,
    title: "Распакуйте файлы",
    description:
      "Откройте архив и скопируйте все файлы из него в папку game/ вашей визуальной новеллы на Ren'Py.",
  },
  {
    icon: Gamepad2,
    title: "Запустите игру",
    description:
      "Откройте визуальную новеллу. Мод инициализируется автоматически при старте — вы увидите значок NVL Translate в углу экрана.",
  },
];

const afterInstall = [
  {
    icon: Gamepad2,
    title: "Откройте игру",
    description: "Запустите визуальную новеллу с установленным модом.",
  },
  {
    icon: KeyRound,
    title: "Откройте меню мода",
    description:
      "Нажмите на значок NVL Translate или используйте горячую клавишу для открытия панели мода.",
  },
  {
    icon: KeyRound,
    title: "Введите код доступа",
    description:
      "Скопируйте код из личного кабинета на сайте и вставьте его в поле «Код доступа» в меню мода.",
  },
  {
    icon: CheckCircle,
    title: "Подтвердите подключение",
    description:
      "Дождитесь зелёного индикатора — соединение установлено. Теперь можно переводить слова прямо в игре!",
  },
];

const troubleshooting = [
  {
    icon: RefreshCw,
    title: "Проверьте версию игры",
    description:
      "Убедитесь, что ваша визуальная новелла работает на Ren'Py версии 7.x или 8.x. Более старые версии не поддерживаются.",
  },
  {
    icon: AlertTriangle,
    title: "Проверьте совместимость",
    description:
      "Некоторые новеллы с нестандартным интерфейсом могут работать некорректно. Проверьте список совместимых игр на странице совместимости.",
  },
  {
    icon: HelpCircle,
    title: "Откройте раздел помощи",
    description:
      "В меню мода есть встроенный раздел помощи с подробными инструкциями и диагностикой проблем.",
  },
  {
    icon: MessageCircle,
    title: "Свяжитесь с поддержкой",
    description:
      "Если проблема не решается, напишите нам на support@nvltrnslt.com или в Discord-канал поддержки.",
  },
];

export default function DownloadPage() {
  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto space-y-24">
        {/* Header */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-accent-light text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Download className="w-4 h-4" />
            Скачать
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Скачать мод
          </h1>
          <p className="text-lg text-foreground-secondary leading-relaxed">
            Установите мод NVL Translate для вашей визуальной новеллы на Ren&apos;Py
            и начните учить английский прямо во время игры.
          </p>
        </section>

        {/* Platform Selection */}
        <section>
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Выберите платформу
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className={`relative bg-background-card border rounded-2xl p-8 text-center flex flex-col items-center ${
                  platform.available
                    ? "border-accent shadow-[0_0_30px_rgba(108,92,231,0.15)]"
                    : "border-border opacity-60"
                }`}
              >
                {platform.available && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Доступно
                  </div>
                )}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                    platform.available ? "bg-accent-light" : "bg-background-hover"
                  }`}
                >
                  <platform.icon
                    className={`w-8 h-8 ${
                      platform.available ? "text-accent" : "text-foreground-muted"
                    }`}
                  />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {platform.name}
                </h3>
                <p className="text-foreground-secondary text-sm mb-4">
                  {platform.description}
                </p>

                {platform.available ? (
                  <>
                    <div className="flex items-center gap-3 text-xs text-foreground-muted mb-4">
                      <span>{platform.version}</span>
                      <span className="w-1 h-1 rounded-full bg-foreground-muted" />
                      <span>{platform.size}</span>
                    </div>
                    <a
                      href="#"
                      className="w-full inline-flex items-center justify-center gap-2 bg-accent text-white py-3 px-6 rounded-xl font-medium transition-colors hover:bg-accent-hover"
                    >
                      <Download className="w-4 h-4" />
                      Скачать
                    </a>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-foreground-muted text-sm mt-auto">
                    <Clock className="w-4 h-4" />
                    Скоро
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Installation Steps */}
        <section>
          <h2 className="text-3xl font-bold text-foreground text-center mb-4">
            Установка мода
          </h2>
          <p className="text-foreground-secondary text-center mb-12 max-w-2xl mx-auto">
            Три простых шага для установки мода в вашу визуальную новеллу.
          </p>
          <div className="grid gap-6 max-w-3xl mx-auto">
            {installSteps.map((step, index) => (
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

        {/* After Installation */}
        <section>
          <h2 className="text-3xl font-bold text-foreground text-center mb-4">
            После установки
          </h2>
          <p className="text-foreground-secondary text-center mb-12 max-w-2xl mx-auto">
            Подключите мод к вашему аккаунту для синхронизации словаря.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {afterInstall.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-4 bg-background-card border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-accent-secondary-light rounded-lg flex items-center justify-center relative">
                  <step.icon className="w-5 h-5 text-accent-secondary" />
                  <span className="absolute -top-2 -left-2 w-5 h-5 bg-accent-secondary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-foreground-secondary text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Troubleshooting */}
        <section>
          <div className="bg-background-card border border-border rounded-2xl p-8 md:p-12">
            <div className="flex items-center justify-center gap-3 mb-8">
              <AlertTriangle className="w-6 h-6 text-warning" />
              <h2 className="text-2xl font-bold text-foreground">
                Если что-то не работает
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {troubleshooting.map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-background-hover rounded-lg flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      {item.title}
                    </h3>
                    <p className="text-foreground-secondary text-sm">
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
