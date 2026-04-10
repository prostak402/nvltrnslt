"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Languages,
  BookOpen,
  Download,
  KeyRound,
  Gamepad2,
  Brain,
  BarChart3,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

const STEPS = 3;
const FAKE_CODE = "NVL-7K2F-9XAM";

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {Array.from({ length: STEPS }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={step} className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition ${
                isActive
                  ? "bg-accent text-white"
                  : isDone
                    ? "bg-accent/20 text-accent"
                    : "bg-background-secondary text-foreground-muted border border-border"
              }`}
            >
              {isDone ? <Check className="w-4 h-4" /> : step}
            </div>
            {step < STEPS && (
              <div
                className={`w-10 h-0.5 ${
                  isDone ? "bg-accent/40" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-foreground">
        Добро пожаловать!
      </h2>
      <p className="text-foreground-secondary leading-relaxed">
        NVL Translate помогает учить английский через визуальные новеллы. Вот как
        это работает:
      </p>

      <div className="grid gap-4 text-left">
        <div className="flex items-start gap-4 p-4 bg-background-secondary rounded-xl border border-border">
          <div className="p-2 bg-accent-light rounded-lg shrink-0">
            <Gamepad2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">Играйте с модом</p>
            <p className="text-sm text-foreground-muted mt-0.5">
              Мод автоматически определяет незнакомые слова в диалогах и
              показывает перевод
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-background-secondary rounded-xl border border-border">
          <div className="p-2 bg-accent-light rounded-lg shrink-0">
            <Brain className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">Запоминайте слова</p>
            <p className="text-sm text-foreground-muted mt-0.5">
              Все встреченные слова сохраняются в ваш личный словарь для
              повторения
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-background-secondary rounded-xl border border-border">
          <div className="p-2 bg-accent-light rounded-lg shrink-0">
            <BarChart3 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              Отслеживайте прогресс
            </p>
            <p className="text-sm text-foreground-muted mt-0.5">
              На сайте доступна статистика, тренировки и отслеживание прогресса
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDownload() {
  return (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Скачать мод</h2>
      <p className="text-foreground-secondary leading-relaxed">
        Установите мод для Ren&apos;Py, чтобы начать учить слова прямо во время
        игры.
      </p>

      <button
        type="button"
        className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition cursor-pointer"
      >
        <Download className="w-5 h-5" />
        Скачать NVL Translate Mod
      </button>

      <div className="text-left space-y-3 p-4 bg-background-secondary rounded-xl border border-border">
        <p className="font-medium text-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent" />
          Инструкция по установке
        </p>
        <ol className="text-sm text-foreground-secondary space-y-2 list-decimal list-inside">
          <li>Скачайте архив с модом</li>
          <li>
            Распакуйте содержимое в папку <code className="text-accent-secondary bg-background px-1.5 py-0.5 rounded text-xs">game/</code> вашей
            визуальной новеллы
          </li>
          <li>Запустите игру — мод активируется автоматически</li>
          <li>Введите код доступа при первом запуске (следующий шаг)</li>
        </ol>
      </div>
    </div>
  );
}

function StepAccessCode() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(FAKE_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Код доступа</h2>
      <p className="text-foreground-secondary leading-relaxed">
        Введите этот код в моде при первом запуске игры, чтобы связать аккаунт.
      </p>

      <div className="flex items-center justify-center gap-3">
        <div className="px-6 py-4 bg-background-secondary border border-border rounded-xl">
          <span className="text-2xl font-mono font-bold tracking-widest text-accent">
            {FAKE_CODE}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="p-3 bg-background-secondary border border-border hover:border-border-hover rounded-xl transition cursor-pointer"
          title="Скопировать"
        >
          {copied ? (
            <Check className="w-5 h-5 text-success" />
          ) : (
            <Copy className="w-5 h-5 text-foreground-muted" />
          )}
        </button>
      </div>

      <div className="p-4 bg-background-secondary rounded-xl border border-border text-left">
        <p className="font-medium text-foreground flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-accent" />
          Как использовать код
        </p>
        <ol className="mt-2 text-sm text-foreground-secondary space-y-1.5 list-decimal list-inside">
          <li>Запустите игру с установленным модом</li>
          <li>В меню мода выберите «Привязать аккаунт»</li>
          <li>Введите код выше и нажмите «Подтвердить»</li>
        </ol>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="w-full max-w-lg">
      <div className="bg-background-card border border-border rounded-2xl p-8 shadow-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Languages className="w-7 h-7 text-accent" />
          <span className="text-xl font-bold text-foreground">
            NVL Translate
          </span>
        </div>

        <StepIndicator current={step} />

        {/* Step content */}
        {step === 1 && <StepWelcome />}
        {step === 2 && <StepDownload />}
        {step === 3 && <StepAccessCode />}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-4 py-2.5 text-foreground-secondary hover:text-foreground transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>
          ) : (
            <div />
          )}

          {step < STEPS ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition cursor-pointer"
            >
              Далее
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center gap-1 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition"
            >
              Перейти в кабинет
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Footer note */}
        {step === STEPS && (
          <p className="mt-6 text-center text-xs text-foreground-muted">
            Слова появятся после первого использования мода
          </p>
        )}
      </div>
    </div>
  );
}
