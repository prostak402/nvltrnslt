import { getSessionPayloadFromCookies } from "@/lib/server/auth";
import { getSessionSummary } from "@/lib/server/service";
import { ok } from "@/lib/server/routes";

export async function GET() {
  const session = await getSessionPayloadFromCookies();
  const summary = await getSessionSummary(session);
  return ok(summary);
}
