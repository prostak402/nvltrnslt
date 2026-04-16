FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS builder
ARG BUILD_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55473/nvltrnslt
ARG BUILD_BOOTSTRAP_ADMIN_NAME="Local Admin"
ARG BUILD_BOOTSTRAP_ADMIN_EMAIL=admin@nvl.local
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN AUTH_SECRET=build-auth-secret-at-least-32-characters-long \
  DATABASE_URL=$BUILD_DATABASE_URL \
  BOOTSTRAP_ADMIN_NAME="$BUILD_BOOTSTRAP_ADMIN_NAME" \
  BOOTSTRAP_ADMIN_EMAIL=$BUILD_BOOTSTRAP_ADMIN_EMAIL \
  BOOTSTRAP_ADMIN_PASSWORD=build-bootstrap-password-123 \
  npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts/healthcheck.mjs ./scripts/healthcheck.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/db-seed.mjs ./scripts/db-seed.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/db-migrate.mjs ./scripts/db-migrate.mjs

RUN chmod -R a+rX /app/public \
  && mkdir -p /app/data/backups \
  && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "scripts/healthcheck.mjs"]

CMD ["node", "server.js"]
