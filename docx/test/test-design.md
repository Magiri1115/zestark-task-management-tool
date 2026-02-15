# テスト設計書

## 1. テスト戦略

### 1.1 テストピラミッド

```
        ┌─────────────┐
        │   E2E Test  │  10%
        │  (Playwright)│
        └─────────────┘
      ┌───────────────────┐
      │ Integration Test  │  30%
      │   (Vitest + DB)   │
      └───────────────────┘
    ┌─────────────────────────┐
    │    Unit Test            │  60%
    │  (Vitest + Validation)  │
    └─────────────────────────┘
```

### 1.2 テスト範囲

| テスト種別 | 対象 | ツール | カバレッジ目標 |
|-----------|------|--------|--------------|
| 単体テスト | ユーティリティ関数、バリデーション | Vitest | 80% |
| 統合テスト | Server Actions、DB連携 | Vitest + Prisma | 70% |
| E2Eテスト | ユーザーフロー | Playwright | 主要シナリオのみ |

---

## 2. 単体テスト（Unit Test）

### 2.1 バリデーションテスト

#### 2.1.1 タスクバリデーション

```typescript
// src/lib/__tests__/validations.test.ts

import { describe, it, expect } from 'vitest';
import { taskSchema } from '@/lib/validations';

describe('taskSchema', () => {
  describe('name', () => {
    it('正常: 有効なタスク名', () => {
      const result = taskSchema.parse({
        name: '要件定義',
        status: 'NOT_STARTED',
        phase: '第1段階',
        effort_hours: 8.0,
        effort_level: 'MEDIUM'
      });
      
      expect(result.name).toBe('要件定義');
    });

    it('異常: 空文字', () => {
      expect(() => {
        taskSchema.parse({
          name: '',
          status: 'NOT_STARTED',
          phase: '第1段階',
          effort_hours: 8.0,
          effort_level: 'MEDIUM'
        });
      }).toThrow('タスク名は必須です');
    });

    it('異常: 201文字', () => {
      const longName = 'あ'.repeat(201);
      expect(() => {
        taskSchema.parse({
          name: longName,
          status: 'NOT_STARTED',
          phase: '第1段階',
          effort_hours: 8.0,
          effort_level: 'MEDIUM'
        });
      }).toThrow('タスク名は200文字以内です');
    });
  });

  describe('effort_hours', () => {
    it('正常: 0.01', () => {
      const result = taskSchema.parse({
        name: 'テスト',
        status: 'NOT_STARTED',
        phase: '第1段階',
        effort_hours: 0.01,
        effort_level: 'LIGHT'
      });
      
      expect(result.effort_hours).toBe(0.01);
    });

    it('正常: 9999.99', () => {
      const result = taskSchema.parse({
        name: 'テスト',
        status: 'NOT_STARTED',
        phase: '第1段階',
        effort_hours: 9999.99,
        effort_level: 'HEAVY'
      });
      
      expect(result.effort_hours).toBe(9999.99);
    });

    it('異常: 0', () => {
      expect(() => {
        taskSchema.parse({
          name: 'テスト',
          status: 'NOT_STARTED',
          phase: '第1段階',
          effort_hours: 0,
          effort_level: 'LIGHT'
        });
      }).toThrow('工数は0.01以上である必要があります');
    });

    it('異常: 10000', () => {
      expect(() => {
        taskSchema.parse({
          name: 'テスト',
          status: 'NOT_STARTED',
          phase: '第1段階',
          effort_hours: 10000,
          effort_level: 'HEAVY'
        });
      }).toThrow('工数は9999.99以下である必要があります');
    });
  });

  describe('status', () => {
    it('正常: NOT_STARTED', () => {
      const result = taskSchema.parse({
        name: 'テスト',
        status: 'NOT_STARTED',
        phase: '第1段階',
        effort_hours: 8.0,
        effort_level: 'MEDIUM'
      });
      
      expect(result.status).toBe('NOT_STARTED');
    });

    it('異常: 不正な値', () => {
      expect(() => {
        taskSchema.parse({
          name: 'テスト',
          status: 'INVALID_STATUS',
          phase: '第1段階',
          effort_hours: 8.0,
          effort_level: 'MEDIUM'
        });
      }).toThrow();
    });
  });
});
```

### 2.2 ユーティリティ関数テスト

#### 2.2.1 タスクコード生成

```typescript
// src/lib/__tests__/task-code-generator.test.ts

import { describe, it, expect } from 'vitest';
import { generateNextTaskCode } from '@/lib/utils';

describe('generateNextTaskCode', () => {
  it('初回生成: T1-01', () => {
    const result = generateNextTaskCode(undefined, '第1段階');
    expect(result).toBe('T1-01');
  });

  it('同フェーズ: T1-01 → T1-02', () => {
    const result = generateNextTaskCode('T1-01', '第1段階');
    expect(result).toBe('T1-02');
  });

  it('同フェーズ: T1-09 → T1-10', () => {
    const result = generateNextTaskCode('T1-09', '第1段階');
    expect(result).toBe('T1-10');
  });

  it('新フェーズ: T1-05 → T2-01', () => {
    const result = generateNextTaskCode('T1-05', '第2段階');
    expect(result).toBe('T2-01');
  });

  it('フェーズ番号抽出: 第3段階 → T3-01', () => {
    const result = generateNextTaskCode(undefined, '第3段階');
    expect(result).toBe('T3-01');
  });
});
```

#### 2.2.2 ロック期限チェック

```typescript
// src/lib/__tests__/lock-checker.test.ts

import { describe, it, expect } from 'vitest';
import { isLockExpired } from '@/lib/utils';

describe('isLockExpired', () => {
  it('期限内: 14分経過', () => {
    const lockedAt = new Date(Date.now() - 14 * 60 * 1000);
    expect(isLockExpired(lockedAt)).toBe(false);
  });

  it('期限切れ: 16分経過', () => {
    const lockedAt = new Date(Date.now() - 16 * 60 * 1000);
    expect(isLockExpired(lockedAt)).toBe(true);
  });

  it('境界値: ちょうど15分', () => {
    const lockedAt = new Date(Date.now() - 15 * 60 * 1000);
    expect(isLockExpired(lockedAt)).toBe(false);
  });

  it('NULL: false', () => {
    expect(isLockExpired(null)).toBe(false);
  });
});
```

---

## 3. 統合テスト（Integration Test）

### 3.1 Server Actionsテスト

#### 3.1.1 テスト用DB設定

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['**/*.integration.test.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

```typescript
// src/__tests__/setup.ts

import { beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL
    }
  }
});

beforeAll(async () => {
  // マイグレーション実行
  await prisma.$executeRaw`CREATE DATABASE IF NOT EXISTS test_db`;
});

afterEach(async () => {
  // テストデータクリーンアップ
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.project.deleteMany();
  await prisma.role.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
```

#### 3.1.2 タスク作成テスト

```typescript
// src/actions/__tests__/task.integration.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { createTask } from '@/actions/task.actions';
import { prisma } from '@/__tests__/setup';
import bcrypt from 'bcryptjs';

describe('createTask Integration', () => {
  let adminUser: any;
  let project: any;

  beforeEach(async () => {
    // ロール作成
    const adminRole = await prisma.role.create({
      data: { id: 1, name: 'admin' }
    });

    // ユーザー作成
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Test Admin',
        password_hash: await bcrypt.hash('password', 10),
        role_id: adminRole.id
      }
    });

    // プロジェクト作成
    project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test'
      }
    });
  });

  it('正常: タスク作成成功', async () => {
    const task = await createTask({
      project_id: project.id,
      name: '要件定義',
      phase: '第1段階',
      effort_hours: 8.0,
      effort_level: 'MEDIUM'
    });

    expect(task.name).toBe('要件定義');
    expect(task.task_code).toBe('T1-01');
    expect(task.status).toBe('NOT_STARTED');
  });

  it('正常: task_code自動インクリメント', async () => {
    await createTask({
      project_id: project.id,
      name: 'タスク1',
      phase: '第1段階',
      effort_hours: 8.0,
      effort_level: 'MEDIUM'
    });

    const task2 = await createTask({
      project_id: project.id,
      name: 'タスク2',
      phase: '第1段階',
      effort_hours: 8.0,
      effort_level: 'MEDIUM'
    });

    expect(task2.task_code).toBe('T1-02');
  });

  it('異常: 不正なproject_id', async () => {
    await expect(
      createTask({
        project_id: '00000000-0000-0000-0000-000000000000',
        name: 'テスト',
        phase: '第1段階',
        effort_hours: 8.0,
        effort_level: 'MEDIUM'
      })
    ).rejects.toThrow();
  });
});
```

#### 3.1.3 ロック取得テスト

```typescript
// src/actions/__tests__/lock.integration.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { lockTask } from '@/actions/task.actions';
import { prisma } from '@/__tests__/setup';

describe('lockTask Integration', () => {
  let user1: any;
  let user2: any;
  let task: any;

  beforeEach(async () => {
    // セットアップ
    const editorRole = await prisma.role.create({
      data: { id: 2, name: 'editor' }
    });

    user1 = await prisma.user.create({
      data: {
        email: 'user1@test.com',
        name: 'User 1',
        password_hash: 'hash',
        role_id: editorRole.id
      }
    });

    user2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        name: 'User 2',
        password_hash: 'hash',
        role_id: editorRole.id
      }
    });

    const project = await prisma.project.create({
      data: { name: 'Test Project' }
    });

    task = await prisma.task.create({
      data: {
        project_id: project.id,
        task_code: 'T1-01',
        name: 'テスト',
        status: 'NOT_STARTED',
        phase: '第1段階',
        effort_hours: 8.0,
        effort_level: 'MEDIUM'
      }
    });
  });

  it('正常: 未ロック状態からロック取得', async () => {
    await lockTask(task.id, user1.id);

    const locked = await prisma.task.findUnique({
      where: { id: task.id }
    });

    expect(locked?.locked_by).toBe(user1.id);
    expect(locked?.locked_at).toBeTruthy();
  });

  it('異常: 他ユーザーがロック中', async () => {
    // user1がロック取得
    await lockTask(task.id, user1.id);

    // user2がロック取得を試みる
    await expect(
      lockTask(task.id, user2.id)
    ).rejects.toThrow('User 1が編集中です');
  });

  it('正常: ロック期限切れ後に取得', async () => {
    // user1がロック取得（16分前）
    await prisma.task.update({
      where: { id: task.id },
      data: {
        locked_by: user1.id,
        locked_at: new Date(Date.now() - 16 * 60 * 1000)
      }
    });

    // user2がロック取得（成功）
    await lockTask(task.id, user2.id);

    const locked = await prisma.task.findUnique({
      where: { id: task.id }
    });

    expect(locked?.locked_by).toBe(user2.id);
  });
});
```

### 3.2 統計計算テスト

```typescript
// src/actions/__tests__/stats.integration.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { getProjectStats } from '@/actions/task.actions';
import { prisma } from '@/__tests__/setup';

describe('getProjectStats Integration', () => {
  let project: any;

  beforeEach(async () => {
    project = await prisma.project.create({
      data: { name: 'Test Project' }
    });

    // タスク3件作成
    await prisma.task.createMany({
      data: [
        {
          project_id: project.id,
          task_code: 'T1-01',
          name: 'タスク1',
          status: 'COMPLETED',
          phase: '第1段階',
          effort_hours: 8.0,
          effort_level: 'MEDIUM'
        },
        {
          project_id: project.id,
          task_code: 'T1-02',
          name: 'タスク2',
          status: 'IN_PROGRESS',
          phase: '第1段階',
          effort_hours: 16.0,
          effort_level: 'HEAVY'
        },
        {
          project_id: project.id,
          task_code: 'T2-01',
          name: 'タスク3',
          status: 'NOT_STARTED',
          phase: '第2段階',
          effort_hours: 4.0,
          effort_level: 'LIGHT'
        }
      ]
    });
  });

  it('統計計算: 正確な値', async () => {
    const stats = await getProjectStats(project.id);

    expect(stats.totalTasks).toBe(3);
    expect(stats.completedTasks).toBe(1);
    expect(stats.inProgressTasks).toBe(1);
    expect(stats.notStartedTasks).toBe(1);
    expect(stats.completionRate).toBeCloseTo(33.33, 2);
    expect(stats.totalEffort).toBe(28.0);
  });

  it('タスク0件: completionRate = 0', async () => {
    await prisma.task.deleteMany({
      where: { project_id: project.id }
    });

    const stats = await getProjectStats(project.id);

    expect(stats.totalTasks).toBe(0);
    expect(stats.completionRate).toBe(0);
  });
});
```

---

## 4. E2Eテスト（End-to-End Test）

### 4.1 Playwright設定

```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

### 4.2 ログインフロー

```typescript
// e2e/auth.spec.ts

import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  test('正常: ログイン成功', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/tasks');
    await expect(page.locator('h1')).toContainText('タスク一覧');
  });

  test('異常: 不正な認証情報', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    await expect(page.locator('.toast-error')).toBeVisible();
  });

  test('未認証でのアクセス: /tasksへのリダイレクト', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL('/login');
  });
});
```

### 4.3 タスク編集フロー

```typescript
// e2e/task-edit.spec.ts

import { test, expect } from '@playwright/test';

test.describe('タスク編集フロー', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/tasks');
  });

  test('正常: タスク編集成功', async ({ page }) => {
    // タスク行をダブルクリック
    await page.locator('tr[data-task-id]').first().dblclick();

    // モーダル表示確認
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // タスク名変更
    await page.fill('input[name="name"]', '新しいタスク名');

    // ステータス変更
    await page.selectOption('select[name="status"]', 'IN_PROGRESS');

    // 保存
    await page.click('button:has-text("保存")');

    // モーダル閉じる
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // トースト表示
    await expect(page.locator('.toast-success')).toContainText('保存しました');

    // 一覧に反映
    await expect(page.locator('tr').first()).toContainText('新しいタスク名');
  });

  test('異常: バリデーションエラー', async ({ page }) => {
    await page.locator('tr[data-task-id]').first().dblclick();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // タスク名を空にする
    await page.fill('input[name="name"]', '');

    // 保存
    await page.click('button:has-text("保存")');

    // エラーメッセージ表示
    await expect(page.locator('.error-message')).toContainText('タスク名は必須です');
  });

  test('キャンセル: Escキー', async ({ page }) => {
    await page.locator('tr[data-task-id]').first().dblclick();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Escキー押下
    await page.keyboard.press('Escape');

    // モーダル閉じる
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});
```

### 4.4 ロック競合テスト

```typescript
// e2e/lock-conflict.spec.ts

import { test, expect } from '@playwright/test';

test.describe('ロック競合', () => {
  test('2ユーザーが同時編集: 後続ユーザーはエラー', async ({ browser }) => {
    // User 1
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    await page1.goto('/login');
    await page1.fill('input[name="email"]', 'admin@example.com');
    await page1.fill('input[name="password"]', 'admin123');
    await page1.click('button[type="submit"]');
    await page1.waitForURL('/tasks');

    // User 2
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    await page2.goto('/login');
    await page2.fill('input[name="email"]', 'editor@example.com');
    await page2.fill('input[name="password"]', 'editor123');
    await page2.click('button[type="submit"]');
    await page2.waitForURL('/tasks');

    // User 1がタスク編集開始
    await page1.locator('tr[data-task-id]').first().dblclick();
    await expect(page1.locator('[role="dialog"]')).toBeVisible();

    // User 2が同じタスクを編集しようとする
    await page2.locator('tr[data-task-id]').first().dblclick();

    // エラートースト表示
    await expect(page2.locator('.toast-error')).toContainText('が編集中です');

    // モーダルは表示されない
    await expect(page2.locator('[role="dialog"]')).not.toBeVisible();

    await context1.close();
    await context2.close();
  });
});
```

---

## 5. テスト実行

### 5.1 コマンド

```json
// package.json

{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "pnpm test:unit && pnpm test:integration && pnpm test:e2e"
  }
}
```

### 5.2 CI/CD統合（GitHub Actions）

```yaml
# .github/workflows/test.yml

name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test:unit

  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      - run: pnpm test:integration

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 6. カバレッジ目標

### 6.1 目標値

| 項目 | カバレッジ |
|------|-----------|
| バリデーション | 100% |
| ユーティリティ関数 | 90% |
| Server Actions | 80% |
| 全体 | 75% |

### 6.2 カバレッジレポート

```bash
# カバレッジ取得
pnpm test:unit --coverage

# HTMLレポート生成
open coverage/index.html
```

---

## 7. テストデータ管理

### 7.1 Fixtureファイル

```typescript
// src/__tests__/fixtures/users.ts

export const testUsers = {
  admin: {
    email: 'admin@test.com',
    name: 'Test Admin',
    password: 'password123',
    role: 'admin'
  },
  editor: {
    email: 'editor@test.com',
    name: 'Test Editor',
    password: 'password123',
    role: 'editor'
  },
  viewer: {
    email: 'viewer@test.com',
    name: 'Test Viewer',
    password: 'password123',
    role: 'viewer'
  }
};
```

```typescript
// src/__tests__/fixtures/tasks.ts

export const testTasks = [
  {
    task_code: 'T1-01',
    name: '要件定義',
    status: 'COMPLETED',
    phase: '第1段階',
    effort_hours: 8.0,
    effort_level: 'MEDIUM'
  },
  {
    task_code: 'T1-02',
    name: 'DB設計',
    status: 'IN_PROGRESS',
    phase: '第1段階',
    effort_hours: 16.0,
    effort_level: 'HEAVY'
  }
];
```

---

## 8. テストチェックリスト

### 8.1 実装完了前チェック

- [ ] 単体テスト: バリデーション全パターン
- [ ] 単体テスト: ユーティリティ関数全パターン
- [ ] 統合テスト: 主要Server Actions
- [ ] 統合テスト: ロック競合パターン
- [ ] E2Eテスト: ログイン/ログアウト
- [ ] E2Eテスト: タスク作成/編集/削除
- [ ] E2Eテスト: ロック競合
- [ ] カバレッジ75%以上
- [ ] CI/CDパイプライン通過

---