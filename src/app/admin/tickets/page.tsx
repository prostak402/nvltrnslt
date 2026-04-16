"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Clock,
  Loader2,
  MessageSquare,
  Search,
  Send,
  User,
  X,
} from "lucide-react";

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

type Ticket = {
  id: number;
  userId: number;
  userName: string;
  email: string;
  subject: string;
  category: keyof typeof supportCategoryLabels;
  status: keyof typeof ticketStatusMeta;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: number;
    authorRole: "user" | "admin";
    authorName: string;
    text: string;
    createdAt: string;
  }>;
};

type ReplyErrors = {
  text?: string;
  status?: string;
};

const initialData: Ticket[] = [];

export default function TicketsPage() {
  const { data, error, reload } = useApiData<Ticket[]>(
    "/api/admin/tickets",
    initialData,
  );
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] =
    useState<keyof typeof ticketStatusMeta>("in_progress");
  const [message, setMessage] = useState("");
  const [replyErrors, setReplyErrors] = useState<ReplyErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(
    () =>
      data.filter((ticket) => {
        const term = search.toLowerCase();
        if (
          term &&
          !ticket.subject.toLowerCase().includes(term) &&
          !ticket.userName.toLowerCase().includes(term) &&
          !String(ticket.id).includes(term)
        ) {
          return false;
        }

        if (filterStatus !== "all" && ticket.status !== filterStatus) {
          return false;
        }

        return true;
      }),
    [data, filterStatus, search],
  );

  const selectedTicket =
    data.find((ticket) => ticket.id === selectedTicketId) ?? null;
  const openCount = data.filter((ticket) => ticket.status === "open").length;
  const inProgressCount = data.filter(
    (ticket) =>
      ticket.status === "in_progress" || ticket.status === "waiting",
  ).length;

  const handleReply = async () => {
    if (!selectedTicket || !reply.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("");
      setReplyErrors({});

      await apiSend("/api/admin/tickets", "POST", {
        ticketId: selectedTicket.id,
        text: reply.trim(),
        status: replyStatus,
      });

      setReply("");
      await reload();
      setMessage("Ответ отправлен.");
    } catch (requestError) {
      if (isApiError(requestError)) {
        const nextErrors = {
          text: getApiFieldError(requestError, "text") ?? undefined,
          status: getApiFieldError(requestError, "status") ?? undefined,
        };

        setReplyErrors(nextErrors);

        if (!nextErrors.text && !nextErrors.status) {
          setMessage(requestError.message);
        }
      } else {
        setMessage(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось отправить ответ.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-6">
      <div
        className={`flex min-w-0 flex-col ${
          selectedTicket ? "hidden w-[400px] flex-shrink-0 lg:flex" : "flex-1"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Тикеты</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-danger">
              <AlertCircle className="h-4 w-4" /> {openCount} открытых
            </span>
            <span className="flex items-center gap-1.5 text-accent">
              <Loader2 className="h-4 w-4" /> {inProgressCount} в работе
            </span>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            Не удалось загрузить тикеты: {error}
          </div>
        ) : null}

        <div className="mb-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              placeholder="Поиск по теме, имени или ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-border bg-background-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="cursor-pointer appearance-none rounded-lg border border-border bg-background-card px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="all">Все статусы</option>
            {Object.entries(ticketStatusMeta).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {filtered.map((ticket) => {
            const badge = ticketStatusMeta[ticket.status];

            return (
              <div
                key={ticket.id}
                onClick={() => {
                  setSelectedTicketId(ticket.id);
                  setReply("");
                  setReplyErrors({});
                  setMessage("");
                  setReplyStatus(ticket.status);
                }}
                className={`cursor-pointer rounded-xl border bg-background-card p-4 transition-colors hover:border-border-hover ${
                  selectedTicket?.id === ticket.id
                    ? "border-accent bg-accent-light/30"
                    : "border-border"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs text-foreground-muted">
                      #{ticket.id}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      badge.variant === "success"
                        ? "bg-success/15 text-success"
                        : badge.variant === "warning"
                          ? "bg-warning/15 text-warning"
                          : badge.variant === "accent"
                            ? "bg-accent-light text-accent"
                            : "bg-background-hover text-foreground-secondary"
                    }`}
                  >
                    {badge.label}
                  </span>
                </div>
                <h3 className="mb-1 line-clamp-1 text-sm font-medium">
                  {ticket.subject}
                </h3>
                <div className="flex items-center justify-between text-xs text-foreground-muted">
                  <span>{ticket.userName}</span>
                  <span>{new Date(ticket.updatedAt).toLocaleString("ru-RU")}</span>
                </div>
                <span className="mt-2 inline-block rounded bg-background-hover px-2 py-0.5 text-xs text-foreground-muted">
                  {supportCategoryLabels[ticket.category]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {selectedTicket ? (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background-card">
          <div className="shrink-0 border-b border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-foreground-muted">
                  #{selectedTicket.id}
                </span>
                <span className="rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent">
                  {supportCategoryLabels[selectedTicket.category]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTicketId(null);
                  setReply("");
                  setReplyErrors({});
                  setMessage("");
                }}
                className="text-foreground-muted hover:text-foreground lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h2 className="font-semibold">{selectedTicket.subject}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {selectedTicket.userName} ({selectedTicket.email})
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(selectedTicket.createdAt).toLocaleString("ru-RU")}
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {selectedTicket.messages.map((entry) => (
              <div
                key={entry.id}
                className={`flex ${
                  entry.authorRole === "admin"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-xl p-3 ${
                    entry.authorRole === "admin"
                      ? "bg-accent-light text-foreground"
                      : "bg-background-hover text-foreground"
                  }`}
                >
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-foreground-muted">
                    {entry.authorRole === "admin" ? (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Поддержка
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {entry.authorName}
                      </span>
                    )}
                    <span>{new Date(entry.createdAt).toLocaleString("ru-RU")}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {entry.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 space-y-3 border-t border-border p-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(ticketStatusMeta).map(([value, meta]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setReplyStatus(value as keyof typeof ticketStatusMeta);
                    setReplyErrors((current) => ({
                      ...current,
                      status: undefined,
                    }));
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    replyStatus === value
                      ? meta.variant === "success"
                        ? "bg-success/15 text-success"
                        : meta.variant === "warning"
                          ? "bg-warning/15 text-warning"
                          : meta.variant === "accent"
                            ? "bg-accent-light text-accent"
                            : "bg-background-hover text-foreground-secondary"
                      : "bg-background-hover text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {meta.label}
                </button>
              ))}
            </div>

            {replyErrors.status ? (
              <p className="text-sm text-danger">{replyErrors.status}</p>
            ) : null}

            {message ? (
              <p className="text-sm text-foreground-secondary">{message}</p>
            ) : null}

            <div className="flex gap-2">
              <div className="flex-1">
                <textarea
                  value={reply}
                  onChange={(event) => {
                    setReply(event.target.value);
                    setReplyErrors((current) => ({
                      ...current,
                      text: undefined,
                    }));
                  }}
                  placeholder="Написать ответ..."
                  rows={3}
                  className={`w-full resize-none rounded-lg border bg-background-hover px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none ${
                    replyErrors.text ? "border-danger" : "border-border"
                  }`}
                />
                {replyErrors.text ? (
                  <p className="mt-1 text-sm text-danger">{replyErrors.text}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleReply()}
                disabled={!reply.trim() || isSubmitting}
                className="self-end rounded-lg bg-accent px-4 text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
