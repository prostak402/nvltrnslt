"use client";

import { useEffect, useState } from "react";
import { Bell, BookOpen, RefreshCw, Save, User } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { apiSend, getApiFieldError, useApiData } from "@/lib/client/api";
import type { DashboardSettingsResponse } from "@/lib/contracts/dashboard";

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const initialData: DashboardSettingsResponse = {
  email: "",
  dailyWords: 20,
  prioritizeDifficult: true,
  includePhrases: true,
  autoSync: true,
  poorConnection: "queue",
  reminderEnabled: true,
  emailNotifications: true,
};

const initialPasswordForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function SettingsPage() {
  const { data, loading, error, reload } = useApiData<DashboardSettingsResponse>(
    "/api/dashboard/settings",
    initialData,
  );
  const [form, setForm] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [passwordErrors, setPasswordErrors] = useState<
    Partial<Record<keyof PasswordForm, string>>
  >({});
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setForm(data);
  }, [data]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setMessage("");
      await apiSend("/api/dashboard/settings", "POST", form);
      await reload();
      setMessage("Настройки сохранены");
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось сохранить настройки",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      setIsChangingPassword(true);
      setPasswordMessage("");
      setPasswordErrors({});
      await apiSend("/api/dashboard/settings/password", "POST", passwordForm);
      setPasswordForm(initialPasswordForm);
      setPasswordMessage("Пароль обновлён");
    } catch (requestError) {
      setPasswordErrors({
        currentPassword:
          getApiFieldError(requestError, "currentPassword") ?? undefined,
        newPassword: getApiFieldError(requestError, "newPassword") ?? undefined,
        confirmPassword:
          getApiFieldError(requestError, "confirmPassword") ?? undefined,
      });
      setPasswordMessage(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось изменить пароль",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Настройки</h1>

      {error ? (
        <Card className="mb-6 border-danger/30 bg-danger/10 text-danger">
          Не удалось загрузить настройки: {error}
        </Card>
      ) : null}

      {message ? <p className="mb-4 text-sm text-foreground-secondary">{message}</p> : null}

      <div className="max-w-2xl space-y-6">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Профиль</h2>
          </div>
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm text-foreground-secondary">
                Электронная почта
              </label>
              <input
                type="email"
                value={form.email}
                readOnly
                className="w-full cursor-not-allowed rounded-lg border border-border bg-background-hover px-4 py-2.5 text-foreground-muted"
              />
            </div>

            <div className="border-t border-border pt-5">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-foreground">Смена пароля</h3>
                <p className="mt-1 text-xs text-foreground-muted">
                  Используйте текущий пароль, чтобы задать новый доступ к аккаунту.
                </p>
              </div>

              <div className="space-y-4">
                <PasswordField
                  id="currentPassword"
                  label="Текущий пароль"
                  value={passwordForm.currentPassword}
                  error={passwordErrors.currentPassword}
                  onChange={(value) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: value,
                    }))
                  }
                />

                <PasswordField
                  id="newPassword"
                  label="Новый пароль"
                  value={passwordForm.newPassword}
                  error={passwordErrors.newPassword}
                  onChange={(value) =>
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: value,
                    }))
                  }
                />

                <PasswordField
                  id="confirmPassword"
                  label="Подтверждение нового пароля"
                  value={passwordForm.confirmPassword}
                  error={passwordErrors.confirmPassword}
                  onChange={(value) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: value,
                    }))
                  }
                />
              </div>

              {passwordMessage ? (
                <p className="mt-4 text-sm text-foreground-secondary">{passwordMessage}</p>
              ) : null}

              <button
                type="button"
                onClick={() => void handlePasswordChange()}
                disabled={isChangingPassword || loading}
                className="mt-4 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-background-hover disabled:opacity-60"
              >
                {isChangingPassword ? "Обновляем пароль..." : "Обновить пароль"}
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Настройки обучения</h2>
          </div>
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm">Карточек в дневной подборке</label>
                <span className="text-sm font-medium text-accent">{form.dailyWords}</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={form.dailyWords}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dailyWords: Number(event.target.value),
                  }))
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-background-hover accent-accent"
              />
              <div className="mt-1 flex justify-between text-xs text-foreground-muted">
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            <ToggleRow
              title="Приоритет сложных слов"
              description="Сложные карточки будут чаще попадать в подборку"
              checked={form.prioritizeDifficult}
              onChange={() =>
                setForm((current) => ({
                  ...current,
                  prioritizeDifficult: !current.prioritizeDifficult,
                }))
              }
            />

            <ToggleRow
              title="Включать фразы в повторение"
              description="Фразы будут попадать в общую очередь обучения"
              checked={form.includePhrases}
              onChange={() =>
                setForm((current) => ({
                  ...current,
                  includePhrases: !current.includePhrases,
                }))
              }
            />
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Настройки синхронизации</h2>
          </div>
          <div className="space-y-5">
            <ToggleRow
              title="Автоматическая синхронизация"
              description="Мод будет отправлять данные на сайт сразу после сохранения"
              checked={form.autoSync}
              onChange={() =>
                setForm((current) => ({
                  ...current,
                  autoSync: !current.autoSync,
                }))
              }
            />

            <div>
              <label className="mb-1.5 block text-sm">Поведение при плохом интернете</label>
              <select
                value={form.poorConnection}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    poorConnection:
                      event.target.value as DashboardSettingsResponse["poorConnection"],
                  }))
                }
                className="w-full cursor-pointer appearance-none rounded-lg border border-border bg-background-hover px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              >
                <option value="queue">Складывать в очередь и отправлять позже</option>
                <option value="retry">Повторять попытку автоматически</option>
                <option value="skip">Пропускать без синхронизации</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Уведомления</h2>
          </div>
          <div className="space-y-5">
            <ToggleRow
              title="Напоминания о повторении"
              description="Ежедневное напоминание о новых карточках и due-словах"
              checked={form.reminderEnabled}
              onChange={() =>
                setForm((current) => ({
                  ...current,
                  reminderEnabled: !current.reminderEnabled,
                }))
              }
            />

            <ToggleRow
              title="Письма по аккаунту"
              description="Уведомления по тарифу, безопасности и статусу синхронизации"
              checked={form.emailNotifications}
              onChange={() =>
                setForm((current) => ({
                  ...current,
                  emailNotifications: !current.emailNotifications,
                }))
              }
            />
          </div>
        </Card>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || loading}
          className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Сохраняем..." : "Сохранить настройки"}
        </button>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: keyof PasswordForm;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-foreground-secondary">
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border px-4 py-2.5 text-foreground focus:border-accent focus:outline-none ${
          error ? "border-danger bg-danger/5" : "border-border bg-background-hover"
        }`}
      />
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm">{title}</p>
        <p className="mt-0.5 text-xs text-foreground-muted">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "justify-end bg-accent" : "justify-start bg-background-hover"
        }`}
      >
        <span className="mx-0.5 h-5 w-5 rounded-full bg-white shadow" />
      </button>
    </div>
  );
}
