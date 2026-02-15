# SQLマイグレーション設計書

## 1. テーブル設計

### 1.1 roles（ロール）

```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- 初期データ
INSERT INTO roles (id, name) VALUES
  (1, 'admin'),
  (2, 'editor'),
  (3, 'viewer');
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | SERIAL | NOT NULL | auto | 主キー |
| name | VARCHAR(50) | NOT NULL | - | ロール名（admin/editor/viewer） |

**制約**
- PRIMARY KEY: id
- UNIQUE: name

---

### 1.2 users（ユーザー）

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) 
    REFERENCES roles(id) ON DELETE RESTRICT
);

-- インデックス
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | 主キー |
| email | VARCHAR(255) | NOT NULL | - | メールアドレス |
| name | VARCHAR(100) | NOT NULL | - | 表示名 |
| password_hash | VARCHAR(255) | NOT NULL | - | bcryptハッシュ |
| role_id | INTEGER | NOT NULL | - | ロールID（外部キー） |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**
- PRIMARY KEY: id
- UNIQUE: email
- FOREIGN KEY: role_id → roles(id)

**インデックス**
- idx_users_email: email（ログイン高速化）
- idx_users_role_id: role_id（権限チェック高速化）

---

### 1.3 projects（プロジェクト）

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 初期データ（デフォルトプロジェクト）
INSERT INTO projects (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'デフォルトプロジェクト', '初期プロジェクト');
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | 主キー |
| name | VARCHAR(200) | NOT NULL | - | プロジェクト名 |
| description | TEXT | NULL | - | 説明 |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**
- PRIMARY KEY: id

---

### 1.4 tasks（タスク）

```sql
CREATE TYPE task_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE effort_level AS ENUM ('LIGHT', 'MEDIUM', 'HEAVY');

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  task_code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  status task_status NOT NULL DEFAULT 'NOT_STARTED',
  phase VARCHAR(100) NOT NULL,
  effort_hours DECIMAL(10, 2) NOT NULL,
  effort_level effort_level NOT NULL,
  description TEXT,
  locked_by UUID,
  locked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_id)
    REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_locked_by FOREIGN KEY (locked_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT unique_project_task_code UNIQUE (project_id, task_code)
);

-- インデックス
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_locked_by ON tasks(locked_by) WHERE locked_by IS NOT NULL;
CREATE INDEX idx_tasks_locked_at ON tasks(locked_at) WHERE locked_at IS NOT NULL;
```

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | 主キー（不変） |
| project_id | UUID | NOT NULL | - | プロジェクトID（外部キー） |
| task_code | VARCHAR(20) | NOT NULL | - | 表示用コード（例: T1-01） |
| name | VARCHAR(200) | NOT NULL | - | タスク名 |
| status | task_status | NOT NULL | NOT_STARTED | ステータス |
| phase | VARCHAR(100) | NOT NULL | - | フェーズ分類 |
| effort_hours | DECIMAL(10, 2) | NOT NULL | - | 工数（時間） |
| effort_level | effort_level | NOT NULL | - | 工数レベル |
| description | TEXT | NULL | - | 詳細説明 |
| locked_by | UUID | NULL | - | ロック中のユーザーID |
| locked_at | TIMESTAMP | NULL | - | ロック取得日時 |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**
- PRIMARY KEY: id
- UNIQUE: (project_id, task_code)
- FOREIGN KEY: project_id → projects(id) (CASCADE DELETE)
- FOREIGN KEY: locked_by → users(id) (SET NULL)

**インデックス**
- idx_tasks_project_id: project_id（一覧取得高速化）
- idx_tasks_status: status（ステータス別集計高速化）
- idx_tasks_project_status: (project_id, status)（複合検索高速化）
- idx_tasks_locked_by: locked_by（ロック状態検索、NULL除外）
- idx_tasks_locked_at: locked_at（期限チェック高速化、NULL除外）

---

## 2. マイグレーションファイル

### 2.1 初期マイグレーション

**ファイル名**: `prisma/migrations/20240101000000_init/migration.sql`

```sql
-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "effort_level" AS ENUM ('LIGHT', 'MEDIUM', 'HEAVY');

-- CreateTable: roles
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: projects
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tasks
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "task_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "task_status" NOT NULL DEFAULT 'NOT_STARTED',
    "phase" TEXT NOT NULL,
    "effort_hours" DECIMAL(10,2) NOT NULL,
    "effort_level" "effort_level" NOT NULL,
    "description" TEXT,
    "locked_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_id_idx" ON "users"("role_id");
CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_project_id_status_idx" ON "tasks"("project_id", "status");
CREATE INDEX "tasks_locked_by_idx" ON "tasks"("locked_by") WHERE "locked_by" IS NOT NULL;
CREATE INDEX "tasks_locked_at_idx" ON "tasks"("locked_at") WHERE "locked_at" IS NOT NULL;
CREATE UNIQUE INDEX "tasks_project_id_task_code_key" ON "tasks"("project_id", "task_code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## 3. シードデータ

### 3.1 seed.ts

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. ロール作成
  console.log('Creating roles...');
  const adminRole = await prisma.role.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'admin' }
  });

  const editorRole = await prisma.role.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'editor' }
  });

  const viewerRole = await prisma.role.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, name: 'viewer' }
  });

  // 2. 管理者ユーザー作成
  console.log('Creating admin user...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'システム管理者',
      password_hash: adminPasswordHash,
      role_id: adminRole.id
    }
  });

  // 3. テスト用エディターユーザー作成
  console.log('Creating editor user...');
  const editorPasswordHash = await bcrypt.hash('editor123', 10);
  await prisma.user.upsert({
    where: { email: 'editor@example.com' },
    update: {},
    create: {
      email: 'editor@example.com',
      name: 'テスト編集者',
      password_hash: editorPasswordHash,
      role_id: editorRole.id
    }
  });

  // 4. テスト用閲覧者ユーザー作成
  console.log('Creating viewer user...');
  const viewerPasswordHash = await bcrypt.hash('viewer123', 10);
  await prisma.user.upsert({
    where: { email: 'viewer@example.com' },
    update: {},
    create: {
      email: 'viewer@example.com',
      name: 'テスト閲覧者',
      password_hash: viewerPasswordHash,
      role_id: viewerRole.id
    }
  });

  // 5. デフォルトプロジェクト作成
  console.log('Creating default project...');
  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'デフォルトプロジェクト',
      description: '初期プロジェクト'
    }
  });

  // 6. サンプルタスク作成（任意）
  console.log('Creating sample tasks...');
  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      project_id: project.id,
      task_code: 'T1-01',
      name: '要件定義',
      status: 'COMPLETED',
      phase: '第1段階',
      effort_hours: 8.0,
      effort_level: 'MEDIUM',
      description: '要件定義書の作成'
    }
  });

  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0000-000000000102' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000102',
      project_id: project.id,
      task_code: 'T1-02',
      name: 'DB設計',
      status: 'IN_PROGRESS',
      phase: '第1段階',
      effort_hours: 16.0,
      effort_level: 'HEAVY',
      description: 'データベース設計'
    }
  });

  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0000-000000000103' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000103',
      project_id: project.id,
      task_code: 'T2-01',
      name: 'フロントエンド実装',
      status: 'NOT_STARTED',
      phase: '第2段階',
      effort_hours: 24.0,
      effort_level: 'HEAVY',
      description: 'React UIコンポーネント作成'
    }
  });

  console.log('✅ Seeding completed!');
  console.log('\n📝 Login credentials:');
  console.log('Admin  - Email: admin@example.com   Password: admin123');
  console.log('Editor - Email: editor@example.com  Password: editor123');
  console.log('Viewer - Email: viewer@example.com  Password: viewer123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 3.2 package.jsonへの追加

```json
{
  "scripts": {
    "db:seed": "tsx prisma/seed.ts"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## 4. 運用イメージ

### 4.1 開発環境セットアップ

```bash
# 1. データベース作成（Vercel Postgresの場合は自動）
# Localの場合:
createdb task_management_dev

# 2. 環境変数設定
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/task_management_dev" > .env.local

# 3. Prismaセットアップ
pnpm prisma generate

# 4. マイグレーション実行
pnpm prisma migrate dev --name init

# 5. シードデータ投入
pnpm db:seed

# 6. 確認
pnpm prisma studio
```

### 4.2 本番環境デプロイ時

```bash
# Vercel環境変数設定（Dashboard or CLI）
vercel env add DATABASE_URL production

# デプロイ時に自動実行される
# 1. prisma generate
# 2. prisma migrate deploy（本番用マイグレーション）
# 3. next build
```

### 4.3 マイグレーション追加時

```bash
# 新しいマイグレーション作成
pnpm prisma migrate dev --name add_column_xxx

# 本番反映
pnpm prisma migrate deploy
```

---

## 5. データ型選定理由

| 項目 | 型 | 理由 |
|------|---|------|
| id | UUID | グローバル一意性、セキュリティ |
| email | VARCHAR(255) | RFC 5321準拠 |
| password_hash | VARCHAR(255) | bcrypt出力長（60文字）に余裕を持たせる |
| effort_hours | DECIMAL(10,2) | 精度保証（999999.99時間まで対応） |
| task_code | VARCHAR(20) | T1-01形式、余裕を持たせる |
| status/effort_level | ENUM | 値制約、パフォーマンス向上 |
| description | TEXT | 長文対応 |

---

## 6. 制約設計

### 6.1 外部キー制約

```sql
-- ユーザーのロール削除防止
ALTER TABLE users 
  ADD CONSTRAINT fk_users_role 
  FOREIGN KEY (role_id) REFERENCES roles(id) 
  ON DELETE RESTRICT;

-- プロジェクト削除時、関連タスクも削除
ALTER TABLE tasks 
  ADD CONSTRAINT fk_tasks_project 
  FOREIGN KEY (project_id) REFERENCES projects(id) 
  ON DELETE CASCADE;

-- ユーザー削除時、ロック情報のみNULL化
ALTER TABLE tasks 
  ADD CONSTRAINT fk_tasks_locked_by 
  FOREIGN KEY (locked_by) REFERENCES users(id) 
  ON DELETE SET NULL;
```

### 6.2 ユニーク制約

```sql
-- プロジェクト内でtask_codeは一意
ALTER TABLE tasks 
  ADD CONSTRAINT unique_project_task_code 
  UNIQUE (project_id, task_code);

-- メールアドレスは全体で一意
ALTER TABLE users 
  ADD CONSTRAINT unique_email 
  UNIQUE (email);
```

---

## 7. パフォーマンスチューニング

### 7.1 インデックス戦略

```sql
-- 頻繁に使うクエリに対応
-- 1. タスク一覧取得（プロジェクトごと）
CREATE INDEX idx_tasks_project_id ON tasks(project_id);

-- 2. ステータス別集計
CREATE INDEX idx_tasks_status ON tasks(status);

-- 3. プロジェクト×ステータス検索（複合）
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);

-- 4. ロック中タスク検索（NULL除外で効率化）
CREATE INDEX idx_tasks_locked_by ON tasks(locked_by) 
  WHERE locked_by IS NOT NULL;

-- 5. ロック期限チェック（NULL除外で効率化）
CREATE INDEX idx_tasks_locked_at ON tasks(locked_at) 
  WHERE locked_at IS NOT NULL;
```

### 7.2 統計情報更新

```sql
-- 定期的にANALYZE実行（Vercel Postgresは自動）
ANALYZE tasks;
ANALYZE users;
```

---

## 8. バックアップ＆リストア

### 8.1 バックアップコマンド

```bash
# ローカル環境
pg_dump -h localhost -U user -d task_management_dev > backup.sql

# Vercel Postgresの場合
# Dashboard上で自動バックアップ設定
```

### 8.2 リストア

```bash
# ローカル環境
psql -h localhost -U user -d task_management_dev < backup.sql
```

---

## 9. データ削除ポリシー

### 9.1 論理削除（将来拡張）

現在は物理削除だが、将来的に論理削除を実装する場合：

```sql
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- 削除クエリ
UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?;

-- 一覧取得時は deleted_at IS NULL で絞る
SELECT * FROM tasks WHERE deleted_at IS NULL;
```

### 9.2 物理削除

現在は以下の挙動：
- プロジェクト削除 → 関連タスク CASCADE DELETE
- ユーザー削除 → ロック情報 SET NULL
- ロール削除 → RESTRICT（関連ユーザーがいたら削除不可）

---

## 10. データ整合性チェッククエリ

### 10.1 孤立レコード検出

```sql
-- ロックユーザーが存在しないタスク
SELECT * FROM tasks 
WHERE locked_by IS NOT NULL 
  AND locked_by NOT IN (SELECT id FROM users);

-- 存在しないプロジェクトを参照しているタスク
SELECT * FROM tasks 
WHERE project_id NOT IN (SELECT id FROM projects);
```

### 10.2 ロック期限切れタスク

```sql
-- 15分以上ロックされているタスク
SELECT 
  t.id,
  t.name,
  u.name AS locked_by_user,
  t.locked_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.locked_at)) / 60 AS minutes_locked
FROM tasks t
JOIN users u ON t.locked_by = u.id
WHERE t.locked_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes';
```

---