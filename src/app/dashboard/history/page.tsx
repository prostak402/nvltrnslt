import { requireDashboardPageUser } from "@/lib/server/page-auth";
import { getHistoryPageData } from "@/lib/server/services/study";

import { HistoryClient } from "./HistoryClient";

export default async function HistoryPage() {
  const user = await requireDashboardPageUser();
  const data = await getHistoryPageData(user.id);

  return <HistoryClient data={data} />;
}
