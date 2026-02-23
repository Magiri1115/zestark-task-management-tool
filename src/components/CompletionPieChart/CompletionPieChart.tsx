import React from 'react';
import styles from './CompletionPieChart.module.css';

interface CompletionPieChartProps {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  completionRate: string;
}

const CompletionPieChart: React.FC<CompletionPieChartProps> = ({
  totalTasks,
  completedTasks,
  inProgressTasks,
  notStartedTasks,
  completionRate,
}) => {
  // Pie chart data (percentages)
  const completedPercentage = (completedTasks / totalTasks) * 100;
  const inProgressPercentage = (inProgressTasks / totalTasks) * 100;
  const notStartedPercentage = (notStartedTasks / totalTasks) * 100;

  // SVG stroke-dasharray and stroke-dashoffset calculations
  const circumference = 2 * Math.PI * 80; // r=80 from wireframe
  const completedDasharray = (completedPercentage / 100) * circumference;
  const inProgressDasharray = (inProgressPercentage / 100) * circumference;
  const notStartedDasharray = (notStartedPercentage / 100) * circumference;

  const completedOffset = 0;
  const inProgressOffset = -completedDasharray;
  const notStartedOffset = -(completedDasharray + inProgressDasharray);

  return (
    <div className={styles.chartContainer}>
      <div className={styles.pieChart}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle cx="100" cy="100" r="80" fill="none" stroke="#f3f4f6" strokeWidth="40" />
          {/* Not Started */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="40"
            strokeDasharray={`${notStartedDasharray} ${circumference}`}
            strokeDashoffset={notStartedOffset}
          />
          {/* In Progress */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="40"
            strokeDasharray={`${inProgressDasharray} ${circumference}`}
            strokeDashoffset={inProgressOffset}
          />
          {/* Completed */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#10b981"
            strokeWidth="40"
            strokeDasharray={`${completedDasharray} ${circumference}`}
            strokeDashoffset={completedOffset}
          />
        </svg>
        <div className={styles.pieCenterText}>
          <div className={styles.piePercentage}>{completionRate}%</div>
          <div className={styles.pieLabel}>完了率</div>
        </div>
      </div>
      <div className={styles.chartLegend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.legendColorCompleted}`}></div>
          <div className={styles.legendText}>完了</div>
          <div className={styles.legendCount}>{completedTasks}件 ({completedPercentage.toFixed(1)}%)</div>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.legendColorProgress}`}></div>
          <div className={styles.legendText}>進行中</div>
          <div className={styles.legendCount}>{inProgressTasks}件 ({inProgressPercentage.toFixed(1)}%)</div>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.legendColorNotstarted}`}></div>
          <div className={styles.legendText}>未着手</div>
          <div className={styles.legendCount}>{notStartedTasks}件 ({notStartedPercentage.toFixed(1)}%)</div>
        </div>
      </div>
    </div>
  );
};

export default CompletionPieChart;
