# API-CRUDマトリックス
## API一覧
```
| API        | C | R | U | D |
| ---------- | - | - | - | - |
| createTask | ○ |   |   |   |
| getTasks   |   | ○ |   |   |
| updateTask |   |   | ○ |   |
| deleteTask |   |   |   | ○ | (論理削除) |
| importJSON | ○ |   |   |   |
| dumpDB     |   | ○ |   |   |

## API*ロール
| API        | admin | viewer |
| ---------- | ----- | ------ |
| createTask | ○     | ×      |
| getTasks   | ○     | ○      |
| updateTask | ○     | ×      |
| deleteTask | ○     | ×      |
| importJSON | ○     | ×      |
| dumpDB     | ○     | ×      |
```