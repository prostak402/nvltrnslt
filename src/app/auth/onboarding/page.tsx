"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Download,
  FileKey2,
  FolderOpen,
  Gamepad2,
  Languages,
} from "lucide-react";

import { useApiData } from "@/lib/client/api";
import {
  ACTIVATION_KEY_FILE,
  MAX_ACTIVE_DEVICES,
  MOD_DOWNLOAD_PATH,
} from "@/lib/config";
import {
  activationFallbackSummary,
  activationFilePlacementSummary,
  activationFlowSummary,
  deviceLimitSummary,
  firstSyncSummary,
  modDesktopSupportSummary,
  modInstallationSummary,
} from "@/lib/product";

const STEPS = 3;

type DevicesResponse = {
  activationKeyPreview: string;
  activationFileName: string;
  activationFilePath: string;
  devices: Array<{ id: number; name: string }>;
  maxDevices: number;
  activeDevices: number;
};

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-3">
      {Array.from({ length: STEPS }, (_, index) => {
        const step = index + 1;
        const isActive = step === current;
        const isDone = step < current;

        return (
          <div key={step} className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
                isActive
                  ? "bg-accent text-white"
                  : isDone
                    ? "bg-accent/20 text-accent"
                    : "border border-border bg-background-secondary text-foreground-muted"
              }`}
            >
              {step}
            </div>
            {step < STEPS ? (
              <div className={`h-0.5 w-10 ${isDone ? "bg-accent/40" : "bg-border"}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-foreground">Добро пожаловать!</h2>
      <p className="leading-relaxed text-foreground-secondary">
        NVLingo помогает читать визуальные новеллы на английском,
        переводить текст через серверный proxy и сразу собирать собственный
        словарь для обучения.
      </p>

      <div className="grid gap-4 text-left">
        <div className="flex items-start gap-4 rounded-xl border border-border bg-background-secondary p-4">
          <div className="shrink-0 rounded-lg bg-accent-light p-2">
            <Gamepad2 className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">Читайте прямо в игре</p>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Мод живёт в папке game/ и переводит текст через ваш backend на
              Yandex Cloud.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-xl border border-border bg-background-secondary p-4">
          <div className="shrink-0 rounded-lg bg-accent-light p-2">
            <Brain className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">Сохраняйте словарь</p>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Все отмеченные слова, фразы и контекст синхронизируются с сайтом и
              попадают в обучение.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-xl border border-border bg-background-secondary p-4">
          <div className="shrink-0 rounded-lg bg-accent-light p-2">
            <BarChart3 className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">Следите за прогрессом</p>
            <p className="mt-0.5 text-sm text-foreground-muted">
              В кабинете доступны карточки, история, статистика и управление
              устройствами. {deviceLimitSummary()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDownload() {
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-foreground">Скачайте мод</h2>
      <p className="leading-relaxed text-foreground-secondary">
        {modInstallationSummary()} {modDesktopSupportSummary()} На следующем шаге вы скачаете файл активации
        для этой же папки.
      </p>

      <Link
        href={MOD_DOWNLOAD_PATH}
        prefetch={false}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-6 py-3 font-medium text-white transition hover:bg-accent-hover"
      >
        <Download className="h-5 w-5" />
        Скачать desktop-архив
      </Link>

      <div className="space-y-3 rounded-xl border border-border bg-background-secondary p-4 text-left">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <BookOpen className="h-4 w-4 text-accent" />
          Инструкция по установке
        </p>
        <ol className="list-inside list-decimal space-y-2 text-sm text-foreground-secondary">
          <li>Скачайте архив с модом.</li>
          <li>
            Распакуйте содержимое в папку{" "}
            <code className="rounded bg-background px-1.5 py-0.5 text-xs text-accent-secondary">
              game/
            </code>{" "}
            вашей визуальной новеллы.
          </li>
          <li>Перезапустите игру после копирования файлов.</li>
          <li>На следующем шаге скачайте файл активации и положите его туда же.</li>
        </ol>
      </div>
    </div>
  );
}

function StepActivationFile({
  activationKeyPreview,
  activationFileName,
  activationFilePath,
  activeDevices,
  maxDevices,
}: {
  activationKeyPreview: string;
  activationFileName: string;
  activationFilePath: string;
  activeDevices: number;
  maxDevices: number;
}) {
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-foreground">Файл активации</h2>
      <p className="leading-relaxed text-foreground-secondary">
        {activationFlowSummary()} Ручной ввод кода больше не нужен.
      </p>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-background-secondary px-4 py-3">
          <p className="text-foreground-muted">Ключ аккаунта</p>
          <p className="mt-1 font-mono font-semibold text-foreground">
            {activationKeyPreview}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background-secondary px-4 py-3">
          <p className="text-foreground-muted">Файл</p>
          <p className="mt-1 font-semibold text-foreground">{activationFileName}</p>
        </div>
        <div className="rounded-lg border border-border bg-background-secondary px-4 py-3">
          <p className="text-foreground-muted">Устройства</p>
          <p className="mt-1 font-semibold text-foreground">
            {activeDevices} / {maxDevices}
          </p>
        </div>
      </div>

      <a
        href={activationFilePath}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
      >
        <FileKey2 className="h-4 w-4" />
        Скачать файл активации
      </a>

      <div className="rounded-xl border border-border bg-background-secondary p-4 text-left">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <FolderOpen className="h-4 w-4 text-accent" />
          Что делать дальше
        </p>
        <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-foreground-secondary">
          <li>{activationFilePlacementSummary()}</li>
          <li>Запустите игру и при необходимости откройте окно мода через F6.</li>
          <li>{activationFallbackSummary()}</li>
          <li>{firstSyncSummary()}</li>
          <li>{deviceLimitSummary()}</li>
        </ol>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const { data } = useApiData<DevicesResponse>("/api/dashboard/devices", {
    activationKeyPreview: "—",
    activationFileName: ACTIVATION_KEY_FILE,
    activationFilePath: "/api/dashboard/activation-file",
    devices: [],
    maxDevices: MAX_ACTIVE_DEVICES,
    activeDevices: 0,
  });

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-2xl border border-border bg-background-card p-8 shadow-lg">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Languages className="h-7 w-7 text-accent" />
          <span className="text-xl font-bold text-foreground">NVLingo</span>
        </div>

        <StepIndicator current={step} />

        {step === 1 ? <StepWelcome /> : null}
        {step === 2 ? <StepDownload /> : null}
        {step === 3 ? (
          <StepActivationFile
            activationKeyPreview={data.activationKeyPreview}
            activationFileName={data.activationFileName}
            activationFilePath={data.activationFilePath}
            activeDevices={data.activeDevices}
            maxDevices={data.maxDevices}
          />
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex cursor-pointer items-center gap-1 px-4 py-2.5 text-foreground-secondary transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </button>
          ) : (
            <div />
          )}

          {step < STEPS ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex cursor-pointer items-center gap-1 rounded-lg bg-accent px-6 py-2.5 font-medium text-white transition hover:bg-accent-hover"
            >
              Далее
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center gap-1 rounded-lg bg-accent px-6 py-2.5 font-medium text-white transition hover:bg-accent-hover"
            >
              Перейти в кабинет
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {step === STEPS ? (
          <p className="mt-6 text-center text-xs text-foreground-muted">
            {firstSyncSummary()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
