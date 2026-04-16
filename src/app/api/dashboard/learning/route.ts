import { requireUser } from "@/lib/server/auth";
import { getLearningPageData } from "@/lib/server/service";
import { failForRouteError, ok } from "@/lib/server/routes";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getLearningPageData(user.id));
  } catch (error) {
    return failForRouteError(error, "LEARNING_LOAD_FAILED", 500);
  }
}
