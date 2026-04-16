"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  Clock3,
  Database,
  KeyRound,
  Save,
  Shield,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { apiSend, isApiError, useApiData } from "@/lib/client/api";
import { PLAN_ORDER, PLANS } from "@/lib/config";
import { initials } from "@/lib/client/presentation";
import type {
  AdminSettingsRecord,
  BackupStatusRecord,
  PlanId,
  UserRecord,
} from "@/lib/types";

type AdminUser = Omit<UserRecord, "passwordHash">;

type AdminSettingsResponse = {
  admins: AdminUser[];
  adminSettings: AdminSettingsRecord;
};

const initialSettings: AdminSettingsRecord = {
  defaultDailyLimit: {
    free: PLANS.free.dailyTranslations,
    basic: PLANS.basic.dailyTranslations,
    extended: PLANS.extended.dailyTranslations,
  },
  maxDictionarySize: {
    free: PLANS.free.dictionaryLimit,
    basic: PLANS.basic.dictionaryLimit,
    extended: PLANS.extended.dictionaryLimit,
  },
  apiTimeoutSec: 8,
  autoBackup: false,
  backupTime: "03:00",
  maintenanceMode: false,
  registrationOpen: true,
  adminNotifications: true,
  errorAlerts: true,
};

const initialData: AdminSettingsResponse = {
  admins: [],
  adminSettings: initialSettings,
};

const initialBackupStatus: BackupStatusRecord = {
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorMessage: "",
  lastFileName: "",
  lastFilePath: "",
  lastTrigger: "",
  nextDueAt: null,
};

function limitInputValue(value: number | null) {
  return value === null ? "0" : String(value);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "ещё не было";
  }

  return new Date(value).toLocaleString("ru-RU");
}

export default function AdminSettingsPage() {
  const { data, error, setData } = useApiData<AdminSettingsResponse>(
    "/api/admin/settings",
    initialData,
  );
  const {
    data: backupStatus,
    error: backupError,
    reload: reloadBackupStatus,
  } = useApiData<BackupStatusRecord>("/api/admin/backups", initialBackupStatus);
  const [draft, setDraft] = useState<AdminSettingsRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const settings = draft ?? data.adminSettings;

  function updateSettings(
    updater: (current: AdminSettingsRecord) => AdminSettingsRecord,
  ) {
    setDraft(updater(settings));
    setMessage(null);
  }

  function updatePlanLimit(
    key: "defaultDailyLimit" | "maxDictionarySize",
    planId: PlanId,
    rawValue: string,
  ) {
    const normalized = rawValue.trim();
    const nextValue =
      normalized === "" || normalized === "0"
        ? null
        : Math.max(0, Number.parseInt(normalized, 10) || 0);

    updateSettings((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [planId]: nextValue,
      },
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage(null);

      const next = await apiSend<AdminSettingsRecord>(
        "/api/admin/settings",
        "POST",
        settings,
      );

      setData((current) => ({ ...current, adminSettings: next }));
      setDraft(null);
      setMessage("Настройки сохранены.");
      await reloadBackupStatus();
    } catch (saveError) {
      setMessage(
        isApiError(saveError)
          ? saveError.message
          : saveError instanceof Error
            ? saveError.message
            : "Не удалось сохранить настройки.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRunBackup() {
    try {
      setRunningBackup(true);
      setMessage(null);
      await apiSend<BackupStatusRecord>("/api/admin/backups", "POST");
      await reloadBackupStatus();
      setMessage("Бэкап создан.");
    } catch (runError) {
      setMessage(
        isApiError(runError)
          ? runError.message
          : runError instanceof Error
            ? runError.message
            : "Не удалось создать бэкап.",
      );
    } finally {
      setRunningBackup(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Настройки администрирования</h1>

      {error ? (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Не удалось загрузить настройки: {error}
        </div>
      ) : null}

      {message ? (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            message === "Настройки сохранены." || message === "Бэкап создан."
              ? "border border-success/30 bg-success/10 text-success"
              : "border border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="max-w-5xl space-y-6">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-foreground-secondary" />
              <h2 className="text-lg font-semibold">Администраторы</h2>
            </div>
            <Badge variant="accent">Список активных аккаунтов</Badge>
          </div>
          <div className="space-y-3">
            {data.admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between rounded-lg bg-background-hover/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background-card text-sm font-bold text-foreground-muted">
                    {initials(admin.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{admin.name}</p>
                      <Badge variant="danger">Админ</Badge>
                    </div>
                    <p className="text-xs text-foreground-muted">{admin.email}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-foreground-muted">
                  <p>Последняя активность</p>
                  <p>{new Date(admin.lastActiveAt).toLocaleString("ru-RU")}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-foreground-secondary" />
            <div>
              <h2 className="text-lg font-semibold">Лимиты по тарифам</h2>
              <p className="text-sm text-foreground-muted">
                Эти значения переопределяют runtime-лимиты поверх базовых тарифов.
                Значение `0` означает безлимит.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <PlanLimitSection
              title="Дневной лимит единиц перевода"
              description="Используется в mod translate, dashboard и статистике аккаунта."
              value={settings.defaultDailyLimit}
              onChange={(planId, value) =>
                updatePlanLimit("defaultDailyLimit", planId, value)
              }
            />

            <PlanLimitSection
              title="Максимум карточек в словаре"
              description="Ограничивает сохранение новых карточек. Обновление уже существующих карточек остаётся доступно."
              value={settings.maxDictionarySize}
              onChange={(planId, value) =>
                updatePlanLimit("maxDictionarySize", planId, value)
              }
            />
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-foreground-secondary" />
            <div>
              <h2 className="text-lg font-semibold">Переводчик и доступ</h2>
              <p className="text-sm text-foreground-muted">
                Эти настройки влияют на timeout внешнего translation provider и доступность продукта.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Timeout запроса к переводчику</span>
                <span className="font-medium text-accent">{settings.apiTimeoutSec} сек</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={settings.apiTimeoutSec}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    apiTimeoutSec: Number(event.target.value),
                  }))
                }
                className="w-full cursor-pointer accent-accent"
              />
              <p className="mt-1 text-xs text-foreground-muted">
                Используется при запросе к внешнему провайдеру перевода.
              </p>
            </div>

            <ToggleRow
              title="Регистрация открыта"
              description="Если выключить, `/api/auth/register` перестанет создавать новые аккаунты."
              checked={settings.registrationOpen}
              onToggle={() =>
                updateSettings((current) => ({
                  ...current,
                  registrationOpen: !current.registrationOpen,
                }))
              }
              badge={
                settings.registrationOpen ? (
                  <Badge variant="success">Включена</Badge>
                ) : (
                  <Badge variant="warning">Закрыта</Badge>
                )
              }
            />

            <ToggleRow
              title="Режим обслуживания"
              description="Обычные пользователи и гости потеряют доступ к public pages, dashboard и mod API. Админы сохраняют доступ."
              checked={settings.maintenanceMode}
              onToggle={() =>
                updateSettings((current) => ({
                  ...current,
                  maintenanceMode: !current.maintenanceMode,
                }))
              }
              badge={
                settings.maintenanceMode ? (
                  <Badge variant="warning">Активен</Badge>
                ) : (
                  <Badge variant="default">Выключен</Badge>
                )
              }
            />
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-foreground-secondary" />
            <div>
              <h2 className="text-lg font-semibold">Бэкапы</h2>
              <p className="text-sm text-foreground-muted">
                Автобэкап проверяется через `/api/health`: после времени запуска он будет создан при ближайшем health-check.
              </p>
            </div>
          </div>

          {backupError ? (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              Не удалось загрузить статус бэкапов: {backupError}
            </div>
          ) : null}

          <div className="space-y-5">
            <ToggleRow
              title="Автоматический бэкап"
              description="Разрешает ежедневный автоматический backup snapshot в локальную папку сервера."
              checked={settings.autoBackup}
              onToggle={() =>
                updateSettings((current) => ({
                  ...current,
                  autoBackup: !current.autoBackup,
                }))
              }
              badge={
                settings.autoBackup ? (
                  <Badge variant="success">Включён</Badge>
                ) : (
                  <Badge variant="default">Выключен</Badge>
                )
              }
            />

            <div className="flex items-center gap-3">
              <Clock3 className="h-4 w-4 text-foreground-muted" />
              <label className="text-sm text-foreground-secondary" htmlFor="backupTime">
                Время ежедневного бэкапа
              </label>
              <input
                id="backupTime"
                type="time"
                value={settings.backupTime}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    backupTime: event.target.value,
                  }))
                }
                className="rounded-lg border border-border bg-background-hover px-3 py-1.5 text-sm"
              />
            </div>

            <div className="rounded-lg bg-background-hover/50 p-4 text-sm text-foreground-secondary">
              <p>Последний успешный бэкап: <span className="text-foreground">{formatDateTime(backupStatus.lastSuccessAt)}</span></p>
              <p className="mt-1">Последняя ошибка: <span className="text-foreground">{backupStatus.lastErrorAt ? `${formatDateTime(backupStatus.lastErrorAt)} — ${backupStatus.lastErrorMessage}` : "не было"}</span></p>
              <p className="mt-1">Следующее окно запуска: <span className="text-foreground">{formatDateTime(backupStatus.nextDueAt)}</span></p>
              <p className="mt-1">Последний файл: <span className="text-foreground">{backupStatus.lastFileName || "ещё не создан"}</span></p>
            </div>

            <button
              type="button"
              onClick={handleRunBackup}
              disabled={runningBackup}
              className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-background-hover disabled:opacity-70"
            >
              {runningBackup ? "Создаю бэкап..." : "Создать бэкап сейчас"}
            </button>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-foreground-secondary" />
            <div>
              <h2 className="text-lg font-semibold">Алерты админки</h2>
              <p className="text-sm text-foreground-muted">
                Эти флаги управляют in-app alerts в админке, а при настроенных `TELEGRAM_*` env
                также включают отправку уведомлений в Telegram.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <ToggleRow
              title="Уведомления администраторам"
              description="Создаёт admin-события о новых тикетах и показывает operational notices на дашборде. При настроенном Telegram эти уведомления также уходят во внешний канал."
              checked={settings.adminNotifications}
              onToggle={() =>
                updateSettings((current) => ({
                  ...current,
                  adminNotifications: !current.adminNotifications,
                }))
              }
              badge={
                settings.adminNotifications ? (
                  <Badge variant="success">Включены</Badge>
                ) : (
                  <Badge variant="default">Выключены</Badge>
                )
              }
            />

            <ToggleRow
              title="Алерты об ошибках"
              description="Показывает системные предупреждения по деградации переводчика и сбоям бэкапа на admin dashboard. При настроенном Telegram эти алерты также отправляются во внешний канал."
              checked={settings.errorAlerts}
              onToggle={() =>
                updateSettings((current) => ({
                  ...current,
                  errorAlerts: !current.errorAlerts,
                }))
              }
              badge={
                settings.errorAlerts ? (
                  <Badge variant="warning">Активны</Badge>
                ) : (
                  <Badge variant="default">Скрыты</Badge>
                )
              }
            />
          </div>
        </Card>

        <Card className="border-danger/30">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <h2 className="text-lg font-semibold text-danger">Осторожно с maintenance mode</h2>
          </div>
          <div className="space-y-2 text-sm text-foreground-secondary">
            <p>
              Если включить maintenance mode, обычные пользователи не смогут войти,
              открыть dashboard или пользоваться mod/API.
            </p>
            <p>
              Держите под рукой рабочий admin-аккаунт, чтобы не заблокировать себе доступ.
            </p>
          </div>
        </Card>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-white transition-colors hover:bg-accent-hover disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {saving ? "Сохраняю..." : "Сохранить настройки"}
        </button>
      </div>
    </div>
  );
}

function PlanLimitSection({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: Record<PlanId, number | null>;
  onChange: (planId: PlanId, value: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-foreground-muted">{description}</p>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {PLAN_ORDER.map((planId) => (
          <label
            key={planId}
            className="rounded-lg border border-border bg-background-hover/40 p-3"
          >
            <span className="mb-2 block text-xs text-foreground-muted">
              {PLANS[planId].label}
            </span>
            <input
              type="number"
              min={0}
              value={limitInputValue(value[planId])}
              onChange={(event) => onChange(planId, event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onToggle,
  badge,
}: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-sm">
          {title}
          {badge}
        </p>
        <p className="mt-0.5 text-xs text-foreground-muted">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "justify-end bg-accent" : "justify-start bg-background-hover"
        }`}
      >
        <span className="mx-0.5 h-5 w-5 rounded-full bg-white shadow" />
      </button>
    </div>
  );
}
