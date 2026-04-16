"use client";

import { useState } from "react";
import {
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
  const { data, loading, error, reload } = useApiData<DashboardSupportResponse>(
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

      await apiSend("/api/dashboard/support", "POST", {
        subject: subject.trim(),
        category,
        message: message.trim(),
      });

      setSubject("");
      setMessage("");
      await reload();
      setStatusMessage("Тикет создан. Он уже появился в списке ниже.");
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
    <div>
      <h1 className="mb-6 text-2xl font-bold">Поддержка</h1>

      {error ? (
        <Card className="mb-6 border-danger/30 bg-danger/10 text-danger">
          Не удалось загрузить раздел поддержки: {error}
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-foreground-secondary" />
              <h2 className="text-lg font-semibold">Быстрые ответы</h2>
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
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-background-hover"
                  >
                    <span className="text-sm font-medium">{item.q}</span>
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

            <a
              href="/faq"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent transition-colors hover:text-accent-hover"
            >
              Все вопросы и ответы <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-foreground-secondary" />
              <h2 className="text-lg font-semibold">Написать в поддержку</h2>
            </div>

            <Card>
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
                    <p className="mt-1 text-sm text-danger">
                      {formErrors.subject}
                    </p>
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
                    {Object.entries(supportCategoryLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
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
                    rows={6}
                    placeholder="Опишите проблему, шаги воспроизведения и что вы уже попробовали."
                    className={`w-full resize-none rounded-lg border bg-background-hover px-4 py-2.5 text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none ${
                      formErrors.message ? "border-danger" : "border-border"
                    }`}
                  />
                  {formErrors.message ? (
                    <p className="mt-1 text-sm text-danger">
                      {formErrors.message}
                    </p>
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
                  {isSubmitting ? "Отправляем..." : "Отправить"}
                </button>
              </div>
            </Card>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-foreground-secondary" />
              <h2 className="text-lg font-semibold">Мои тикеты</h2>
            </div>

            <div className="space-y-3">
              {data.tickets.map((ticket) => {
                const badge = ticketStatusMeta[ticket.status];

                return (
                  <Card key={ticket.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {ticket.subject}
                        </p>
                        <p className="mt-1 text-xs text-foreground-muted">
                          {supportCategoryLabels[ticket.category]} · обновлён{" "}
                          {ticket.updatedAtLabel}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>

                    <div className="mt-4 space-y-3">
                      {ticket.messages.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-lg bg-background-hover px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">
                              {entry.authorName}
                            </p>
                            <span className="text-xs text-foreground-muted">
                              {new Date(entry.createdAt).toLocaleString("ru-RU")}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground-secondary">
                            {entry.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}

              {!loading && data.tickets.length === 0 ? (
                <Card>
                  <p className="text-sm text-foreground-muted">
                    У вас пока нет открытых тикетов.
                  </p>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
