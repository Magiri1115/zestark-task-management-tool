# 実装予定関数一覧

| No | 関数名 | 役割 | 詳細 | 記述ファイル | 継承元関数（依存元） |
| -- | -- | -- | -- | -- | -- |
| 1 | login | 認証関連 | ユーザーログイン処理（NextAuth.js連携） | src/actions/auth.action.ts | LoginForm (UI) |
| 2 | logout | 認証関連 | ログアウト処理（セッション破棄） | src/actions/auth.action.ts | Header/Sidebar (UI) |
| 3 | addTaskComment | コメント関連 | タスクへのコメント追加 | src/actions/comment.action.ts | TaskCommentSection (UI) |
| 4 | getTaskComments | コメント関連 | タスクのコメント履歴取得 | src/actions/comment.action.ts | TaskCommentSection (UI) |
| 5 | getNotifications | 通知関連 | 通知一覧取得（タスク割り当て、期限接近など） | src/actions/notification.action.ts | Header (UI) |
| 6 | markNotificationAsRead | 通知関連 | 通知既読化 | src/actions/notification.action.ts | NotificationList (UI) |
| 7 | getProjects | プロジェクト管理 | プロジェクト一覧取得 | src/actions/project.action.ts | ProjectListPage (UI) |
| 8 | getProject | プロジェクト管理 | 単一プロジェクト詳細取得 | src/actions/project.action.ts | ProjectDashboard (UI) |
| 9 | createProject | プロジェクト管理 | プロジェクト作成 | src/actions/project.action.ts | ProjectCreateModal (UI) |
| 10 | updateProject | プロジェクト管理 | プロジェクト更新 | src/actions/project.action.ts | ProjectSettings (UI) |
| 11 | deleteProject | プロジェクト管理 | プロジェクト削除 | src/actions/project.action.ts | ProjectSettings (UI) |
| 12 | getProjectMembers | プロジェクト管理 | プロジェクトメンバー一覧取得 | src/actions/project.action.ts | MemberManageModal (UI) |
| 13 | getTasks | タスク管理 | プロジェクトIDに基づくタスク一覧取得 | src/actions/task.action.ts | TaskListPage (UI) |
| 14 | getTask | タスク管理 | タスクIDに基づく単一タスク詳細取得 | src/actions/task.action.ts | TaskDetailPage (UI), TaskEditModal (UI) |
| 15 | createTask | タスク管理 | 新規タスク作成（権限チェック・コード自動生成含む） | src/actions/task.action.ts | TaskCreateModal (UI) |
| 16 | updateTask | タスク管理 | タスク更新（ロック所有者のみ、権限チェック含む） | src/actions/task.action.ts | TaskEditModal (UI) |
| 17 | deleteTask | タスク管理 | タスク削除（管理者のみ） | src/actions/task.action.ts | TaskDeleteDialog (UI) |
| 18 | lockTask | タスク管理 | タスク編集ロック取得（排他制御） | src/actions/task.action.ts | TaskEditButton (UI) |
| 19 | unlockTask | タスク管理 | タスクロック強制解除（管理者のみ） | src/actions/task.action.ts | AdminTaskControl (UI) |
| 20 | getProjectStats | タスク管理 | プロジェクト統計情報（進捗率・工数合計）取得 | src/actions/task.action.ts | DashboardPage (UI) |
| 21 | exportTasksToExcel | タスク管理 | タスク一覧のExcelエクスポート | src/actions/task.action.ts | TaskListHeader (UI) |
| 22 | searchTasks | タスク管理 | タスク検索・フィルタリング（キーワード、ステータス、担当者等） | src/actions/task.action.ts | TaskSearchForm (UI) |
| 23 | bulkUpdateTasks | タスク管理 | 複数タスクの一括ステータス更新 | src/actions/task.action.ts | TaskListView (UI) |
| 24 | duplicateTask | タスク管理 | 既存タスクを複製（テンプレート的利用） | src/actions/task.action.ts | TaskMenu (UI) |
| 25 | getTaskHistory | タスク管理 | タスクの変更履歴取得（監査・トラブルシューティング用） | src/actions/task.action.ts | TaskHistoryTab (UI) |
| 26 | assignTask | タスク管理 | タスク担当者の割り当て/変更 | src/actions/task.action.ts | TaskAssignPopover (UI) |
| 27 | importTasksFromExcel | タスク管理 | Excelからのタスク一括インポート | src/actions/task.action.ts | TaskImportModal (UI) |
| 28 | getTaskTemplates | タスク管理 | タスクテンプレート取得 | src/actions/task.action.ts | TaskCreateModal (UI) |
| 29 | refreshLock | タスク管理 | ロックの有効期限延長（編集中のハートビート） | src/actions/task.action.ts | TaskEditForm (UI) |
| 30 | getActiveLocks | タスク管理 | 現在アクティブなロック一覧（管理者用） | src/actions/task.action.ts | AdminLockMonitor (UI) |
| 31 | checkLockStatus | タスク管理 | 特定タスクのロック状態確認 | src/actions/task.action.ts | TaskCard (UI) |
| 32 | getUsers | ユーザー管理 | ユーザー一覧取得（タスク割り当て用） | src/actions/user.action.ts | UserSelect (UI) |
| 33 | getUserProfile | ユーザー管理 | ユーザープロフィール取得 | src/actions/user.action.ts | ProfilePage (UI) |
| 34 | updateUserProfile | ユーザー管理 | プロフィール更新 | src/actions/user.action.ts | ProfileEditForm (UI) |
| 35 | checkPermission | 認証関連 | ユーザー権限に基づく操作許可判定 | src/lib/permission.ts | createTask, updateTask, lockTask, deleteTask |
| 36 | generateNextTaskCode | タスク管理 | 次期タスクコード生成 | src/lib/task-utils.ts | createTask |
| 37 | validateTaskData | タスク管理 | タスクデータのバリデーション（共通処理） | src/lib/validation.ts | createTask, updateTask |
