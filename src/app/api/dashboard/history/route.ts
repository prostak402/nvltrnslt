import { requireUser } from "@/lib/server/auth";
import { getHistoryPageData } from "@/lib/server/service";
import { failForRouteError, ok } from "@/lib/server/routes";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getHistoryPageData(user.id));
  } catch (error) {
    return failForRouteError(error, "HISTORY_LOAD_FAILED", 500);
  }
}
