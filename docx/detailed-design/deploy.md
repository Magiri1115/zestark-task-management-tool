# デプロイ手順書

## 1. デプロイ概要

### 1.1 デプロイ先

- **プラットフォーム**: Vercel
- **リージョン**: iad1（米国東海岸）
- **データベース**: Vercel Postgres

### 1.2 デプロイフロー

```
┌────────────┐
│   GitHub   │
│  (main)    │
└──────┬─────┘
       │ push
       ↓
┌────────────┐
│  Vercel    │
│ Auto Deploy│
└──────┬─────┘
       │
       ├─→ Build (Docker)
       ├─→ Prisma Generate (Data Proxy URLを考慮)
       ├─→ Migrate (production)
       └─→ Deploy
              ↓
┌─────────────────────────────────────────┐
│      Next.js App (Production)           │
│  (Prisma Data Platform経由でDB接続)     │
└─────────────────────────────────────────┘
              ↓ ↑ (Prisma Data Platform / Accelerate)
┌─────────────────────────────────────────┐
│    PostgreSQL (Vercel Postgres)         │
└─────────────────────────────────────────┘
```

---

## 2. 初回セットアップ

### 2.1 前提条件

- [ ] Docker Desktop インストール済み
- [ ] Docker Compose インストール済み
- [ ] Vercel CLI インストール済み

### 2.2 Vercel CLIインストール

```bash
# グローバルインストール
npm install -g vercel

# バージョン確認
vercel --version
```

---

## 3. ローカル開発環境セットアップ

### 3.1 リポジトリクローン

```bash
# リポジトリクローン
git clone https://github.com/your-org/task-management-system.git
cd task-management-system

# Docker Composeでサービス起動
docker compose up -d
```

### 3.2 環境変数設定

ローカル開発環境では、Docker Composeで起動するローカルデータベースに直接接続します。

```bash
# .env.exampleをコピー
cp .env.example .env.local

# .env.localを編集
vim .env.local
```

#### .env.local 内容

```env
# Database (ローカル開発用: Prisma Studioもこの設定を使用)
DATABASE_URL="postgresql://postgres:postgres@db:5432/task_management_dev"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # openssl rand -base64 32で生成

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3.3 データベースセットアップ

```bash
# Prisma生成
docker compose exec app pnpm prisma generate

# マイグレーション実行
docker compose exec app pnpm prisma migrate dev --name init

# シードデータ投入
docker compose exec app pnpm db:seed

# Prisma Studioでローカル開発用DBを確認
# (ローカルの.env.localに設定されたDATABASE_URLを使用)
docker compose exec app pnpm db:studio # ローカル開発用DBに接続
```

### 3.4 開発サーバー起動

```bash
# 開発サーバー起動
docker compose up

# ブラウザでアクセス
open http://localhost:3000
```

---

## 4. Vercelプロジェクト作成

### 4.1 Vercel連携

```bash
# Vercelにログイン
vercel login

# プロジェクト連携
vercel link
```

#### インタラクティブ設定

```
? Set up and deploy "~/task-management-system"? [Y/n] Y
? Which scope do you want to deploy to? your-team
? Link to existing project? [y/N] N
? What's your project's name? task-management-system
? In which directory is your code located? ./
```

### 4.2 Vercel Postgres作成

```bash
# Postgresストレージ作成
vercel postgres create
```

#### 作成時の選択

```
? What would you like to name your Postgres database? task-management-db
? Which region should your database be created in? Washington, D.C., USA (iad1)
```

### 4.3 環境変数設定

Vercelにデプロイするアプリケーションは、Prisma Data PlatformのData Proxyを経由してデータベースに接続します。
Prisma Data Platformでプロジェクトを作成し、Vercel Postgresを接続すると発行されるData Proxy URLを`DATABASE_URL`として設定してください。

#### Vercel Dashboardで設定

1. https://vercel.com/your-team/task-management-system/settings/environment-variables
2. 以下の環境変数を追加：

| キー | 値 | 環境 |
|------|---|------|
| DATABASE_URL | (Prisma Data Platformから取得したData Proxy URL) | Production, Preview |
| NEXTAUTH_URL | https://your-domain.vercel.app | Production |
| NEXTAUTH_URL | https://*-your-team.vercel.app | Preview |
| NEXTAUTH_SECRET | (openssl rand -base64 32) | Production, Preview, Development |
| NODE_ENV | production | Production |

#### CLIで設定する場合

```bash
# Prisma Data Platformから取得したData Proxy URLを設定
vercel env add DATABASE_URL "prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY&project=YOUR_PROJECT_ID" production
vercel env add DATABASE_URL "prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY&project=YOUR_PROJECT_ID" preview

# NEXTAUTH_SECRET生成
openssl rand -base64 32

# 環境変数追加
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_SECRET preview

# 本番URL設定
vercel env add NEXTAUTH_URL production
# 値: https://task-management-system.vercel.app

# プレビューURL設定
vercel env add NEXTAUTH_URL preview
# 値: https://*-your-team.vercel.app
```

### 4.4 環境変数のローカル同期

```bash
# Vercelの環境変数をローカルに同期
vercel env pull .env.local
```

---

## 5. 初回デプロイ

### 5.1 mainブランチへプッシュ

```bash
# コミット
git add .
# git commit -m "Initial commit"

# mainブランチへプッシュ
git push origin main
```

### 5.2 Vercel自動デプロイ

GitHubへのpush後、Vercelが自動的に以下を実行：

1. ビルド開始
2. 依存関係インストール (`pnpm install`)
3. Prisma生成 (`prisma generate`)
4. Next.jsビルド (`next build`)
5. デプロイ

---

## 6. データベースマイグレーション（本番）

### 6.1 初回マイグレーション

```bash
# 本番環境変数を取得
vercel env pull .env.production

# 本番DBに接続してマイグレーション (Prisma Data PlatformのData Proxy経由)
# Vercelのデプロイプロセスで自動的に実行されるが、手動で実行する場合は以下
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" \
pnpm prisma migrate deploy

# シードデータ投入（初回のみ）
# 注意: 本番環境でのシードデータ投入は慎重に行うこと。
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" \
pnpm db:seed
```

### 6.2 マイグレーション追加時

#### ローカルで作成

```bash
# 新しいマイグレーション作成
docker compose exec app pnpm prisma migrate dev --name add_new_column

# コミット
git add prisma/migrations/
git commit -m "feat: add new column to tasks table"
git push origin main
```

#### 本番反映

```bash
# 本番環境でマイグレーション実行
# Vercelのデプロイプロセスで自動的に実行されるが、手動で実行する場合は以下
DATABASE_URL="$(vercel env pull -y && grep DATABASE_URL .env.production | cut -d '=' -f2-)" \
pnpm prisma migrate deploy
```

または、Vercel Dashboardで手動実行：

1. Project Settings → Environment Variables
2. DATABASE_URLをコピー
3. ローカルで実行：
   ```bash
   DATABASE_URL="your-production-url" pnpm prisma migrate deploy
   ```

---

## 7. デプロイ後の確認

### 7.1 ヘルスチェック

```bash
# URLにアクセス
curl https://your-domain.vercel.app/api/health

# 期待レスポンス
{"status":"ok"}
```

### 7.2 動作確認

1. **ログインページアクセス**
   ```
   https://your-domain.vercel.app/login
   ```

2. **管理者ログイン**
   - Email: `admin@example.com`
   - Password: `admin123`

3. **タスク一覧表示確認**

4. **タスク作成・編集・削除確認**

5. **Excel出力確認**

### 7.3 ログ確認

```bash
# Vercelログ確認
vercel logs

# リアルタイムログ
vercel logs --follow
```

---

## 8. ドメイン設定

### 8.1 カスタムドメイン追加

#### Vercel Dashboardで設定

1. Project Settings → Domains
2. "Add Domain" クリック
3. ドメイン入力（例: `tasks.example.com`）
4. DNS設定

#### DNSレコード設定

| Type | Name | Value |
|------|------|-------|
| CNAME | tasks | cname.vercel-dns.com |

### 8.2 環境変数更新

```bash
# NEXTAUTH_URLを更新
vercel env rm NEXTAUTH_URL production
vercel env add NEXTAUTH_URL production
# 値: https://tasks.example.com
```

---

## 9. 継続的デプロイ（CI/CD）

### 9.1 ブランチ戦略

```
main (本番)
  ├── develop (ステージング)
  └── feature/* (プレビュー)
```

### 9.2 デプロイルール

| ブランチ | デプロイ先 | URL |
|---------|----------|-----|
| main | Production | https://your-domain.vercel.app |
| develop | Preview (staging) | https://develop-your-project.vercel.app |
| feature/* | Preview | https://feature-xxx-your-project.vercel.app |

### 9.3 プレビューデプロイ

```bash
# feature ブランチ作成
git checkout -b feature/new-feature

# 変更をコミット
git add .
# git commit -m "feat: add new feature"
# git push origin feature/new-feature
```

→ Vercelが自動的にプレビューURLを生成

---

## 10. ロールバック手順

### 10.1 Vercel Dashboardでロールバック

1. Deployments ページへ
2. ロールバック先のデプロイを選択
3. "︙" メニュー → "Promote to Production"

### 10.2 GitHubでロールバック

```bash
# 以前のコミットに戻す
git revert HEAD
# git push origin main

# または特定のコミットに戻す
git reset --hard <commit-hash>
# git push -f origin main
```

---

## 11. モニタリング

### 11.1 Vercel Analytics

- 自動有効化（無料プラン）
- Core Web Vitals計測
- リアルタイムアクセス数

#### 確認方法

1. Project Dashboard → Analytics
2. パフォーマンス指標確認

### 11.2 エラー監視（将来実装）

```bash
# Sentry統合（例）
pnpm add @sentry/nextjs

# sentry.client.config.ts, sentry.server.config.ts 作成
```

---

## 12. バックアップ

### 12.1 データベースバックアップ

#### 手動バックアップ

```bash
# 本番DBをダンプ
vercel env pull .env.production
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)"

# pg_dumpでバックアップ
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

#### 自動バックアップ（Vercel Postgres）

- Vercel Postgresは自動的にバックアップを取得
- Dashboard → Storage → Postgres → Backups で確認

### 12.2 リストア

```bash
# バックアップからリストア
psql $DATABASE_URL < backup_20240101.sql
```

---

## 13. パフォーマンス最適化

### 13.1 ビルド最適化

```javascript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 画像最適化
  images: {
    domains: ['your-domain.com'],
    formats: ['image/avif', 'image/webp']
  },

  // コンパイル最適化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },

  // 静的生成ページ
  output: 'standalone'
};

module.exports = nextConfig;
```

### 13.2 キャッシュ設定

```typescript
// src/app/tasks/page.tsx

export const revalidate = 60; // 60秒キャッシュ
```

---

## 14. セキュリティ設定

### 14.1 環境変数の保護

- [ ] `.env.local` を `.gitignore` に追加済み
- [ ] NEXTAUTH_SECRET が十分に複雑
- [ ] 本番環境変数がGitHubに含まれていない

### 14.2 セキュリティヘッダー

```javascript
// next.config.js

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};
```

---

## 15. トラブルシューティング

### 15.1 ビルドエラー

#### 症状: "Module not found"

```bash
# 依存関係再インストール
rm -rf node_modules .next
docker compose exec app pnpm install
docker compose exec app pnpm build
```

#### 症状: "Prisma Client not generated"

```bash
# Prisma再生成
docker compose exec app pnpm prisma generate
docker compose exec app pnpm build
```

### 15.2 データベース接続エラー

#### 症状: "Can't reach database server"

```bash
# DATABASE_URL確認
vercel env pull .env.production
cat .env.production | grep DATABASE_URL

# 接続テスト
docker compose exec app psql $DATABASE_URL -c "SELECT 1"
```

### 15.3 認証エラー

#### 症状: "NEXTAUTH_URL mismatch"

```bash
# NEXTAUTH_URLが正しいか確認
vercel env ls

# 修正
vercel env rm NEXTAUTH_URL production
vercel env add NEXTAUTH_URL production
# 正しいURLを入力
```

---

## 16. デプロイチェックリスト

### 16.1 デプロイ前

- [ ] ローカルでビルド成功 (`docker compose exec app pnpm build`)
- [ ] テスト全通過 (`docker compose exec app pnpm test:all`)
- [ ] 環境変数が正しく設定されている
- [ ] マイグレーションファイルがコミット済み
- [ ] `.env.local` が `.gitignore` に含まれている

### 16.2 デプロイ後

- [ ] ビルドログ確認（エラーなし）
- [ ] ヘルスチェックAPI正常
- [ ] ログインページアクセス可能
- [ ] 管理者ログイン成功
- [ ] タスク一覧表示確認
- [ ] CRUD操作動作確認
- [ ] Excel出力動作確認
- [ ] エラーログ確認（異常なし）

---

## 17. 緊急時対応

### 17.1 サービス停止時

1. **Vercel Status確認**
   - https://www.vercel-status.com/

2. **ロールバック実施**
   - Dashboardから即座にロールバック

3. **ログ確認**
   ```bash
   vercel logs --follow
   ```

### 17.2 データ破損時

1. **バックアップからリストア**
   ```bash
   # 最新バックアップ確認
   ls -lt backup_*.sql | head -1
   
   # リストア
   psql $DATABASE_URL < backup_latest.sql
   ```

2. **整合性チェック**
   ```bash
   docker compose exec app pnpm prisma db push
   ```

---

## 18. コマンドリファレンス

```bash
# ローカル開発
docker compose up -d  # サービス起動
docker compose up      # 開発サーバー起動

# データベース
docker compose exec app pnpm prisma generate
docker compose exec app pnpm prisma migrate
docker compose exec app pnpm db:seed
docker compose exec app pnpm db:studio

# テスト
docker compose exec app pnpm test
docker compose exec app pnpm test:unit
docker compose exec app pnpm test:e2e
docker compose exec app pnpm test:all

# Vercel
vercel                      # プレビューデプロイ
vercel --prod               # 本番デプロイ
vercel logs                 # ログ確認
vercel env pull             # 環境変数取得
vercel env ls               # 環境変数一覧
```

---

## 19. Docker Compose 設定例

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/task_management_dev # ローカル開発用DBへの接続
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=your-secret-key-here
      - NODE_ENV=development
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
    depends_on:
      - db
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=task_management_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

---

## 20. Dockerfile 設定例 (マルチステージビルド)

このプロジェクトでは、ビルド時間を短縮し、最終的なイメージサイズを最適化するためにマルチステージビルドを採用しています。

### Dockerfile の構成

*   **`base` ステージ**: 共通の Node.js 環境と pnpm の設定を行います。
*   **`deps` ステージ**: `package.json` と `pnpm-lock.yaml` に基づいて依存関係をインストールします。このステージは、依存関係ファイルが変更された場合にのみ再実行されるため、キャッシュを効率的に利用できます。
*   **`development` ステージ**: 開発環境用のイメージを構築します。ソースコードをコピーし、Prisma クライアントを生成し、開発サーバーを起動します。
*   **`builder` ステージ**: 本番ビルド用のイメージを構築します。依存関係のインストール後、ソースコードをコピーし、Prisma クライアントを生成し、Next.js の本番ビルドを実行します。
*   **`production` ステージ**: 最終的な本番環境用の軽量イメージを構築します。`builder` ステージで生成されたビルド成果物のみをコピーし、本番サーバーを起動します。

```dockerfile
# task-management-system/Dockerfile

FROM node:20-alpine AS base

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
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate # 生成されたPrismaクライアントは、実行時にDATABASE_URL (本番ではData Proxy URL) を使用します
RUN pnpm build

# 本番用
FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 21. ローカルでの Docker 起動手順

```bash
# Docker Composeでサービス起動
docker compose up -d

# 開発サーバー起動
docker compose up

# ブラウザでアクセス
open http://localhost:3000
```

---

## 22. 本番デプロイ手順（Docker）

### 22.1 Vercel での Docker デプロイ設定

1. Vercel Dashboard → Settings → Environment → "Dockerfile" を指定
2. `vercel.json` に以下の設定を追加

```json
{
  "builds": [
    {
      "src": "Dockerfile",
      "use": "docker"
    }
  ],
  "routes": [
    {
      "src": "/(.*)(\\/)?",
      "dest": "/"
    }
  ]
}
```

### 22.2 デプロイ実行

```bash
# Vercel CLI でデプロイ
vercel --prod
```

---

