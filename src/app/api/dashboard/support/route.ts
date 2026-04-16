import type { NextRequest } from "next/server";

import { supportTicketBodySchema } from "@/lib/server/api-schemas";
import { requireUser } from "@/lib/server/auth";
import { createSupportTicket, getSupportPageData } from "@/lib/server/service";
import { failForRouteError, ok, parseJson } from "@/lib/server/routes";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getSupportPageData(user.id));
  } catch (error) {
    return failForRouteError(error, "SUPPORT_LOAD_FAILED", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, supportTicketBodySchema);

    return ok(
      await createSupportTicket(user.id, {
        subject: body.subject,
        category: body.category,
        message: body.message,
      }),
    );
  } catch (error) {
    return failForRouteError(error, "TICKET_CREATE_FAILED", 400);
  }
}
