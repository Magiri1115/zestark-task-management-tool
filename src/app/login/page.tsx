"use client";

import styles from './page.module.css';
import { useState } from 'react'; // useStateをインポート

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false); // パスワード表示状態を管理

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginFrame}>
        <h1 className={styles.loginTitle}>タスク管理システム</h1>
        <form>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className={styles.formInput}
              placeholder="email@example.com"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>Password</label>
            <input
              type={showPassword ? 'text' : 'password'} // showPasswordの状態に応じてtypeを変更
              id="password"
              name="password"
              className={styles.formInput}
              placeholder="••••••••"
              required
            />
            <div className={styles.checkboxGroup}> {/* 新しいスタイルグループを追加 */}
              <input
                type="checkbox"
                id="showPassword"
                checked={!showPassword} // 初期値はチェックされている状態（マスク）
                onChange={handleTogglePasswordVisibility}
              />
              <label htmlFor="showPassword" className={styles.checkboxLabel}>パスワードをマスク</label>
            </div>
          </div>
          <button type="submit" className={styles.btnLogin}>
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}
