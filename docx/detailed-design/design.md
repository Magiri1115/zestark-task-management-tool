# 詳細設計書

## 1. 概要

### 1.1 システム名称
**AI構造強制型タスク管理システム**

### 1.2 目的
AIが生成した構造化タスクを管理し、工数・進捗を可視化することで実行効率を最大化する。

### 1.3 設計方針
- IDは不変（UUID主キー）
- 構造を強制し、自由度を制限
- 数値データはDB正規化
- 自動算出可能なものはすべて自動化
- UI体験を重視
- 将来的なSaaS化・AI連携を視野に入れる

### 1.4 想定ユーザー数
- 同時接続：100人
- 初期段階：単一プロジェクト運用
- 将来拡張：マルチプロジェクト対応

---

## 2. 技術選定

### 2.1 技術スタック

| レイヤー | 技術 | バージョン | 選定理由 |
|---------|------|-----------|---------|
| フロントエンド | Next.js (App Router) | 14.x | RSC対応、最新機能活用 |
| 言語 | TypeScript | 5.x | 型安全性、保守性向上 |
| バックエンド | Next.js Server Actions | 14.x | APIレス設計、型共有 |
| データベース | PostgreSQL (Vercel Postgres) | 15.x | リレーショナルDB、Vercel統合 |
| ORM | Prisma | 5.x | 型安全、マイグレーション管理 |
| 認証 | NextAuth.js | 5.x (Auth.js) | OAuth対応、セッション管理 |
| UI Framework | Tailwind CSS | 3.x | ユーティリティファースト |
| グラフ描画 | Recharts | 2.x | React統合、シンプル |
| Excel出力 | ExcelJS | 4.x | サーバーサイド生成、高機能 |
| デプロイ | Vercel | - | Next.js最適化、自動CI/CD |
| パッケージ管理 | pnpm | 8.x | 高速、ディスク効率 |

### 2.2 認証方式詳細

#### NextAuth.js 設定
- **プロバイダー**: Credentials（メール + パスワード）
- **セッション戦略**: JWT
- **セッション有効期限**: 7日間
- **パスワードハッシュ**: bcrypt (rounds: 10)

#### 認証フロー
```
1. ユーザーがログインフォームに入力
2. Server Action経由で認証リクエスト
3. DB照合（email, password_hash）
4. JWT生成、セッション確立
5. ロール情報をセッションに含める
```

---

## 3. システム構成

### 3.1 アーキテクチャ図

```
┌─────────────────────────────────────────┐
│         Browser (Client)                │
│  ┌─────────────────────────────────┐   │
│  │  Next.js App (Client Component) │   │
│  │  - タスク一覧表示                  │   │
│  │  - モーダル編集UI                  │   │
│  │  - グラフ表示 (Recharts)          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↓ ↑ (Fetch / Server Action)
┌─────────────────────────────────────────┐
│      Next.js Server (Vercel Edge)       │
│  ┌─────────────────────────────────┐   │
│  │  Server Components              │   │
│  │  - 初期データ取得                  │   │
│  │  - キャッシュ戦略                  │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Server Actions                 │   │
│  │  - createTask                   │   │
│  │  - updateTask                   │   │
│  │  - deleteTask                   │   │
│  │  - lockTask / unlockTask        │   │
│  │  - exportExcel                  │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  NextAuth.js Middleware         │   │
│  │  - セッション検証                  │   │
│  │  - ロールチェック                  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↓ ↑ (Prisma Client)
┌─────────────────────────────────────────┐
│    PostgreSQL (Vercel Postgres)         │
│  - users                                │
│  - roles                                │
│  - projects                             │
│  - tasks                                │
└─────────────────────────────────────────┘
```

### 3.2 ディレクトリ構成

```
project-root/
├── prisma/
│   ├── schema.prisma          # DBスキーマ定義
│   ├── migrations/            # マイグレーションファイル
│   └── seed.ts                # 初期データ投入
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx     # 認証済みレイアウト
│   │   │   └── tasks/
│   │   │       └── page.tsx   # タスク一覧ページ
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   ├── layout.tsx         # ルートレイアウト
│   │   └── globals.css
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginForm.tsx
│   │   ├── tasks/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskEditModal.tsx
│   │   │   ├── TaskRow.tsx
│   │   │   └── CompletionChart.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       └── Select.tsx
│   ├── lib/
│   │   ├── auth.ts            # NextAuth設定
│   │   ├── prisma.ts          # Prismaクライアント
│   │   ├── validations.ts     # Zodスキーマ
│   │   └── utils.ts           # 共通ユーティリティ
│   ├── actions/
│   │   ├── task.actions.ts    # タスク関連Server Actions
│   │   ├── auth.actions.ts    # 認証関連Server Actions
│   │   └── excel.actions.ts   # Excel出力Server Action
│   ├── types/
│   │   ├── task.ts
│   │   ├── user.ts
│   │   └── index.ts
│   └── middleware.ts          # 認証ミドルウェア
├── public/
│   └── images/
├── .env.local                 # 環境変数（Gitignore）
├── .env.example               # 環境変数テンプレート
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. ドメイン設計

### 4.1 エンティティ定義

#### User（ユーザー）
| プロパティ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| id | UUID | ○ | 主キー |
| email | String | ○ | メールアドレス（ユニーク） |
| name | String | ○ | 表示名 |
| password_hash | String | ○ | bcryptハッシュ |
| role_id | Int | ○ | ロールID（外部キー） |
| created_at | DateTime | ○ | 作成日時 |
| updated_at | DateTime | ○ | 更新日時 |

#### Role（ロール）
| プロパティ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| id | Int | ○ | 主キー |
| name | String | ○ | ロール名（admin/editor/viewer） |

#### Project（プロジェクト）
| プロパティ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| id | UUID | ○ | 主キー |
| name | String | ○ | プロジェクト名 |
| description | String | × | 説明 |
| created_at | DateTime | ○ | 作成日時 |
| updated_at | DateTime | ○ | 更新日時 |

#### Task（タスク）
| プロパティ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| id | UUID | ○ | 主キー（不変） |
| project_id | UUID | ○ | プロジェクトID（外部キー） |
| task_code | String | ○ | 表示用コード（例: T1-01） |
| name | String | ○ | タスク名 |
| status | Enum | ○ | NOT_STARTED / IN_PROGRESS / COMPLETED |
| phase | String | ○ | フェーズ分類 |
| effort_hours | Decimal | ○ | 工数（時間） |
| effort_level | Enum | ○ | LIGHT / MEDIUM / HEAVY |
| description | String | × | 詳細説明 |
| locked_by | UUID | × | ロック中のユーザーID |
| locked_at | DateTime | × | ロック取得日時 |
| created_at | DateTime | ○ | 作成日時 |
| updated_at | DateTime | ○ | 更新日時 |

### 4.2 Enum定義

```typescript
// TaskStatus
enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

// EffortLevel
enum EffortLevel {
  LIGHT = 'LIGHT',
  MEDIUM = 'MEDIUM',
  HEAVY = 'HEAVY'
}

// RoleName
enum RoleName {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}
```

---

## 5. エンティティ関係図（ER図）

```
┌─────────────┐
│   roles     │
│─────────────│
│ id (PK)     │
│ name        │
└─────────────┘
       ↑
       │ 1
       │
       │ N
┌─────────────────┐         ┌──────────────┐
│     users       │         │   projects   │
│─────────────────│         │──────────────│
│ id (PK)         │         │ id (PK)      │
│ email           │         │ name         │
│ name            │         │ description  │
│ password_hash   │         │ created_at   │
│ role_id (FK)    │         │ updated_at   │
│ created_at      │         └──────────────┘
│ updated_at      │                ↑
└─────────────────┘                │ 1
       ↑                           │
       │ 1                         │ N
       │                    ┌──────────────────┐
       │ N                  │      tasks       │
       │                    │──────────────────│
       └────────────────────│ id (PK)          │
         (locked_by)        │ project_id (FK)  │
                            │ task_code        │
                            │ name             │
                            │ status           │
                            │ phase            │
                            │ effort_hours     │
                            │ effort_level     │
                            │ description      │
                            │ locked_by (FK)   │
                            │ locked_at        │
                            │ created_at       │
                            │ updated_at       │
                            └──────────────────┘
```

### 5.1 リレーション

- `users.role_id` → `roles.id` (Many-to-One)
- `tasks.project_id` → `projects.id` (Many-to-One)
- `tasks.locked_by` → `users.id` (Many-to-One, nullable)

---

## 6. ロジック設計

### 6.1 自動算出ロジック

#### 6.1.1 タスク総数
```typescript
const totalTasks = await prisma.task.count({
  where: { project_id: projectId }
});
```

#### 6.1.2 総工数
```typescript
const totalEffort = await prisma.task.aggregate({
  where: { project_id: projectId },
  _sum: { effort_hours: true }
});
```

#### 6.1.3 完了率
```typescript
const completedCount = await prisma.task.count({
  where: { 
    project_id: projectId,
    status: 'COMPLETED'
  }
});

const completionRate = (completedCount / totalTasks) * 100;
```

### 6.2 ロック制御ロジック

#### 6.2.1 ロック取得（lockTask）
```typescript
// 1. ロック状態確認
const task = await prisma.task.findUnique({
  where: { id: taskId },
  include: { locked_by_user: true }
});

// 2. ロック期限チェック（15分）
const LOCK_TIMEOUT_MINUTES = 15;
const isLockExpired = task.locked_at && 
  (Date.now() - task.locked_at.getTime()) > LOCK_TIMEOUT_MINUTES * 60 * 1000;

// 3. ロック取得可能判定
if (task.locked_by && !isLockExpired) {
  throw new Error(`タスクは ${task.locked_by_user.name} が編集中です`);
}

// 4. ロック取得
await prisma.task.update({
  where: { id: taskId },
  data: {
    locked_by: userId,
    locked_at: new Date()
  }
});
```

#### 6.2.2 ロック解除（unlockTask）
```typescript
// 管理者のみ強制解除可能
if (userRole === 'admin' || task.locked_by === userId) {
  await prisma.task.update({
    where: { id: taskId },
    data: {
      locked_by: null,
      locked_at: null
    }
  });
}
```

#### 6.2.3 更新時ロック検証
```typescript
// 更新前にロック所有者確認
const task = await prisma.task.findUnique({ where: { id: taskId } });

if (task.locked_by !== userId) {
  throw new Error('ロックを保持していないため更新できません');
}

// 更新とロック解除を同一トランザクションで実行
await prisma.task.update({
  where: { id: taskId },
  data: {
    ...updateData,
    locked_by: null,
    locked_at: null,
    updated_at: new Date()
  }
});
```

### 6.3 キャッシュ戦略

#### 6.3.1 読み取り戦略
```typescript
// Server Component（一覧取得）
export default async function TasksPage() {
  const tasks = await getTasks(); // キャッシュ有効
  return <TaskList tasks={tasks} />;
}

// Next.js自動キャッシュ（fetch cache）
export async function getTasks() {
  const tasks = await prisma.task.findMany({
    include: { locked_by_user: true }
  });
  return tasks;
}
```

#### 6.3.2 書き込み後再検証
```typescript
'use server'

import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateTask(taskId: string, data: UpdateTaskInput) {
  // DB更新
  await prisma.task.update({
    where: { id: taskId },
    data: { ...data, updated_at: new Date() }
  });
  
  // キャッシュ再検証
  revalidatePath('/tasks');
  revalidateTag('tasks');
  
  return { success: true };
}
```

### 6.4 認証・認可ロジック

#### 6.4.1 ミドルウェアによるルート保護
```typescript
// src/middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      // 認証が必要なルート
      if (req.nextUrl.pathname.startsWith('/tasks')) {
        return !!token;
      }
      return true;
    }
  }
});

export const config = {
  matcher: ['/tasks/:path*', '/api/:path*']
};
```

#### 6.4.2 Server Actionでのロール検証
```typescript
async function checkPermission(userId: string, action: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });
  
  const permissions = {
    admin: ['create', 'read', 'update', 'delete', 'unlock'],
    editor: ['create', 'read', 'update'],
    viewer: ['read']
  };
  
  if (!permissions[user.role.name]?.includes(action)) {
    throw new Error('権限がありません');
  }
}
```

### 6.5 Excel出力ロジック

```typescript
import ExcelJS from 'exceljs';

export async function exportTasksToExcel(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { project_id: projectId },
    select: {
      task_code: true,
      name: true,
      effort_hours: true
    },
    orderBy: { task_code: 'asc' }
  });
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('タスク一覧');
  
  // ヘッダー
  worksheet.columns = [
    { header: 'ID', key: 'task_code', width: 15 },
    { header: 'タスク名', key: 'name', width: 40 },
    { header: '工数（時間）', key: 'effort_hours', width: 15 }
  ];
  
  // データ追加
  worksheet.addRows(tasks);
  
  // スタイル適用
  worksheet.getRow(1).font = { bold: true };
  
  // Buffer生成
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
```

---

## 7. API設計（Server Actions）

### 7.1 タスク操作API

#### 7.1.1 getTasks
```typescript
export async function getTasks(projectId: string) {
  return await prisma.task.findMany({
    where: { project_id: projectId },
    include: {
      locked_by_user: {
        select: { id: true, name: true }
      }
    },
    orderBy: { task_code: 'asc' }
  });
}
```

#### 7.1.2 createTask
```typescript
export async function createTask(data: CreateTaskInput) {
  // 権限チェック
  await checkPermission(session.user.id, 'create');
  
  // task_code自動生成
  const lastTask = await prisma.task.findFirst({
    where: { project_id: data.project_id },
    orderBy: { task_code: 'desc' }
  });
  
  const nextCode = generateNextTaskCode(lastTask?.task_code);
  
  const task = await prisma.task.create({
    data: {
      ...data,
      task_code: nextCode,
      id: crypto.randomUUID()
    }
  });
  
  revalidatePath('/tasks');
  return task;
}
```

#### 7.1.3 updateTask
```typescript
export async function updateTask(
  taskId: string, 
  data: UpdateTaskInput
) {
  await checkPermission(session.user.id, 'update');
  
  // ロック検証
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (task.locked_by !== session.user.id) {
    throw new Error('ロックを保持していません');
  }
  
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...data,
      locked_by: null,
      locked_at: null,
      updated_at: new Date()
    }
  });
  
  revalidatePath('/tasks');
  return updated;
}
```

#### 7.1.4 deleteTask
```typescript
export async function deleteTask(taskId: string) {
  await checkPermission(session.user.id, 'delete');
  
  // 論理削除（将来拡張用）
  await prisma.task.update({
    where: { id: taskId },
    data: { deleted_at: new Date() }
  });
  
  revalidatePath('/tasks');
  return { success: true };
}
```

#### 7.1.5 lockTask
```typescript
export async function lockTask(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { locked_by_user: true }
  });
  
  // 期限チェック
  const LOCK_TIMEOUT = 15 * 60 * 1000; // 15分
  const isExpired = task.locked_at && 
    (Date.now() - task.locked_at.getTime()) > LOCK_TIMEOUT;
  
  if (task.locked_by && !isExpired) {
    throw new Error(
      `${task.locked_by_user.name} が編集中です（${formatLockTime(task.locked_at)}）`
    );
  }
  
  await prisma.task.update({
    where: { id: taskId },
    data: {
      locked_by: session.user.id,
      locked_at: new Date()
    }
  });
  
  return { success: true };
}
```

#### 7.1.6 unlockTask（管理者のみ）
```typescript
export async function unlockTask(taskId: string) {
  // 管理者権限チェック
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  });
  
  if (user.role.name !== 'admin') {
    throw new Error('管理者のみ実行可能です');
  }
  
  await prisma.task.update({
    where: { id: taskId },
    data: {
      locked_by: null,
      locked_at: null
    }
  });
  
  revalidatePath('/tasks');
  return { success: true };
}
```

### 7.2 認証API

#### 7.2.1 login
```typescript
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  });
  
  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }
  
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error('パスワードが正しくありません');
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role.name
  };
}
```

### 7.3 統計API

#### 7.3.1 getProjectStats
```typescript
export async function getProjectStats(projectId: string) {
  const [total, completed, totalEffort] = await Promise.all([
    prisma.task.count({ where: { project_id: projectId } }),
    prisma.task.count({ 
      where: { project_id: projectId, status: 'COMPLETED' } 
    }),
    prisma.task.aggregate({
      where: { project_id: projectId },
      _sum: { effort_hours: true }
    })
  ]);
  
  return {
    totalTasks: total,
    completedTasks: completed,
    completionRate: (completed / total) * 100,
    totalEffort: totalEffort._sum.effort_hours || 0
  };
}
```

---

## 8. 環境構築

### 8.1 必要な環境変数

```env
# .env.example

# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl"

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 8.2 セットアップ手順

#### 8.2.1 初期セットアップ
```bash
# 1. リポジトリクローン
git clone <repository-url>
cd project-root

# 2. 依存関係インストール
pnpm install

# 3. 環境変数設定
cp .env.example .env.local
# .env.localを編集（DATABASE_URL, NEXTAUTH_SECRETなど）

# 4. Prismaセットアップ
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm prisma db seed

# 5. 開発サーバー起動
pnpm dev
```

#### 8.2.2 Vercel Postgresセットアップ
```bash
# Vercel CLIインストール
npm i -g vercel

# プロジェクト連携
vercel link

# Postgresアドオン追加
vercel postgres create

# 環境変数自動設定
vercel env pull .env.local
```

### 8.3 初期データ（Seed）

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ロール作成
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
  
  // 管理者ユーザー作成
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'システム管理者',
      password_hash: passwordHash,
      role_id: adminRole.id
    }
  });
  
  // デフォルトプロジェクト作成
  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'デフォルトプロジェクト',
      description: '初期プロジェクト'
    }
  });
  
  console.log('✅ Seed完了');
  console.log('管理者ログイン情報:');
  console.log('Email: admin@example.com');
  console.log('Password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 8.4 package.json

```json
{
  "name": "task-management-system",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "test": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.14.0",
    "next-auth": "^5.0.0-beta.19",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.0",
    "recharts": "^2.12.0",
    "exceljs": "^4.4.0",
    "tailwindcss": "^3.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.4.0",
    "prisma": "^5.14.0",
    "tsx": "^4.7.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "vitest": "^1.6.0",
    "@playwright/test": "^1.44.0"
  }
}
```

---

## 9. ファイル・フォルダ構成と記述内容

### 9.1 コアファイル詳細

#### prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Role {
  id    Int    @id @default(autoincrement())
  name  String @unique

  users User[]
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String
  password_hash String
  role_id       Int
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  role         Role   @relation(fields: [role_id], references: [id])
  locked_tasks Task[] @relation("LockedBy")
}

model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  tasks Task[]
}

enum TaskStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

enum EffortLevel {
  LIGHT
  MEDIUM
  HEAVY
}

model Task {
  id           String       @id @default(uuid())
  project_id   String
  task_code    String
  name         String
  status       TaskStatus   @default(NOT_STARTED)
  phase        String
  effort_hours Decimal      @db.Decimal(10, 2)
  effort_level EffortLevel
  description  String?
  locked_by    String?
  locked_at    DateTime?
  created_at   DateTime     @default(now())
  updated_at   DateTime     @updatedAt

  project         Project @relation(fields: [project_id], references: [id], onDelete: Cascade)
  locked_by_user  User?   @relation("LockedBy", fields: [locked_by], references: [id])

  @@unique([project_id, task_code])
  @@index([project_id])
  @@index([status])
}
```

#### src/lib/auth.ts
```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from './prisma';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      authorize: async (credentials) => {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { role: true }
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.name
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60 // 7日間
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role;
      return session;
    }
  },
  pages: {
    signIn: '/login'
  }
});
```

#### src/middleware.ts
```typescript
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/tasks', req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
```

#### src/actions/task.actions.ts
```typescript
'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15分

export async function lockTask(taskId: string) {
  const session = await auth();
  if (!session) throw new Error('認証が必要です');

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { locked_by_user: true }
  });

  if (!task) throw new Error('タスクが見つかりません');

  // ロック期限チェック
  const isExpired = task.locked_at &&
    (Date.now() - task.locked_at.getTime()) > LOCK_TIMEOUT_MS;

  if (task.locked_by && !isExpired) {
    throw new Error(
      `${task.locked_by_user?.name} が編集中です`
    );
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      locked_by: session.user.id,
      locked_at: new Date()
    }
  });

  return { success: true };
}

export async function updateTask(
  taskId: string,
  data: {
    name?: string;
    status?: string;
    phase?: string;
    effort_hours?: number;
    effort_level?: string;
    description?: string;
  }
) {
  const session = await auth();
  if (!session) throw new Error('認証が必要です');

  const task = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (task?.locked_by !== session.user.id) {
    throw new Error('ロックを保持していません');
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      ...data,
      locked_by: null,
      locked_at: null,
      updated_at: new Date()
    }
  });

  revalidatePath('/tasks');
  return { success: true };
}
```

---

## 10. デプロイ構成

### 10.1 Vercelデプロイ設定

#### vercel.json
```json
{
  "buildCommand": "prisma generate && next build",
  "devCommand": "next dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

### 10.2 環境変数設定（Vercel Dashboard）

```
DATABASE_URL: [Vercel Postgres自動設定]
NEXTAUTH_URL: https://your-domain.vercel.app
NEXTAUTH_SECRET: [openssl rand -base64 32で生成]
NODE_ENV: production
```

### 10.3 ビルド＆デプロイフロー

```
1. GitHubへpush
   ↓
2. Vercel自動検知
   ↓
3. 依存関係インストール (pnpm install)
   ↓
4. Prisma生成 (prisma generate)
   ↓
5. Next.jsビルド (next build)
   ↓
6. デプロイ完了
   ↓
7. ヘルスチェック
```

---

## 11. パフォーマンス最適化

### 11.1 データベース最適化

#### インデックス戦略
```sql
-- タスク検索の高速化
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_locked_by ON tasks(locked_by) WHERE locked_by IS NOT NULL;

-- ロック期限チェック高速化
CREATE INDEX idx_tasks_locked_at ON tasks(locked_at) WHERE locked_at IS NOT NULL;
```

### 11.2 Next.jsキャッシュ戦略

```typescript
// 静的生成（可能な部分）
export const revalidate = 60; // 60秒キャッシュ

// 動的部分（ロック状態など）はキャッシュ無効化
export const dynamic = 'force-dynamic';
```

### 11.3 フロントエンド最適化

- React Server Components活用
- 動的インポートでコード分割
- 画像最適化（next/image）
- 不要な再レンダリング防止（React.memo）

---

## 12. セキュリティ対策

### 12.1 実装済み対策

| 項目 | 対策内容 |
|------|---------|
| CSRF | Next.js標準で保護 |
| XSS | React自動エスケープ |
| SQLインジェクション | Prisma（パラメータ化クエリ） |
| 認証 | NextAuth.js（JWT） |
| パスワード | bcrypt（rounds: 10） |
| セッション | HTTPOnly Cookie |

### 12.2 追加推奨対策

```typescript
// Rate Limiting（将来実装）
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

---

## 13. モニタリング＆ログ

### 13.1 ログ出力

```typescript
// src/lib/logger.ts
export function logError(error: Error, context: any) {
  console.error({
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    context
  });
}
```

### 13.2 Vercel Analytics
- 自動有効化
- Core Web Vitals計測
- リアルタイムアクセス解析

---