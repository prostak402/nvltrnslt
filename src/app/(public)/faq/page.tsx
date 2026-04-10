"use client";

import { useState } from "react";
import {
  ChevronDown,
  HelpCircle,
  Wifi,
  WifiOff,
  Database,
  CreditCard,
  MessageSquareText,
  Wrench,
  Shield,
  User,
  Rocket,
  Lock,
  Globe,
  Gamepad2,
} from "lucide-react";

const faqItems = [
  {
    icon: Wifi,
    question: "Нужен ли интернет для работы мода?",
    answer:
      "Для перевода новых слов и фраз необходимо подключение к интернету. Запросы отправляются на сервер для получения перевода. Однако уже переведённые слова кэшируются локально и доступны без подключения.",
  },
  {
    icon: WifiOff,
    question: "Как работает офлайн-режим?",
    answer:
      "Мод автоматически сохраняет все переведённые слова в локальный кэш на вашем компьютере. Если интернет недоступен, вы можете просматривать ранее переведённые слова. Новые переводы и синхронизация с сайтом будут недоступны до восстановления соединения.",
  },
  {
    icon: Database,
    question: "Где хранятся мои данные?",
    answer:
      "Ваши слова и фразы хранятся в двух местах: локально в папке мода (для быстрого доступа и офлайн-режима) и на нашем сервере (для синхронизации с сайтом и доступа с разных устройств). Данные на сервере зашифрованы и доступны только вам.",
  },
  {
    icon: CreditCard,
    question: "Можно ли пользоваться бесплатно?",
    answer:
      "Да, бесплатный тариф доступен без ограничений по времени. Он включает 30-50 переводов в день, ограниченный словарь, базовые карточки и синхронизацию. Этого достаточно для знакомства с платформой и казуального использования.",
  },
  {
    icon: MessageSquareText,
    question: "Поддерживается ли перевод фраз?",
    answer:
      "Да, мод поддерживает перевод как отдельных слов, так и целых фраз. Выделите несколько слов в тексте диалога, и мод переведёт всю фразу целиком с учётом контекста. Фразы также можно сохранять в словарь.",
  },
  {
    icon: Wrench,
    question: "Как установить мод?",
    answer:
      "Скачайте архив с модом со страницы загрузки, распакуйте его и скопируйте файлы в папку game/ вашей визуальной новеллы на Ren'Py. При следующем запуске игры мод активируется автоматически. Подробная инструкция доступна на странице загрузки.",
  },
  {
    icon: Gamepad2,
    question: "С какими играми совместим мод?",
    answer:
      "Мод совместим с большинством визуальных новелл на движке Ren'Py версий 7.x и 8.x. Полный список протестированных игр с указанием статуса совместимости доступен на странице совместимости. Если вашей игры нет в списке — попробуйте установить мод, скорее всего он будет работать.",
  },
  {
    icon: User,
    question: "Как создать аккаунт?",
    answer:
      "Зарегистрируйтесь на сайте, указав email и пароль. После регистрации вы получите код доступа для мода в личном кабинете. Введите этот код в настройках мода для подключения к вашему аккаунту.",
  },
  {
    icon: Rocket,
    question: "Чем отличаются платные тарифы?",
    answer:
      "Базовый тариф ($4.99/мес) увеличивает лимит переводов до 200 в день, открывает полный словарь, расширенные карточки, упражнения и ежедневный прогресс. Расширенный тариф ($9.99/мес) снимает все лимиты, добавляет авто-перевод предложений, расширенную статистику и приоритетную обработку.",
  },
  {
    icon: Lock,
    question: "Насколько безопасны мои данные?",
    answer:
      "Мы серьёзно относимся к безопасности. Все данные передаются по зашифрованному каналу (HTTPS). Пароли хранятся в захешированном виде. Мы не передаём ваши данные третьим лицам и не используем их в рекламных целях. Вы можете удалить свой аккаунт и все данные в любой момент.",
  },
  {
    icon: Globe,
    question: "Какие языки перевода поддерживаются?",
    answer:
      "В настоящее время мод поддерживает перевод с английского на русский язык. Мы планируем добавить поддержку других языков в будущих обновлениях.",
  },
  {
    icon: Shield,
    question: "Мод безопасен для игры?",
    answer:
      "Да, мод не модифицирует файлы игры и не влияет на сохранения. Он работает как дополнительный слой поверх интерфейса Ren'Py. Вы можете удалить мод в любой момент, просто убрав его файлы из папки game/ — игра будет работать как прежде.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-accent-light text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Частые вопросы
          </h1>
          <p className="text-lg text-foreground-secondary leading-relaxed">
            Ответы на самые популярные вопросы о платформе NVL Translate,
            установке мода и работе сервиса.
          </p>
        </section>

        {/* Accordion */}
        <section className="max-w-3xl mx-auto">
          <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index;
              const Icon = item.icon;
              return (
                <div key={index} className="bg-background-card">
                  <button
                    onClick={() => toggle(index)}
                    className="flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-background-hover"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-accent-light rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                    <span className="flex-1 pr-4 font-medium text-foreground">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 flex-shrink-0 text-foreground-muted transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-200 ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 pl-[4.5rem] text-sm leading-relaxed text-foreground-secondary">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
