"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  MessageSquare,
  Send,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  apiSend,
  getApiFieldError,
  isApiError,
  useApiData,
} from "@/lib/client/api";
import {
  supportCategoryLabels,
  ticketStatusMeta,
} from "@/lib/client/presentation";
import type { DashboardSupportResponse } from "@/lib/contracts/dashboard";

const initialData: DashboardSupportResponse = {
  faqItems: [],
  tickets: [],
};

export default function SupportPage() {
  const router = useRouter();
  const { data, loading, error } = useApiData<DashboardSupportResponse>(
    "/api/dashboard/support",
    initialData,
  );
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] =
    useState<keyof typeof supportCategoryLabels>("mod");
  const [message, setMessage] = useState("");
  const [formErrors, setFormErrors] = useState<{
    subject?: string;
    category?: string;
    message?: string;
  }>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      setStatusMessage("Заполните тему и сообщение.");
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage("");
      setFormErrors({});

      const createdTicket = await apiSend<{ id: number }>(
        "/api/dashboard/support",
        "POST",
        {
          subject: subject.trim(),
          category,
          message: message.trim(),
        },
      );

      setSubject("");
      setMessage("");
      router.push(`/dashboard/support/${createdTicket.id}`);
      router.refresh();
    } catch (requestError) {
      if (isApiError(requestError)) {
        const subjectError = getApiFieldError(requestError, "subject");
        const categoryError = getApiFieldError(requestError, "category");
        const messageError = getApiFieldError(requestError, "message");

        setFormErrors({
          subject: subjectError ?? undefined,
          category: categoryError ?? undefined,
          message: messageError ?? undefined,
        });

        if (!subjectError && !categoryError && !messageError) {
          setStatusMessage(requestError.message);
        }
      } else {
        setStatusMessage(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось создать тикет",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Поддержка</h1>
        <p className="mt-2 max-w-3xl text-sm text-foreground-muted">
          Здесь можно быстро проверить частые вопросы, создать новый тикет и
          открыть любую переписку на отдельной странице без длинного общего
          полотна.
        </p>
      </div>

      {error ? (
        <Card className="border-danger/30 bg-danger/10 text-danger">
          Не удалось загрузить раздел поддержки: {error}
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="mb-5 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold text-foreground">
              Быстрые ответы
            </h2>
          </div>

          <div className="space-y-2">
            {data.faqItems.map((item, index) => (
              <div
                key={item.q}
                className="overflow-hidden rounded-xl border border-border bg-background-card"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-background-hover"
                >
                  <span className="text-sm font-medium text-foreground">
                    {item.q}
                  </span>
                  {openFaq === index ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-foreground-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-foreground-muted" />
                  )}
                </button>

                {openFaq === index ? (
                  <div className="px-4 pb-4">
                    <p className="text-sm leading-relaxed text-foreground-secondary">
                      {item.a}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <Link
            href="/faq"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent transition-colors hover:text-accent-hover"
          >
            Открыть полный FAQ <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Card>

        <Card>
          <div className="mb-5 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold text-foreground">
              Новый тикет
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-foreground-secondary">
                Тема
              </label>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className={`w-full rounded-lg border bg-background-hover px-4 py-2.5 text-foreground focus:border-accent focus:outline-none ${
                  formErrors.subject ? "border-danger" : "border-border"
                }`}
                placeholder="Например: мод не проходит авторизацию"
              />
              {formErrors.subject ? (
                <p className="mt-1 text-sm text-danger">{formErrors.subject}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-foreground-secondary">
                Категория
              </label>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value as keyof typeof supportCategoryLabels,
                  )
                }
                className={`w-full cursor-pointer appearance-none rounded-lg border bg-background-hover px-4 py-2.5 text-foreground focus:border-accent focus:outline-none ${
                  formErrors.category ? "border-danger" : "border-border"
                }`}
              >
                {Object.entries(supportCategoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {formErrors.category ? (
                <p className="mt-1 text-sm text-danger">
                  {formErrors.category}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-foreground-secondary">
                Сообщение
              </label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={7}
                placeholder="Опишите проблему, шаги воспроизведения и что уже успели проверить."
                className={`w-full resize-none rounded-lg border bg-background-hover px-4 py-2.5 text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none ${
                  formErrors.message ? "border-danger" : "border-border"
                }`}
              />
              {formErrors.message ? (
                <p className="mt-1 text-sm text-danger">{formErrors.message}</p>
              ) : null}
            </div>

            {statusMessage ? (
              <p className="text-sm text-foreground-secondary">
                {statusMessage}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Создаём тикет..." : "Создать тикет"}
            </button>
          </div>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Мои тикеты
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Каждый тикет теперь открывается на отдельной странице с полной
              перепиской.
            </p>
          </div>
          <Badge variant="default">
            {loading ? "Загрузка..." : `${data.tickets.length} шт.`}
          </Badge>
        </div>

        {loading ? (
          <Card>
            <p className="text-sm text-foreground-muted">Загружаем тикеты...</p>
          </Card>
        ) : null}

        {!loading && data.tickets.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">
              У вас пока нет тикетов. Создайте первый запрос справа, и он сразу
              откроется на отдельной странице.
            </p>
          </Card>
        ) : null}

        {!loading
          ? data.tickets.map((ticket) => {
              const badge = ticketStatusMeta[ticket.status];

              return (
                <Card key={ticket.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-foreground">
                          {ticket.subject}
                        </p>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <Badge variant="default">#{ticket.id}</Badge>
                      </div>

                      <p className="mt-2 text-sm text-foreground-muted">
                        {supportCategoryLabels[ticket.category]} · создан{" "}
                        {ticket.createdAtLabel} · обновлён {ticket.updatedAtLabel}
                      </p>

                      {ticket.lastMessagePreview ? (
                        <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">
                          {ticket.lastMessagePreview}
                        </p>
                      ) : null}

                      <p className="mt-3 text-xs text-foreground-muted">
                        Сообщений в переписке: {ticket.messageCount}
                      </p>
                    </div>

                    <Link
                      href={`/dashboard/support/${ticket.id}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-border-hover hover:bg-background-hover"
                    >
                      Открыть тикет
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </Card>
              );
            })
          : null}
      </section>
    </div>
  );
}
