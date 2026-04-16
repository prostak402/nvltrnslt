import type { NextRequest } from "next/server";

import { adminTicketReplyBodySchema } from "@/lib/server/api-schemas";
import { requireAdmin } from "@/lib/server/auth";
import { getAdminTicketsData, replyToTicket } from "@/lib/server/service";
import { failForRouteError, ok, parseJson } from "@/lib/server/routes";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getAdminTicketsData());
  } catch (error) {
    return failForRouteError(error, "ADMIN_TICKETS_LOAD_FAILED", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await parseJson(request, adminTicketReplyBodySchema);
    return ok(await replyToTicket(admin.id, body.ticketId, body.text, body.status));
  } catch (error) {
    return failForRouteError(error, "TICKET_REPLY_FAILED", 400);
  }
}
