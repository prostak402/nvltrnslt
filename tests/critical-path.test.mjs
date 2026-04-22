import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import postgres from "postgres";

import { createTestApp } from "./helpers/test-app.mjs";

let app;

function makeLinkCode() {
  return `LNK-${randomBytes(6).toString("hex")}`.slice(0, 24);
}

async function createPendingDeviceLinkCode(databaseUrl, userId) {
  const sql = postgres(databaseUrl, {
    prepare: false,
    max: 1,
  });
  const code = makeLinkCode();

  try {
    await sql`
      insert into device_link_codes (user_id, code, expires_at, used_at, created_at)
      values (
        ${userId},
        ${code},
        now() + interval '30 minutes',
        null,
        now()
      )
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }

  return code;
}

before(async () => {
  app = await createTestApp();
});

after(async () => {
  if (app) {
    await app.close();
  }
});

test("critical HTTP path covers auth, mod flow, review, support, and admin auth", async () => {
  const user = app.createClient();
  const admin = app.createClient();

  const registerResponse = await user.request({
    path: "/api/auth/register",
    method: "POST",
    json: {
      name: "Alice Integration",
      email: "alice.integration@example.com",
      password: "super-secret-password-123",
    },
  });

  assert.equal(registerResponse.status, 200);
  assert.equal(registerResponse.json?.ok, true);
  assert.equal(registerResponse.json?.data?.user?.email, "alice.integration@example.com");

  const sessionAfterRegister = await user.request({
    path: "/api/session",
  });
  assert.equal(sessionAfterRegister.status, 200);
  assert.equal(sessionAfterRegister.json?.data?.isAuthenticated, true);

  const logoutResponse = await user.request({
    path: "/api/auth/logout",
    method: "POST",
  });
  assert.equal(logoutResponse.status, 200);

  const sessionAfterLogout = await user.request({
    path: "/api/session",
  });
  assert.equal(sessionAfterLogout.status, 200);
  assert.equal(sessionAfterLogout.json?.data?.isAuthenticated, false);

  const loginResponse = await user.request({
    path: "/api/auth/login",
    method: "POST",
    json: {
      email: "alice.integration@example.com",
      password: "super-secret-password-123",
    },
  });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.json?.data?.user?.role, "user");

  const forbiddenAdminDashboardResponse = await user.request({
    path: "/api/admin/dashboard",
  });
  assert.equal(forbiddenAdminDashboardResponse.status, 403);
  assert.equal(forbiddenAdminDashboardResponse.json?.ok, false);

  const activationFileResponse = await user.request({
    path: "/api/dashboard/activation-file",
  });
  assert.equal(activationFileResponse.status, 200);

  const activationPayload = JSON.parse(activationFileResponse.text);
  assert.equal(activationPayload.accountEmail, "alice.integration@example.com");
  assert.ok(activationPayload.activationKey);

  const activateDeviceResponse = await user.request({
    path: "/api/mod/activate",
    method: "POST",
    json: {
      activationKey: activationPayload.activationKey,
      deviceLabel: "Integration Device",
    },
  });

  assert.equal(activateDeviceResponse.status, 200);
  assert.equal(activateDeviceResponse.json?.ok, true);
  assert.equal(activateDeviceResponse.json?.data?.user?.email, "alice.integration@example.com");

  const deviceToken = activateDeviceResponse.json?.data?.deviceToken;
  assert.ok(deviceToken);

  const bootstrapResponse = await user.request({
    path: "/api/mod/bootstrap",
    headers: {
      "x-device-token": deviceToken,
    },
  });
  assert.equal(bootstrapResponse.status, 200);
  assert.equal(bootstrapResponse.json?.data?.user?.email, "alice.integration@example.com");
  assert.equal(bootstrapResponse.json?.data?.settings?.includePhrases, true);

  const translateResponse = await user.request({
    path: "/api/mod/translate",
    method: "POST",
    headers: {
      "x-device-token": deviceToken,
    },
    json: {
      text: "reluctant",
    },
  });

  assert.equal(translateResponse.status, 200);
  assert.equal(translateResponse.json?.data?.translation, "неохотный");
  assert.equal(translateResponse.json?.data?.provider, "local");
  assert.equal(translateResponse.json?.data?.degraded, true);

  const saveItemResponse = await user.request({
    path: "/api/mod/items",
    method: "POST",
    headers: {
      "x-device-token": deviceToken,
    },
    json: {
      kind: "word",
      text: "reluctant",
      translation: "неохотный",
      note: "saved from integration test",
      contextOriginal: "He felt reluctant to continue.",
      contextTranslation: "Он неохотно продолжал.",
      novelTitle: "Integration Novel",
    },
  });

  assert.equal(saveItemResponse.status, 200);
  assert.equal(saveItemResponse.json?.ok, true);
  const itemId = saveItemResponse.json?.data?.itemId;
  assert.ok(Number.isInteger(itemId));

  const wordsResponse = await user.request({
    path: "/api/dashboard/words",
  });
  assert.equal(wordsResponse.status, 200);
  assert.equal(
    wordsResponse.json?.data?.words?.some(
      (entry) => entry.word === "reluctant" && entry.translation === "неохотный",
    ),
    true,
  );

  const learningResponse = await user.request({
    path: "/api/dashboard/learning",
  });
  assert.equal(learningResponse.status, 200);
  assert.equal(
    learningResponse.json?.data?.ratedSession?.queueWords?.some(
      (card) => card.id === itemId && card.currentTaskType === "pairs",
    ) ?? learningResponse.json?.data?.cards?.some((card) => card.id === itemId),
    true,
  );

  const pairsReviewResponse = await user.request({
    path: "/api/dashboard/review",
    method: "POST",
    json: {
      itemId,
      rating: "know",
      taskType: "pairs",
      sessionMode: "rated",
    },
  });

  assert.equal(pairsReviewResponse.status, 200);

  const reviewResponse = await user.request({
    path: "/api/dashboard/review",
    method: "POST",
    json: {
      itemId,
      rating: "know",
      taskType: "flashcards",
      sessionMode: "rated",
    },
  });

  assert.equal(reviewResponse.status, 200);
  assert.equal(reviewResponse.json?.data?.id, itemId);
  assert.equal(reviewResponse.json?.data?.correctStreak, 1);
  assert.equal(reviewResponse.json?.data?.repetitions, 2);

  const supportTicketResponse = await user.request({
    path: "/api/dashboard/support",
    method: "POST",
    json: {
      subject: "Need help with sync",
      category: "mod",
      message: "The translation flow degraded once during the test.",
    },
  });

  assert.equal(supportTicketResponse.status, 200);
  assert.equal(supportTicketResponse.json?.data?.status, "open");
  const ticketId = supportTicketResponse.json?.data?.id;
  assert.ok(Number.isInteger(ticketId));

  const userSupportPageResponse = await user.request({
    path: "/api/dashboard/support",
  });
  assert.equal(userSupportPageResponse.status, 200);
  assert.equal(
    userSupportPageResponse.json?.data?.tickets?.some((ticket) => ticket.id === ticketId),
    true,
  );

  const adminLoginResponse = await admin.request({
    path: "/api/auth/login",
    method: "POST",
    json: {
      email: app.bootstrapAdmin.email,
      password: app.bootstrapAdmin.password,
    },
  });

  assert.equal(adminLoginResponse.status, 200);
  assert.equal(adminLoginResponse.json?.data?.user?.role, "admin");

  const adminDashboardResponse = await admin.request({
    path: "/api/admin/dashboard",
  });
  assert.equal(adminDashboardResponse.status, 200);
  assert.equal(adminDashboardResponse.json?.ok, true);

  const adminTicketsResponse = await admin.request({
    path: "/api/admin/tickets",
  });
  assert.equal(adminTicketsResponse.status, 200);
  assert.equal(
    adminTicketsResponse.json?.data?.some((ticket) => ticket.id === ticketId),
    true,
  );

  const adminReplyResponse = await admin.request({
    path: "/api/admin/tickets",
    method: "POST",
    json: {
      ticketId,
      text: "We reproduced the issue and the fallback path behaved as expected.",
      status: "resolved",
    },
  });

  assert.equal(adminReplyResponse.status, 200);
  assert.equal(adminReplyResponse.json?.data?.id, ticketId);
  assert.equal(adminReplyResponse.json?.data?.status, "resolved");
});

test("forgot and reset password flow restores account access through preview link", async () => {
  const user = app.createClient();
  const guest = app.createClient();
  const email = "recovery.flow@example.com";
  const oldPassword = "recovery-old-password-123";
  const newPassword = "recovery-new-password-123";

  const registerResponse = await user.request({
    path: "/api/auth/register",
    method: "POST",
    json: {
      name: "Recovery Flow",
      email,
      password: oldPassword,
    },
  });

  assert.equal(registerResponse.status, 200);

  const forgotResponse = await guest.request({
    path: "/api/auth/forgot-password",
    method: "POST",
    json: {
      email,
    },
  });

  assert.equal(forgotResponse.status, 200);
  assert.equal(forgotResponse.json?.data?.accepted, true);
  assert.equal(forgotResponse.json?.data?.delivery, "preview-link");

  const previewUrl = forgotResponse.json?.data?.previewUrl;
  assert.equal(typeof previewUrl, "string");
  const token = new URL(previewUrl).searchParams.get("token");
  assert.ok(token);

  const resetResponse = await guest.request({
    path: "/api/auth/reset-password",
    method: "POST",
    json: {
      token,
      newPassword,
      confirmPassword: newPassword,
    },
  });

  assert.equal(resetResponse.status, 200);
  assert.equal(resetResponse.json?.data?.updated, true);
  assert.equal(resetResponse.json?.data?.email, email);

  const reusedTokenResponse = await guest.request({
    path: "/api/auth/reset-password",
    method: "POST",
    json: {
      token,
      newPassword: "another-password-123",
      confirmPassword: "another-password-123",
    },
  });

  assert.equal(reusedTokenResponse.status, 400);
  assert.equal(reusedTokenResponse.json?.errorCode, "PASSWORD_RESET_TOKEN_INVALID");

  const loginWithOldPasswordResponse = await guest.request({
    path: "/api/auth/login",
    method: "POST",
    json: {
      email,
      password: oldPassword,
    },
  });

  assert.equal(loginWithOldPasswordResponse.status, 401);

  const loginWithNewPasswordResponse = await guest.request({
    path: "/api/auth/login",
    method: "POST",
    json: {
      email,
      password: newPassword,
    },
  });

  assert.equal(loginWithNewPasswordResponse.status, 200);
  assert.equal(loginWithNewPasswordResponse.json?.data?.user?.email, email);
});

test("breadth HTTP path covers dashboard, public, study CRUD, mod link, and admin data endpoints", async () => {
  const user = app.createClient();
  const admin = app.createClient();
  const guest = app.createClient();

  const registerResponse = await user.request({
    path: "/api/auth/register",
    method: "POST",
    json: {
      name: "Bob Coverage",
      email: "bob.coverage@example.com",
      password: "another-super-secret-123",
    },
  });

  assert.equal(registerResponse.status, 200);
  const userId = registerResponse.json?.data?.user?.id;
  assert.ok(Number.isInteger(userId));

  const activationFileResponse = await user.request({
    path: "/api/dashboard/activation-file",
  });
  assert.equal(activationFileResponse.status, 200);
  const activationPayload = JSON.parse(activationFileResponse.text);
  assert.ok(activationPayload.activationKey);

  const linkFromActivationKeyResponse = await user.request({
    path: "/api/mod/link",
    method: "POST",
    json: {
      activationKey: activationPayload.activationKey,
      deviceLabel: "Coverage Device Alpha",
    },
  });

  assert.equal(linkFromActivationKeyResponse.status, 200);
  const alphaDeviceToken = linkFromActivationKeyResponse.json?.data?.deviceToken;
  assert.ok(alphaDeviceToken);

  const linkCode = await createPendingDeviceLinkCode(app.databaseUrl, userId);
  const linkFromCodeResponse = await user.request({
    path: "/api/mod/link",
    method: "POST",
    json: {
      code: linkCode,
      deviceLabel: "Coverage Device Beta",
    },
  });

  assert.equal(linkFromCodeResponse.status, 200);
  const betaDeviceToken = linkFromCodeResponse.json?.data?.deviceToken;
  assert.ok(betaDeviceToken);

  const translateResponse = await user.request({
    path: "/api/mod/translate",
    method: "POST",
    headers: {
      "x-device-token": alphaDeviceToken,
    },
    json: {
      text: "reluctant",
    },
  });

  assert.equal(translateResponse.status, 200);
  assert.equal(translateResponse.json?.data?.provider, "local");

  const wordSaveResponse = await user.request({
    path: "/api/mod/items",
    method: "POST",
    headers: {
      "x-device-token": alphaDeviceToken,
    },
    json: {
      kind: "word",
      text: "reluctant",
      translation: "РЅРµРѕС…РѕС‚РЅС‹Р№",
      note: "coverage word",
      contextOriginal: "He felt reluctant to continue.",
      contextTranslation: "РћРЅ РЅРµРѕС…РѕС‚РЅРѕ РїСЂРѕРґРѕР»Р¶Р°Р».",
      novelTitle: "Coverage Novel",
    },
  });

  assert.equal(wordSaveResponse.status, 200);
  const wordItemId = wordSaveResponse.json?.data?.itemId;
  assert.ok(Number.isInteger(wordItemId));

  const phraseSaveResponse = await user.request({
    path: "/api/mod/items",
    method: "POST",
    headers: {
      "x-device-token": betaDeviceToken,
    },
    json: {
      kind: "phrase",
      text: "take a step back",
      translation: "сделать шаг назад",
      note: "coverage phrase",
      contextOriginal: "Sometimes it helps to take a step back.",
      contextTranslation: "Иногда полезно сделать шаг назад.",
      novelTitle: "Coverage Novel",
    },
  });

  assert.equal(phraseSaveResponse.status, 200);
  const phraseItemId = phraseSaveResponse.json?.data?.itemId;
  assert.ok(Number.isInteger(phraseItemId));

  const overviewResponse = await user.request({
    path: "/api/dashboard/overview",
  });
  assert.equal(overviewResponse.status, 200);
  assert.equal(overviewResponse.json?.data?.summary?.wordsCount >= 1, true);
  assert.equal(overviewResponse.json?.data?.summary?.phrasesCount >= 1, true);

  const learningResponse = await user.request({
    path: "/api/dashboard/learning",
  });
  assert.equal(learningResponse.status, 200);
  assert.equal(
    learningResponse.json?.data?.cards?.some((card) => card.id === wordItemId),
    true,
  );
  assert.equal(
    learningResponse.json?.data?.cards?.some((card) => card.id === phraseItemId),
    true,
  );

  const progressResponse = await user.request({
    path: "/api/dashboard/progress",
  });
  assert.equal(progressResponse.status, 200);
  assert.equal(progressResponse.json?.data?.totalWords >= 2, true);
  assert.equal(Array.isArray(progressResponse.json?.data?.weeklyData), true);

  const historyResponse = await user.request({
    path: "/api/dashboard/history",
  });
  assert.equal(historyResponse.status, 200);
  assert.equal(
    historyResponse.json?.data?.activities?.some((entry) =>
      typeof entry.description === "string" && entry.description.includes("reluctant"),
    ),
    true,
  );

  const wordsResponse = await user.request({
    path: "/api/dashboard/words",
  });
  assert.equal(wordsResponse.status, 200);
  assert.equal(
    wordsResponse.json?.data?.words?.some((entry) => entry.id === wordItemId),
    true,
  );

  const phrasesResponse = await user.request({
    path: "/api/dashboard/phrases",
  });
  assert.equal(phrasesResponse.status, 200);
  assert.equal(
    phrasesResponse.json?.data?.phrases?.some((entry) => entry.id === phraseItemId),
    true,
  );

  const planResponse = await user.request({
    path: "/api/dashboard/plan",
  });
  assert.equal(planResponse.status, 200);
  assert.equal(typeof planResponse.json?.data?.currentPlan?.name, "string");
  assert.equal(planResponse.json?.data?.billing?.mode, "disabled");
  assert.equal(planResponse.json?.data?.billing?.checkoutAvailable, false);
  assert.equal(
    planResponse.json?.data?.subscription?.lifecycle?.phase === "active" ||
      planResponse.json?.data?.subscription?.lifecycle?.phase === "trial",
    true,
  );

  const settingsResponse = await user.request({
    path: "/api/dashboard/settings",
  });
  assert.equal(settingsResponse.status, 200);
  assert.equal(settingsResponse.json?.data?.email, "bob.coverage@example.com");

  const saveSettingsResponse = await user.request({
    path: "/api/dashboard/settings",
    method: "POST",
    json: {
      dailyWords: 25,
      dailyNewWords: 7,
      prioritizeDifficult: false,
      includePhrases: true,
      autoSync: false,
      poorConnection: "retry",
      reminderEnabled: false,
      emailNotifications: false,
    },
  });

  assert.equal(saveSettingsResponse.status, 200);
  assert.equal(saveSettingsResponse.json?.data?.dailyWords, 25);
  assert.equal(saveSettingsResponse.json?.data?.dailyNewWords, 7);
  assert.equal(saveSettingsResponse.json?.data?.poorConnection, "retry");

  const settingsAfterSaveResponse = await user.request({
    path: "/api/dashboard/settings",
  });
  assert.equal(settingsAfterSaveResponse.status, 200);
  assert.equal(settingsAfterSaveResponse.json?.data?.dailyWords, 25);
  assert.equal(settingsAfterSaveResponse.json?.data?.dailyNewWords, 7);
  assert.equal(settingsAfterSaveResponse.json?.data?.autoSync, false);

  const invalidPasswordChangeResponse = await user.request({
    path: "/api/dashboard/settings/password",
    method: "POST",
    json: {
      currentPassword: "wrong-current-password",
      newPassword: "coverage-new-password-123",
      confirmPassword: "coverage-new-password-123",
    },
  });

  assert.equal(invalidPasswordChangeResponse.status, 400);
  assert.equal(
    invalidPasswordChangeResponse.json?.fieldErrors?.currentPassword?.[0],
    "Текущий пароль указан неверно",
  );

  const passwordChangeResponse = await user.request({
    path: "/api/dashboard/settings/password",
    method: "POST",
    json: {
      currentPassword: "another-super-secret-123",
      newPassword: "coverage-new-password-123",
      confirmPassword: "coverage-new-password-123",
    },
  });

  assert.equal(passwordChangeResponse.status, 200);
  assert.equal(passwordChangeResponse.json?.data?.updated, true);

  const logoutAfterPasswordChangeResponse = await user.request({
    path: "/api/auth/logout",
    method: "POST",
  });
  assert.equal(logoutAfterPasswordChangeResponse.status, 200);

  const loginWithOldPasswordResponse = await user.request({
    path: "/api/auth/login",
    method: "POST",
    json: {
      email: "bob.coverage@example.com",
      password: "another-super-secret-123",
    },
  });

  assert.equal(loginWithOldPasswordResponse.status, 401);

  const loginWithNewPasswordResponse = await user.request({
    path: "/api/auth/login",
    method: "POST",
    json: {
      email: "bob.coverage@example.com",
      password: "coverage-new-password-123",
    },
  });

  assert.equal(loginWithNewPasswordResponse.status, 200);
  assert.equal(
    loginWithNewPasswordResponse.json?.data?.user?.email,
    "bob.coverage@example.com",
  );

  const devicesResponse = await user.request({
    path: "/api/dashboard/devices",
  });
  assert.equal(devicesResponse.status, 200);
  assert.equal(devicesResponse.json?.data?.activeDevices, 2);
  const betaDevice = devicesResponse.json?.data?.devices?.find(
    (entry) => entry.name === "Coverage Device Beta",
  );
  assert.ok(betaDevice);

  const devicesReloadResponse = await user.request({
    path: "/api/dashboard/devices",
    method: "POST",
  });
  assert.equal(devicesReloadResponse.status, 200);
  assert.equal(devicesReloadResponse.json?.data?.activeDevices, 2);

  const revokeDeviceResponse = await user.request({
    path: `/api/dashboard/devices/${betaDevice.id}`,
    method: "DELETE",
  });
  assert.equal(revokeDeviceResponse.status, 200);
  assert.equal(revokeDeviceResponse.json?.data?.status, "revoked");

  const devicesAfterRevokeResponse = await user.request({
    path: "/api/dashboard/devices",
  });
  assert.equal(devicesAfterRevokeResponse.status, 200);
  assert.equal(devicesAfterRevokeResponse.json?.data?.activeDevices, 1);

  const patchWordResponse = await user.request({
    path: `/api/study-items/${wordItemId}`,
    method: "PATCH",
    json: {
      translation: "неохотный (edited)",
      note: "edited in coverage test",
      status: "hard",
    },
  });

  assert.equal(patchWordResponse.status, 200);
  assert.equal(patchWordResponse.json?.data?.translation, "неохотный (edited)");
  assert.equal(patchWordResponse.json?.data?.status, "hard");

  const wordsAfterPatchResponse = await user.request({
    path: "/api/dashboard/words",
  });
  assert.equal(wordsAfterPatchResponse.status, 200);
  assert.equal(
    wordsAfterPatchResponse.json?.data?.words?.some(
      (entry) =>
        entry.id === wordItemId &&
        entry.translation === "неохотный (edited)" &&
        entry.note === "edited in coverage test",
    ),
    true,
  );

  const adminLoginResponse = await admin.request({
    path: "/api/auth/login",
    method: "POST",
    json: {
      email: app.bootstrapAdmin.email,
      password: app.bootstrapAdmin.password,
    },
  });

  assert.equal(adminLoginResponse.status, 200);

  const adminAnalyticsResponse = await admin.request({
    path: "/api/admin/analytics",
  });
  assert.equal(adminAnalyticsResponse.status, 200);
  assert.equal(adminAnalyticsResponse.json?.data?.registrationData?.length, 7);
  assert.equal(adminAnalyticsResponse.json?.data?.translationVolume?.length, 7);

  const adminSettingsResponse = await admin.request({
    path: "/api/admin/settings",
  });
  assert.equal(adminSettingsResponse.status, 200);
  assert.equal(Array.isArray(adminSettingsResponse.json?.data?.admins), true);
  assert.equal(
    typeof adminSettingsResponse.json?.data?.adminSettings?.maintenanceMode,
    "boolean",
  );

  const adminUsersResponse = await admin.request({
    path: "/api/admin/users",
  });
  assert.equal(adminUsersResponse.status, 200);
  const bobAdminView = adminUsersResponse.json?.data?.find(
    (entry) => entry.email === "bob.coverage@example.com",
  );
  assert.ok(bobAdminView);
  assert.equal(bobAdminView.devicesCount, 1);
  assert.equal(bobAdminView.wordsCount >= 1, true);

  const adminSubscriptionsResponse = await admin.request({
    path: "/api/admin/subscriptions",
  });
  assert.equal(adminSubscriptionsResponse.status, 200);
  assert.equal(
    adminSubscriptionsResponse.json?.data?.some(
      (entry) => entry.email === "bob.coverage@example.com",
    ),
    true,
  );
  assert.equal(
    adminSubscriptionsResponse.json?.data?.some(
      (entry) =>
        entry.email === "bob.coverage@example.com" &&
        typeof entry.lifecycle?.phase === "string",
    ),
    true,
  );

  const adminCompatibilityResponse = await admin.request({
    path: "/api/admin/compatibility",
  });
  assert.equal(adminCompatibilityResponse.status, 200);
  assert.equal(Array.isArray(adminCompatibilityResponse.json?.data), true);

  const createCompatibilityResponse = await admin.request({
    path: "/api/admin/compatibility",
    method: "POST",
    json: {
      name: "Coverage Novel",
      renpyVersion: "8.2",
      status: "testing",
      comment: "Added by integration coverage test",
    },
  });

  assert.equal(createCompatibilityResponse.status, 200);
  const gameId = createCompatibilityResponse.json?.data?.id;
  assert.ok(Number.isInteger(gameId));

  const adminCompatibilityAfterCreateResponse = await admin.request({
    path: "/api/admin/compatibility",
  });
  assert.equal(adminCompatibilityAfterCreateResponse.status, 200);
  assert.equal(
    adminCompatibilityAfterCreateResponse.json?.data?.some((entry) => entry.id === gameId),
    true,
  );

  const publicCompatibilityResponse = await guest.request({
    path: "/api/public/compatibility",
  });
  assert.equal(publicCompatibilityResponse.status, 200);
  assert.equal(Array.isArray(publicCompatibilityResponse.json?.data?.games), true);
  assert.equal(Array.isArray(publicCompatibilityResponse.json?.data?.limitations), true);
  assert.equal(
    publicCompatibilityResponse.json?.data?.games?.some((entry) => entry.id === gameId),
    true,
  );

  const adminLogsResponse = await admin.request({
    path: "/api/admin/logs",
  });
  assert.equal(adminLogsResponse.status, 200);
  assert.equal(Array.isArray(adminLogsResponse.json?.data), true);
  assert.equal(adminLogsResponse.json?.data?.length > 0, true);

  const deleteCompatibilityResponse = await admin.request({
    path: `/api/admin/compatibility/${gameId}`,
    method: "DELETE",
  });
  assert.equal(deleteCompatibilityResponse.status, 200);
  assert.equal(deleteCompatibilityResponse.json?.data?.deleted, true);

  const publicCompatibilityAfterDeleteResponse = await guest.request({
    path: "/api/public/compatibility",
  });
  assert.equal(publicCompatibilityAfterDeleteResponse.status, 200);
  assert.equal(
    publicCompatibilityAfterDeleteResponse.json?.data?.games?.some(
      (entry) => entry.id === gameId,
    ),
    false,
  );

  const deletePhraseResponse = await user.request({
    path: `/api/study-items/${phraseItemId}`,
    method: "DELETE",
  });

  assert.equal(deletePhraseResponse.status, 200);
  assert.equal(deletePhraseResponse.json?.data?.deleted, true);

  const phrasesAfterDeleteResponse = await user.request({
    path: "/api/dashboard/phrases",
  });
  assert.equal(phrasesAfterDeleteResponse.status, 200);
  assert.equal(
    phrasesAfterDeleteResponse.json?.data?.phrases?.some((entry) => entry.id === phraseItemId),
    false,
  );
});

test("admin runtime settings affect registration, maintenance access, and admin bypass", async () => {
  const user = app.createClient();
  const admin = app.createClient();
  const guest = app.createClient();
  const userEmail = "carol.runtime@example.com";
  const userPassword = "runtime-super-secret-123";
  let adminLoggedIn = false;

  try {
    const registerResponse = await user.request({
      path: "/api/auth/register",
      method: "POST",
      json: {
        name: "Carol Runtime",
        email: userEmail,
        password: userPassword,
      },
    });

    assert.equal(registerResponse.status, 200);

    const activationFileResponse = await user.request({
      path: "/api/dashboard/activation-file",
    });
    assert.equal(activationFileResponse.status, 200);

    const activationPayload = JSON.parse(activationFileResponse.text);
    const activateDeviceResponse = await user.request({
      path: "/api/mod/activate",
      method: "POST",
      json: {
        activationKey: activationPayload.activationKey,
        deviceLabel: "Runtime Device",
      },
    });

    assert.equal(activateDeviceResponse.status, 200);
    const deviceToken = activateDeviceResponse.json?.data?.deviceToken;
    assert.ok(deviceToken);

    const adminLoginResponse = await admin.request({
      path: "/api/auth/login",
      method: "POST",
      json: {
        email: app.bootstrapAdmin.email,
        password: app.bootstrapAdmin.password,
      },
    });

    assert.equal(adminLoginResponse.status, 200);
    adminLoggedIn = true;

    const closeRegistrationResponse = await admin.request({
      path: "/api/admin/settings",
      method: "POST",
      json: {
        registrationOpen: false,
      },
    });

    assert.equal(closeRegistrationResponse.status, 200);
    assert.equal(closeRegistrationResponse.json?.data?.registrationOpen, false);
    assert.equal(closeRegistrationResponse.json?.data?.maintenanceMode, false);

    const blockedRegisterResponse = await guest.request({
      path: "/api/auth/register",
      method: "POST",
      json: {
        name: "Denied Register",
        email: "denied.register@example.com",
        password: "blocked-register-123",
      },
    });

    assert.equal(blockedRegisterResponse.status, 403);
    assert.equal(blockedRegisterResponse.json?.errorCode, "REGISTRATION_CLOSED");

    const enableMaintenanceResponse = await admin.request({
      path: "/api/admin/settings",
      method: "POST",
      json: {
        maintenanceMode: true,
      },
    });

    assert.equal(enableMaintenanceResponse.status, 200);
    assert.equal(enableMaintenanceResponse.json?.data?.maintenanceMode, true);
    assert.equal(enableMaintenanceResponse.json?.data?.registrationOpen, false);

    const blockedOverviewResponse = await user.request({
      path: "/api/dashboard/overview",
    });

    assert.equal(blockedOverviewResponse.status, 503);
    assert.equal(blockedOverviewResponse.json?.errorCode, "MAINTENANCE_MODE");

    const blockedBootstrapResponse = await guest.request({
      path: "/api/mod/bootstrap",
      headers: {
        "x-device-token": deviceToken,
      },
    });

    assert.equal(blockedBootstrapResponse.status, 503);
    assert.equal(blockedBootstrapResponse.json?.errorCode, "MAINTENANCE_MODE");

    const blockedLoginResponse = await guest.request({
      path: "/api/auth/login",
      method: "POST",
      json: {
        email: userEmail,
        password: userPassword,
      },
    });

    assert.equal(blockedLoginResponse.status, 503);
    assert.equal(blockedLoginResponse.json?.errorCode, "MAINTENANCE_MODE");

    const blockedPublicCompatibilityResponse = await guest.request({
      path: "/api/public/compatibility",
    });

    assert.equal(blockedPublicCompatibilityResponse.status, 503);
    assert.equal(
      blockedPublicCompatibilityResponse.json?.errorCode,
      "MAINTENANCE_MODE",
    );

    const adminDashboardResponse = await admin.request({
      path: "/api/admin/dashboard",
    });

    assert.equal(adminDashboardResponse.status, 200);

    const adminSettingsResponse = await admin.request({
      path: "/api/admin/settings",
    });

    assert.equal(adminSettingsResponse.status, 200);
    assert.equal(
      adminSettingsResponse.json?.data?.adminSettings?.maintenanceMode,
      true,
    );
    assert.equal(
      adminSettingsResponse.json?.data?.adminSettings?.registrationOpen,
      false,
    );
  } finally {
    if (adminLoggedIn) {
      const resetResponse = await admin.request({
        path: "/api/admin/settings",
        method: "POST",
        json: {
          maintenanceMode: false,
          registrationOpen: true,
        },
      });

      assert.equal(resetResponse.status, 200);
      assert.equal(resetResponse.json?.data?.maintenanceMode, false);
      assert.equal(resetResponse.json?.data?.registrationOpen, true);
    }
  }
});

test("expanded admin settings drive limits, backups, and admin alerts", async () => {
  const admin = app.createClient();
  const user = app.createClient();
  let adminLoggedIn = false;

  try {
    const adminLoginResponse = await admin.request({
      path: "/api/auth/login",
      method: "POST",
      json: {
        email: app.bootstrapAdmin.email,
        password: app.bootstrapAdmin.password,
      },
    });

    assert.equal(adminLoginResponse.status, 200);
    adminLoggedIn = true;

    const saveSettingsResponse = await admin.request({
      path: "/api/admin/settings",
      method: "POST",
      json: {
        defaultDailyLimit: {
          free: 1,
        },
        maxDictionarySize: {
          free: 1,
        },
        apiTimeoutSec: 3,
        autoBackup: true,
        backupTime: "00:00",
        adminNotifications: true,
        errorAlerts: true,
        registrationOpen: true,
        maintenanceMode: false,
      },
    });

    assert.equal(saveSettingsResponse.status, 200);
    assert.equal(saveSettingsResponse.json?.data?.defaultDailyLimit?.free, 1);
    assert.equal(saveSettingsResponse.json?.data?.maxDictionarySize?.free, 1);
    assert.equal(saveSettingsResponse.json?.data?.apiTimeoutSec, 3);
    assert.equal(saveSettingsResponse.json?.data?.autoBackup, true);
    assert.equal(saveSettingsResponse.json?.data?.backupTime, "00:00");
    assert.equal(saveSettingsResponse.json?.data?.adminNotifications, true);
    assert.equal(saveSettingsResponse.json?.data?.errorAlerts, true);

    const adminSettingsResponse = await admin.request({
      path: "/api/admin/settings",
    });

    assert.equal(adminSettingsResponse.status, 200);
    assert.equal(
      adminSettingsResponse.json?.data?.adminSettings?.defaultDailyLimit?.free,
      1,
    );
    assert.equal(
      adminSettingsResponse.json?.data?.adminSettings?.maxDictionarySize?.free,
      1,
    );
    assert.equal(
      adminSettingsResponse.json?.data?.adminSettings?.apiTimeoutSec,
      3,
    );
    assert.equal(
      adminSettingsResponse.json?.data?.adminSettings?.autoBackup,
      true,
    );
    assert.equal(
      adminSettingsResponse.json?.data?.adminSettings?.backupTime,
      "00:00",
    );

    const backupStatusBeforeResponse = await admin.request({
      path: "/api/admin/backups",
    });

    assert.equal(backupStatusBeforeResponse.status, 200);
    assert.equal(backupStatusBeforeResponse.json?.data?.lastSuccessAt, null);
    assert.equal(
      typeof backupStatusBeforeResponse.json?.data?.nextDueAt,
      "string",
    );

    const registerResponse = await user.request({
      path: "/api/auth/register",
      method: "POST",
      json: {
        name: "Dora Expanded Settings",
        email: "dora.expanded@example.com",
        password: "expanded-settings-123",
      },
    });

    assert.equal(registerResponse.status, 200);

    const activationFileResponse = await user.request({
      path: "/api/dashboard/activation-file",
    });
    assert.equal(activationFileResponse.status, 200);

    const activationPayload = JSON.parse(activationFileResponse.text);
    const activateDeviceResponse = await user.request({
      path: "/api/mod/activate",
      method: "POST",
      json: {
        activationKey: activationPayload.activationKey,
        deviceLabel: "Expanded Runtime Device",
      },
    });

    assert.equal(activateDeviceResponse.status, 200);
    const deviceToken = activateDeviceResponse.json?.data?.deviceToken;
    assert.ok(deviceToken);

    const bootstrapResponse = await user.request({
      path: "/api/mod/bootstrap",
      headers: {
        "x-device-token": deviceToken,
      },
    });

    assert.equal(bootstrapResponse.status, 200);
    assert.equal(bootstrapResponse.json?.data?.usage?.limit, 1);

    const planResponse = await user.request({
      path: "/api/dashboard/plan",
    });

    assert.equal(planResponse.status, 200);
    assert.equal(planResponse.json?.data?.currentPlan?.translationsLimit, 1);
    assert.equal(planResponse.json?.data?.currentPlan?.wordsLimit, 1);

    const firstSaveResponse = await user.request({
      path: "/api/mod/items",
      method: "POST",
      headers: {
        "x-device-token": deviceToken,
      },
      json: {
        kind: "word",
        text: "reluctant",
        translation: "неохотный",
        note: "first dictionary item under custom limit",
        contextOriginal: "He felt reluctant to continue.",
        contextTranslation: "Он неохотно продолжал.",
        novelTitle: "Expanded Settings Novel",
      },
    });

    assert.equal(firstSaveResponse.status, 200);

    const secondSaveResponse = await user.request({
      path: "/api/mod/items",
      method: "POST",
      headers: {
        "x-device-token": deviceToken,
      },
      json: {
        kind: "word",
        text: "despair",
        translation: "отчаяние",
        note: "should exceed dictionary limit",
        contextOriginal: "There was despair in the room.",
        contextTranslation: "В комнате было отчаяние.",
        novelTitle: "Expanded Settings Novel",
      },
    });

    assert.equal(secondSaveResponse.status, 409);
    assert.equal(
      secondSaveResponse.json?.errorCode,
      "DICTIONARY_LIMIT_REACHED",
    );

    const supportTicketResponse = await user.request({
      path: "/api/dashboard/support",
      method: "POST",
      json: {
        subject: "Expanded settings alert check",
        category: "mod",
        message: "Please leave this ticket open so the admin alert stays visible.",
      },
    });

    assert.equal(supportTicketResponse.status, 200);

    const adminDashboardWithAlertsResponse = await admin.request({
      path: "/api/admin/dashboard",
    });

    assert.equal(adminDashboardWithAlertsResponse.status, 200);
    assert.equal(
      adminDashboardWithAlertsResponse.json?.data?.alerts?.some((entry) =>
        typeof entry === "string" && entry.includes("поддерж"),
      ),
      true,
    );
    assert.equal(
      adminDashboardWithAlertsResponse.json?.data?.alerts?.some((entry) =>
        typeof entry === "string" && entry.includes("Yandex Cloud"),
      ),
      true,
    );

    const runBackupResponse = await admin.request({
      path: "/api/admin/backups",
      method: "POST",
    });

    assert.equal(runBackupResponse.status, 200);
    assert.equal(runBackupResponse.json?.data?.lastTrigger, "manual");
    assert.equal(typeof runBackupResponse.json?.data?.lastSuccessAt, "string");
    assert.equal(
      runBackupResponse.json?.data?.lastFileName?.startsWith("nvltrnslt-backup-"),
      true,
    );

    const disableAlertsResponse = await admin.request({
      path: "/api/admin/settings",
      method: "POST",
      json: {
        adminNotifications: false,
        errorAlerts: false,
      },
    });

    assert.equal(disableAlertsResponse.status, 200);
    assert.equal(disableAlertsResponse.json?.data?.adminNotifications, false);
    assert.equal(disableAlertsResponse.json?.data?.errorAlerts, false);

    const adminDashboardWithoutAlertsResponse = await admin.request({
      path: "/api/admin/dashboard",
    });

    assert.equal(adminDashboardWithoutAlertsResponse.status, 200);
    assert.equal(
      adminDashboardWithoutAlertsResponse.json?.data?.alerts?.some((entry) =>
        typeof entry === "string" && entry.includes("поддерж"),
      ),
      false,
    );
    assert.equal(
      adminDashboardWithoutAlertsResponse.json?.data?.alerts?.some((entry) =>
        typeof entry === "string" && entry.includes("Yandex Cloud"),
      ),
      false,
    );
  } finally {
    if (adminLoggedIn) {
      const resetResponse = await admin.request({
        path: "/api/admin/settings",
        method: "POST",
        json: {
          defaultDailyLimit: {
            free: 100,
            basic: 300,
            extended: null,
          },
          maxDictionarySize: {
            free: 500,
            basic: 2000,
            extended: null,
          },
          apiTimeoutSec: 8,
          autoBackup: false,
          backupTime: "03:00",
          adminNotifications: true,
          errorAlerts: true,
          registrationOpen: true,
          maintenanceMode: false,
        },
      });

      assert.equal(resetResponse.status, 200);
    }
  }
});

test("security hardening adds headers and rate limits auth and mod endpoints", async () => {
  const guest = app.createClient();
  const forwardedFor = "203.0.113.25";

  const loginPageResponse = await guest.request({
    path: "/auth/login",
  });

  assert.equal(loginPageResponse.status, 200);
  assert.equal(
    loginPageResponse.headers.get("x-robots-tag"),
    "noindex, nofollow, noarchive",
  );
  assert.equal(
    (loginPageResponse.headers.get("cache-control") ?? "").includes("no-cache"),
    true,
  );

  const healthResponse = await guest.request({
    path: "/api/health",
  });

  assert.equal(healthResponse.status, 200);
  assert.equal(
    healthResponse.headers.get("x-content-type-options"),
    "nosniff",
  );
  assert.equal(healthResponse.headers.get("x-frame-options"), "DENY");
  assert.equal(
    healthResponse.headers.get("content-security-policy")?.includes("default-src 'none'"),
    true,
  );
  assert.equal(
    healthResponse.headers.get("x-robots-tag"),
    "noindex, nofollow, noarchive",
  );
  assert.equal(
    healthResponse.headers.get("cache-control"),
    "no-store, no-cache, must-revalidate",
  );

  const faqResponse = await guest.request({
    path: "/faq",
  });

  assert.equal(faqResponse.status, 200);
  assert.equal(faqResponse.headers.get("x-frame-options"), "DENY");
  assert.equal(
    faqResponse.headers.get("content-security-policy")?.includes("default-src 'self'"),
    true,
  );

  const registerResponse = await guest.request({
    path: "/api/auth/register",
    method: "POST",
    headers: {
      "x-forwarded-for": "198.51.100.81",
    },
    json: {
      name: "Security Test User",
      email: "security.user@example.com",
      password: "security-password-123",
    },
  });

  assert.equal(registerResponse.status, 200);
  assert.equal(
    registerResponse.headers.get("cache-control"),
    "private, no-store, max-age=0",
  );
  assert.equal(
    registerResponse.headers.get("x-robots-tag"),
    "noindex, nofollow, noarchive",
  );

  const registerSetCookie = (
    registerResponse.headers.getSetCookie?.().join("; ") ??
    registerResponse.headers.get("set-cookie") ??
    ""
  );
  assert.equal(registerSetCookie.includes("HttpOnly"), true);

  const sessionResponse = await guest.request({
    path: "/api/session",
  });

  assert.equal(sessionResponse.status, 200);
  assert.equal(
    sessionResponse.headers.get("cache-control"),
    "private, no-store, max-age=0",
  );
  assert.equal(
    sessionResponse.headers.get("x-robots-tag"),
    "noindex, nofollow, noarchive",
  );

  const externalMetricsResponse = await guest.request({
    path: "/api/metrics",
    headers: {
      "x-forwarded-for": "198.51.100.70",
    },
  });

  assert.equal(externalMetricsResponse.status, 403);
  assert.equal(
    externalMetricsResponse.text.includes("metrics endpoint is restricted"),
    true,
  );

  const logoutSecurityUserResponse = await guest.request({
    path: "/api/auth/logout",
    method: "POST",
  });

  assert.equal(logoutSecurityUserResponse.status, 200);

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const loginResponse = await guest.request({
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "x-forwarded-for": forwardedFor,
      },
      json: {
        email: "ratelimit@example.com",
        password: "wrong-password",
      },
    });

    assert.equal(loginResponse.status, 401);
  }

  const limitedLoginResponse = await guest.request({
    path: "/api/auth/login",
    method: "POST",
    headers: {
      "x-forwarded-for": forwardedFor,
    },
    json: {
      email: "ratelimit@example.com",
      password: "wrong-password",
    },
  });

  assert.equal(limitedLoginResponse.status, 429);
  assert.equal(limitedLoginResponse.json?.errorCode, "RATE_LIMITED");
  assert.equal(
    Number(limitedLoginResponse.headers.get("retry-after")) >= 1,
    true,
  );

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const activateResponse = await guest.request({
      path: "/api/mod/activate",
      method: "POST",
      headers: {
        "x-forwarded-for": "198.51.100.40",
      },
      json: {
        activationKey: "NVLKEY-INVALID-INVALID-INVALID",
        deviceLabel: `Rate Limit Device ${attempt}`,
      },
    });

    assert.equal(activateResponse.status, 400);
  }

  const limitedActivateResponse = await guest.request({
    path: "/api/mod/activate",
    method: "POST",
    headers: {
      "x-forwarded-for": "198.51.100.40",
    },
    json: {
      activationKey: "NVLKEY-INVALID-INVALID-INVALID",
      deviceLabel: "Rate Limit Device Final",
    },
  });

  assert.equal(limitedActivateResponse.status, 429);
  assert.equal(limitedActivateResponse.json?.errorCode, "RATE_LIMITED");
});

test("observability exposes health, readiness, metrics, and dashboard summary", async () => {
  const guest = app.createClient();
  const admin = app.createClient();

  const healthResponse = await guest.request({
    path: "/api/health",
  });

  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.json?.status, "ok");
  assert.equal(healthResponse.json?.checks?.database?.status, "ok");

  const readinessResponse = await guest.request({
    path: "/api/ready",
  });

  assert.equal(readinessResponse.status, 200);
  assert.equal(readinessResponse.json?.status, "ready");
  assert.equal(readinessResponse.json?.checks?.database?.status, "ok");
  assert.equal(readinessResponse.json?.checks?.backupStorage?.status, "ok");
  assert.equal(readinessResponse.json?.checks?.config?.status, "ok");
  assert.equal(Array.isArray(readinessResponse.json?.warnings), true);

  const metricsResponse = await guest.request({
    path: "/api/metrics",
  });

  assert.equal(metricsResponse.status, 200);
  assert.equal(
    metricsResponse.headers.get("content-type")?.includes("text/plain"),
    true,
  );
  assert.equal(
    metricsResponse.text.includes("nvltrnslt_health_status"),
    true,
  );
  assert.equal(
    metricsResponse.text.includes("nvltrnslt_readiness_status"),
    true,
  );
  assert.equal(
    metricsResponse.text.includes("nvltrnslt_observability_scrape_success 1"),
    true,
  );
  assert.equal(
    metricsResponse.text.includes("nvltrnslt_users_total"),
    true,
  );

  const adminLoginResponse = await admin.request({
    path: "/api/auth/login",
    method: "POST",
    json: {
      email: app.bootstrapAdmin.email,
      password: app.bootstrapAdmin.password,
    },
  });

  assert.equal(adminLoginResponse.status, 200);

  const adminDashboardResponse = await admin.request({
    path: "/api/admin/dashboard",
  });

  assert.equal(adminDashboardResponse.status, 200);
  assert.equal(adminDashboardResponse.json?.ok, true);
  assert.equal(
    adminDashboardResponse.json?.data?.observability?.health?.status,
    "ok",
  );
  assert.equal(
    adminDashboardResponse.json?.data?.observability?.readiness?.status,
    "ready",
  );
  assert.equal(
    typeof adminDashboardResponse.json?.data?.observability?.recentErrors15m,
    "number",
  );
  assert.equal(
    Array.isArray(
      adminDashboardResponse.json?.data?.observability?.readiness?.warnings,
    ),
    true,
  );
});
