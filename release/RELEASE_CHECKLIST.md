# Release Checklist

This checklist is the practical release gate for the first VPS launch and every later update.
It assumes the deploy path from [deploy/RUNBOOK.md](/F:/Мои%20проекты/Claude%20vltrnslate/nvltrnslt/deploy/RUNBOOK.md:1) is already in place.

## 1. Prepare the release

1. Confirm the target git commit and keep the previous production commit or image tag nearby for rollback.
2. If the mod changed, update `MOD_VERSION` in [src/lib/config.ts](/F:/Мои%20проекты/Claude%20vltrnslate/nvltrnslt/src/lib/config.ts:1).
3. Create or update the versioned mod notes in `release/mod/v<MOD_VERSION>/`.
4. Review `.env.production` and confirm all required secrets are filled in.
5. If the release contains migrations, confirm the new `drizzle/` files are committed.

## 2. Pre-release verification

Run these checks from the project root:

```bash
npm run lint
npm test
npm run build
npm run db:check
npm run mod:package
```

Release only if all five commands pass.

## 3. Check the mod package

1. Verify that `public/downloads/nvl-translate-mod-v<MOD_VERSION>.zip` exists.
2. Open the archive and confirm it contains:
   - `00_lexmod_FIXED.rpy`
   - `INSTALL.txt`
   - `RELEASE_NOTES.txt`
   - `manifest.json`
3. Confirm `public/downloads/releases/v<MOD_VERSION>/` contains the same notes and manifest.
4. Read `INSTALL.txt` once from top to bottom and make sure the steps match the real activation flow.

## 4. Deploy the release

Use the exact production steps from [deploy/RUNBOOK.md](/F:/Мои%20проекты/Claude%20vltrnslate/nvltrnslt/deploy/RUNBOOK.md:1):

1. Build the Docker image.
2. Start PostgreSQL.
3. Apply committed migrations with `scripts/db-migrate.mjs`.
4. Run `scripts/db-seed.mjs` only if the target database is empty.
5. Start the app container.
6. Keep the previous production revision available until the smoke check is green.

## 5. Release smoke check

Run these checks in order after deployment:

1. Open the public homepage and confirm the marketing pages load without visible errors.
2. Open `/api/health` and confirm it returns `200` with `status=ok`.
3. Open `/api/ready` and confirm it returns `200` with `status=ready`.
4. Log in with an existing user account.
5. Open `/auth/forgot-password`, request a reset, and confirm the preview reset link is generated.
6. Complete the reset flow and verify the new password works.
7. Log in as admin and open `/admin`.
8. Confirm the admin dashboard, analytics, logs, users, and subscriptions pages load.
9. Create a support ticket from the user dashboard and confirm:
   - the ticket appears in the user history
   - the ticket appears in admin tickets
   - the Telegram notification arrives
10. Download the current mod archive from `/downloads/nvl-translate-mod-v<MOD_VERSION>.zip`.
11. Confirm the dashboard still downloads `nvl_translate_key.json`.
12. Run one real mod flow against the deployed API:
   - activation
   - bootstrap
   - translate
   - save item
   - review
13. Trigger a manual backup from admin and confirm the latest backup status is successful.

If any critical step fails, stop the rollout and use the rollback plan below.

## 6. Rollback triggers

Rollback immediately if any of these happen after deployment:

- `/api/health` or `/api/ready` does not go green within a few minutes
- login, forgot/reset password, or admin login is broken
- mod activation, bootstrap, or translate fails on the deployed API
- repeated `5xx` errors start arriving in Telegram alerts
- the database migration introduces broken or missing data

## 7. Rollback plan

1. Enable maintenance mode if the app is partially serving broken traffic.
2. Capture the failing revision:
   - git commit or tag
   - Docker image id
   - recent `app` and `db` logs
3. Stop the current app container.
4. Restore the previous known-good revision or image.
5. If the incident is caused by a destructive or incompatible migration, restore the database from the backup taken before deployment.
6. Start the previous app version.
7. Repeat the smoke check for:
   - homepage
   - `/api/health`
   - `/api/ready`
   - login
   - admin dashboard
   - one support-ticket flow
8. Disable maintenance mode only after the rolled-back version is green.

## 8. Release record

After a successful release, record:

- release date and time
- deployed git commit
- deployed mod version
- whether migrations were applied
- whether rollback was needed
