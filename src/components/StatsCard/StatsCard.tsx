import React from 'react';
import styles from './StatsCard.module.css';

interface StatsCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, children, className }) => {
  return (
    <div className={`${styles.statsCard} ${className || ''}`}>
      <div className={styles.statsTitle}>{title}</div>
      {children}
    </div>
  );
};

export default StatsCard;
