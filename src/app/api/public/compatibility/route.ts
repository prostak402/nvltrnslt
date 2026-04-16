import { getCompatibilityPageData } from "@/lib/server/service";
import { failForRouteError, ok } from "@/lib/server/routes";
import { assertSiteAccessAllowed } from "@/lib/server/services/site-settings";

export async function GET() {
  try {
    await assertSiteAccessAllowed(null);
    return ok(await getCompatibilityPageData());
  } catch (error) {
    return failForRouteError(error, "PUBLIC_COMPATIBILITY_LOAD_FAILED", 500);
  }
}
