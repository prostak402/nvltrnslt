import type { AdminSubscriptionRow } from "@/lib/contracts/admin";
import { requireAdminPageUser } from "@/lib/server/page-auth";
import { getAdminSubscriptionsData } from "@/lib/server/services/billing";

import SubscriptionsClient from "./SubscriptionsClient";

export default async function SubscriptionsPage() {
  await requireAdminPageUser();

  let data: AdminSubscriptionRow[] = [];
  let error: string | null = null;

  try {
    data = await getAdminSubscriptionsData();
  } catch {
    error = "Не удалось загрузить подписки.";
  }

  return <SubscriptionsClient data={data} error={error} />;
}
