# シーケンス図
## タスク編集開始（ロック取得）
```
ユーザー
   ↓ ダブルクリック
フロントエンド
   ↓ Server Action 呼び出し（lockTask）
バックエンド
   ↓ DB: tasks.locked_by = user_id
   ↓ DB: tasks.locked_at = now()
   ↓ ロック成功レスポンス
フロントエンド
   ↓ モーダル表示
   ↓ 編集開始
```
### 例外系
すでに locked_by が存在 → エラー返却
ロック期限切れ → 上書き取得可能
## タスク保存
```
ユーザー
   ↓ 保存クリック
フロントエンド
   ↓ Server Action 呼び出し（updateTask）
バックエンド
   ↓ ロック所有者確認
   ↓ DB更新
   ↓ locked_by = NULL
   ↓ locked_at = NULL
   ↓ Vercel Cache 再検証（方法は詳細設計）
   ↓ 成功レスポンス
フロントエンド
   ↓ モーダル閉じる
   ↓ 一覧再描画
```
## タスク一覧取得（キャッシュ利用）
```
ユーザー
   ↓ 画面表示
フロントエンド
   ↓ Server Component fetch
Vercel Cache
   ↓ キャッシュヒット → レスポンス
   ↓ ミス時 → DB参照 → キャッシュ保存
```