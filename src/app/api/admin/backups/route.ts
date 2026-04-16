import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  getBackupStatusRecord,
  runBackupNow,
} from "@/lib/server/services/backups";
import {
  assertNoBody,
  failForRouteError,
  ok,
} from "@/lib/server/routes";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getBackupStatusRecord());
  } catch (error) {
    return failForRouteError(error, "ADMIN_BACKUP_STATUS_FAILED", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await assertNoBody(request);
    return ok(await runBackupNow({ trigger: "manual", adminUserId: admin.id }));
  } catch (error) {
    return failForRouteError(error, "ADMIN_BACKUP_RUN_FAILED", 500);
  }
}
