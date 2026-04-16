# NVLingo

Next.js 16 приложение для сайта NVLingo, личного кабинета, админки и backend API для Ren'Py-мода.

## Локальный запуск

Самый простой способ поднять всё одной командой:

```bash
npm run local:up
```

Что делает команда:

- Требует установленный Docker Desktop с `docker compose`.
- Поднимает локальный Postgres через Docker Compose.
- Создаёт или обновляет `.env.local`.
- Генерирует `AUTH_SECRET`, если его нет или он слишком короткий.
- Подчищает placeholder-значения Yandex env до пустых.
- Заполняет `BOOTSTRAP_ADMIN_*` для локального первого admin, если они ещё не заданы.
- Если дефолтные порты заняты, автоматически подбирает ближайшие свободные и синхронизирует `DATABASE_URL`.
- Применяет committed `drizzle`-миграции через `npm run db:migrate`.
- Выполняет `npm run db:seed` и создаёт bootstrap-admin, если база ещё пустая.
- Запускает Next.js dev server на отдельном порту `32173`.

По умолчанию приложение стартует на [http://127.0.0.1:32173](http://127.0.0.1:32173).
Если `32173` занят, скрипт сам сообщит фактический URL в консоли.

Для остановки локальной базы:

```bash
npm run local:down
```

Если нужно полностью сбросить локальную базу вместе с Docker volume, например после перехода со старого `db:push` flow на committed migrations:

```bash
npm run local:reset-db
```

Ручной запуск тоже остаётся доступен, если понадобится тонкая настройка:

1. Скопируйте `.env.example` в `.env.local`.
2. Укажите `AUTH_SECRET` и `DATABASE_URL`.
   `AUTH_SECRET` обязателен и должен быть не короче 32 символов.
   Пример: `postgres://postgres:postgres@127.0.0.1:55473/nvltrnslt`
3. При необходимости задайте `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`.
   Если `BOOTSTRAP_ADMIN_PASSWORD` не указан, `npm run db:seed` сгенерирует пароль и выведет его в консоль.
4. Примените схему:

```bash
npm run db:migrate
```

5. Создайте bootstrap-admin для пустой базы:

```bash
npm run db:seed
```

6. Запустите dev-сервер:

```bash
npm run dev
```

## Что важно после перехода на Postgres

- Runtime теперь полностью работает через Postgres/Drizzle и не использует snapshot-слой.
- `data/app-state.json` больше не участвует в runtime и не импортируется автоматически.
- `npm run db:migrate` меняет только схему. Минимально рабочее окружение для пустой базы создаётся отдельным `npm run db:seed`.
- Обязательные переменные окружения валидируются на старте; без `AUTH_SECRET` и `DATABASE_URL` приложение не поднимется.
- Для `drizzle-kit` переменные окружения подхватываются из корня проекта через `@next/env`.

## Drizzle миграции

Основной workflow для схемы базы данных теперь такой:

1. Меняете `src/lib/db/schema.ts`.
2. Генерируете новую миграцию:

```bash
npm run db:generate -- --name <migration-name>
```

3. Проверяете SQL-файлы в `drizzle/` и коммитите их в репозиторий.
4. Применяете миграции:

```bash
npm run db:migrate
```

5. Если база пустая и нужен первый admin, выполняете:

```bash
npm run db:seed
```

6. При необходимости проверяете согласованность migration-артефактов:

```bash
npm run db:check
```

`npm run db:push` оставлен только как вспомогательная команда для одноразовых локальных экспериментов. Основной workflow проекта теперь должен идти через committed migration-файлы.

## Production запуск

Минимальный production-path теперь есть в репозитории:

- `Dockerfile` собирает standalone Next.js image.
- `.github/workflows/ci.yml` гоняет `lint`, `test`, `build` и `db:check`.
- Health endpoint доступен по `/api/health`.
- Readiness endpoint доступен по `/api/ready`.
- Базовые Prometheus-метрики доступны по `/api/metrics`.

Сборка контейнера:

```bash
docker build -t nvltrnslt .
```

Пример запуска контейнера:

```bash
docker run --rm -p 3000:3000 -e AUTH_SECRET=replace-with-a-long-random-secret-at-least-32-chars -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:55473/nvltrnslt nvltrnslt
```

После старта health endpoint должен отвечать:

```bash
curl http://127.0.0.1:3000/api/health
```

Если база доступна, endpoint возвращает HTTP `200` и JSON со статусом `ok`. Если база недоступна, endpoint возвращает HTTP `503`.

Readiness endpoint:

```bash
curl http://127.0.0.1:3000/api/ready
```

Если инстанс готов принимать трафик, endpoint возвращает HTTP `200` и статус `ready`. Если не проходит проверка базы, backup storage или обязательной конфигурации, endpoint возвращает HTTP `503`.

Prometheus-метрики:

```bash
curl http://127.0.0.1:3000/api/metrics
```

Endpoint отдаёт текстовый Prometheus exposition format с базовыми метриками по health/readiness, пользователям, устройствам, study items, support tickets, переводам и recent server errors.

## Bootstrap admin

`npm run db:seed` идемпотентен и создаёт первого admin только если таблица `users` ещё пуста.

Используемые переменные окружения:

```bash
BOOTSTRAP_ADMIN_NAME=Local Admin
BOOTSTRAP_ADMIN_EMAIL=admin@nvl.local
BOOTSTRAP_ADMIN_PASSWORD=
```

- Bootstrap-admin создаётся с `role=admin`, `status=active` и активной `extended`-подпиской.
- Вместе с пользователем создаются связанные записи в `user_settings` и `subscriptions`, чтобы личный кабинет и mod API не падали на пустой базе.
- Если `BOOTSTRAP_ADMIN_PASSWORD` не задан, seed-скрипт сгенерирует случайный пароль. В `npm run local:up` он заранее сохраняется в `.env.local`, чтобы логин был повторяемым между перезапусками.

## Password recovery

В проекте теперь есть публичный flow восстановления доступа:

- `/auth/forgot-password` принимает email и создаёт одноразовый токен сброса пароля.
- `/auth/reset-password?token=...` позволяет установить новый пароль по этому токену.
- `POST /api/auth/forgot-password` и `POST /api/auth/reset-password` закрыты rate limiting и не раскрывают лишние внутренние детали наружу.

Пока платёжный и почтовый провайдеры ещё не выбраны, письмо не отправляется. Вместо этого текущая сборка возвращает preview-link и показывает ссылку на сброс прямо в UI, чтобы flow уже можно было тестировать и использовать локально.

## Telegram alerts

Проект поддерживает внешний канал алертов через Telegram-бота:

- `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` включают отправку уведомлений во внешний чат.
- `TELEGRAM_MESSAGE_THREAD_ID` опционален и нужен только для forum topic / message thread.
- `adminNotifications` управляет внешними уведомлениями о новых тикетах поддержки.
- `errorAlerts` управляет внешними уведомлениями о деградации health/readiness, 5xx-ошибках и ошибках backup.

Чтобы получить `TELEGRAM_CHAT_ID`, сначала напишите боту хотя бы одно сообщение, например `/start`. После этого chat id можно получить через `getUpdates` или сохранить вручную в env нужной среды.

## Email alerts

У проекта теперь есть второй внешний канал алертов через SMTP:

- `ALERT_EMAIL_TO` — один или несколько email-адресов получателей через запятую.
- `ALERT_EMAIL_FROM` — адрес отправителя, например `alerts@nvlingo.ru`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` — SMTP endpoint.
- `SMTP_USER` и `SMTP_PASSWORD` опциональны; если сервер принимает локальный relay без авторизации, их можно оставить пустыми.
- `adminNotifications` управляет внешними уведомлениями о новых тикетах поддержки.
- `errorAlerts` управляет внешними уведомлениями о деградации health/readiness, 5xx-ошибках и ошибках backup.

Каналы Telegram и email работают независимо друг от друга. Если один из них недоступен, второй всё равно продолжит отправку.

## Полезные команды

```bash
npm run lint
npm run build
npm run test
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:check
```

`npm run test` теперь поднимает временную тестовую базу и временный Next.js server для интеграционного HTTP smoke-сценария. Для локального запуска нужен доступный Postgres из `DATABASE_URL`.

## Translation flow env

For the mod translation API, the server now supports explicit runtime controls:

```bash
TRANSLATION_TIMEOUT_MS=8000
TRANSLATION_MAX_RETRIES=2
TRANSLATION_RETRY_DELAY_MS=400
TRANSLATION_DEGRADED_MODE=fallback
```

- `TRANSLATION_TIMEOUT_MS`: timeout for one upstream translation attempt.
- `TRANSLATION_MAX_RETRIES`: how many retry attempts are allowed after the first failed request.
- `TRANSLATION_RETRY_DELAY_MS`: base delay between retries. The server uses incremental backoff.
- `TRANSLATION_DEGRADED_MODE=fallback`: if Yandex is unavailable, the API returns an explicit degraded response instead of silent garbage data.
- `TRANSLATION_DEGRADED_MODE=error`: strict mode for production. If the provider is unavailable or misconfigured, the API returns an error instead of fallback text.

## Billing prep

Until a real payment provider is selected, keep `BILLING_MODE=disabled`.

The project now includes provider-neutral billing preparation:

- richer subscription fields for billing lifecycle and future external subscription ids
- richer payment event fields for future external payment or webhook references
- a `billing_checkout_intents` table for future checkout flows
- provider-neutral billing state helpers and tests

## Deployment artifacts

Production deployment artifacts are now versioned in the repository:

- `compose.production.yml`
- `.env.production.example`
- `deploy/systemd/nvltrnslt.service`
- `deploy/nginx/nvltrnslt.conf`
- `deploy/RUNBOOK.md`

For the first VPS deployment and repeatable update flow, use [deploy/RUNBOOK.md](/F:/Мои%20проекты/Claude%20vltrnslate/nvltrnslt/deploy/RUNBOOK.md:1).
