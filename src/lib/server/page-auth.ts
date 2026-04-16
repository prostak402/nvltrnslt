import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/server/auth";

export async function requireDashboardPageUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return user;
}

export async function requireAdminPageUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return user;
}
