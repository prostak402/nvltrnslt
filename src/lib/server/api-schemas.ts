import "server-only";

import { z } from "zod";

import {
  COMPATIBILITY_STATUSES,
  REVIEW_RATINGS,
  STUDY_KINDS,
  STUDY_STATUSES,
  SUPPORT_CATEGORIES,
  TICKET_STATUSES,
} from "@/lib/config";

const nonEmptyString = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().max(max).optional();
const positiveInt = z.coerce.number().int().positive();
const nullableNonNegativeInt = z
  .union([z.coerce.number().int().min(0), z.null()])
  .transform((value) => (value === 0 ? null : value));
const backupTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

export const loginBodySchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(200),
});

export const registerBodySchema = z.object({
  name: nonEmptyString(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(200),
});

export const forgotPasswordBodySchema = z.object({
  email: z.string().trim().email().max(255),
});

export const resetPasswordBodySchema = z
  .object({
    token: z.string().trim().min(1).max(255),
    newPassword: z.string().min(6).max(200),
    confirmPassword: z.string().min(6).max(200),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Пароли не совпадают",
      });
    }
  });

export const reviewBodySchema = z.object({
  itemId: positiveInt,
  rating: z.enum(REVIEW_RATINGS),
});

export const dashboardSettingsBodySchema = z.object({
  dailyWords: z.coerce.number().int().min(5).max(50),
  prioritizeDifficult: z.boolean(),
  includePhrases: z.boolean(),
  autoSync: z.boolean(),
  poorConnection: z.enum(["queue", "retry", "skip"]),
  reminderEnabled: z.boolean(),
  emailNotifications: z.boolean(),
});

export const dashboardPasswordChangeBodySchema = z
  .object({
    currentPassword: z.string().min(6).max(200),
    newPassword: z.string().min(6).max(200),
    confirmPassword: z.string().min(6).max(200),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Пароли не совпадают",
      });
    }

    if (value.currentPassword === value.newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Новый пароль должен отличаться от текущего",
      });
    }
  });

export const supportTicketBodySchema = z.object({
  subject: nonEmptyString(180),
  category: z.enum(SUPPORT_CATEGORIES),
  message: nonEmptyString(10000),
});

export const adminCompatibilityBodySchema = z.object({
  id: positiveInt.optional(),
  name: nonEmptyString(180),
  renpyVersion: nonEmptyString(40),
  status: z.enum(COMPATIBILITY_STATUSES),
  comment: z.string().max(10000),
});

export const adminSettingsBodySchema = z
  .object({
    defaultDailyLimit: z
      .object({
        free: nullableNonNegativeInt.optional(),
        basic: nullableNonNegativeInt.optional(),
        extended: nullableNonNegativeInt.optional(),
      })
      .optional(),
    maxDictionarySize: z
      .object({
        free: nullableNonNegativeInt.optional(),
        basic: nullableNonNegativeInt.optional(),
        extended: nullableNonNegativeInt.optional(),
      })
      .optional(),
    apiTimeoutSec: z.coerce.number().int().min(1).max(30).optional(),
    autoBackup: z.boolean().optional(),
    backupTime: backupTimeSchema.optional(),
    maintenanceMode: z.boolean().optional(),
    registrationOpen: z.boolean().optional(),
    adminNotifications: z.boolean().optional(),
    errorAlerts: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Передайте хотя бы одно поле настройки",
  });

export const adminTicketReplyBodySchema = z.object({
  ticketId: positiveInt,
  text: nonEmptyString(10000),
  status: z.enum(TICKET_STATUSES).optional(),
});

export const modActivateBodySchema = z.object({
  activationKey: nonEmptyString(64),
  deviceLabel: z.string().trim().max(120).optional().default(""),
});

export const modItemBodySchema = z.object({
  kind: z.enum(STUDY_KINDS),
  text: nonEmptyString(10000),
  translation: z.string().max(10000),
  note: optionalText(10000),
  contextOriginal: optionalText(20000),
  contextTranslation: optionalText(20000),
  novelTitle: z.string().trim().max(180).optional(),
});

export const modLinkBodySchema = z
  .object({
    code: z.string().trim().max(24).optional(),
    activationKey: z.string().trim().max(64).optional(),
    deviceLabel: z.string().trim().max(120).optional().default(""),
  })
  .refine((value) => Boolean(value.code) || Boolean(value.activationKey), {
    message: "Укажите code или activationKey",
    path: ["code"],
  });

export const modTranslateBodySchema = z.object({
  text: nonEmptyString(10000),
});

export const studyItemPatchBodySchema = z
  .object({
    translation: z.string().max(10000).optional(),
    note: z.string().max(10000).optional(),
    status: z.enum(STUDY_STATUSES).optional(),
  })
  .refine(
    (value) =>
      value.translation !== undefined ||
      value.note !== undefined ||
      value.status !== undefined,
    {
      message: "Измените хотя бы одно поле",
    },
  );

export const itemIdParamsSchema = z.object({
  itemId: positiveInt,
});

export const gameIdParamsSchema = z.object({
  gameId: positiveInt,
});

export const deviceIdParamsSchema = z.object({
  deviceId: positiveInt,
});

export const deviceTokenSchema = z.string().trim().min(1).max(128);
