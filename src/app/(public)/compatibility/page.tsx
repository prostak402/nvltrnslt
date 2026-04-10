import {
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Info,
  Shield,
  Monitor,
  Smartphone,
  Puzzle,
  AlertOctagon,
} from "lucide-react";

export const metadata = {
  title: "Совместимость — NVL Translate",
};

type GameStatus =
  | "fully_works"
  | "limited"
  | "testing"
  | "unsupported";

interface Game {
  name: string;
  renpyVersion: string;
  status: GameStatus;
  comment: string;
}

const statusConfig: Record<
  GameStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle }
> = {
  fully_works: {
    label: "Полностью работает",
    color: "text-success",
    bg: "bg-[rgba(0,184,148,0.15)]",
    icon: CheckCircle,
  },
  limited: {
    label: "С ограничениями",
    color: "text-warning",
    bg: "bg-[rgba(253,203,110,0.15)]",
    icon: AlertTriangle,
  },
  testing: {
    label: "Тестируется",
    color: "text-accent",
    bg: "bg-accent-light",
    icon: Clock,
  },
  unsupported: {
    label: "Не поддерживается",
    color: "text-danger",
    bg: "bg-danger-light",
    icon: XCircle,
  },
};

const games: Game[] = [
  {
    name: "Doki Doki Literature Club!",
    renpyVersion: "6.99 / 7.x",
    status: "fully_works",
    comment: "Полная поддержка, включая все пути.",
  },
  {
    name: "Katawa Shoujo",
    renpyVersion: "6.13",
    status: "limited",
    comment: "Старая версия Ren'Py. Перевод работает, сохранение фраз ограничено.",
  },
  {
    name: "Everlasting Summer",
    renpyVersion: "7.4",
    status: "fully_works",
    comment: "Полная совместимость с русской и английской версиями.",
  },
  {
    name: "Long Live The Queen",
    renpyVersion: "7.3",
    status: "fully_works",
    comment: "Работает стабильно на всех платформах.",
  },
  {
    name: "Butterfly Soup",
    renpyVersion: "7.1",
    status: "fully_works",
    comment: "Полная поддержка.",
  },
  {
    name: "The Arcana",
    renpyVersion: "7.x (модиф.)",
    status: "limited",
    comment: "Нестандартный интерфейс. Перевод слов работает, но всплывающее окно может перекрываться.",
  },
  {
    name: "Steins;Gate (Ren'Py порт)",
    renpyVersion: "8.0",
    status: "testing",
    comment: "Ведётся тестирование на Ren'Py 8. Базовый функционал работает.",
  },
  {
    name: "Amnesia: Memories",
    renpyVersion: "Не Ren'Py",
    status: "unsupported",
    comment: "Игра не использует движок Ren'Py.",
  },
  {
    name: "Saya no Uta (Ren'Py порт)",
    renpyVersion: "7.5",
    status: "fully_works",
    comment: "Полная поддержка.",
  },
  {
    name: "DDLC Plus (мобильная)",
    renpyVersion: "Мобильный порт",
    status: "unsupported",
    comment: "Мобильные версии не поддерживаются.",
  },
];

const limitations = [
  {
    icon: Puzzle,
    title: "Нестандартные интерфейсы",
    description:
      "Новеллы с сильно изменённым интерфейсом могут некорректно отображать всплывающее окно перевода. В таких случаях перевод доступен через меню мода.",
  },
  {
    icon: AlertOctagon,
    title: "Сильно модифицированные сборки",
    description:
      "Игры с глубокими модификациями движка Ren'Py (кастомные рендереры, нестандартная обработка текста) могут быть несовместимы.",
  },
  {
    icon: Smartphone,
    title: "Мобильные порты",
    description:
      "Мобильные версии визуальных новелл (Android, iOS) в настоящее время не поддерживаются. Мод работает только на десктопных версиях.",
  },
  {
    icon: Monitor,
    title: "Старые версии Ren'Py",
    description:
      "Версии Ren'Py ниже 6.x могут иметь ограниченную совместимость или не поддерживаться. Рекомендуем Ren'Py 7.x или 8.x.",
  },
];

function StatusBadge({ status }: { status: GameStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

export default function CompatibilityPage() {
  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto space-y-24">
        {/* Header */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-accent-light text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            Совместимость
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Совместимость с играми
          </h1>
          <p className="text-lg text-foreground-secondary leading-relaxed">
            Мод NVL Translate работает с визуальными новеллами на движке Ren&apos;Py.
            Ниже представлен список протестированных игр и их статус совместимости.
          </p>
        </section>

        {/* Disclaimer */}
        <section>
          <div className="bg-accent-light border border-accent/20 rounded-2xl p-6 md:p-8 flex items-start gap-4">
            <Info className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Важная информация
              </h3>
              <p className="text-foreground-secondary leading-relaxed">
                Мод разработан для движка Ren&apos;Py и совместим с большинством визуальных новелл
                на его базе. Однако игры с сильно изменённым интерфейсом, нестандартной обработкой
                текста или очень старыми версиями движка могут работать с ограничениями или не
                поддерживаться. Мы постоянно расширяем список протестированных игр.
              </p>
            </div>
          </div>
        </section>

        {/* Games Table */}
        <section>
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Протестированные игры
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-foreground-secondary text-sm font-medium p-4 border-b border-border">
                    Название
                  </th>
                  <th className="text-left text-foreground-secondary text-sm font-medium p-4 border-b border-border">
                    Версия Ren&apos;Py
                  </th>
                  <th className="text-left text-foreground-secondary text-sm font-medium p-4 border-b border-border">
                    Статус
                  </th>
                  <th className="text-left text-foreground-secondary text-sm font-medium p-4 border-b border-border">
                    Комментарий
                  </th>
                </tr>
              </thead>
              <tbody>
                {games.map((game, index) => (
                  <tr
                    key={index}
                    className="hover:bg-background-hover transition-colors"
                  >
                    <td className="p-4 border-b border-border">
                      <span className="text-foreground font-medium">{game.name}</span>
                    </td>
                    <td className="p-4 border-b border-border">
                      <span className="text-foreground-secondary text-sm font-mono">
                        {game.renpyVersion}
                      </span>
                    </td>
                    <td className="p-4 border-b border-border">
                      <StatusBadge status={game.status} />
                    </td>
                    <td className="p-4 border-b border-border">
                      <span className="text-foreground-secondary text-sm">
                        {game.comment}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Known Limitations */}
        <section>
          <h2 className="text-3xl font-bold text-foreground text-center mb-4">
            Известные ограничения
          </h2>
          <p className="text-foreground-secondary text-center mb-12 max-w-2xl mx-auto">
            Ситуации, в которых мод может работать некорректно или не поддерживаться.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {limitations.map((item, index) => (
              <div
                key={index}
                className="bg-background-card border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
              >
                <div className="w-10 h-10 bg-[rgba(253,203,110,0.15)] rounded-lg flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-warning" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-foreground-secondary text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
