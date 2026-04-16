import { requireUser } from "@/lib/server/auth";
import { getWordsPageData } from "@/lib/server/service";
import { failForRouteError, ok } from "@/lib/server/routes";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getWordsPageData(user.id));
  } catch (error) {
    return failForRouteError(error, "WORDS_LOAD_FAILED", 500);
  }
}
