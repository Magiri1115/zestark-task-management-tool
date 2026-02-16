# コーディング規約
## 設計思想
責務分離を徹底
UIとドメインロジックを混ぜない
Server Action = アプリケーション層
Prisma = インフラ層

## 命名規則
### ファイル
種類	ルール
Component	PascalCase.tsx
Hook	useSomething.ts
Action	something.action.ts
Repository	something.repository.ts
型	something.type.ts
### 変数
boolean → is, has, canで始める
配列 → 複数形
関数 → 動詞から始める
例：
const isCompleted = true
const tasks = []
function createTask() {}

### Server Actionsルール
禁止事項
UIロジックを書かない
try-catch乱用しない
console.log残さない
原則
入力値は必ずバリデーション（zod推奨）
戻り値は型を固定
エラーは統一フォーマット
type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

### 型の扱い
any 使用禁止
APIレスポンス型は明示
Prismaの型を直接UIに渡さない
理由わかる？
DB構造変更がUI崩壊に直結するからよ。
### Tailwindルール
classは意味順に並べる
長すぎる場合はcn()で整理
magic number禁止（theme使用）
### コメント方針
なぜその実装なのかを書く
何をしているかは書かない
ダサいコメント例：
// タスクを作成する

## Gitブランチ戦略
### ブランチモデル
基本構成
main
develop
feature/*
fix/*
hotfix/*
1. main
本番デプロイ専用
直接push禁止
2. develop
開発統合ブランチ
featureはここにマージ
3. feature/xxx
例：
feature/task-create
feature/auth-google
1機能1ブランチ
2週間以上持たせない
4. fix/xxx
軽微修正用
5. hotfix/xxx
本番緊急修正
2-2. コミット規約（Conventional Commits）
feat: タスク作成機能追加
fix: 認証エラー修正
refactor: repository分離
docs: README更新
chore: 依存関係更新

## マージ戦略
develop → main は squash merge
feature → develop は rebase推奨