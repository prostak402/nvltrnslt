import "server-only";

import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { cookies } from "next/headers";

import {
  DEFAULT_SITE_URL,
  PASSWORD_RESET_TTL_MINUTES,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/config";
import type { SessionSummary } from "@/lib/contracts/session";
import { getDb } from "@/lib/db/client";
import {
  passwordResetTokens,
  subscriptions,
  userSettings,
  users,
} from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";
import type { SessionPayload } from "@/lib/types";
import {
  findUserById,
  getUserRow,
  logActivity,
  mapUserRow,
  omitPassword,
  toDate,
  type DbExecutor,
} from "@/lib/server/services/shared";
import {
  makeActivationKey,
  makePasswordResetToken,
  nowIso,
  sha256,
} from "@/lib/server/utils";
import { assertSiteAccessAllowed } from "@/lib/server/services/site-settings";

type DatabaseErrorLike = {
  code?: string;
  column_name?: string;
  constraint_name?: string;
  detail?: string;
  message?: string;
};

function authSecret() {
  return new TextEncoder().encode(serverEnv.AUTH_SECRET);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function resolveSiteOrigin(origin?: string) {
  const fallback = DEFAULT_SITE_URL;
  const candidate = origin?.trim() || fallback;

  try {
    return new URL(candidate).origin;
  } catch {
    return fallback;
  }
}

function buildPasswordResetPreviewUrl(origin: string | undefined, token: string) {
  const base = new URL(resolveSiteOrigin(origin));
  base.pathname = "/auth/reset-password";
  base.search = "";
  base.searchParams.set("token", token);
  return base.toString();
}

async function getUserRowByEmail(executor: DbExecutor, email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const rows = await executor
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);

  return rows[0] ?? null;
}

async function generateUniqueActivationKey(executor: DbExecutor) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = makeActivationKey();
    const existing = await executor
      .select({ id: users.id })
      .from(users)
      .where(eq(users.activationKey, candidate))
      .limit(1);

    if (!existing[0]) {
      return candidate;
    }
  }

  throw new Error("ACTIVATION_KEY_GENERATION_FAILED");
}

function isUniqueViolationOn(error: unknown, targets: string[]) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const dbError = error as DatabaseErrorLike;
  if (dbError.code !== "23505") {
    return false;
  }

  const haystack = [
    dbError.column_name,
    dbError.constraint_name,
    dbError.detail,
    dbError.message,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return targets.some((target) => haystack.includes(target.toLowerCase()));
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ ...payload } satisfies JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(authSecret());
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, authSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    priority: "high",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    priority: "high",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionPayloadFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function getSessionSummary(
  session: SessionPayload | null,
): Promise<SessionSummary> {
  if (!session) {
    return { user: null, isAuthenticated: false };
  }

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return { user: null, isAuthenticated: false };
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as NonNullable<SessionSummary["user"]>["role"],
      plan: user.plan as NonNullable<SessionSummary["user"]>["plan"],
    },
    isAuthenticated: true,
  };
}

export async function getCurrentUserSafe(userId: number) {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ? omitPassword(user) : null;
}

export async function getCurrentUser() {
  const session = await getSessionPayloadFromCookies();
  if (!session) return null;
  return findUserById(getDb(), session.userId);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  await assertSiteAccessAllowed(user.role);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function authenticateUser(email: string, password: string) {
  const userRow = await getUserRowByEmail(getDb(), email);
  if (!userRow || userRow.status === "banned") return null;

  const valid = await verifyPassword(password, userRow.passwordHash);
  return valid ? mapUserRow(userRow) : null;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const registeredAt = nowIso();
  const registeredAtDate = toDate(registeredAt) ?? new Date();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getDb().transaction(async (tx) => {
        const existing = await getUserRowByEmail(tx, email);
        if (existing) {
          throw new Error("EMAIL_EXISTS");
        }

        const activationKey = await generateUniqueActivationKey(tx);
        const insertedUsers = await tx
          .insert(users)
          .values({
            name,
            email,
            passwordHash,
            activationKey,
            role: "user",
            plan: "free",
            status: "active",
            registeredAt: registeredAtDate,
            lastActiveAt: registeredAtDate,
          })
          .returning();

        const userRow = insertedUsers[0];
        if (!userRow) {
          throw new Error("USER_CREATE_FAILED");
        }

        await tx.insert(userSettings).values({
          userId: userRow.id,
          dailyWords: 20,
          dailyNewWords: 10,
          prioritizeDifficult: true,
          includePhrases: true,
          autoSync: true,
          poorConnection: "queue",
          reminderEnabled: true,
          emailNotifications: true,
        });

        await tx.insert(subscriptions).values({
          userId: userRow.id,
          plan: "free",
          status: "active",
          startedAt: registeredAtDate,
          renewalAt: null,
          endedAt: null,
        });

        return mapUserRow(userRow);
      });
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_EXISTS") {
        throw error;
      }

      if (isUniqueViolationOn(error, ["email"])) {
        throw new Error("EMAIL_EXISTS");
      }

      if (attempt < 2 && isUniqueViolationOn(error, ["activation_key", "activation key"])) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("REGISTER_FAILED");
}

export async function touchUserLastActive(userId: number) {
  await getDb()
    .update(users)
    .set({
      lastActiveAt: toDate(nowIso()) ?? new Date(),
    })
    .where(eq(users.id, userId));
}

export async function changeUserPassword(
  userId: number,
  input: {
    currentPassword: string;
    newPassword: string;
  },
) {
  return getDb().transaction(async (tx) => {
    const userRow = await getUserRow(tx, userId);
    if (!userRow) {
      throw new Error("USER_NOT_FOUND");
    }

    const currentPasswordValid = await verifyPassword(
      input.currentPassword,
      userRow.passwordHash,
    );
    if (!currentPasswordValid) {
      throw new Error("CURRENT_PASSWORD_INVALID");
    }

    const isSamePassword = await verifyPassword(
      input.newPassword,
      userRow.passwordHash,
    );
    if (isSamePassword) {
      throw new Error("PASSWORD_UNCHANGED");
    }

    const passwordHash = await hashPassword(input.newPassword);
    const [updatedUser] = await tx
      .update(users)
      .set({
        passwordHash,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("USER_NOT_FOUND");
    }

    await logActivity(tx, {
      userId,
      type: "auth",
      action: "Пароль обновлен",
      detail: "Пользователь изменил пароль в личном кабинете",
      level: "success",
    });

    return mapUserRow(updatedUser);
  });
}

export async function requestPasswordReset(input: {
  email: string;
  origin?: string;
}) {
  const requestedEmail = normalizeEmail(input.email);
  const token = makePasswordResetToken();
  const tokenHash = sha256(token);
  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
  );
  const previewUrl = buildPasswordResetPreviewUrl(input.origin, token);

  await getDb().transaction(async (tx) => {
    const userRow = await getUserRowByEmail(tx, requestedEmail);

    if (userRow) {
      await tx
        .update(passwordResetTokens)
        .set({
          usedAt: createdAt,
        })
        .where(
          and(
            eq(passwordResetTokens.userId, userRow.id),
            isNull(passwordResetTokens.usedAt),
          ),
        );
    }

    await tx.insert(passwordResetTokens).values({
      userId: userRow?.id ?? null,
      requestedEmail,
      tokenHash,
      createdAt,
      expiresAt,
      usedAt: null,
    });

    if (userRow) {
      await logActivity(tx, {
        userId: userRow.id,
        type: "auth",
        action: "Запрошен сброс пароля",
        detail: "Пользователь инициировал восстановление доступа",
        level: "info",
      });
    }
  });

  return {
    accepted: true,
    delivery: "preview-link" as const,
    previewUrl,
    expiresAt: expiresAt.toISOString(),
    note:
      "Если аккаунт существует, используйте ссылку ниже для продолжения сброса в текущей сборке.",
  };
}

export async function resetPasswordWithToken(input: {
  token: string;
  newPassword: string;
}) {
  const tokenHash = sha256(input.token.trim());
  const now = new Date();

  return getDb().transaction(async (tx) => {
    const [tokenRow] = await tx
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (
      !tokenRow ||
      tokenRow.userId === null ||
      tokenRow.usedAt !== null ||
      tokenRow.expiresAt.getTime() <= now.getTime()
    ) {
      throw new Error("PASSWORD_RESET_TOKEN_INVALID");
    }

    const userRow = await getUserRow(tx, tokenRow.userId);
    if (!userRow || userRow.status !== "active") {
      throw new Error("PASSWORD_RESET_TOKEN_INVALID");
    }

    const isSamePassword = await verifyPassword(
      input.newPassword,
      userRow.passwordHash,
    );
    if (isSamePassword) {
      throw new Error("PASSWORD_UNCHANGED");
    }

    const passwordHash = await hashPassword(input.newPassword);
    const [updatedUser] = await tx
      .update(users)
      .set({
        passwordHash,
      })
      .where(eq(users.id, userRow.id))
      .returning();

    if (!updatedUser) {
      throw new Error("USER_NOT_FOUND");
    }

    await tx
      .update(passwordResetTokens)
      .set({
        usedAt: now,
      })
      .where(
        and(
          eq(passwordResetTokens.userId, userRow.id),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      );

    await logActivity(tx, {
      userId: userRow.id,
      type: "auth",
      action: "Пароль сброшен",
      detail: "Пароль обновлен по ссылке восстановления",
      level: "success",
    });

    return mapUserRow(updatedUser);
  });
}
