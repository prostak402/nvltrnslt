#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env.production" ]]; then
  echo ".env.production is required for production deploy" >&2
  exit 1
fi

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
if [[ -z "$BRANCH" || "$BRANCH" == "HEAD" ]]; then
  echo "Unable to determine deploy branch. Pass it explicitly: scripts/deploy-update.sh <branch>" >&2
  exit 1
fi

COMPOSE_ARGS=(--env-file .env.production -f compose.production.yml)

echo "Fetching latest code for branch: $BRANCH"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "Rebuilding application image"
docker compose "${COMPOSE_ARGS[@]}" build app

echo "Applying database migrations"
docker compose "${COMPOSE_ARGS[@]}" run --rm app node scripts/db-migrate.mjs

echo "Restarting production stack"
docker compose "${COMPOSE_ARGS[@]}" up -d --remove-orphans

echo "Current stack status"
docker compose "${COMPOSE_ARGS[@]}" ps
