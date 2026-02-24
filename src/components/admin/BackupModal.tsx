'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { backupDatabase } from '@/actions/admin.actions';
import styles from './BackupModal.module.css';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BackupModal({ isOpen, onClose }: BackupModalProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleBackup = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const result = await backupDatabase();
      setMessage(result.message);
    } catch (err: any) {
      setError(err.message || 'バックアップ中にエラーが発生しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="DBバックアップ">
      <div className={styles.backupModalContent}>
        <p>データベースのバックアップを実行します。この操作は管理者のみ実行可能です。</p>
        {message && <p className={styles.messageSuccess}>{message}</p>}
        {error && <p className={styles.messageError}>{error}</p>}
        <div className={styles.actions}>
          <Button
            onClick={handleBackup}
            variant="destructive"
            disabled={loading}
          >
            {loading ? 'バックアップ中...' : 'バックアップ実行'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
