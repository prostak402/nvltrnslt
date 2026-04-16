import { PLANS } from "@/lib/config";
import type { PlanId } from "@/lib/types";

export const studyStatusMeta = {
  new: { label: "Новое", variant: "accent" as const },
  hard: { label: "Сложное", variant: "warning" as const },
  learned: { label: "Выучено", variant: "success" as const },
};

export const ticketStatusMeta = {
  open: { label: "Открыт", variant: "accent" as const },
  in_progress: { label: "В работе", variant: "warning" as const },
  waiting: { label: "Ожидает", variant: "default" as const },
  resolved: { label: "Решён", variant: "success" as const },
  closed: { label: "Закрыт", variant: "default" as const },
};

export const compatibilityStatusMeta = {
  full: { label: "Полная", variant: "success" as const },
  partial: { label: "Частичная", variant: "warning" as const },
  testing: { label: "Тестируется", variant: "accent" as const },
  unsupported: { label: "Не поддерживается", variant: "danger" as const },
};

export const activityLevelMeta = {
  info: { label: "Инфо", variant: "default" as const },
  success: { label: "Успешно", variant: "success" as const },
  warning: { label: "Внимание", variant: "warning" as const },
  error: { label: "Ошибка", variant: "danger" as const },
  danger: { label: "Ошибка", variant: "danger" as const },
};

export const supportCategoryLabels = {
  mod: "Проблема с модом",
  sync: "Синхронизация",
  account: "Аккаунт",
  payment: "Оплата",
  feature: "Предложение",
  other: "Другое",
};

export function planLabel(plan: PlanId) {
  return PLANS[plan].label;
}

export function planTranslationLimit(plan: PlanId) {
  return PLANS[plan].dailyTranslations ?? "∞";
}

export function planDictionaryLimit(plan: PlanId) {
  return PLANS[plan].dictionaryLimit ?? "∞";
}

export function initials(name: string) {
  const [first = "", second = ""] = name.split(/\s+/);
  return `${first[0] ?? ""}${second[0] ?? ""}`.trim().toUpperCase() || "U";
}
