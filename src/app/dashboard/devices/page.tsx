"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Download,
  FileKey2,
  FolderOpen,
  Laptop,
  Monitor,
  Settings,
  Smartphone,
  Unlink,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiSend, useApiData } from "@/lib/client/api";
import {
  ACTIVATION_KEY_FILE,
  MAX_ACTIVE_DEVICES,
  MOD_DOWNLOAD_PATH,
} from "@/lib/config";
import {
  activationFallbackSummary,
  activationFilePlacementSummary,
  activationFilesCheckSummary,
  activationFlowSummary,
  deviceLimitSummary,
  modInstallationSummary,
} from "@/lib/product";

type Device = {
  id: number;
  name: string;
  lastActive: string;
  status: "active" | "inactive";
  linkedAt: string;
  tokenPreview: string;
};

type DevicesResponse = {
  activationKeyPreview: string;
  activationFileName: string;
  activationFilePath: string;
  devices: Device[];
  maxDevices: number;
  activeDevices: number;
};

const initialData: DevicesResponse = {
  activationKeyPreview: "—",
  activationFileName: ACTIVATION_KEY_FILE,
  activationFilePath: "/api/dashboard/activation-file",
  devices: [],
  maxDevices: MAX_ACTIVE_DEVICES,
  activeDevices: 0,
};

const setupSteps = [
  {
    step: 1,
    icon: Download,
    title: "Скачайте мод",
    description: modInstallationSummary(),
  },
  {
    step: 2,
    icon: FileKey2,
    title: "Скачайте файл активации",
    description: activationFilePlacementSummary(),
  },
  {
    step: 3,
    icon: FolderOpen,
    title: "Проверьте расположение файлов",
    description: `${activationFilesCheckSummary()} После этого мод сам подтянет ключ.`,
  },
  {
    step: 4,
    icon: CheckCircle2,
    title: "Запустите игру",
    description: `Обычно мод активируется сам при запуске игры. ${activationFallbackSummary()}`,
  },
] as const;

export default function DevicesPage() {
  const { data, loading, error, reload } = useApiData<DevicesResponse>(
    "/api/dashboard/devices",
    initialData,
  );
  const [pendingDeviceId, setPendingDeviceId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const handleRevoke = async (deviceId: number) => {
    try {
      setPendingDeviceId(deviceId);
      setMessage("");
      await apiSend(`/api/dashboard/devices/${deviceId}`, "DELETE");
      await reload();
      setMessage("Устройство отвязано.");
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось отвязать устройство.",
      );
    } finally {
      setPendingDeviceId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Monitor className="h-6 w-6 text-accent" />
          Устройства
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Активация мода теперь идёт через файл ключа, а управление уже
          подключёнными устройствами собрано здесь.
        </p>
      </div>

      {error ? (
        <Card className="border-danger/30 bg-danger/10 text-danger">
          Не удалось загрузить устройства: {error}
        </Card>
      ) : null}

      {message ? <p className="text-sm text-foreground-secondary">{message}</p> : null}

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <FileKey2 className="h-5 w-5 text-accent" />
          Файл активации
        </h2>
        <p className="mb-4 text-sm text-foreground-muted">
          {activationFlowSummary()} {deviceLimitSummary()}
        </p>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-background-hover px-4 py-3">
            <p className="text-foreground-muted">Постоянный ключ</p>
            <p className="mt-1 font-mono font-semibold text-foreground">
              {data.activationKeyPreview}
            </p>
          </div>
          <div className="rounded-lg bg-background-hover px-4 py-3">
            <p className="text-foreground-muted">Файл для игры</p>
            <p className="mt-1 font-semibold text-foreground">
              {data.activationFileName}
            </p>
          </div>
          <div className="rounded-lg bg-background-hover px-4 py-3">
            <p className="text-foreground-muted">Активных устройств</p>
            <p className="mt-1 font-semibold text-foreground">
              {data.activeDevices} / {data.maxDevices}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href={data.activationFilePath}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            <FileKey2 className="h-4 w-4" />
            Скачать файл активации
          </a>
          <a
            href={MOD_DOWNLOAD_PATH}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-border-hover"
          >
            <Download className="h-4 w-4" />
            Скачать мод
          </a>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Monitor className="h-5 w-5 text-accent" />
            Подключённые устройства
          </h2>
          <Badge variant="default">{data.devices.length} устройств</Badge>
        </div>

        <div className="space-y-3">
          {data.devices.map((device) => {
            const Icon = /phone|android|ios/i.test(device.name)
              ? Smartphone
              : Laptop;

            return (
              <div
                key={device.id}
                className="flex items-center gap-4 rounded-lg border border-border/50 bg-background-hover p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-light">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{device.name}</p>
                  <p className="text-xs text-foreground-muted">
                    Последняя активность: {device.lastActive} · Активировано:{" "}
                    {device.linkedAt}
                  </p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    Токен: {device.tokenPreview}••••••
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={device.status === "active" ? "success" : "default"}>
                    {device.status === "active" ? "Активно" : "Неактивно"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pendingDeviceId === device.id}
                    onClick={() => void handleRevoke(device.id)}
                  >
                    <Unlink className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">Отвязать</span>
                  </Button>
                </div>
              </div>
            );
          })}

          {!loading && data.devices.length === 0 ? (
            <div className="rounded-lg bg-background-hover px-4 py-6 text-sm text-foreground-muted">
              Пока нет привязанных устройств. {activationFilePlacementSummary()}
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Settings className="h-5 w-5 text-accent" />
          Как подключить устройство
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {setupSteps.map((step) => {
            const Icon = step.icon;

            return (
              <div key={step.step} className="flex gap-4 rounded-lg bg-background-hover p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-light">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-foreground">
                    <span className="mr-1.5 text-accent">{step.step}.</span>
                    {step.title}
                  </p>
                  <p className="text-xs leading-relaxed text-foreground-muted">
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
