# Zestark Task Management Tool

Next.js (App Router) + Prisma + NextAuth を使用したタスク管理システムです。

## 開発環境の起動

```bash
docker compose up -d
```

## GitHub Packages (GHCR) の利用

ビルド済みの Docker イメージを GitHub Container Registry から直接取得して実行できます。

### 1. ログイン (初回のみ)
```bash
echo $YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### 2. イメージの取得
```bash
docker pull ghcr.io/YOUR_GITHUB_USERNAME/zestark-task-management-tool:main
```

### 3. 実行
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="your_database_url" \
  -e NEXTAUTH_SECRET="your_secret" \
  ghcr.io/YOUR_GITHUB_USERNAME/zestark-task-management-tool:main
```

詳細なデプロイ・運用手順については [deploy.md] を参照してください。