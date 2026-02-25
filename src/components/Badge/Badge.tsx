import React from 'react';
import styles from './Badge.module.css';

type BadgeVariant =
  | 'statusCompleted'
  | 'statusProgress'
  | 'statusNotstarted'
  | 'effortLight'
  | 'effortMedium'
  | 'effortHeavy';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
}

const Badge: React.FC<BadgeProps> = ({ children, variant, className, ...props }) => {
  const badgeClassName = `${styles.badge} ${styles[variant]} ${className || ''}`;

  return (
    <span className={badgeClassName} {...props}>
      {children}
    </span>
  );
};

export default Badge;
