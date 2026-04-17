import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import type {
  DashboardSupportResponse,
  DashboardSupportTicketMessage,
  DashboardSupportTicketResponse,
} from "@/lib/contracts/dashboard";
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
    a: "Проверьте, что у вас стабильное интернет-соединение и что файл nvl_translate_key.json лежит в папке game/. Если нужно, заново скачайте ключ в разделе устройств.",
  },
  {
    q: "Слова не появляются в кабинете",
    a: "Проверьте, не накопилась ли очередь офлайн-синхронизации. Последние события и ошибки можно посмотреть в разделе истории.",
  },
  {
    q: "Как восстановить удалённое слово",
    a: "Удалённые карточки можно импортировать заново из TSV-экспорта или повторно сохранить во время чтения новеллы.",
  },
  {
    q: "Перевод отображается некорректно",
    a: "Перевод идёт через серверный proxy на Yandex Cloud. Вы можете отредактировать карточку или описать проблему в тикете, если ошибка повторяется.",
  },
  {
    q: "Как отменить подписку",
    a: "На текущем этапе реальные списания ещё могут быть отключены, но сами лимиты и тарифные уровни уже работают так же, как в будущей billing-схеме.",
  },
] as const;

function messagePreview(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  return normalized.length > 180
    ? `${normalized.slice(0, 177).trimEnd()}...`
    : normalized;
}

function mapSupportMessage(
  entry: typeof supportMessages.$inferSelect,
): DashboardSupportTicketMessage {
  return {
    id: entry.id,
    authorRole: entry.authorRole as "user" | "admin",
    authorName: entry.authorName,
    text: entry.text,
    createdAt: toIsoString(entry.createdAt) ?? "",
    createdAtLabel: formatDateTimeRu(entry.createdAt),
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

function withTicketLabels(entry: typeof supportTickets.$inferSelect) {
  const ticket = mapSupportTicket(entry);

  return {
    ...ticket,
    createdAtLabel: formatDateTimeRu(ticket.createdAt),
    updatedAtLabel: formatDateTimeRu(ticket.updatedAt),
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

  const messageMetaByTicket = new Map<
    number,
    { messageCount: number; lastMessagePreview: string | null }
  >();

  for (const message of messages) {
    const current = messageMetaByTicket.get(message.ticketId) ?? {
      messageCount: 0,
      lastMessagePreview: null,
    };

    current.messageCount += 1;
    current.lastMessagePreview = messagePreview(message.text);
    messageMetaByTicket.set(message.ticketId, current);
  }

  return {
    faqItems: [...FAQ_ITEMS],
    tickets: tickets.map((ticket) => {
      const normalized = withTicketLabels(ticket);
      const messageMeta = messageMetaByTicket.get(ticket.id);

      return {
        id: normalized.id,
        subject: normalized.subject,
        category: normalized.category,
        status: normalized.status,
        createdAtLabel: normalized.createdAtLabel,
        updatedAtLabel: normalized.updatedAtLabel,
        messageCount: messageMeta?.messageCount ?? 0,
        lastMessagePreview: messageMeta?.lastMessagePreview ?? null,
      };
    }),
  };
}

export async function getSupportTicketPageData(
  userId: number,
  ticketId: number,
): Promise<DashboardSupportTicketResponse | null> {
  const [ticket] = await getDb()
    .select()
    .from(supportTickets)
    .where(
      and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.userId, userId),
      ),
    )
    .limit(1);

  if (!ticket) {
    return null;
  }

  const messages = await getDb()
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.ticketId, ticketId))
    .orderBy(supportMessages.createdAt);

  const normalized = withTicketLabels(ticket);

  return {
    id: normalized.id,
    subject: normalized.subject,
    category: normalized.category,
    status: normalized.status,
    createdAtLabel: normalized.createdAtLabel,
    updatedAtLabel: normalized.updatedAtLabel,
    messages: messages.map(mapSupportMessage),
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
