# API-CRUDマトリックス
## API一覧
```
| API        | C | R | U | D |
| ---------- | - | - | - | - |
| createTask | ○ |   |   |   |
| getTasks   |   | ○ |   |   |
| updateTask |   |   | ○ |   |
| deleteTask |   |   |   | ○ |
| lockTask   |   |   | ○ |   |
| unlockTask |   |   | ○ |   |
```
## API*ロール
```
| API        | admin | editor | viewer |
| ---------- | ----- | ------ | ------ |
| createTask | ○     | ○      | ×      |
| getTasks   | ○     | ○      | ○      |
| updateTask | ○     | ○      | ×      |
| deleteTask | ○     | △     | ×      |
| lockTask   | ○     | ○      | ×      |
| unlockTask | ○     | ×      | ×      |
```