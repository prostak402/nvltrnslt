import type { NextRequest } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { getDevicesPageData } from "@/lib/server/service";
import {
  assertNoBody,
  failForRouteError,
  ok,
} from "@/lib/server/routes";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getDevicesPageData(user.id));
  } catch (error) {
    return failForRouteError(error, "DEVICES_LOAD_FAILED", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await assertNoBody(request);
    const user = await requireUser();
    return ok(await getDevicesPageData(user.id));
  } catch (error) {
    return failForRouteError(error, "DEVICES_LOAD_FAILED", 400);
  }
}
