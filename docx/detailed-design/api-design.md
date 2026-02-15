# API設計書（Server Actions）

## 1. API概要

### 1.1 アーキテクチャ
- **方式**: Next.js Server Actions
- **プロトコル**: HTTP POST（自動）
- **認証**: NextAuth.js セッション
- **エラーハンドリング**: try-catch + カスタムエラー

### 1.2 共通仕様

#### リクエスト形式
```typescript
// Server Actionは自動的にPOSTリクエストとして処理される
'use server'

export async function actionName(param: Type) {
  // 処理
}
```

#### レスポンス形式
```typescript
// 成功時
type SuccessResponse<T> = {
  success: true;
  data: T;
};

// エラー時
type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};
```

#### 認証チェック
```typescript
const session = await auth();
if (!session) {
  throw new Error('UNAUTHORIZED');
}
```

---

## 2. タスク管理API

### 2.1 getTasks（タスク一覧取得）

#### 概要
プロジェクトIDを指定してタスク一覧を取得

#### Server Action定義
```typescript
'use server'

export async function getTasks(projectId: string): Promise<TaskWithUser[]> {
  const session = await auth();
  if (!session) throw new Error('UNAUTHORIZED');

  const tasks = await prisma.task.findMany({
    where: { project_id: projectId },
    include: {
      locked_by_user: {
        select: { id: true, name: true }
      }
    },
    orderBy: { task_code: 'asc' }
  });

  return tasks;
}
```

#### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| projectId | string (UUID) | ○ | プロジェクトID |

#### レスポンス
```typescript
type TaskWithUser = {
  id: string;
  project_id: string;
  task_code: string;
  name: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  phase: string;
  effort_hours: number;
  effort_level: 'LIGHT' | 'MEDIUM' | 'HEAVY';
  description: string | null;
  locked_by: string | null;
  locked_at: Date | null;
  created_at: Date;
  updated_at: Date;
  locked_by_user: {
    id: string;
    name: string;
  } | null;
};
```

#### エラー
| コード | メッセージ | HTTPステータス相当 |
|--------|-----------|-------------------|
| UNAUTHORIZED | 認証が必要です | 401 |
| NOT_FOUND | プロジェクトが見つかりません | 404 |

#### 権限
- admin: ○
- editor: ○
- viewer: ○

---

### 2.2 getTask（単一タスク取得）

#### 概要
タスクIDを指定して単一タスクを取得

#### Server Action定義
```typescript
'use server'

export async function getTask(taskId: string): Promise<TaskWithUser> {
  const session = await auth();
  if (!session) throw new Error('UNAUTHORIZED');

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      locked_by_user: {
        select: { id: true, name: true }
      }
    }
  });

  if (!task) {
    throw new Error('NOT_FOUND');
  }

  return task;
}
```

#### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| taskId | string (UUID) | ○ | タスクID |

#### レスポンス
`TaskWithUser` 型（getTasks と同様）

#### エラー
| コード | メッセージ | HTTPステータス相当 |
|--------|-----------|-------------------|
| UNAUTHORIZED | 認証が必要です | 401 |
| NOT_FOUND | タスクが見つかりません | 404 |

#### 権限
- admin: ○
- editor: ○
- viewer: ○

---

### 2.3 createTask（タスク作成）

#### 概要
新規タスクを作成

#### Server Action定義
```typescript
'use server'

import { revalidatePath } from 'next/cache';

export async function createTask(
  data: CreateTaskInput
): Promise<Task> {
  const session = await auth();
  if (!session) throw new Error('UNAUTHORIZED');

  // 権限チェック
  await checkPermission(session.user.id, 'create');

  // task_code自動生成
  const lastTask = await prisma.task.findFirst({
    where: { project_id: data.project_id },
    orderBy: { task_code: 'desc' }
  });

  const nextCode = generateNextTaskCode(lastTask?.task_code, data.phase);

  // タスク作成
  const task = await prisma.task.create({
    data: {
      ...data,
      task_code: nextCode,
      id: crypto.randomUUID()
    }
  });

  // キャッシュ再検証
  revalidatePath('/tasks');

  return task;
}
```

#### パラメータ
```typescript
type CreateTaskInput = {
  project_id: string;
  name: string;
  phase: string;
  effort_hours: number;
  effort_level: 'LIGHT' | 'MEDIUM' | 'HEAVY';
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  description?: string;
};
```

#### レスポンス
```typescript
type Task = {
  id: string;
  project_id: string;
  task_code: string;
  name: string;
  status: TaskStatus;
  phase: string;
  effort_hours: number;
  effort_level: EffortLevel;
  description: string | null;
  locked_by: string | null;
  locked_at: Date | null;
  created_at: Date;
  updated_at: Date;
};
```

#### バリデーション
```typescript
const createTaskSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  phase: z.string().min(1).max(100),
  effort_hours: z.number().min(0.01).max(9999.99),
  effort_level: z.enum(['LIGHT', 'MEDIUM', 'HEAVY']),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  description: z.string().max(5000).optional()
});
```

#### エラー
| コード | メッセージ | HTTPステータス相当 |
|--------|-----------|-------------------|
| UNAUTHORIZED | 認証が必要です | 401 |
| FORBIDDEN | 権限がありません | 403 |
| VALIDATION_ERROR | バリデーションエラー | 400 |
| CONFLICT | task_codeが重複しています | 409 |

#### 権限
- admin: ○
- editor: ○
- viewer: ×

---

### 2.4 updateTask（タスク更新）

#### 概要
タスクを更新（ロック所有者のみ可能）

#### Server Action定義
```typescript
'use server'

import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateTask(
  taskId: string,
  data: UpdateTaskInput
): Promise<Task> {
  const session = await auth();
  if (!session) throw new Error('UNAUTHORIZED');

  // 権限チェック
  await checkPermission(session.user.id, 'update');

  // ロック所有者確認
  const task = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (!task) {
    throw new Error('NOT_FOUND');
  }

  if (task.locked_by !== session.user.id) {
    throw new Error('LOCK_NOT_HELD');
  }

  // 更新 + ロック解除
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...data,
      locked_by: null,
      locked_at: null,
      updated_at: new Date()
    }
  });

  // キャッシュ再検証
  revalidatePath('/tasks');
  revalidateTag('tasks');

  return updated;
}
```

#### パラメータ
```typescript
type UpdateTaskInput = {
  name?: string;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  phase?: string;
  effort_hours?: number;
  effort_level?: 'LIGHT' | 'MEDIUM' | 'HEAVY';
  description?: string;
};
```

#### レスポンス
`Task` 型（createTask と同様）

#### バリデーション
```typescript
const updateTaskSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  phase: z.string().min(1).max(100).optional(),
  effort_hours: z.number().min(0.01).max(9999.99).optional(),
  effort_level: z.enum(['LIGHT', 'MEDIUM', 'HEAVY']).optional(),
  description: z.string().max(5000).optional()
});
```

#### エラー
| コード | メッセージ | HTTPステータス相当 |
|--------|-----------|-------------------|
| UNAUTHORIZED | 認証が必要です | 401 |
| FORBIDDEN | 権限がありません | 403 |
| NOT_FOUND | タスクが見つかりません | 404 |
| LOCK_NOT_HELD | ロックを保持していません | 409 |
| VALIDATION_ERROR | バリデーションエラー | 400 |

#### 権限
- admin: ○
- editor: ○
- viewer: ×

---

### 2.5 deleteTask（タスク削除）

#### 概要
タスクを削除（物理削除）

#### Server Action定義
```typescript
'use server'

import { revalidatePath } from 'next/cache';

export async function deleteTask(taskId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error('UNAUTHORIZED');

  // 権限チェック
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  });

  if (user?.role.name !== 'admin') {
    throw new Error('FORBIDDEN');
  }

  // 削除
  await prisma.task.delete({
    where: { id: taskId }
  });

  // キャッシュ再検証
  revalidatePath('/tasks');
}
```

#### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| taskId | string (UUID) | ○ | タスクID |

#### レスポンス
```typescript
void
```

#### エラー
| コード | メッセージ | HTTPステータス相当 |
|--------|-----------|-------------------|
| UNAUTHORIZED | 認証が必要です | 401 |
| FORBIDDEN | 権限がありません（管理者のみ） | 403 |
| NOT_FOUND | タスクが見つかりません | 404 |

#### 権限
- admin: ○
- editor: × （論理削除のみ・将来拡張）
- viewer: ×

---

### 2.6 lockTask（ロック取得）

#### 概要
タスクのロックを取得（編集開始時）

#### Server Action定義
```typescript
'use server'

const LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15分

export async function lockTask(taskId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error('UNAUTHORIZED');

  // 権限チェック
  await checkPermission(session.user.id, 'update');

  // タスク取得
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      locked_by_user: {
        select: { id: true, name: true }
      }
    }
  });

  if (!task) {
    throw new Error('NOT_FOUND');
  }

  // ロック期限チェック
  const isExpired = task.locked_at &&
    (Date.now() - task.locked_at.getTime()) > LOCK_TIMEOUT_MS;

  // 他ユーザーがロック中 && 期限内
  if (task.locked_by && task.locked_by !== session.user.id && !isExpired) {
    throw new Error(`LOCKED_BY_OTHER:${task.locked_by_user?.name}`);
  }

  // ロック取得
  await prisma.task.update({
    where: { id: taskId },
    data: {
      locked_by: session.user.id,
      locked_at: new Date()
    }
  });
}
```

#### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| taskId | string (UUID) | ○ | タスクID |

#### レスポンス
```typescript
void
```

#### エラー
| コード | メッセージ | HTTPステータス相当 |
|--------|-----------|-------------------|
| UNAUTHORIZED | 認証が必要です | 401 |
| FORBIDDEN | 権限がありません | 403 |
| NOT_FOUND | タスクが見つかりません | 404 |
| LOCKED_BY_OTHER:{name} | {name}が編集中です | 409 |

#### ロック期限
- **タイムアウト**: 15分
- **自動解除**: 期限切れ時に次回アクセスで自動解除

#### 権限
- admin: ○
- editor: ○
- viewer: ×

---

### 2.7 unlockTask（ロック解除）

#### 概要
タスクのロックを強制解除（管理者のみ）

#### Server Action定義
```typescript
'use server'

import { revalidatePath } from 'next/cache';

export async function unlockTask(taskId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error('UNAUTHORIZED');

  // 管理者権限チェック
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  });

  if (user?.role.name !== 'admin') {
    throw new Error('FORBIDDEN');
  }

  // ロック解除
  await prisma.task.update({
    where: { id: taskId },
    data: {
      locked_by: null,
      locked_at: null
    }
  });

  // キャッシュ再検証
  revalidatePath('/tasks');
}
```

#### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| taskId | string (UUID) | ○ | タスクID |

#### レスポンス
```typescript
void
```

#### エラー
| コード | メッセージ | HTTPステータス相当 |
|--------|-----------|-------------------|
| UNAUTHORIZED | 認証が必要です | 401 |
| FORBIDDEN | 権限がありません（管理者のみ） | 403 |
| NOT_FOUND | タスクが見つかりません | 404 |

#### 権限
- admin: ○
- editor: ×
- viewer: ×

---

## 3. 統計API

### 3.1 getProjectStats（プロジェクト統計）

#### 概要
プロジェクトの統計情報を取得

#### Server Action定義
```typescript
'use server'

export async function getProjectStats(projectId: string): Promise<ProjectStats> {
  const session = await auth();
  if (!session) throw new Error('UNAUTHORIZED');

  const [total, completed, inProgress, notStarted, totalEffort] = await Promise.all([
    prisma.task.count({
      where: { project_id: projectId }
    }),
    prisma.task.count({
      where: { project_id: projectId, status: 'COMPLETED' }
    }),
    prisma.task.count({
      where: { project_id: projectId, status: 'IN_PROGRESS' }
    }),
    prisma.task.count({
      where: { project_id: projectId, status: 'NOT_STARTED' }
    }),
    prisma.task.aggregate({
      where: { project_id: projectId },
      _sum: { effort_hours: true }
    })
  ]);

  return {
    totalTasks: total,
    completedTasks: completed,
    inProgressTasks: inProgress,
    notStartedTasks: notStarted,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
    totalEffort: totalEffort._sum.effort_hours || 0
  };
}
```

#### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| projectId | string (UUID) | ○ | プロジェクトID |

#### レスポンス
```typescript
type ProjectStats = {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  completionRate: number; // 0-100
  totalEffort: number;
};
```

#### エラー
| コード | メッセージ | HTTPステータス相当 |
|--------|-----------|-------------------|
| UNAUTHORIZED | 認証が必要です | 401 |
| NOT_FOUND | プロジェクトが見つかりません | 404 |

#### 権限
- admin: ○
- editor: ○
- viewer: ○

---

## 4. Excel出力API

### 4.1 exportTasksToExcel（Excel出力）

#### 概要
タスク一覧をExcelファイルとして出力

#### Server Action定義
```typescript
'use server'

import ExcelJS from 'exceljs';

export async function exportTasksToExcel(projectId: string): Promise<Buffer> {
  const session = await auth();
  if (!session) throw new Error('UNAUTHORIZED');

  // タスク取得
  const tasks = await prisma.task.findMany({
    where: { project_id: projectId },
    select: {
      task_code: true,
      name: true,
      effort_hours: true
    },
    orderBy: { task_code: 'asc' }
  });

  // Excelファイル生成
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('タスク一覧');

  // ヘッダー設定
  worksheet.columns = [
    { header: 'ID', key: 'task_code', width: 15 },
    { header: 'タスク名', key: 'name', width: 40 },
    { header: '工数（時間）', key: 'effort_hours', width: 15 }
  ];

  // データ追加
  worksheet.addRows(tasks);

  // スタイル適用
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Buffer生成
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
```

#### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| projectId | string (UUID) | ○ | プロジェクトID |

#### レスポンス
```typescript
Buffer // Excelファイルのバイナリデータ
```

#### クライアント側実装例
```typescript
'use client'

async function handleExport() {
  const buffer = await exportTasksToExcel(projectId);
  
  // Blob生成
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  
  // ダウンロード
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
```

#### エラー
| コード | メッセージ | HTTPステータス相当 |
|--------|-----------|-------------------|
| UNAUTHORIZED | 認証が必要です | 401 |
| NOT_FOUND | プロジェクトが見つかりません | 404 |

#### 権限
- admin: ○
- editor: ○
- viewer: ○

---

## 5. 認証API

### 5.1 login（ログイン）

#### 概要
ユーザー認証を実行（NextAuth.js経由）

#### Server Action定義
```typescript
'use server'

import { signIn } from '@/lib/auth';

export async function login(email: string, password: string) {
  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false
    });
    
    return { success: true };
  } catch (error) {
    if (error.type === 'CredentialsSignin') {
      throw new Error('INVALID_CREDENTIALS');
    }
    throw error;
  }
}
```

#### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| email | string | ○ | メールアドレス |
| password | string | ○ | パスワード |

#### レスポンス
```typescript
{ success: true }
```

#### バリデーション
```typescript
const loginSchema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),
  password: z.string().min(6, 'パスワードは6文字以上である必要があります')
});
```

#### エラー
| コード | メッセージ | HTTPステータス相当 |
|--------|-----------|-------------------|
| INVALID_CREDENTIALS | メールアドレスまたはパスワードが正しくありません | 401 |
| VALIDATION_ERROR | バリデーションエラー | 400 |

---

### 5.2 logout（ログアウト）

#### 概要
セッションを破棄してログアウト

#### Server Action定義
```typescript
'use server'

import { signOut } from '@/lib/auth';

export async function logout() {
  await signOut({ redirect: false });
  return { success: true };
}
```

#### パラメータ
なし

#### レスポンス
```typescript
{ success: true }
```

---

## 6. 共通ヘルパー関数

### 6.1 checkPermission（権限チェック）

```typescript
async function checkPermission(
  userId: string,
  action: 'create' | 'read' | 'update' | 'delete' | 'unlock'
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const permissions: Record<string, string[]> = {
    admin: ['create', 'read', 'update', 'delete', 'unlock'],
    editor: ['create', 'read', 'update'],
    viewer: ['read']
  };

  const allowedActions = permissions[user.role.name] || [];

  if (!allowedActions.includes(action)) {
    throw new Error('FORBIDDEN');
  }
}
```

### 6.2 generateNextTaskCode（タスクコード生成）

```typescript
function generateNextTaskCode(
  lastCode: string | undefined,
  phase: string
): string {
  // 例: T1-01, T1-02, T2-01
  const phaseNum = phase.replace(/\D/g, '') || '1';
  
  if (!lastCode) {
    return `T${phaseNum}-01`;
  }

  const [prefix, numStr] = lastCode.split('-');
  const currentPhase = prefix.replace('T', '');
  
  if (currentPhase === phaseNum) {
    // 同フェーズの場合、番号をインクリメント
    const nextNum = parseInt(numStr, 10) + 1;
    return `T${phaseNum}-${String(nextNum).padStart(2, '0')}`;
  } else {
    // 新フェーズの場合、01から開始
    return `T${phaseNum}-01`;
  }
}
```

---

## 7. エラーコード一覧

| コード | メッセージ | HTTPステータス相当 | 発生API |
|--------|-----------|-------------------|---------|
| UNAUTHORIZED | 認証が必要です | 401 | 全API |
| FORBIDDEN | 権限がありません | 403 | create, update, delete, unlock |
| NOT_FOUND | リソースが見つかりません | 404 | get, update, delete, lock, unlock |
| VALIDATION_ERROR | バリデーションエラー | 400 | create, update, login |
| CONFLICT | task_codeが重複しています | 409 | create |
| LOCK_NOT_HELD | ロックを保持していません | 409 | update |
| LOCKED_BY_OTHER | 他ユーザーが編集中です | 409 | lock |
| INVALID_CREDENTIALS | 認証情報が正しくありません | 401 | login |

---

## 8. キャッシュ戦略

### 8.1 revalidatePath
```typescript
// タスク一覧ページを再検証
revalidatePath('/tasks');
```

### 8.2 revalidateTag
```typescript
// 'tasks' タグを持つキャッシュを再検証
revalidateTag('tasks');
```

### 8.3 適用箇所
| Server Action | revalidatePath | revalidateTag |
|---------------|----------------|---------------|
| createTask | ○ | × |
| updateTask | ○ | ○ |
| deleteTask | ○ | × |
| unlockTask | ○ | × |

---

## 9. レート制限（将来拡張）

現在は未実装だが、将来的に以下を検討：

```typescript
// レート制限例（1分間に100リクエスト）
const rateLimit = {
  interval: 60 * 1000, // 1分
  maxRequests: 100
};
```

---

## 10. API呼び出し例

### 10.1 タスク一覧取得

```typescript
'use client'

import { getTasks } from '@/actions/task.actions';

export default function TaskListPage() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    async function loadTasks() {
      try {
        const data = await getTasks(projectId);
        setTasks(data);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    }
    loadTasks();
  }, [projectId]);

  return <TaskList tasks={tasks} />;
}
```

### 10.2 タスク更新

```typescript
'use client'

import { updateTask } from '@/actions/task.actions';

async function handleSave(taskId: string, data: UpdateTaskInput) {
  try {
    await updateTask(taskId, data);
    toast.success('保存しました');
    closeModal();
  } catch (error) {
    if (error.message === 'LOCK_NOT_HELD') {
      toast.error('ロックを保持していません');
    } else {
      toast.error('保存に失敗しました');
    }
  }
}
```

### 10.3 ロック取得

```typescript
'use client'

import { lockTask } from '@/actions/task.actions';

async function handleEdit(taskId: string) {
  try {
    await lockTask(taskId);
    openModal(taskId);
  } catch (error) {
    if (error.message.startsWith('LOCKED_BY_OTHER')) {
      const userName = error.message.split(':')[1];
      toast.error(`${userName}が編集中です`);
    } else {
      toast.error('ロック取得に失敗しました');
    }
  }
}
```

---