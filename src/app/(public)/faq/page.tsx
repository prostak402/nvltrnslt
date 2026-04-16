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

import {
  activationFlowSummary,
  deviceLimitSummary,
  freePlanSummary,
  paidPlansSummary,
} from "@/lib/product";

const faqItems = [
  {
    icon: Wifi,
    question: "Нужен ли интернет для работы мода?",
    answer:
      "Для новых переводов нужно подключение к интернету. Уже переведённые слова и фразы могут открываться из локального кэша.",
  },
  {
    icon: WifiOff,
    question: "Как работает офлайн-режим?",
    answer:
      "Без сети мод не сможет получить новые переводы и синхронизировать кабинет, но ранее сохранённые переводы останутся доступны локально.",
  },
  {
    icon: Database,
    question: "Где хранятся мои данные?",
    answer:
      "Слова и фразы хранятся в аккаунте для синхронизации с кабинетом, а часть данных кэшируется локально для более быстрой работы мода.",
  },
  {
    icon: CreditCard,
    question: "Можно ли пользоваться бесплатно?",
    answer: freePlanSummary(),
  },
  {
    icon: MessageSquareText,
    question: "Поддерживается ли перевод фраз?",
    answer:
      "Да. Мод поддерживает перевод отдельных слов и целых фраз. Сохранённые фразы тоже попадают в словарь и историю.",
  },
  {
    icon: Wrench,
    question: "Как установить мод?",
    answer: activationFlowSummary(),
  },
  {
    icon: Gamepad2,
    question: "С какими играми совместим мод?",
    answer:
      "Мод ориентирован на визуальные новеллы на Ren'Py 7.x и 8.x. Полный список проверенных игр доступен на странице совместимости.",
  },
  {
    icon: User,
    question: "Как создать аккаунт?",
    answer:
      "Зарегистрируйтесь на сайте, затем скачайте файл активации из кабинета и положите его в папку game/ рядом с модом.",
  },
  {
    icon: Rocket,
    question: "Чем отличаются платные тарифы?",
    answer: paidPlansSummary(),
  },
  {
    icon: Shield,
    question: "Можно ли использовать мод на нескольких устройствах?",
    answer: deviceLimitSummary(),
  },
  {
    icon: Lock,
    question: "Насколько безопасны мои данные?",
    answer:
      "Аккаунт и данные словаря работают через защищённый серверный слой. Пароли не хранятся в открытом виде, а ключ активации привязан к вашему аккаунту.",
  },
  {
    icon: Globe,
    question: "Какие языки перевода поддерживаются?",
    answer:
      "Сейчас основной сценарий — перевод с английского на русский. Дальнейшее расширение языков возможно в следующих версиях.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className="min-h-screen px-4 py-16">
      <div className="mx-auto max-w-7xl space-y-16">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent-light px-4 py-1.5 text-sm font-medium text-accent">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </div>
          <h1 className="mb-6 text-4xl font-bold text-foreground md:text-5xl">
            Частые вопросы
          </h1>
          <p className="text-lg leading-relaxed text-foreground-secondary">
            Здесь собраны ответы по установке, тарифам, устройствам и работе
            кабинета. Они синхронизированы с текущими правилами продукта.
          </p>
        </section>

        <section className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-border">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index;
              const Icon = item.icon;

              return (
                <div
                  key={item.question}
                  className="border-b border-border last:border-b-0 bg-background-card"
                >
                  <button
                    onClick={() => toggle(index)}
                    className="flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-background-hover"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-light">
                      <Icon className="h-4 w-4 text-accent" />
                    </div>
                    <span className="flex-1 pr-4 font-medium text-foreground">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-foreground-muted transition-transform duration-200 ${
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
