"use client";

import styles from './page.module.css';
import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  const isDev = process.env.NODE_ENV === 'development';

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleQuickLogin = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('メールアドレスまたはパスワードが正しくありません。');
        setIsProcessing(false);
      } else {
        window.location.href = '/tasks';
      }
    } catch (err) {
      setError('予期せぬエラーが発生しました。');
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      {/* 開発者モード切り替えボタン (開発環境のみ) */}
      {isDev && (
        <button 
          type="button" 
          className={`${styles.devModeToggle} ${isDevMode ? styles.devModeToggleActive : ''}`}
          onClick={() => setIsDevMode(!isDevMode)}
        >
          {isDevMode ? 'Dev Mode: ON' : 'Dev Mode: OFF'}
        </button>
      )}

      <div className={styles.loginFrame}>
        <h1 className={styles.loginTitle}>タスク管理システム</h1>
        
        {error && <p className={styles.errorMessage} style={{color: 'red', textAlign: 'center', marginBottom: '1rem'}}>{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className={styles.formInput}
              placeholder="email@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              className={styles.formInput}
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isProcessing}
            />
            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="showPassword"
                checked={!showPassword}
                onChange={handleTogglePasswordVisibility}
                disabled={isProcessing}
              />
              <label htmlFor="showPassword" className={styles.checkboxLabel}>パスワードをマスク</label>
            </div>
          </div>
          <button type="submit" className={styles.btnLogin} disabled={isProcessing}>
            {isProcessing ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        {/* 開発者用クイックログインパネル */}
        {isDev && isDevMode && (
          <div className={styles.devPanel}>
            <p className={styles.devTitle}>Quick Login (Development Only)</p>
            <div className={styles.devButtonGrid}>
              <button 
                type="button" 
                className={styles.btnDev}
                onClick={() => handleQuickLogin('admin@example.com', 'admin123')}
              >
                管理者
              </button>
              <button 
                type="button" 
                className={styles.btnDev}
                onClick={() => handleQuickLogin('user@example.com', 'user123')}
              >
                一般ユーザー
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
