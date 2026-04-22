import type { NextRequest } from "next/server";

import { reviewBodySchema } from "@/lib/server/api-schemas";
import { requireUser } from "@/lib/server/auth";
import { recordReview } from "@/lib/server/service";
import { failForRouteError, ok, parseJson } from "@/lib/server/routes";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, reviewBodySchema);
    return ok(await recordReview(user.id, body.itemId, body.rating, body.taskType, body.sessionMode));
  } catch (error) {
    return failForRouteError(error, "REVIEW_FAILED", 400);
  }
}
