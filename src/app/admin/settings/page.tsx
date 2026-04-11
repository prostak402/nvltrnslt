"use client";

import { useState } from "react";
import {
  Shield,
  Users,
  Globe,
  Bell,
  Save,
  Plus,
  Trash2,
  Key,
  Database,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const mockAdmins = [
  { id: 1, name: "Главный администратор", email: "admin@nvltranslate.com", role: "superadmin", lastLogin: "10.04.2026 10:42" },
  { id: 2, name: "Модератор поддержки", email: "support@nvltranslate.com", role: "support", lastLogin: "10.04.2026 09:15" },
  { id: 3, name: "Контент-менеджер", email: "content@nvltranslate.com", role: "content", lastLogin: "08.04.2026 14:30" },
];

const roleLabels: Record<string, string> = {
  superadmin: "Суперадмин",
  admin: "Администратор",
  support: "Поддержка",
  content: "Контент",
};

const roleBadgeVariant: Record<string, "danger" | "accent" | "warning" | "default"> = {
  superadmin: "danger",
  admin: "accent",
  support: "warning",
  content: "default",
};

export default function AdminSettingsPage() {
  const [defaultLimit, setDefaultLimit] = useState({ free: 50, basic: 150, extended: 500 });
  const [maxDictSize, setMaxDictSize] = useState({ free: 100, basic: 1000, extended: 0 });
  const [apiTimeout, setApiTimeout] = useState(5);
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupTime, setBackupTime] = useState("03:00");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [adminNotifications, setAdminNotifications] = useState(true);
  const [errorAlerts, setErrorAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Настройки администрирования</h1>

      <div className="space-y-6 max-w-3xl">
        {/* Admin accounts */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-foreground-secondary" />
              <h2 className="text-lg font-semibold">Администраторы</h2>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm transition-colors">
              <Plus className="w-4 h-4" /> Добавить
            </button>
          </div>
          <div className="space-y-3">
            {mockAdmins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-3 bg-background-hover/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-background-card border border-border flex items-center justify-center text-sm font-bold text-foreground-muted">
                    {admin.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{admin.name}</p>
                      <Badge variant={roleBadgeVariant[admin.role]}>{roleLabels[admin.role]}</Badge>
                    </div>
                    <p className="text-xs text-foreground-muted">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-foreground-muted hidden sm:block">Вход: {admin.lastLogin}</span>
                  {admin.role !== "superadmin" && (
                    <button className="p-1.5 rounded hover:bg-danger-light text-foreground-muted hover:text-danger transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Global limits */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Глобальные лимиты</h2>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground-secondary">Дневной лимит переводов</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Бесплатный</label>
                <input
                  type="number"
                  value={defaultLimit.free}
                  onChange={(e) => setDefaultLimit({ ...defaultLimit, free: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background-hover border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Базовый</label>
                <input
                  type="number"
                  value={defaultLimit.basic}
                  onChange={(e) => setDefaultLimit({ ...defaultLimit, basic: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background-hover border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Расширенный</label>
                <input
                  type="number"
                  value={defaultLimit.extended}
                  onChange={(e) => setDefaultLimit({ ...defaultLimit, extended: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background-hover border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <h3 className="text-sm font-medium text-foreground-secondary pt-2">Максимальный размер словаря</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Бесплатный</label>
                <input
                  type="number"
                  value={maxDictSize.free}
                  onChange={(e) => setMaxDictSize({ ...maxDictSize, free: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background-hover border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Базовый</label>
                <input
                  type="number"
                  value={maxDictSize.basic}
                  onChange={(e) => setMaxDictSize({ ...maxDictSize, basic: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background-hover border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Расширенный (0 = без лимита)</label>
                <input
                  type="number"
                  value={maxDictSize.extended}
                  onChange={(e) => setMaxDictSize({ ...maxDictSize, extended: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background-hover border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* API & System */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">API и система</h2>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm">Таймаут запроса перевода (сек)</label>
                <span className="text-sm font-medium text-accent">{apiTimeout}с</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={apiTimeout}
                onChange={(e) => setApiTimeout(Number(e.target.value))}
                className="w-full h-2 bg-background-hover rounded-full appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-xs text-foreground-muted mt-1">
                <span>1с</span>
                <span>15с</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Регистрация открыта</p>
                <p className="text-xs text-foreground-muted mt-0.5">Новые пользователи могут создавать аккаунты</p>
              </div>
              <button
                onClick={() => setRegistrationOpen(!registrationOpen)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center ${registrationOpen ? "bg-success justify-end" : "bg-background-hover justify-start"}`}
              >
                <span className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm flex items-center gap-2">
                  Режим обслуживания
                  {maintenanceMode && <Badge variant="warning">Активен</Badge>}
                </p>
                <p className="text-xs text-foreground-muted mt-0.5">Сайт будет недоступен для пользователей</p>
              </div>
              <button
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center ${maintenanceMode ? "bg-warning justify-end" : "bg-background-hover justify-start"}`}
              >
                <span className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
              </button>
            </div>
          </div>
        </Card>

        {/* Backup */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Резервные копии</h2>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Автоматический бэкап</p>
                <p className="text-xs text-foreground-muted mt-0.5">Ежедневное резервное копирование базы данных</p>
              </div>
              <button
                onClick={() => setAutoBackup(!autoBackup)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center ${autoBackup ? "bg-accent justify-end" : "bg-background-hover justify-start"}`}
              >
                <span className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
              </button>
            </div>

            {autoBackup && (
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-foreground-muted" />
                <label className="text-sm text-foreground-secondary">Время бэкапа:</label>
                <input
                  type="time"
                  value={backupTime}
                  onChange={(e) => setBackupTime(e.target.value)}
                  className="px-3 py-1.5 bg-background-hover border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>
            )}

            <div className="p-3 bg-background-hover/50 rounded-lg text-sm">
              <p className="text-foreground-muted">Последний бэкап: <span className="text-foreground">09.04.2026 03:00</span></p>
              <p className="text-foreground-muted mt-1">Размер: <span className="text-foreground">2.4 GB</span></p>
            </div>

            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-background-hover transition-colors">
              <Database className="w-4 h-4" /> Создать бэкап сейчас
            </button>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Уведомления администратора</h2>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Уведомления о новых тикетах</p>
                <p className="text-xs text-foreground-muted mt-0.5">Email при создании нового обращения в поддержку</p>
              </div>
              <button
                onClick={() => setAdminNotifications(!adminNotifications)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center ${adminNotifications ? "bg-accent justify-end" : "bg-background-hover justify-start"}`}
              >
                <span className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Алерты об ошибках</p>
                <p className="text-xs text-foreground-muted mt-0.5">Уведомления при критических ошибках системы</p>
              </div>
              <button
                onClick={() => setErrorAlerts(!errorAlerts)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center ${errorAlerts ? "bg-danger justify-end" : "bg-background-hover justify-start"}`}
              >
                <span className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
              </button>
            </div>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="border-danger/30">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-danger" />
            <h2 className="text-lg font-semibold text-danger">Опасная зона</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-danger-light/30 rounded-lg">
              <div>
                <p className="text-sm font-medium">Очистить кэш переводов</p>
                <p className="text-xs text-foreground-muted mt-0.5">Удалит все кэшированные переводы. Новые переводы будут запрашиваться заново.</p>
              </div>
              <button className="px-3 py-1.5 text-sm border border-danger/50 text-danger rounded-lg hover:bg-danger-light transition-colors">
                Очистить
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-danger-light/30 rounded-lg">
              <div>
                <p className="text-sm font-medium">Сбросить все дневные лимиты</p>
                <p className="text-xs text-foreground-muted mt-0.5">Принудительно обнулит использованные переводы для всех пользователей.</p>
              </div>
              <button className="px-3 py-1.5 text-sm border border-danger/50 text-danger rounded-lg hover:bg-danger-light transition-colors">
                Сбросить
              </button>
            </div>
          </div>
        </Card>

        {/* Save */}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {saved ? "Сохранено!" : "Сохранить настройки"}
        </button>
      </div>
    </div>
  );
}
