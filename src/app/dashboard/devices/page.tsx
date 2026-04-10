"use client";

import { useState } from "react";
import {
  Monitor,
  Copy,
  RefreshCw,
  Smartphone,
  Laptop,
  Unlink,
  Check,
  KeyRound,
  Download,
  Settings,
  Link2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { LucideIcon } from "lucide-react";

type Device = {
  id: number;
  name: string;
  icon: LucideIcon;
  lastActive: string;
  status: "active" | "inactive";
};

type SetupStep = {
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
};

const accessCode = "NVL-A7X9-K2M4";

const devices: Device[] = [
  {
    id: 1,
    name: "Samsung Galaxy S24",
    icon: Smartphone,
    lastActive: "Сейчас",
    status: "active",
  },
  {
    id: 2,
    name: "MacBook Pro",
    icon: Laptop,
    lastActive: "3 дня назад",
    status: "inactive",
  },
];

const setupSteps: SetupStep[] = [
  {
    step: 1,
    icon: Download,
    title: "Установите мод",
    description: "Скачайте и установите NVL Translate мод для вашей визуальной новеллы.",
  },
  {
    step: 2,
    icon: Settings,
    title: "Откройте настройки мода",
    description: "Запустите новеллу и найдите пункт NVL Translate в меню настроек.",
  },
  {
    step: 3,
    icon: KeyRound,
    title: "Введите код доступа",
    description: "Скопируйте код доступа выше и вставьте его в поле авторизации мода.",
  },
  {
    step: 4,
    icon: Link2,
    title: "Подтвердите привязку",
    description: "Нажмите «Подключить» — устройство появится в списке ниже.",
  },
];

export default function DevicesPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Monitor className="w-6 h-6 text-accent" />
          Устройства
        </h1>
        <p className="text-sm text-foreground-muted mt-1">
          Управляйте подключёнными устройствами и кодом доступа
        </p>
      </div>

      {/* Access code */}
      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-accent" />
          Код доступа
        </h2>
        <p className="text-sm text-foreground-muted mb-4">
          Используйте этот код для привязки новых устройств к вашему аккаунту.
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 bg-background-hover border border-border rounded-xl px-6 py-4">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-accent tracking-widest select-all">
              {accessCode}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? "Скопировано" : "Копировать"}
            </Button>
            <Button variant="ghost" size="md">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Обновить код
            </Button>
          </div>
        </div>
      </Card>

      {/* Connected devices */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Monitor className="w-5 h-5 text-accent" />
            Подключённые устройства
          </h2>
          <Badge variant="default">{devices.length} устройств</Badge>
        </div>
        <div className="space-y-3">
          {devices.map((device) => {
            const Icon = device.icon;
            return (
              <div
                key={device.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-background-hover border border-border/50"
              >
                <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{device.name}</p>
                  <p className="text-xs text-foreground-muted">
                    Последняя активность: {device.lastActive}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={device.status === "active" ? "success" : "default"}>
                    {device.status === "active" ? "Активно" : "Неактивно"}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Unlink className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Отвязать</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <Button variant="secondary" size="sm">
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Создать новый код
          </Button>
        </div>
      </Card>

      {/* Setup instructions */}
      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-accent" />
          Как подключить устройство
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {setupSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="flex gap-4 p-4 rounded-lg bg-background-hover"
              >
                <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    <span className="text-accent mr-1.5">{step.step}.</span>
                    {step.title}
                  </p>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
