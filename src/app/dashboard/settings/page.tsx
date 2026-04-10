"use client";

import { useState } from "react";
import { User, Globe, BookOpen, RefreshCw, Bell, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  const [email] = useState("alexey@example.com");
  const [dailyWords, setDailyWords] = useState(20);
  const [prioritizeDifficult, setPrioritizeDifficult] = useState(true);
  const [includePhrases, setIncludePhrases] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [poorConnection, setPoorConnection] = useState("queue");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>

      <div className="space-y-6 max-w-2xl">
        {/* Profile */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Профиль</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-foreground-secondary mb-1.5">Электронная почта</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full px-4 py-2.5 bg-background-hover border border-border rounded-lg text-foreground-muted cursor-not-allowed"
              />
            </div>
            <button className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-background-hover transition-colors">
              Сменить пароль
            </button>
          </div>
        </Card>

        {/* Language */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Язык интерфейса</h2>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2.5 bg-accent text-white rounded-lg text-sm">
              Русский
            </button>
            <button className="px-4 py-2.5 border border-border rounded-lg text-sm text-foreground-muted cursor-not-allowed">
              English <span className="text-xs ml-1 opacity-60">(скоро)</span>
            </button>
          </div>
        </Card>

        {/* Learning Settings */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Настройки обучения</h2>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm">Слов в дневной подборке</label>
                <span className="text-sm font-medium text-accent">{dailyWords}</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={dailyWords}
                onChange={(e) => setDailyWords(Number(e.target.value))}
                className="w-full h-2 bg-background-hover rounded-full appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-xs text-foreground-muted mt-1">
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Приоритет сложных слов</p>
                <p className="text-xs text-foreground-muted mt-0.5">Сложные слова будут появляться чаще в повторении</p>
              </div>
              <button
                onClick={() => setPrioritizeDifficult(!prioritizeDifficult)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center ${prioritizeDifficult ? "bg-accent justify-end" : "bg-background-hover justify-start"}`}
              >
                <span className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Включать фразы в повторение</p>
                <p className="text-xs text-foreground-muted mt-0.5">Фразы будут добавлены к ежедневным карточкам</p>
              </div>
              <button
                onClick={() => setIncludePhrases(!includePhrases)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center ${includePhrases ? "bg-accent justify-end" : "bg-background-hover justify-start"}`}
              >
                <span className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
              </button>
            </div>
          </div>
        </Card>

        {/* Sync Settings */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-5 h-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Настройки синхронизации</h2>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Автоматическая синхронизация</p>
                <p className="text-xs text-foreground-muted mt-0.5">Данные синхронизируются при каждом сохранении</p>
              </div>
              <button
                onClick={() => setAutoSync(!autoSync)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center ${autoSync ? "bg-accent justify-end" : "bg-background-hover justify-start"}`}
              >
                <span className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
              </button>
            </div>

            <div>
              <label className="block text-sm mb-1.5">Поведение при плохом интернете</label>
              <select
                value={poorConnection}
                onChange={(e) => setPoorConnection(e.target.value)}
                className="w-full px-4 py-2.5 bg-background-hover border border-border rounded-lg text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
              >
                <option value="queue">Складывать в очередь и отправить позже</option>
                <option value="retry">Повторять попытку автоматически</option>
                <option value="skip">Пропускать без синхронизации</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-foreground-secondary" />
            <h2 className="text-lg font-semibold">Уведомления</h2>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Напоминания о повторении</p>
                <p className="text-xs text-foreground-muted mt-0.5">Ежедневное напоминание о необходимости повторить слова</p>
              </div>
              <button
                onClick={() => setReminderEnabled(!reminderEnabled)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center ${reminderEnabled ? "bg-accent justify-end" : "bg-background-hover justify-start"}`}
              >
                <span className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Письма по аккаунту</p>
                <p className="text-xs text-foreground-muted mt-0.5">Уведомления об оплатах, изменениях тарифа и безопасности</p>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center ${emailNotifications ? "bg-accent justify-end" : "bg-background-hover justify-start"}`}
              >
                <span className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
              </button>
            </div>
          </div>
        </Card>

        {/* Save Button */}
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
