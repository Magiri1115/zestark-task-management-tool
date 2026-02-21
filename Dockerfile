# task-management-system/Dockerfile

FROM node:20-alpine AS base

# pnpmインストール
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

    # PrismaのエンジンがAlpine Linuxで動作するために必要な依存関係をインストール
    # openssl-dev: libsslの提供
    # libc6-compat: glibc互換性レイヤー (Prismaのエンジンがglibcに依存する場合があるため)
    RUN apk add --no-cache openssl-dev libc6-compat

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
COPY --from=deps /app/node_modules ./node_modules
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