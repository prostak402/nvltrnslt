import { ArrowLeft, Clock3, MessageSquare, Shield } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  supportCategoryLabels,
  ticketStatusMeta,
} from "@/lib/client/presentation";
import type { DashboardSupportTicketResponse } from "@/lib/contracts/dashboard";
import { requireDashboardPageUser } from "@/lib/server/page-auth";
import { getSupportTicketPageData } from "@/lib/server/services/support";

type SupportTicketPageProps = {
  params: Promise<{
    ticketId: string;
  }>;
};

export default async function SupportTicketPage({
  params,
}: SupportTicketPageProps) {
  const { ticketId } = await params;
  const parsedTicketId = Number(ticketId);

  if (!Number.isInteger(parsedTicketId) || parsedTicketId < 1) {
    notFound();
  }

  const user = await requireDashboardPageUser();
  const ticket: DashboardSupportTicketResponse | null =
    await getSupportTicketPageData(user.id, parsedTicketId);

  if (!ticket) {
    notFound();
  }

  const statusBadge = ticketStatusMeta[ticket.status];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button
        href="/dashboard/support"
        variant="ghost"
        size="sm"
        className="gap-2 px-0"
      >
        <ArrowLeft className="h-4 w-4" />
        К списку тикетов
      </Button>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                {ticket.subject}
              </h1>
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              <Badge variant="default">#{ticket.id}</Badge>
            </div>

            <p className="mt-3 text-sm text-foreground-muted">
              {supportCategoryLabels[ticket.category]}
            </p>
          </div>

          <div className="grid gap-3 text-sm text-foreground-secondary sm:grid-cols-2 lg:text-right">
            <div className="rounded-xl bg-background-hover px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-foreground-muted">
                Создан
              </p>
              <p className="mt-1 font-medium text-foreground">
                {ticket.createdAtLabel}
              </p>
            </div>
            <div className="rounded-xl bg-background-hover px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-foreground-muted">
                Обновлён
              </p>
              <p className="mt-1 font-medium text-foreground">
                {ticket.updatedAtLabel}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-foreground-secondary" />
          <h2 className="text-lg font-semibold text-foreground">Переписка</h2>
        </div>

        <div className="space-y-4">
          {ticket.messages.map((message) => {
            const isAdminReply = message.authorRole === "admin";

            return (
              <div
                key={message.id}
                className={`flex ${isAdminReply ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[80%] ${
                    isAdminReply
                      ? "border border-border bg-background-card text-foreground"
                      : "bg-accent text-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-medium">
                      {isAdminReply ? (
                        <>
                          <Shield className="h-3.5 w-3.5" />
                          Поддержка
                        </>
                      ) : (
                        "Вы"
                      )}
                    </span>
                    <span
                      className={
                        isAdminReply
                          ? "text-foreground-muted"
                          : "text-white/75"
                      }
                    >
                      ·
                    </span>
                    <span
                      className={
                        isAdminReply
                          ? "inline-flex items-center gap-1 text-foreground-muted"
                          : "inline-flex items-center gap-1 text-white/75"
                      }
                    >
                      <Clock3 className="h-3 w-3" />
                      {message.createdAtLabel}
                    </span>
                  </div>

                  <p
                    className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${
                      isAdminReply ? "text-foreground-secondary" : "text-white"
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
