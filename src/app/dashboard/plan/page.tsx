import {
  BarChart3,
  BookOpen,
  CreditCard,
  Infinity as InfinityIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PLAN_ORDER, PLANS } from "@/lib/config";
import { dictionaryLimitText, translationUnitsText } from "@/lib/product";
import type { DashboardPlanResponse } from "@/lib/contracts/dashboard";
import { requireDashboardPageUser } from "@/lib/server/page-auth";
import { getPlanPageData } from "@/lib/server/services/billing";

function progressWidth(used: number, limit: number | null) {
  const safeLimit = limit ?? used;
  return `${Math.min(100, (used / Math.max(safeLimit || 1, 1)) * 100)}%`;
}

export default async function PlanPage() {
  const user = await requireDashboardPageUser();
  const data: DashboardPlanResponse = await getPlanPageData(user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <CreditCard className="h-6 w-6 text-accent" />
          Тариф и лимиты
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Правила, лимиты и цены здесь совпадают с публичной страницей тарифов.
          Само подключение оплаты ещё может быть недоступно, но лимиты уже считаются по реальным данным аккаунта.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-foreground-muted">Текущий план</p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">{data.currentPlan.name}</h2>
            </div>
            <Badge variant="accent">{data.currentPlan.price}</Badge>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-foreground-muted">Следующее списание</p>
              <p className="mt-1 text-foreground">{data.currentPlan.nextBilling}</p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Единицы перевода за день</span>
                <span className="text-foreground">
                  {data.currentPlan.translationsUsed} / {data.currentPlan.translationsLimit ?? "∞"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background-hover">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{
                    width: progressWidth(data.currentPlan.translationsUsed, data.currentPlan.translationsLimit),
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Карточки в словаре</span>
                <span className="text-foreground">
                  {data.currentPlan.wordsUsed} / {data.currentPlan.wordsLimit ?? "∞"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background-hover">
                <div
                  className="h-full rounded-full bg-accent-secondary"
                  style={{ width: progressWidth(data.currentPlan.wordsUsed, data.currentPlan.wordsLimit) }}
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:col-span-2">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const isCurrent = plan.label === data.currentPlan.name;

            return (
              <Card key={planId} className={isCurrent ? "border-accent" : ""}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{plan.label}</h3>
                    <p className="mt-1 text-sm text-foreground-muted">
                      {plan.publicPrice}
                      {plan.period}
                    </p>
                  </div>
                  {isCurrent ? <Badge variant="accent">Текущий</Badge> : <Badge variant="default">Пока без оплаты</Badge>}
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-foreground-secondary">
                    <BarChart3 className="h-4 w-4 text-accent" />
                    {translationUnitsText(planId)}
                  </div>
                  <div className="flex items-center gap-2 text-foreground-secondary">
                    {plan.dictionaryLimit === null ? (
                      <InfinityIcon className="h-4 w-4 text-accent-secondary" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-accent-secondary" />
                    )}
                    {dictionaryLimitText(planId)}
                  </div>
                  <ul className="space-y-1 text-foreground-muted">
                    <li>Слова: {plan.features.wordTranslation ? "да" : "нет"}</li>
                    <li>Фразы: {plan.features.phraseTranslation ? "да" : "нет"}</li>
                    <li>Автоперевод предложений: {plan.features.sentenceTranslation ? "да" : "нет"}</li>
                    <li>Поиск и упражнения: {plan.features.search || plan.features.exercises ? "да" : "нет"}</li>
                    <li>Расширенная статистика: {plan.features.advancedStats ? "да" : "нет"}</li>
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-foreground">История платежей</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-foreground-muted">
                <th className="py-3 pr-4 font-medium">Дата</th>
                <th className="py-3 pr-4 font-medium">Сумма</th>
                <th className="py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((payment, index) => (
                <tr key={`${payment.date}-${index}`} className="border-b border-border/50">
                  <td className="py-3 pr-4 text-foreground">{payment.date}</td>
                  <td className="py-3 pr-4 text-foreground-secondary">{payment.amount}</td>
                  <td className="py-3">
                    <Badge
                      variant={
                        payment.status === "Оплачено"
                          ? "success"
                          : payment.status === "Ошибка"
                            ? "danger"
                            : payment.status === "Возврат"
                              ? "default"
                            : "warning"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {data.payments.length === 0 ? (
                <tr>
                  <td className="py-4 text-foreground-muted" colSpan={3}>
                    Платежей пока нет. Тарифные правила уже показаны в кабинете, а полноценный публичный billing ещё догоняет продуктовую часть.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
