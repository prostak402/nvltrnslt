import { requireUser } from "@/lib/server/auth";
import { getProgressPageData } from "@/lib/server/service";
import { failForRouteError, ok } from "@/lib/server/routes";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getProgressPageData(user.id));
  } catch (error) {
    return failForRouteError(error, "PROGRESS_LOAD_FAILED", 500);
  }
}
