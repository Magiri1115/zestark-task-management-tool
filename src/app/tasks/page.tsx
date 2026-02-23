import styles from './page.module.css';
import Button from '@/components/Button/Button';
import Badge from '@/components/Badge/Badge';
import StatsCard from '@/components/StatsCard/StatsCard';
import CompletionPieChart from '@/components/CompletionPieChart/CompletionPieChart';

export default function TaskListPage() {
  // Mock data for demonstration
  const totalTasks = 15;
  const completedTasks = 5;
  const inProgressTasks = 3;
  const notStartedTasks = 7;
  const totalEffort = 120.5;
  const completionRate = ((completedTasks / totalTasks) * 100).toFixed(1);

  // Pie chart data (percentages)
  const completedPercentage = (completedTasks / totalTasks) * 100;
  const inProgressPercentage = (inProgressTasks / totalTasks) * 100;
  const notStartedPercentage = (notStartedTasks / totalTasks) * 100;



  const tasks = [
    { code: 'T1-01', name: '要件定義', status: '完了', phase: '計画', effort: '20.0h', level: '重', locked: false },
    { code: 'T1-02', name: '基本設計', status: '進行中', phase: '設計', effort: '30.0h', level: '中', locked: true },
    { code: 'T1-03', name: '詳細設計', status: '未着手', phase: '設計', effort: '25.0h', level: '中', locked: false },
    { code: 'T1-04', name: 'DB設計', status: '完了', phase: '設計', effort: '15.0h', level: '軽', locked: false },
    { code: 'T1-05', name: 'API開発', status: '進行中', phase: '開発', effort: '40.0h', level: '重', locked: false },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.taskFrame}>
        <div className={styles.taskHeader}>
          <div className={styles.taskHeaderTitle}>タスク管理システム</div>
          <div className={styles.taskHeaderActions}>
            <Button variant="backup" isAdminOnly>
              🗄️ DBバックアップ
            </Button>
            <Button variant="secondary">ログアウト</Button>
            <Button variant="secondary">📥 Excel出力</Button>
          </div>
        </div>

        <div className={styles.taskContent}>
          {/* プロジェクト概要 */}
          <StatsCard title="📊 プロジェクト概要">
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>総タスク数: <span className={styles.statValue}>{totalTasks}件</span></div>
              <div className={styles.statItem}>完了: <span className={styles.statValue}>{completedTasks}件</span></div>
              <div className={styles.statItem}>未着手: <span className={styles.statValue}>{notStartedTasks}件</span></div>
              <div className={styles.statItem}>進行中: <span className={styles.statValue}>{inProgressTasks}件</span></div>
              <div className={styles.statItem}>総工数: <span className={styles.statValue}>{totalEffort}時間</span></div>
              <div className={styles.statItem}>完了率: <span className={styles.statValue}>{completionRate}%</span></div>
            </div>
          </StatsCard>

          {/* 完了率グラフ */}
          <StatsCard title="📈 完了率">
            <CompletionPieChart
              totalTasks={totalTasks}
              completedTasks={completedTasks}
              inProgressTasks={inProgressTasks}
              notStartedTasks={notStartedTasks}
              completionRate={completionRate}
            />
          </StatsCard>

          {/* タスク一覧テーブル */}
          <div className={styles.tableContainer}>
            <div className={styles.statsTitle}>📋 タスク一覧</div>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>コード</th>
                  <th>タスク名</th>
                  <th>状態</th>
                  <th>フェーズ</th>
                  <th>工数</th>
                  <th>レベル</th>
                  <th>ロック</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr key={index}>
                    <td>{task.code}</td>
                    <td>{task.name}</td>
                    <td>
                      <Badge
                        variant={
                          task.status === '完了' ? 'statusCompleted' :
                          task.status === '進行中' ? 'statusProgress' :
                          'statusNotstarted'
                        }
                      >
                        {task.status}
                      </Badge>
                    </td>
                    <td>{task.phase}</td>
                    <td>{task.effort}</td>
                    <td>
                      <Badge
                        variant={
                          task.level === '軽' ? 'effortLight' :
                          task.level === '中' ? 'effortMedium' :
                          'effortHeavy'
                        }
                      >
                        {task.level}
                      </Badge>
                    </td>
                    <td>{task.locked ? '🔒' : ''}</td>
                    <td>
                      <Button variant="editRow">編集</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
