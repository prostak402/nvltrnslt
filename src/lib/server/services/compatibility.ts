import "server-only";

import { asc, eq } from "drizzle-orm";

import type { CompatibilityResponse } from "@/lib/contracts/public";
import { getDb } from "@/lib/db/client";
import { compatibilityGames } from "@/lib/db/schema";
import type { CompatibilityStatus } from "@/lib/types";

import { logAdmin, toIsoString } from "./shared";

const LIMITATIONS = [
  {
    title: "Нестандартные интерфейсы",
    description: "Новеллы с сильно изменённым интерфейсом могут частично перекрывать окно перевода.",
  },
  {
    title: "Сильно модифицированные сборки",
    description: "Игры с нестандартной обработкой текста могут потребовать отдельной настройки.",
  },
  {
    title: "Мобильные порты",
    description: "Android и iOS пока не поддерживаются.",
  },
  {
    title: "Старые версии Ren'Py",
    description: "Версии ниже Ren'Py 6.x работают с ограничениями или не поддерживаются.",
  },
] as const;

function mapCompatibilityGame(entry: typeof compatibilityGames.$inferSelect) {
  return {
    id: entry.id,
    name: entry.name,
    renpyVersion: entry.renpyVersion,
    status: entry.status as CompatibilityStatus,
    comment: entry.comment,
    addedAt: toIsoString(entry.addedAt) ?? "",
    updatedAt: toIsoString(entry.updatedAt) ?? "",
  };
}

async function listCompatibilityGames() {
  const games = await getDb()
    .select()
    .from(compatibilityGames)
    .orderBy(asc(compatibilityGames.name));

  return games
    .map(mapCompatibilityGame)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export async function getCompatibilityPageData(): Promise<CompatibilityResponse> {
  return {
    games: await listCompatibilityGames(),
    limitations: [...LIMITATIONS],
  };
}

export async function getAdminCompatibilityData() {
  return listCompatibilityGames();
}

export async function saveCompatibilityGame(
  adminUserId: number,
  input: {
    id?: number;
    name: string;
    renpyVersion: string;
    status: CompatibilityStatus;
    comment: string;
  },
) {
  return getDb().transaction(async (tx) => {
    const now = new Date();

    if (input.id) {
      const [game] = await tx
        .update(compatibilityGames)
        .set({
          name: input.name.trim(),
          renpyVersion: input.renpyVersion.trim(),
          status: input.status,
          comment: input.comment.trim(),
          updatedAt: now,
        })
        .where(eq(compatibilityGames.id, input.id))
        .returning();

      if (!game) {
        throw new Error("GAME_NOT_FOUND");
      }

      await logAdmin(tx, {
        adminUserId,
        type: "system",
        action: "Совместимость обновлена",
        detail: game.name,
      });

      return mapCompatibilityGame(game);
    }

    const [game] = await tx
      .insert(compatibilityGames)
      .values({
        name: input.name.trim(),
        renpyVersion: input.renpyVersion.trim(),
        status: input.status,
        comment: input.comment.trim(),
        addedAt: now,
        updatedAt: now,
      })
      .returning();

    await logAdmin(tx, {
      adminUserId,
      type: "system",
      action: "Совместимость добавлена",
      detail: game.name,
    });

    return mapCompatibilityGame(game);
  });
}

export async function deleteCompatibilityGame(adminUserId: number, gameId: number) {
  return getDb().transaction(async (tx) => {
    const [game] = await tx
      .delete(compatibilityGames)
      .where(eq(compatibilityGames.id, gameId))
      .returning();

    if (!game) {
      throw new Error("GAME_NOT_FOUND");
    }

    await logAdmin(tx, {
      adminUserId,
      type: "system",
      action: "Совместимость удалена",
      detail: game.name,
      level: "warning",
    });
  });
}
