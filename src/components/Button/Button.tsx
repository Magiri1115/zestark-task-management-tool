import React from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'backup' | 'editRow';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isAdminOnly?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isAdminOnly = false,
  className,
  ...props
}) => {
  const buttonClassName = `${styles.button} ${styles[variant]} ${className || ''}`;

  return (
    <button className={buttonClassName} {...props}>
      {children}
      {isAdminOnly && <span className={styles.adminOnlyBadge}>admin</span>}
    </button>
  );
};

export default Button;
