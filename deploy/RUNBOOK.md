# Production Runbook

Этот набор рассчитан на минимальный production deployment на одном VPS:

- Docker + Docker Compose
- один контейнер приложения
- один контейнер PostgreSQL
- `nginx` как reverse proxy
- `systemd` для автозапуска после перезагрузки сервера

## Что лежит в репозитории

- [Dockerfile](/F:/Мои%20проекты/Claude%20vltrnslate/nvltrnslt/Dockerfile:1)
- [compose.production.yml](/F:/Мои%20проекты/Claude%20vltrnslate/nvltrnslt/compose.production.yml:1)
- [.env.production.example](/F:/Мои%20проекты/Claude%20vltrnslate/nvltrnslt/.env.production.example:1)
- [deploy/systemd/nvltrnslt.service](/F:/Мои%20проекты/Claude%20vltrnslate/nvltrnslt/deploy/systemd/nvltrnslt.service:1)
- [deploy/nginx/nvltrnslt.conf](/F:/Мои%20проекты/Claude%20vltrnslate/nvltrnslt/deploy/nginx/nvltrnslt.conf:1)
- [scripts/db-migrate.mjs](/F:/Мои%20проекты/Claude%20vltrnslate/nvltrnslt/scripts/db-migrate.mjs:1)
- [scripts/db-seed.mjs](/F:/Мои%20проекты/Claude%20vltrnslate/nvltrnslt/scripts/db-seed.mjs:1)

## 1. Подготовить сервер

Установите:

- Docker Engine
- Docker Compose plugin
- nginx

Проверьте:

```bash
docker --version
docker compose version
nginx -v
```

## 2. Разложить проект на сервере

Пример рабочего каталога:

```bash
sudo mkdir -p /opt/nvltrnslt
sudo chown "$USER":"$USER" /opt/nvltrnslt
cd /opt/nvltrnslt
git clone <YOUR_REPO_URL> .
```

## 3. Создать production env

```bash
cp .env.production.example .env.production
```

Обязательно заполните:

- `AUTH_SECRET`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`

Важно:

- `AUTH_SECRET` должен быть длинным случайным секретом, минимум 32 символа.
- `DATABASE_URL` в compose-сценарии должен смотреть на `db:5432`, а не на `127.0.0.1`.
- Если Telegram уже подключён, перенесите `TELEGRAM_*`.
- Если Yandex provider пока не готов, оставьте `YANDEX_TRANSLATE_*` пустыми.

## 4. Собрать image

```bash
docker compose --env-file .env.production -f compose.production.yml build
```

## 5. Поднять базу

```bash
docker compose --env-file .env.production -f compose.production.yml up -d db
```

Убедитесь, что Postgres healthy:

```bash
docker compose --env-file .env.production -f compose.production.yml ps
```

## 6. Применить миграции

```bash
docker compose --env-file .env.production -f compose.production.yml run --rm app node scripts/db-migrate.mjs
```

Скрипт сам подождёт базу и затем применит committed `drizzle` migrations.

## 7. Создать первого admin

Этот шаг нужен только для пустой базы:

```bash
docker compose --env-file .env.production -f compose.production.yml run --rm app node scripts/db-seed.mjs
```

`db:seed` идемпотентен: если база уже не пустая, он просто ничего не создаст.

## 8. Поднять приложение

```bash
docker compose --env-file .env.production -f compose.production.yml up -d app
```

Проверка:

```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3000/api/ready
```

Ожидаемо:

- `/api/health` -> `200` и `status=ok`
- `/api/ready` -> `200` и `status=ready`

## 9. Подключить nginx

Скопируйте конфиг:

```bash
sudo cp deploy/nginx/nvltrnslt.conf /etc/nginx/sites-available/nvltrnslt.conf
sudo ln -s /etc/nginx/sites-available/nvltrnslt.conf /etc/nginx/sites-enabled/nvltrnslt.conf
```

Перед reload исправьте:

- `server_name`
- пути к `ssl_certificate`
- пути к `ssl_certificate_key`

Потом:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 10. Подключить systemd

Скопируйте unit:

```bash
sudo cp deploy/systemd/nvltrnslt.service /etc/systemd/system/nvltrnslt.service
sudo systemctl daemon-reload
sudo systemctl enable nvltrnslt.service
sudo systemctl start nvltrnslt.service
```

Проверка:

```bash
systemctl status nvltrnslt.service
```

## Повторная выкладка

Когда код обновился:

```bash
cd /opt/nvltrnslt
git pull
docker compose --env-file .env.production -f compose.production.yml build
docker compose --env-file .env.production -f compose.production.yml run --rm app node scripts/db-migrate.mjs
docker compose --env-file .env.production -f compose.production.yml up -d app
```

Если менялись только env-файлы или nginx:

- перезапустите `app`
- при необходимости `reload nginx`

## Полезные команды

Логи приложения:

```bash
docker compose --env-file .env.production -f compose.production.yml logs -f app
```

Логи базы:

```bash
docker compose --env-file .env.production -f compose.production.yml logs -f db
```

Перезапуск приложения:

```bash
docker compose --env-file .env.production -f compose.production.yml restart app
```

Остановка stack:

```bash
docker compose --env-file .env.production -f compose.production.yml down
```

## Где лежат данные

- Postgres: named volume `postgres_data`
- JSON backup snapshots приложения: named volume `backup_data`

## Что проверить после первого запуска

Smoke checklist:

1. Открывается публичный сайт.
2. Работает login.
3. Работает forgot/reset password preview flow.
4. `/api/health` возвращает `ok`.
5. `/api/ready` возвращает `ready`.
6. Admin panel открывается под bootstrap-admin.
7. Telegram alert приходит в ваш чат.
8. Создаётся manual backup из админки.

## Что intentionally не автоматизировано

- HTTPS сертификаты
- email provider
- внешний error tracking
- внешнее object storage для backup
- multi-instance deployment

Этот runbook — минимальный надёжный путь для первого VPS, а не финальный high-availability контур.
