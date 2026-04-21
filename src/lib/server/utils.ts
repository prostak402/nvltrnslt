import crypto from "node:crypto";

export function nowIso() {
  return new Date().toISOString();
}

export function formatDateRu(input: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatDateTimeRu(input: string | Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof input === "string" ? new Date(input) : input);
}

export function formatRelativeDateRu(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  if (diffDays > 1 && diffDays <= 4) return `${diffDays} дня назад`;
  return formatDateRu(date);
}

export function startOfDayKey(input = new Date()) {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toISOString().slice(0, 10);
}

export function hasReachedReviewDay(
  reviewAt: string | Date | null | undefined,
  nowInput = new Date(),
) {
  if (!reviewAt) {
    return false;
  }

  const reviewDate = typeof reviewAt === "string" ? new Date(reviewAt) : reviewAt;
  if (Number.isNaN(reviewDate.getTime())) {
    return false;
  }

  return startOfDayKey(reviewDate) <= startOfDayKey(nowInput);
}

export function addHours(dateIso: string, hours: number) {
  const date = new Date(dateIso);
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  return date.toISOString();
}

export function addDays(dateIso: string, days: number) {
  const date = new Date(dateIso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function makeAccessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (count: number) =>
    Array.from({ length: count }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `NVL-${pick(4)}-${pick(4)}`;
}

export function makeActivationKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (count: number) =>
    Array.from({ length: count }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `NVLKEY-${pick(6)}-${pick(6)}-${pick(6)}`;
}

export function makeDeviceToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function makePasswordResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function normalizeStudyText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeWord(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/^[^a-zа-яё']+|[^a-zа-яё']+$/gi, "");
}

export function countTranslationUnits(text: string) {
  const matches = text.match(/[a-zа-яё0-9]+(?:['’-][a-zа-яё0-9]+)*/gi);
  return Math.max(matches?.length ?? 0, 1);
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
