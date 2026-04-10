"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertTriangle,
  Send,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const faqItems = [
  {
    q: "Мод не подключается к серверу",
    a: "Убедитесь, что у вас стабильное интернет-соединение. Проверьте правильность введённого кода доступа. Если проблема сохраняется, попробуйте обновить код доступа в разделе \"Устройства\" и ввести его заново.",
  },
  {
    q: "Слова не появляются в кабинете",
    a: "Синхронизация может занять до минуты. Убедитесь, что автосинхронизация включена в настройках. Попробуйте сохранить ещё одно слово — это запустит повторную синхронизацию.",
  },
  {
    q: "Как восстановить удалённое слово",
    a: "К сожалению, удалённые слова нельзя восстановить. Вы можете снова сохранить это слово из игры при следующей встрече.",
  },
  {
    q: "Перевод отображается некорректно",
    a: "Переводы предоставляются автоматическим сервисом и могут содержать неточности. Вы можете добавить свою заметку к слову с правильным переводом.",
  },
  {
    q: "Как отменить подписку",
    a: "Перейдите в раздел \"Тариф и лимиты\" и нажмите \"Перейти на бесплатный тариф\". Ваши данные сохранятся, но лимиты будут уменьшены.",
  },
];

const knownIssues = [
  {
    title: "Задержка синхронизации при большом количестве слов",
    status: "В работе",
    statusVariant: "warning" as const,
    description: "При словаре более 500 слов синхронизация может занимать до 5 секунд. Оптимизация в процессе.",
  },
  {
    title: "Некорректное отображение длинных фраз в моде",
    status: "Исправлено в v1.2",
    statusVariant: "success" as const,
    description: "Фразы длиннее 100 символов обрезались при отображении. Исправлено в версии мода 1.2.",
  },
  {
    title: "Мод не определяет версию Ren'Py 8.x автоматически",
    status: "Планируется",
    statusVariant: "default" as const,
    description: "На данный момент определение версии Ren'Py 8.x требует ручной настройки. Автоопределение будет добавлено в следующем обновлении.",
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (subject.trim() && message.trim()) {
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setSubject("");
        setMessage("");
      }, 3000);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Поддержка</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-8">
          {/* Quick FAQ */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-foreground-secondary" />
              <h2 className="text-lg font-semibold">Быстрые ответы</h2>
            </div>
            <div className="space-y-2">
              {faqItems.map((item, i) => (
                <div
                  key={i}
                  className="bg-background-card border border-border rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-background-hover transition-colors"
                  >
                    <span className="font-medium text-sm">{item.q}</span>
                    {openFaq === i ? (
                      <ChevronUp className="w-4 h-4 text-foreground-muted flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-foreground-muted flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-foreground-secondary leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <a
              href="/faq"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-3 transition-colors"
            >
              Все вопросы и ответы <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Known Issues */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-foreground-secondary" />
              <h2 className="text-lg font-semibold">Известные проблемы</h2>
            </div>
            <div className="space-y-3">
              {knownIssues.map((issue, i) => (
                <Card key={i}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-medium text-sm">{issue.title}</h3>
                    <Badge variant={issue.statusVariant}>{issue.status}</Badge>
                  </div>
                  <p className="text-sm text-foreground-muted">{issue.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Contact form */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Написать в поддержку</h2>
          </div>
          <Card>
            {sent ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Send className="w-5 h-5 text-success" />
                </div>
                <h3 className="font-semibold mb-1">Сообщение отправлено</h3>
                <p className="text-sm text-foreground-secondary">Мы ответим в течение 24 часов на вашу почту.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-foreground-secondary mb-1.5">Тема</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background-hover border border-border rounded-lg text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
                  >
                    <option value="">Выберите тему</option>
                    <option value="mod">Проблема с модом</option>
                    <option value="sync">Проблема с синхронизацией</option>
                    <option value="account">Проблема с аккаунтом</option>
                    <option value="payment">Вопрос об оплате</option>
                    <option value="feature">Предложение по функции</option>
                    <option value="other">Другое</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-foreground-secondary mb-1.5">Сообщение</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    placeholder="Опишите вашу проблему или вопрос..."
                    className="w-full px-4 py-2.5 bg-background-hover border border-border rounded-lg text-foreground placeholder:text-foreground-muted resize-none focus:outline-none focus:border-accent"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!subject || !message.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Отправить
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
