import { requireUser } from "@/lib/server/auth";
import { getPhrasesPageData } from "@/lib/server/service";
import { failForRouteError, ok } from "@/lib/server/routes";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getPhrasesPageData(user.id));
  } catch (error) {
    return failForRouteError(error, "PHRASES_LOAD_FAILED", 500);
  }
}
