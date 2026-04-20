import type { NextRequest } from "next/server";

import { dashboardSettingsBodySchema } from "@/lib/server/api-schemas";
import { requireUser } from "@/lib/server/auth";
import { getSettingsPageData, saveSettings } from "@/lib/server/service";
import { failForRouteError, ok, parseJson } from "@/lib/server/routes";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getSettingsPageData(user.id));
  } catch (error) {
    return failForRouteError(error, "SETTINGS_LOAD_FAILED", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, dashboardSettingsBodySchema);

    return ok(
      await saveSettings(user.id, {
        dailyWords: body.dailyWords,
        dailyNewWords: body.dailyNewWords,
        prioritizeDifficult: body.prioritizeDifficult,
        includePhrases: body.includePhrases,
        autoSync: body.autoSync,
        poorConnection: body.poorConnection,
        reminderEnabled: body.reminderEnabled,
        emailNotifications: body.emailNotifications,
      }),
    );
  } catch (error) {
    return failForRouteError(error, "SETTINGS_SAVE_FAILED", 400);
  }
}
