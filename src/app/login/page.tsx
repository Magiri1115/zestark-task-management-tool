"use client";

import styles from './page.module.css';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const urlEmail = searchParams.get('email');
    const urlPassword = searchParams.get('password');

    if (urlEmail && urlPassword) {
      setIsProcessing(true);
      
      // URLから情報を消去（履歴に残さないためreplaceを使用）
      // パラメータを含まないパスに置き換える
      router.replace('/login');

      const autoLogin = async () => {
        try {
          const result = await signIn('credentials', {
            redirect: false,
            email: urlEmail,
            password: urlPassword,
          });

          if (result?.error) {
            setError('自動ログインに失敗しました。メールアドレスまたはパスワードが正しくありません。');
            setIsProcessing(false);
          } else {
            // ログイン成功時はタスク一覧へ
            window.location.href = '/tasks';
          }
        } catch (err) {
          setError('予期せぬエラーが発生しました。');
          setIsProcessing(false);
        }
      };
      autoLogin();
    }
  }, [searchParams, router]);

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
      <div className={styles.loginFrame}>
        <h1 className={styles.loginTitle}>タスク管理システム</h1>
        
        {isProcessing && <p className={styles.processingMessage} style={{color: '#666', textAlign: 'center', marginBottom: '1rem'}}>処理中...</p>}
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
