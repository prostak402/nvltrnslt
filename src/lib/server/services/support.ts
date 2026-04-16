import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import type { DashboardSupportResponse } from "@/lib/contracts/dashboard";
import { getDb } from "@/lib/db/client";
import { supportMessages, supportTickets, users } from "@/lib/db/schema";
import type { SupportCategory, TicketStatus } from "@/lib/types";
import { formatDateTimeRu } from "@/lib/server/utils";

import { logActivity, logAdmin, requireUser, toIsoString } from "./shared";
import { getAdminSettingsRecord } from "./site-settings";
import { sendAlertDelivery } from "./alert-delivery";

const FAQ_ITEMS = [
  {
    q: "Мод не подключается к серверу",
    a: "Убедитесь, что у вас стабильное интернет-соединение и что nvl_translate_key.json лежит в папке game/. При необходимости скачайте файл заново в разделе устройств.",
  },
  {
    q: "Слова не появляются в кабинете",
    a: "Проверьте, не накопилась ли очередь оффлайн-синхронизации. Сайт покажет последние события и ошибки в разделе истории.",
  },
  {
    q: "Как восстановить удалённое слово",
    a: "Удалённые карточки можно импортировать заново из TSV-бэкапа или снова сохранить при чтении новеллы.",
  },
  {
    q: "Перевод отображается некорректно",
    a: "Перевод идёт через серверный proxy на Yandex Cloud. Вы всегда можете поправить перевод или оставить заметку в карточке.",
  },
  {
    q: "Как отменить подписку",
    a: "На этапе MVP реальные списания ещё не включены, но структура тарифов и лимитов уже готова для будущего billing.",
  },
] as const;

function mapSupportMessage(entry: typeof supportMessages.$inferSelect) {
  return {
    id: entry.id,
    ticketId: entry.ticketId,
    authorRole: entry.authorRole as "user" | "admin",
    authorUserId: entry.authorUserId,
    authorName: entry.authorName,
    text: entry.text,
    createdAt: toIsoString(entry.createdAt) ?? "",
  };
}

function mapSupportTicket(entry: typeof supportTickets.$inferSelect) {
  return {
    id: entry.id,
    userId: entry.userId,
    subject: entry.subject,
    category: entry.category as SupportCategory,
    status: entry.status as TicketStatus,
    createdAt: toIsoString(entry.createdAt) ?? "",
    updatedAt: toIsoString(entry.updatedAt) ?? "",
  };
}

export async function getSupportPageData(
  userId: number,
): Promise<DashboardSupportResponse> {
  const tickets = await getDb()
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.userId, userId))
    .orderBy(desc(supportTickets.updatedAt));

  const ticketIds = tickets.map((ticket) => ticket.id);
  const messages = ticketIds.length
    ? await getDb()
        .select()
        .from(supportMessages)
        .where(inArray(supportMessages.ticketId, ticketIds))
        .orderBy(supportMessages.createdAt)
    : [];

  const messagesByTicket = new Map<number, ReturnType<typeof mapSupportMessage>[]>();
  for (const message of messages) {
    const list = messagesByTicket.get(message.ticketId) ?? [];
    list.push(mapSupportMessage(message));
    messagesByTicket.set(message.ticketId, list);
  }

  return {
    faqItems: [...FAQ_ITEMS],
    tickets: tickets.map((ticket) => {
      const normalized = mapSupportTicket(ticket);
      return {
        ...normalized,
        createdAtLabel: formatDateTimeRu(normalized.createdAt),
        updatedAtLabel: formatDateTimeRu(normalized.updatedAt),
        messages: messagesByTicket.get(ticket.id) ?? [],
      };
    }),
  };
}

export async function createSupportTicket(
  userId: number,
  input: {
    subject: string;
    category: SupportCategory;
    message: string;
  },
) {
  const result = await getDb().transaction(async (tx) => {
    const user = await requireUser(tx, userId);
    const adminSettings = await getAdminSettingsRecord(tx);
    const createdAt = new Date();
    const [ticket] = await tx
      .insert(supportTickets)
      .values({
        userId,
        subject: input.subject.trim(),
        category: input.category,
        status: "open",
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    await tx.insert(supportMessages).values({
      ticketId: ticket.id,
      authorRole: "user",
      authorUserId: userId,
      authorName: user.name,
      text: input.message.trim(),
      createdAt,
    });

    await logActivity(tx, {
      userId,
      type: "support",
      action: "Тикет создан",
      detail: ticket.subject,
    });

    if (adminSettings.adminNotifications) {
      await logAdmin(tx, {
        adminUserId: null,
        type: "support",
        action: "Новый тикет поддержки",
        detail: `ticket #${ticket.id}: ${ticket.subject}`,
        level: "warning",
      });
    }

    return {
      ticket: mapSupportTicket(ticket),
      adminNotifications: adminSettings.adminNotifications,
      userName: user.name,
    };
  });

  if (result.adminNotifications) {
    await sendAlertDelivery({
      category: "admin",
      title: "Новый тикет поддержки",
      lines: [
        `ticket: #${result.ticket.id}`,
        `user: ${result.userName}`,
        `category: ${result.ticket.category}`,
        `subject: ${result.ticket.subject}`,
      ],
    });
  }

  return result.ticket;
}

export async function getAdminTicketsData() {
  const tickets = await getDb()
    .select()
    .from(supportTickets)
    .orderBy(desc(supportTickets.updatedAt));

  const ticketIds = tickets.map((ticket) => ticket.id);
  const userIds = [...new Set(tickets.map((ticket) => ticket.userId))];
  const [ticketMessages, ticketUsers] = await Promise.all([
    ticketIds.length
      ? getDb()
          .select()
          .from(supportMessages)
          .where(inArray(supportMessages.ticketId, ticketIds))
      : Promise.resolve([]),
    userIds.length
      ? getDb()
          .select()
          .from(users)
          .where(inArray(users.id, userIds))
      : Promise.resolve([]),
  ]);

  const userMap = new Map(ticketUsers.map((user) => [user.id, user]));
  const messagesByTicket = new Map<number, ReturnType<typeof mapSupportMessage>[]>();
  for (const message of ticketMessages) {
    const list = messagesByTicket.get(message.ticketId) ?? [];
    list.push(mapSupportMessage(message));
    messagesByTicket.set(message.ticketId, list);
  }

  return tickets.map((ticket) => ({
    ...mapSupportTicket(ticket),
    userName: userMap.get(ticket.userId)?.name ?? "Неизвестно",
    email: userMap.get(ticket.userId)?.email ?? "",
    messages: messagesByTicket.get(ticket.id) ?? [],
  }));
}

export async function replyToTicket(
  adminUserId: number,
  ticketId: number,
  text: string,
  status?: TicketStatus,
) {
  return getDb().transaction(async (tx) => {
    const admin = await requireUser(tx, adminUserId);
    const [ticket] = await tx
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      throw new Error("NOT_FOUND");
    }

    const createdAt = new Date();
    await tx.insert(supportMessages).values({
      ticketId,
      authorRole: "admin",
      authorUserId: adminUserId,
      authorName: admin.name,
      text: text.trim(),
      createdAt,
    });

    const [updatedTicket] = await tx
      .update(supportTickets)
      .set({
        status: status ?? ticket.status,
        updatedAt: createdAt,
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();

    await logAdmin(tx, {
      adminUserId,
      type: "support",
      action: "Ответ на тикет",
      detail: `ticket #${ticketId}`,
      level: "success",
    });

    return mapSupportTicket(updatedTicket);
  });
}
