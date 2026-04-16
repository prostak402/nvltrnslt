import type { AdminUserRow } from "@/lib/contracts/admin";
import { requireAdminPageUser } from "@/lib/server/page-auth";
import { getAdminUsersData } from "@/lib/server/services/admin";

import UsersClient from "./UsersClient";

export default async function UsersPage() {
  await requireAdminPageUser();

  let data: AdminUserRow[] = [];
  let error: string | null = null;

  try {
    data = await getAdminUsersData();
  } catch {
    error = "Не удалось загрузить пользователей.";
  }

  return <UsersClient data={data} error={error} />;
}
