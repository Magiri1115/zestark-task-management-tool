'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Task, UpdateTaskInput } from '@/types/task';
import { updateTask, createTask } from '@/actions/task.actions';
import { useRouter } from 'next/navigation';


interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task; // Optional, for editing existing tasks
  projectId: string; // Required for creating new tasks
}

export default function TaskEditModal({
  isOpen,
  onClose,
  task,
  projectId,
}: TaskEditModalProps) {
  const router = useRouter();
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [formData, setFormData] = useState<UpdateTaskInput>({
    name: '',
    status: 'NOT_STARTED',
    phase: '',
    effort_hours: 0,
    effort_level: 'LIGHT',
    description: '',
  });
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        status: task.status,
        phase: task.phase,
        effort_hours: task.effort_hours,
        effort_level: task.effort_level,
        description: task.description,
      });
      setJsonInput(JSON.stringify([task], null, 2));
    } else {
      setFormData({
        name: '',
        status: 'NOT_STARTED',
        phase: '',
        effort_hours: 0,
        effort_level: 'LIGHT',
        description: '',
      });
      setJsonInput('');
    }
    setError('');
    setLoading(false);
  }, [task, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'effort_hours' && value !== '' ? parseFloat(value) : value,
    }));
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isJsonMode) {
        const tasksToProcess: UpdateTaskInput[] = JSON.parse(jsonInput);
        // For simplicity, we'll assume single task update/create via JSON for now
        // In a real app, you'd loop and call updateTask/createTask for each
        if (tasksToProcess.length > 0) {
          const taskData = tasksToProcess[0];
          if (taskData.id) {
            await updateTask(taskData.id, taskData as any);
          } else {
            await createTask({
              name: '',
              status: 'NOT_STARTED',
              phase: '',
              effort_hours: 0,
              effort_level: 'LIGHT',
              ...taskData,
              project_id: projectId,
            } as any);
          }
        }
      } else {
        if (task) {
          await updateTask(task.id, formData as any);
        } else {
          await createTask({
            name: '',
            status: 'NOT_STARTED',
            phase: '',
            effort_hours: 0,
            effort_level: 'LIGHT',
            ...formData,
            project_id: projectId,
          } as any);
        }
      }
      router.refresh(); // Revalidate data on the tasks page
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'タスク編集' : '新規タスク作成'}
    >
      <div className="mb-4 flex justify-end">
        <button onClick={() => setIsJsonMode(!isJsonMode)} className="text-sm text-blue-600 hover:text-blue-800">
          {isJsonMode ? 'フォーム入力に切り替え' : 'JSON一括入力に切り替え'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isJsonMode ? (
          <div>
            <label htmlFor="jsonInput" className="block text-sm font-medium text-gray-700">
              JSONデータ
            </label>
            <Textarea
              id="jsonInput"
              rows={10}
              value={jsonInput}
              onChange={handleJsonChange}
              placeholder='[{"name": "Task 1", "status": "NOT_STARTED", ...}]'
            ></Textarea>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                タスク名
              </label>
              <Input
                type="text"
                name="name"
                id="name"
                value={formData.name || ''}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                ステータス
              </label>
              <Select
                name="status"
                id="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="NOT_STARTED">未着手</option>
                <option value="IN_PROGRESS">進行中</option>
                <option value="COMPLETED">完了</option>
              </Select>
            </div>
            <div>
              <label htmlFor="phase" className="block text-sm font-medium text-gray-700">
                フェーズ
              </label>
              <Input
                type="text"
                name="phase"
                id="phase"
                value={formData.phase || ''}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="effort_hours" className="block text-sm font-medium text-gray-700">
                工数（時間）
              </label>
              <Input
                type="number"
                name="effort_hours"
                id="effort_hours"
                value={formData.effort_hours || 0}
                onChange={handleChange}
                min="0"
                step="0.5"
                required
              />
            </div>
            <div>
              <label htmlFor="effort_level" className="block text-sm font-medium text-gray-700">
                工数レベル
              </label>
              <Select
                name="effort_level"
                id="effort_level"
                value={formData.effort_level}
                onChange={handleChange}
              >
                <option value="LIGHT">軽</option>
                <option value="MEDIUM">中</option>
                <option value="HEAVY">重</option>
              </Select>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                説明
              </label>
              <Textarea
                name="description"
                id="description"
                rows={3}
                value={formData.description || ''}
                onChange={handleChange}
              ></Textarea>
            </div>
          </>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
