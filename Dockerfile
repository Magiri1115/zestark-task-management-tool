# task-management-system/Dockerfile

FROM node:20-alpine AS base

# OpenSSLを追加インストール
RUN apk add --no-cache openssl openssl-dev libc6-compat

# pnpmインストール
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 依存関係インストール
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# 開発用
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
EXPOSE 3000
CMD ["pnpm", "dev"]

# ビルド用
FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# 本番用
FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]