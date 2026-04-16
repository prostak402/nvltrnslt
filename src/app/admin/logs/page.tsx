import type { AdminLogEntry } from "@/lib/contracts/admin";
import { requireAdminPageUser } from "@/lib/server/page-auth";
import { getAdminLogsData } from "@/lib/server/services/admin";

import LogsClient from "./LogsClient";

export default async function LogsPage() {
  await requireAdminPageUser();

  let data: AdminLogEntry[] = [];
  let error: string | null = null;

  try {
    data = await getAdminLogsData();
  } catch {
    error = "Не удалось загрузить логи.";
  }

  return <LogsClient data={data} error={error} />;
}
