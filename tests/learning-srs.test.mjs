import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import postgres from "postgres";

import { createTestApp } from "./helpers/test-app.mjs";

let app;

before(async () => {
  app = await createTestApp();
});

after(async () => {
  await app.close();
});

async function withSql(callback) {
  const sql = postgres(app.databaseUrl, {
    prepare: false,
    max: 1,
  });

  try {
    return await callback(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function registerAndActivateDevice({
  name,
  email,
  password,
}) {
  const client = app.createClient();

  const registerResponse = await client.request({
    path: "/api/auth/register",
    method: "POST",
    json: { name, email, password },
  });

  assert.equal(registerResponse.status, 200);

  const activationFileResponse = await client.request({
    path: "/api/dashboard/activation-file",
  });
  assert.equal(activationFileResponse.status, 200);

  const activationPayload = JSON.parse(activationFileResponse.text);
  const activateDeviceResponse = await client.request({
    path: "/api/mod/activate",
    method: "POST",
    json: {
      activationKey: activationPayload.activationKey,
      deviceLabel: `${name} Device`,
    },
  });

  assert.equal(activateDeviceResponse.status, 200);
  const deviceToken = activateDeviceResponse.json?.data?.deviceToken;
  assert.ok(deviceToken);

  return {
    client,
    deviceToken,
    activationKey: activationPayload.activationKey,
    userId: registerResponse.json?.data?.user?.id,
  };
}

async function saveModItem(client, deviceToken, overrides = {}) {
  const response = await client.request({
    path: "/api/mod/items",
    method: "POST",
    headers: {
      "x-device-token": deviceToken,
    },
    json: {
      kind: "word",
      text: "reluctant",
      translation: "неохотный",
      note: "test note",
      contextOriginal: "He felt reluctant to continue.",
      contextTranslation: "Он неохотно продолжил.",
      novelTitle: "SRS Novel",
      ...overrides,
    },
  });

  assert.equal(response.status, 200);
  return response.json?.data?.itemId;
}

async function fetchStudyItem(itemId) {
  return withSql(async (sql) => {
    const [row] = await sql`
      select
        id,
        status,
        is_active,
        learning_stage,
        activated_at,
        last_answer_at,
        correct_streak,
        wrong_count,
        repetitions,
        next_review_at
      from study_items
      where id = ${itemId}
    `;
    return row;
  });
}

async function updateStudyItemRow(itemId, values) {
  await withSql(async (sql) => {
    await sql.unsafe(
      `update study_items set ${Object.keys(values)
        .map((key, offset) => `${key} = $${offset + 1}`)
        .join(", ")} where id = $${Object.keys(values).length + 1}`,
      [...Object.values(values), itemId],
    );
  });
}

test("daily queue activates only the configured number of new words", async () => {
  const { client, deviceToken } = await registerAndActivateDevice({
    name: "SRS Queue",
    email: "srs.queue@example.com",
    password: "queue-password-123",
  });

  const settingsResponse = await client.request({
    path: "/api/dashboard/settings",
    method: "POST",
    json: {
      dailyWords: 10,
      dailyNewWords: 2,
      prioritizeDifficult: true,
      includePhrases: true,
      autoSync: true,
      poorConnection: "queue",
      reminderEnabled: true,
      emailNotifications: true,
    },
  });
  assert.equal(settingsResponse.status, 200);

  for (let index = 0; index < 5; index += 1) {
    await saveModItem(client, deviceToken, {
      text: `queue-word-${index}`,
      translation: `перевод ${index}`,
    });
  }

  const beforeLearning = await withSql(async (sql) => {
    const rows = await sql`
      select count(*)::int as total, count(*) filter (where is_active) ::int as active
      from study_items
      where text like 'queue-word-%'
    `;
    return rows[0];
  });

  assert.equal(beforeLearning.total, 5);
  assert.equal(beforeLearning.active, 0);

  const learningResponse = await client.request({
    path: "/api/dashboard/learning",
  });

  assert.equal(learningResponse.status, 200);
  assert.equal(learningResponse.json?.data?.summary?.newCount, 2);
  assert.equal(learningResponse.json?.data?.cards?.length, 2);

  const afterLearning = await withSql(async (sql) => {
    const rows = await sql`
      select
        count(*)::int as total,
        count(*) filter (where is_active)::int as active,
        count(*) filter (where not is_active)::int as inactive
      from study_items
      where text like 'queue-word-%'
    `;
    return rows[0];
  });

  assert.equal(afterLearning.total, 5);
  assert.equal(afterLearning.active, 2);
  assert.equal(afterLearning.inactive, 3);
});

test("cloze uses stored context word position and keeps the real word form from the sentence", async () => {
  const { client, deviceToken } = await registerAndActivateDevice({
    name: "SRS Cloze Position",
    email: "srs.cloze.position@example.com",
    password: "cloze-position-password-123",
  });

  const itemId = await saveModItem(client, deviceToken, {
    text: "go",
    translation: "идти",
    contextOriginal: "She went home before sunset.",
    contextTranslation: "Она пошла домой до заката.",
    contextWordPosition: 2,
  });

  const learningResponse = await client.request({
    path: "/api/dashboard/learning",
  });

  assert.equal(learningResponse.status, 200);
  const card = learningResponse.json?.data?.cards?.find((entry) => entry.id === itemId);
  assert.ok(card);
  assert.equal(card.hasCloze, true);
  assert.equal(card.contextWordPosition, 2);
  assert.equal(card.clozeAnswer, "went");
  assert.equal(card.clozeText, "She ______ home before sunset.");
});

test("flashcards know advances stage 0 to 1 with next-day review", async () => {
  const { client, deviceToken } = await registerAndActivateDevice({
    name: "SRS Flashcards",
    email: "srs.flashcards@example.com",
    password: "flashcards-password-123",
  });

  const itemId = await saveModItem(client, deviceToken, {
    text: "flashcard-stage-zero",
    translation: "карточка ноль",
  });

  const learningResponse = await client.request({
    path: "/api/dashboard/learning",
  });
  assert.equal(learningResponse.status, 200);
  assert.equal(
    learningResponse.json?.data?.cards?.some((card) => card.id === itemId),
    true,
  );

  const reviewResponse = await client.request({
    path: "/api/dashboard/review",
    method: "POST",
    json: {
      itemId,
      rating: "know",
      taskType: "flashcards",
    },
  });

  assert.equal(reviewResponse.status, 200);
  assert.equal(reviewResponse.json?.data?.learningStage, 1);
  assert.equal(reviewResponse.json?.data?.status, "new");
  assert.equal(reviewResponse.json?.data?.isActive, true);

  const nextReviewAt = Date.parse(reviewResponse.json?.data?.nextReviewAt);
  const now = Date.now();
  assert.equal(nextReviewAt > now + 20 * 60 * 60 * 1000, true);
  assert.equal(nextReviewAt < now + 28 * 60 * 60 * 1000, true);
});

test("daily queue treats overstretched successful schedules as due by learning stage", async () => {
  const { client, deviceToken } = await registerAndActivateDevice({
    name: "SRS Stage Due",
    email: "srs.stage.due@example.com",
    password: "stage-due-password-123",
  });

  const itemId = await saveModItem(client, deviceToken, {
    text: "stage-due-item",
    translation: "этапное слово",
  });

  await updateStudyItemRow(itemId, {
    status: "new",
    is_active: true,
    learning_stage: 2,
    activated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    last_answer_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    correct_streak: 2,
    wrong_count: 0,
    repetitions: 2,
    next_review_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  });

  const learningResponse = await client.request({
    path: "/api/dashboard/learning",
  });

  assert.equal(learningResponse.status, 200);
  assert.equal(
    learningResponse.json?.data?.cards?.some((card) => card.id === itemId),
    true,
  );
});

test("unknown answer downgrades stage, while hard answer keeps current stage but marks difficult", async () => {
  const { client, deviceToken } = await registerAndActivateDevice({
    name: "SRS Ratings",
    email: "srs.ratings@example.com",
    password: "ratings-password-123",
  });

  const itemId = await saveModItem(client, deviceToken, {
    text: "rating-item",
    translation: "оценка",
  });

  await updateStudyItemRow(itemId, {
    status: "new",
    is_active: true,
    learning_stage: 2,
    activated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    correct_streak: 2,
    wrong_count: 0,
    repetitions: 2,
    next_review_at: new Date(Date.now() - 60 * 1000),
  });

  const unknownResponse = await client.request({
    path: "/api/dashboard/review",
    method: "POST",
    json: {
      itemId,
      rating: "unknown",
      taskType: "flashcards",
    },
  });

  assert.equal(unknownResponse.status, 200);
  assert.equal(unknownResponse.json?.data?.status, "hard");
  assert.equal(unknownResponse.json?.data?.learningStage, 1);

  await updateStudyItemRow(itemId, {
    status: "new",
    is_active: true,
    learning_stage: 2,
    activated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    correct_streak: 2,
    wrong_count: 0,
    repetitions: 2,
    next_review_at: new Date(Date.now() - 60 * 1000),
  });

  const hardResponse = await client.request({
    path: "/api/dashboard/review",
    method: "POST",
    json: {
      itemId,
      rating: "hard",
      taskType: "flashcards",
    },
  });

  assert.equal(hardResponse.status, 200);
  assert.equal(hardResponse.json?.data?.status, "hard");
  assert.equal(hardResponse.json?.data?.learningStage, 2);
});

test("pairs cannot mark a word learned, but strong review modes can after seven days", async () => {
  const { client, deviceToken } = await registerAndActivateDevice({
    name: "SRS Strong",
    email: "srs.strong@example.com",
    password: "strong-password-123",
  });

  const itemId = await saveModItem(client, deviceToken, {
    text: "strong-item",
    translation: "сильное слово",
  });

  const oldActivationDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

  await updateStudyItemRow(itemId, {
    status: "new",
    is_active: true,
    learning_stage: 3,
    activated_at: oldActivationDate,
    correct_streak: 3,
    wrong_count: 0,
    repetitions: 3,
    next_review_at: new Date(Date.now() - 60 * 1000),
  });

  const pairsResponse = await client.request({
    path: "/api/dashboard/review",
    method: "POST",
    json: {
      itemId,
      rating: "know",
      taskType: "pairs",
    },
  });

  assert.equal(pairsResponse.status, 200);
  assert.notEqual(pairsResponse.json?.data?.status, "learned");

  await updateStudyItemRow(itemId, {
    status: "new",
    is_active: true,
    learning_stage: 3,
    activated_at: oldActivationDate,
    correct_streak: 3,
    wrong_count: 0,
    repetitions: 3,
    next_review_at: new Date(Date.now() - 60 * 1000),
  });

  const strongResponse = await client.request({
    path: "/api/dashboard/review",
    method: "POST",
    json: {
      itemId,
      rating: "know",
      taskType: "ru_en_choice",
    },
  });

  assert.equal(strongResponse.status, 200);
  assert.equal(strongResponse.json?.data?.status, "learned");
  assert.equal(strongResponse.json?.data?.isActive, false);

  const learningAfterLearnedResponse = await client.request({
    path: "/api/dashboard/learning",
  });
  assert.equal(learningAfterLearnedResponse.status, 200);
  assert.equal(
    learningAfterLearnedResponse.json?.data?.cards?.some((card) => card.id === itemId),
    false,
  );
});

test("cloze strong reviews can finish a due card after seven days", async () => {
  const { client, deviceToken } = await registerAndActivateDevice({
    name: "SRS Cloze",
    email: "srs.cloze@example.com",
    password: "cloze-password-123",
  });

  const itemId = await saveModItem(client, deviceToken, {
    text: "reluctant",
    translation: "неохотный",
    contextOriginal: "I was reluctant to tell her the truth.",
    contextTranslation: "Я неохотно решился сказать ей правду.",
  });

  await updateStudyItemRow(itemId, {
    status: "new",
    is_active: true,
    learning_stage: 3,
    activated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    correct_streak: 3,
    wrong_count: 0,
    repetitions: 3,
    next_review_at: new Date(Date.now() - 60 * 1000),
  });

  const clozeResponse = await client.request({
    path: "/api/dashboard/review",
    method: "POST",
    json: {
      itemId,
      rating: "know",
      taskType: "cloze_choice",
    },
  });

  assert.equal(clozeResponse.status, 200);
  assert.equal(clozeResponse.json?.data?.status, "learned");
});

test("existing word re-save keeps SRS fields and direct learned patch is rejected", async () => {
  const { client, deviceToken } = await registerAndActivateDevice({
    name: "SRS Preserve",
    email: "srs.preserve@example.com",
    password: "preserve-password-123",
  });

  const itemId = await saveModItem(client, deviceToken, {
    text: "preserve-item",
    translation: "сохраняемое слово",
  });

  await updateStudyItemRow(itemId, {
    status: "hard",
    is_active: true,
    learning_stage: 2,
    activated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    correct_streak: 1,
    wrong_count: 3,
    repetitions: 5,
    next_review_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  });

  const resaveResponse = await client.request({
    path: "/api/mod/items",
    method: "POST",
    headers: {
      "x-device-token": deviceToken,
    },
    json: {
      kind: "word",
      text: "preserve-item",
      translation: "сохраняемое слово (обновлено)",
      note: "updated note",
      contextOriginal: "Preserve the staged progress.",
      contextTranslation: "Сохрани staged progress.",
      novelTitle: "SRS Novel",
    },
  });

  assert.equal(resaveResponse.status, 200);
  assert.equal(resaveResponse.json?.data?.itemId, itemId);

  const itemAfterResave = await fetchStudyItem(itemId);
  assert.equal(itemAfterResave.status, "hard");
  assert.equal(itemAfterResave.is_active, true);
  assert.equal(itemAfterResave.learning_stage, 2);
  assert.equal(itemAfterResave.wrong_count, 3);
  assert.equal(itemAfterResave.repetitions, 5);

  const patchLearnedResponse = await client.request({
    path: `/api/study-items/${itemId}`,
    method: "PATCH",
    json: {
      status: "learned",
    },
  });

  assert.equal(patchLearnedResponse.status, 400);
});
