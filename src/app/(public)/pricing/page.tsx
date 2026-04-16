import Link from "next/link";
import {
  Check,
  X,
  Zap,
  Crown,
  Star,
  CreditCard,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

import { planComparisonRows, publicPlanCards } from "@/lib/product";

export const metadata = {
  title: "Тарифы — NVLingo",
};

const faqs = [
  {
    question: "Можно ли отменить подписку?",
    answer:
      "Да. Когда billing будет включён полностью, подписку можно будет отменить в кабинете, а доступ к платным функциям сохранится до конца оплаченного периода.",
  },
  {
    question: "Есть ли пробный период?",
    answer:
      "Вместо отдельного trial уже доступен бесплатный тариф. Его хватает, чтобы спокойно проверить мод, словарь и синхронизацию с кабинетом.",
  },
  {
    question: "Что будет с данными при смене тарифа?",
    answer:
      "Слова, фразы и прогресс остаются в аккаунте. При понижении тарифа часть функций может стать недоступной, но данные не удаляются.",
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

function iconForPlan(planId: string) {
  switch (planId) {
    case "free":
      return Zap;
    case "basic":
      return Star;
    case "extended":
      return Crown;
    default:
      return Zap;
  }
}

export default function PricingPage() {
  const plans = publicPlanCards();
  const comparisonRows = planComparisonRows();

  return (
    <main className="min-h-screen px-4 py-16">
      <div className="mx-auto max-w-7xl space-y-24">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent-light px-4 py-1.5 text-sm font-medium text-accent">
            <CreditCard className="h-4 w-4" />
            Тарифы
          </div>
          <h1 className="mb-6 text-4xl font-bold text-foreground md:text-5xl">
            Выберите подходящий тариф
          </h1>
          <p className="text-lg leading-relaxed text-foreground-secondary">
            Лимиты, функции и цены на этой странице синхронизированы с кабинетом.
            Бесплатный план подходит для старта, платные открывают больше
            единиц перевода, больший словарь и расширенные режимы обучения.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3 lg:gap-8">
          {plans.map((plan) => {
            const Icon = iconForPlan(plan.id);

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-background-card p-8 ${
                  plan.highlighted
                    ? "border-accent shadow-[0_0_30px_rgba(108,92,231,0.15)]"
                    : "border-border"
                }`}
              >
                {plan.highlighted ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white">
                    Популярный
                  </div>
                ) : null}

                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      plan.highlighted ? "bg-accent-light" : "bg-background-hover"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        plan.highlighted ? "text-accent" : "text-foreground-secondary"
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-foreground-muted">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-6 text-4xl font-bold text-foreground">{plan.price}</div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="text-sm text-foreground-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/register"
                  className={`w-full rounded-xl px-6 py-3 text-center font-medium transition-colors ${
                    plan.highlighted
                      ? "bg-accent text-white hover:bg-accent-hover"
                      : "border border-border bg-background-hover text-foreground hover:border-border-hover"
                  }`}
                >
                  {plan.id === "free" ? "Начать бесплатно" : "Создать аккаунт"}
                </Link>
              </div>
            );
          })}
        </section>

        <section>
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Сравнение тарифов
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

        <section>
          <div className="mb-12 flex items-center justify-center gap-3">
            <HelpCircle className="h-6 w-6 text-accent" />
            <h2 className="text-3xl font-bold text-foreground">Вопросы по тарифам</h2>
          </div>
          <div className="mx-auto max-w-3xl space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-xl border border-border bg-background-card p-6"
              >
                <h3 className="flex items-start gap-3 font-medium text-foreground">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  {faq.question}
                </h3>
                <p className="ml-8 mt-3 text-sm text-foreground-secondary">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
