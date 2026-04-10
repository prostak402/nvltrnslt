"use client";

import { Check, X, CreditCard, Zap, Crown, Gift } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const currentPlan = {
  name: "Базовый",
  price: "$4.99",
  nextBilling: "10 мая 2026",
  translationsLimit: 150,
  translationsUsed: 18,
  wordsLimit: 1000,
  wordsUsed: 247,
};

const plans = [
  {
    name: "Бесплатно",
    price: "$0",
    period: "",
    icon: Gift,
    features: [
      { text: "30–50 переводов в день", included: true },
      { text: "Ограниченный словарь (100 слов)", included: true },
      { text: "Перевод слова", included: true },
      { text: "Перевод выделенной фразы", included: true },
      { text: "Синхронизация с кабинетом", included: true },
      { text: "Базовая история", included: true },
      { text: "Базовые карточки", included: true },
      { text: "Полный поиск и фильтры", included: false },
      { text: "Найди пару", included: false },
      { text: "Прогресс по дням", included: false },
      { text: "Автоперевод предложения", included: false },
      { text: "Расширенная статистика", included: false },
    ],
  },
  {
    name: "Базовый",
    price: "$4.99",
    period: "/мес",
    icon: Zap,
    current: true,
    features: [
      { text: "150 переводов в день", included: true },
      { text: "До 1000 слов в словаре", included: true },
      { text: "Перевод слова", included: true },
      { text: "Перевод выделенной фразы", included: true },
      { text: "Синхронизация с кабинетом", included: true },
      { text: "Полная история", included: true },
      { text: "Карточки", included: true },
      { text: "Полный поиск и фильтры", included: true },
      { text: "Найди пару", included: true },
      { text: "Прогресс по дням", included: true },
      { text: "Автоперевод предложения", included: false },
      { text: "Расширенная статистика", included: false },
    ],
  },
  {
    name: "Расширенный",
    price: "$9.99",
    period: "/мес",
    icon: Crown,
    features: [
      { text: "500 переводов в день", included: true },
      { text: "Неограниченный словарь", included: true },
      { text: "Перевод слова", included: true },
      { text: "Перевод выделенной фразы", included: true },
      { text: "Синхронизация с кабинетом", included: true },
      { text: "Полная история", included: true },
      { text: "Все режимы обучения", included: true },
      { text: "Полный поиск и фильтры", included: true },
      { text: "Найди пару", included: true },
      { text: "Прогресс по дням", included: true },
      { text: "Автоперевод предложения", included: true },
      { text: "Расширенная статистика", included: true },
    ],
  },
];

const payments = [
  { date: "10.03.2026", amount: "$4.99", status: "Оплачено" },
  { date: "10.02.2026", amount: "$4.99", status: "Оплачено" },
  { date: "10.01.2026", amount: "$4.99", status: "Оплачено" },
];

export default function PlanPage() {
  const translationPercent = Math.round((currentPlan.translationsUsed / currentPlan.translationsLimit) * 100);
  const wordsPercent = Math.round((currentPlan.wordsUsed / currentPlan.wordsLimit) * 100);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Тариф и лимиты</h1>

      {/* Current Plan */}
      <Card className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold">Текущий тариф</h2>
              <Badge variant="accent">{currentPlan.name}</Badge>
            </div>
            <p className="text-foreground-secondary text-sm">
              Следующее списание: {currentPlan.nextBilling} — {currentPlan.price}/мес
            </p>
          </div>
          <button className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm transition-colors">
            Улучшить тариф
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground-secondary">Переводов сегодня</span>
              <span className="text-sm font-medium">{currentPlan.translationsUsed} / {currentPlan.translationsLimit}</span>
            </div>
            <div className="h-3 bg-background-hover rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${translationPercent > 80 ? "bg-warning" : "bg-accent"}`}
                style={{ width: `${translationPercent}%` }}
              />
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              Осталось: {currentPlan.translationsLimit - currentPlan.translationsUsed} | Обновление: завтра
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground-secondary">Слов в словаре</span>
              <span className="text-sm font-medium">{currentPlan.wordsUsed} / {currentPlan.wordsLimit}</span>
            </div>
            <div className="h-3 bg-background-hover rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${wordsPercent > 80 ? "bg-warning" : "bg-accent-secondary"}`}
                style={{ width: `${wordsPercent}%` }}
              />
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              Свободно: {currentPlan.wordsLimit - currentPlan.wordsUsed} мест
            </p>
          </div>
        </div>
      </Card>

      {/* Plan Comparison */}
      <h2 className="text-lg font-semibold mb-4">Сравнение тарифов</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.name}
              className={`p-6 rounded-xl border transition-colors ${
                plan.current
                  ? "bg-accent-light border-accent"
                  : "bg-background-card border-border hover:border-border-hover"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 ${plan.current ? "text-accent" : "text-foreground-secondary"}`} />
                <h3 className="font-semibold">{plan.name}</h3>
                {plan.current && <Badge variant="accent">Текущий</Badge>}
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-foreground-secondary">{plan.period}</span>}
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-foreground-muted flex-shrink-0 mt-0.5" />
                    )}
                    <span className={f.included ? "" : "text-foreground-muted"}>{f.text}</span>
                  </li>
                ))}
              </ul>
              {plan.current ? (
                <button className="w-full py-2.5 rounded-lg border border-accent text-accent text-sm cursor-default">
                  Текущий тариф
                </button>
              ) : (
                <button className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm transition-colors">
                  {plan.price === "$0" ? "Перейти" : "Подключить"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment History */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-foreground-secondary" />
          <h2 className="text-lg font-semibold">История платежей</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-foreground-secondary text-sm">
                <th className="pb-3 font-medium">Дата</th>
                <th className="pb-3 font-medium">Сумма</th>
                <th className="pb-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-3 text-sm">{p.date}</td>
                  <td className="py-3 text-sm font-medium">{p.amount}</td>
                  <td className="py-3">
                    <Badge variant="success">{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
