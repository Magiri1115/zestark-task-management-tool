'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { backupDatabase } from '@/actions/admin.actions';

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
      <div className="space-y-4">
        <p>データベースのバックアップを実行します。この操作は管理者のみ実行可能です。</p>
        {message && <p className="text-green-600">{message}</p>}
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex justify-end">
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
