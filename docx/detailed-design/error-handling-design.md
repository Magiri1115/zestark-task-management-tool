# エラーハンドリング設計書

## 1. エラー分類

### 1.1 エラーカテゴリ

| カテゴリ | 概要 | 対処レイヤー |
|---------|------|-------------|
| 認証エラー | セッション切れ、未ログイン | バックエンド |
| 認可エラー | 権限不足 | バックエンド |
| バリデーションエラー | 入力値不正 | フロント + バック |
| ビジネスロジックエラー | ロック競合など | バックエンド |
| データベースエラー | 接続失敗、制約違反 | バックエンド |
| ネットワークエラー | 通信失敗、タイムアウト | フロントエンド |
| 予期しないエラー | 500系エラー | バックエンド |

---

## 2. バックエンドエラーハンドリング

### 2.1 エラークラス定義

```typescript
// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '認証が必要です') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '権限がありません') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'リソース') {
    super('NOT_FOUND', `${resource}が見つかりません`, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = 'バリデーションエラー',
    public errors?: Record<string, string[]>
  ) {
    super('VALIDATION_ERROR', message, 400);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

export class LockError extends ConflictError {
  constructor(userName: string) {
    super(`${userName}が編集中です`);
    this.name = 'LockError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'データベースエラーが発生しました') {
    super('DATABASE_ERROR', message, 500);
    this.name = 'DatabaseError';
  }
}
```

### 2.2 Server Actionエラーハンドリング

```typescript
// src/actions/task.actions.ts

'use server'

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { 
  UnauthorizedError, 
  NotFoundError, 
  LockError,
  ValidationError 
} from '@/lib/errors';
import { logError } from '@/lib/logger';

export async function lockTask(taskId: string) {
  try {
    // 1. 認証チェック
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError();
    }

    // 2. タスク取得
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { locked_by_user: true }
    });

    if (!task) {
      throw new NotFoundError('タスク');
    }

    // 3. ロック状態チェック
    const LOCK_TIMEOUT_MS = 15 * 60 * 1000;
    const isExpired = task.locked_at &&
      (Date.now() - task.locked_at.getTime()) > LOCK_TIMEOUT_MS;

    if (task.locked_by && !isExpired) {
      throw new LockError(task.locked_by_user?.name || '他のユーザー');
    }

    // 4. ロック取得
    await prisma.task.update({
      where: { id: taskId },
      data: {
        locked_by: session.user.id,
        locked_at: new Date()
      }
    });

    return { success: true };

  } catch (error) {
    // エラーログ記録
    logError(error, { action: 'lockTask', taskId });

    // エラーを再スロー（フロントエンドでキャッチ）
    throw error;
  }
}
```

### 2.3 Prismaエラーハンドリング

```typescript
// src/lib/prisma-error-handler.ts

import { Prisma } from '@prisma/client';
import { DatabaseError, ConflictError } from './errors';

export function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        throw new ConflictError('データが重複しています');
      
      case 'P2025':
        // Record not found
        throw new NotFoundError();
      
      case 'P2003':
        // Foreign key constraint violation
        throw new ConflictError('関連データが存在します');
      
      case 'P2014':
        // Relation violation
        throw new ConflictError('関連データの整合性エラー');
      
      default:
        throw new DatabaseError(
          `データベースエラー (code: ${error.code})`
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new ValidationError('データ形式が正しくありません');
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    throw new DatabaseError('データベース接続に失敗しました');
  }

  // その他のエラー
  throw new DatabaseError();
}

// 使用例
export async function updateTaskWithErrorHandling(
  taskId: string,
  data: any
) {
  try {
    return await prisma.task.update({
      where: { id: taskId },
      data
    });
  } catch (error) {
    handlePrismaError(error);
  }
}
```

### 2.4 バリデーションエラーハンドリング

```typescript
// src/lib/validations.ts

import { z } from 'zod';
import { ValidationError } from './errors';

export const taskSchema = z.object({
  name: z.string()
    .min(1, 'タスク名は必須です')
    .max(200, 'タスク名は200文字以内です'),
  
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'], {
    errorMap: () => ({ message: 'ステータスが不正です' })
  }),
  
  effort_hours: z.number()
    .min(0.01, '工数は0.01以上である必要があります')
    .max(9999.99, '工数は9999.99以下である必要があります'),
  
  phase: z.string()
    .min(1, 'フェーズは必須です')
    .max(100, 'フェーズは100文字以内です'),
  
  effort_level: z.enum(['LIGHT', 'MEDIUM', 'HEAVY']),
  
  description: z.string()
    .max(5000, '詳細説明は5000文字以内です')
    .optional()
});

export function validateTask(data: unknown) {
  try {
    return taskSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      
      throw new ValidationError('入力内容に誤りがあります', errors);
    }
    throw error;
  }
}
```

### 2.5 ロギング

```typescript
// src/lib/logger.ts

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  action?: string;
  userId?: string;
  taskId?: string;
  [key: string]: any;
}

export function log(
  level: LogLevel,
  message: string,
  context?: LogContext
) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    message,
    ...context
  };

  // 開発環境: コンソール出力
  if (process.env.NODE_ENV === 'development') {
    console[level](JSON.stringify(logData, null, 2));
    return;
  }

  // 本番環境: Vercel Analytics or 外部ロギングサービス
  // TODO: 本番用ロギング実装
  console[level](JSON.stringify(logData));
}

export function logError(error: unknown, context?: LogContext) {
  if (error instanceof AppError) {
    log('error', error.message, {
      ...context,
      errorCode: error.code,
      statusCode: error.statusCode
    });
  } else if (error instanceof Error) {
    log('error', error.message, {
      ...context,
      errorName: error.name,
      stack: error.stack
    });
  } else {
    log('error', 'Unknown error', {
      ...context,
      error: String(error)
    });
  }
}

export function logInfo(message: string, context?: LogContext) {
  log('info', message, context);
}

export function logWarn(message: string, context?: LogContext) {
  log('warn', message, context);
}
```

---

## 3. フロントエンドエラーハンドリング

### 3.1 エラー境界（Error Boundary）

```typescript
// src/components/ErrorBoundary.tsx

'use client'

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // エラー報告サービスへ送信（将来実装）
    // reportErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            エラーが発生しました
          </h1>
          <p className="text-gray-600 mb-4">
            {this.state.error?.message || '予期しないエラーが発生しました'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            再読み込み
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 3.2 Server Actionエラーキャッチ

```typescript
// src/hooks/useServerAction.ts

'use client'

import { useState } from 'react';
import { toast } from 'sonner';

type ServerActionFn<T, R> = (params: T) => Promise<R>;

export function useServerAction<T, R>(
  action: ServerActionFn<T, R>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function execute(params: T): Promise<R | null> {
    setLoading(true);
    setError(null);

    try {
      const result = await action(params);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      // エラーメッセージ表示
      handleError(error);
      
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { execute, loading, error };
}

function handleError(error: Error) {
  const errorMessages: Record<string, string> = {
    UNAUTHORIZED: 'ログインが必要です',
    FORBIDDEN: '権限がありません',
    NOT_FOUND: 'データが見つかりません',
    VALIDATION_ERROR: '入力内容に誤りがあります',
    CONFLICT: 'データが競合しています',
    DATABASE_ERROR: 'データベースエラーが発生しました'
  };

  // エラーコードからメッセージ取得
  const message = errorMessages[error.message] || error.message;
  
  // トースト表示
  toast.error(message);
}
```

### 3.3 使用例

```typescript
// src/components/tasks/TaskEditModal.tsx

'use client'

import { useServerAction } from '@/hooks/useServerAction';
import { updateTask, lockTask } from '@/actions/task.actions';

export function TaskEditModal({ taskId }: { taskId: string }) {
  const { execute: executeLock, loading: locking } = useServerAction(lockTask);
  const { execute: executeUpdate, loading: updating } = useServerAction(updateTask);

  async function handleOpen() {
    const result = await executeLock(taskId);
    
    if (result) {
      // ロック取得成功
      setIsOpen(true);
    }
    // エラー時は useServerAction 内でトースト表示済み
  }

  async function handleSave(data: UpdateTaskInput) {
    const result = await executeUpdate(taskId, data);
    
    if (result) {
      toast.success('保存しました');
      setIsOpen(false);
    }
  }

  return (
    <Modal open={isOpen} onClose={handleClose}>
      {/* フォーム内容 */}
      <Button 
        onClick={handleSave} 
        disabled={updating}
      >
        {updating ? '保存中...' : '保存'}
      </Button>
    </Modal>
  );
}
```

### 3.4 フォームバリデーション

```typescript
// src/components/tasks/TaskForm.tsx

'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema } from '@/lib/validations';

export function TaskForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(taskSchema)
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>タスク名</label>
        <input {...register('name')} />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">
            {errors.name.message as string}
          </p>
        )}
      </div>

      <div>
        <label>工数（時間）</label>
        <input 
          type="number" 
          step="0.01" 
          {...register('effort_hours', { valueAsNumber: true })} 
        />
        {errors.effort_hours && (
          <p className="text-red-500 text-sm mt-1">
            {errors.effort_hours.message as string}
          </p>
        )}
      </div>

      {/* その他のフィールド */}
    </form>
  );
}
```

### 3.5 ネットワークエラーハンドリング

```typescript
// src/lib/fetch-with-retry.ts

export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // ネットワークエラーの場合のみリトライ
      if (isNetworkError(error)) {
        if (i < maxRetries - 1) {
          await sleep(delay * Math.pow(2, i)); // Exponential backoff
          continue;
        }
      }
      
      // その他のエラーは即座にスロー
      throw error;
    }
  }

  throw lastError!;
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('timeout')
    );
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 4. エラーメッセージ定義

### 4.1 日本語エラーメッセージマップ

```typescript
// src/lib/error-messages.ts

export const errorMessages = {
  // 認証エラー
  UNAUTHORIZED: 'ログインが必要です',
  SESSION_EXPIRED: 'セッションが期限切れです。再度ログインしてください',
  INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません',

  // 認可エラー
  FORBIDDEN: '権限がありません',
  ROLE_REQUIRED_ADMIN: '管理者権限が必要です',
  ROLE_REQUIRED_EDITOR: '編集者権限が必要です',

  // リソースエラー
  NOT_FOUND: 'データが見つかりません',
  TASK_NOT_FOUND: 'タスクが見つかりません',
  PROJECT_NOT_FOUND: 'プロジェクトが見つかりません',
  USER_NOT_FOUND: 'ユーザーが見つかりません',

  // バリデーションエラー
  VALIDATION_ERROR: '入力内容に誤りがあります',
  REQUIRED_FIELD: 'この項目は必須です',
  INVALID_EMAIL: 'メールアドレスの形式が正しくありません',
  INVALID_FORMAT: '形式が正しくありません',
  STRING_TOO_LONG: '文字数が上限を超えています',
  NUMBER_OUT_OF_RANGE: '数値が範囲外です',

  // ビジネスロジックエラー
  CONFLICT: 'データが競合しています',
  DUPLICATE_TASK_CODE: 'タスクコードが重複しています',
  LOCK_NOT_HELD: 'ロックを保持していません',
  ALREADY_LOCKED: '既に他のユーザーが編集中です',
  LOCK_EXPIRED: 'ロックの有効期限が切れました',

  // データベースエラー
  DATABASE_ERROR: 'データベースエラーが発生しました',
  CONNECTION_ERROR: 'データベース接続に失敗しました',
  CONSTRAINT_VIOLATION: 'データの整合性エラーが発生しました',

  // ネットワークエラー
  NETWORK_ERROR: '通信エラーが発生しました',
  TIMEOUT_ERROR: 'タイムアウトしました',
  SERVER_ERROR: 'サーバーエラーが発生しました',

  // その他
  UNKNOWN_ERROR: '予期しないエラーが発生しました'
};

export function getErrorMessage(code: string, fallback?: string): string {
  return errorMessages[code as keyof typeof errorMessages] || fallback || errorMessages.UNKNOWN_ERROR;
}
```

---

## 5. トースト通知

### 5.1 Sonner設定

```typescript
// src/app/layout.tsx

import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Toaster 
          position="top-right"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
```

### 5.2 トースト使用例

```typescript
'use client'

import { toast } from 'sonner';

// 成功
toast.success('保存しました');

// エラー
toast.error('保存に失敗しました');

// 警告
toast.warning('ロックの有効期限が近づいています');

// 情報
toast.info('タスクが更新されました');

// ローディング付き
const toastId = toast.loading('保存中...');
// 処理後
toast.success('保存しました', { id: toastId });
```

---

## 6. エラーページ

### 6.1 404 Not Found

```typescript
// src/app/not-found.tsx

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">
        ページが見つかりません
      </p>
      <a
        href="/tasks"
        className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        トップへ戻る
      </a>
    </div>
  );
}
```

### 6.2 500 Server Error

```typescript
// src/app/error.tsx

'use client'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-6xl font-bold text-red-600 mb-4">500</h1>
      <p className="text-xl text-gray-600 mb-4">
        サーバーエラーが発生しました
      </p>
      <p className="text-sm text-gray-500 mb-8">
        {error.message}
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        再試行
      </button>
    </div>
  );
}
```

---

## 7. エラー監視（将来拡張）

### 7.1 Sentry統合例

```typescript
// sentry.config.ts (将来実装)

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  
  beforeSend(event, hint) {
    // PII削除
    if (event.user) {
      delete event.user.email;
    }
    return event;
  }
});
```

---

## 8. エラーハンドリングチェックリスト

### 8.1 実装時チェック項目

- [ ] Server Actionに try-catch を実装
- [ ] カスタムエラークラスを使用
- [ ] エラーログを記録
- [ ] フロントエンドでエラーをキャッチ
- [ ] ユーザーフレンドリーなメッセージを表示
- [ ] バリデーションエラーを適切に表示
- [ ] ネットワークエラーにリトライ機能
- [ ] ErrorBoundaryで予期しないエラーをキャッチ
- [ ] 404/500エラーページを実装
- [ ] 本番環境でスタックトレースを非表示

---