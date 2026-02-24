'use client';

import { useState } from 'react';
import { signIn } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from './LoginForm.module.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Invalid credentials');
      } else {
        // Redirect to tasks page on successful login
        window.location.href = '/tasks';
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h2 className={styles.heading}>
          Sign in to your account
        </h2>
      </div>

      <div className={styles.formWrapper}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className={styles.label}>
              Email address
            </label>
            <div className={styles.inputWrapper}>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className={styles.passwordLabelWrapper}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
            </div>
            <div className={styles.inputWrapper}>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.buttonWrapper}>
            <Button type="submit" className={styles.fullWidthButton}>
              Sign in
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
