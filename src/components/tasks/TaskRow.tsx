'use client';

import { Task } from '@/types/task';
import { formatLockTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { deleteTask, lockTask } from '@/actions/task.actions';
import { useState } from 'react';


interface TaskRowProps {
  task: Task;
  currentUserId: string;
}

export default function TaskRow({ task, currentUserId }: TaskRowProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [lockError, setLockError] = useState('');

  const handleEdit = async () => {
    setLockError('');
    try {
      await lockTask(task.id);
      router.push(`/tasks?edit=${task.id}`);
    } catch (err: any) {
      setLockError(err.message || 'タスクのロックに失敗しました。');
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (confirm('本当にこのタスクを削除しますか？')) {
      setIsDeleting(true);
      try {
        await deleteTask(task.id);
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'タスクの削除に失敗しました。');
        console.error(err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const isLockedByCurrentUser = task.locked_by === currentUserId;
  const isLockedByOtherUser = !!(task.locked_by && !isLockedByCurrentUser);

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {task.task_code}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {task.name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {task.status}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {task.phase}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {task.effort_hours}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {task.effort_level}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {task.description}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {isLockedByOtherUser
          ? `${task.locked_by_user?.name || '不明なユーザー'} が編集中 (${formatLockTime(
              task.locked_at
            )})`
          : isLockedByCurrentUser
          ? `あなたが編集中 (${formatLockTime(task.locked_at)})`
          : 'なし'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {lockError && <p className="text-red-500 text-xs">{lockError}</p>}
        <button
          onClick={handleEdit}
          className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLockedByOtherUser}
        >
          編集
        </button>
        <button
          onClick={handleDelete}
          className="ml-4 text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isDeleting}
        >
          {isDeleting ? '削除中...' : '削除'}
        </button>
      </td>
    </tr>
  );
}
