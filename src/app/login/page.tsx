import styles from './page.module.css';

export default function LoginPage() {
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
              type="password"
              id="password"
              name="password"
              className={styles.formInput}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className={styles.btnLogin}>
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}
