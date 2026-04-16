import type { NextRequest } from "next/server";

import { itemIdParamsSchema, studyItemPatchBodySchema } from "@/lib/server/api-schemas";
import { requireUser } from "@/lib/server/auth";
import { deleteStudyItem, updateStudyItem } from "@/lib/server/service";
import {
  failForRouteError,
  ok,
  parseJson,
  parseWithSchema,
} from "@/lib/server/routes";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const user = await requireUser();
    const { itemId } = parseWithSchema(await params, itemIdParamsSchema);
    const body = await parseJson(request, studyItemPatchBodySchema);
    return ok(await updateStudyItem(user.id, itemId, body));
  } catch (error) {
    return failForRouteError(error, "ITEM_UPDATE_FAILED", 400);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const user = await requireUser();
    const { itemId } = parseWithSchema(await params, itemIdParamsSchema);
    await deleteStudyItem(user.id, itemId);
    return ok({ deleted: true });
  } catch (error) {
    return failForRouteError(error, "ITEM_DELETE_FAILED", 400);
  }
}
