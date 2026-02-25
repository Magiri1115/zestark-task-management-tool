import { Suspense } from 'react';
import { getTasks } from '@/actions/task.actions';
import TaskList from '@/components/tasks/TaskList';
import TaskEditModal from '@/components/tasks/TaskEditModal';
import BackupModal from '@/components/admin/BackupModal';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface TasksPageProps {
  searchParams: {
    edit?: string;
    backup?: string;
  };
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const projectId = 'default_project_id'; // TODO: Replace with actual project ID from context or user selection
  const tasksFromDb = await getTasks(projectId);
  const tasks = tasksFromDb.map(task => ({
    ...task,
    effort_hours: Number(task.effort_hours)
  }));

  const isEditModalOpen = !!searchParams.edit;
  const isBackupModalOpen = searchParams.backup === 'true';

  const editingTask = tasks.find((task) => task.id === searchParams.edit);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">タスク一覧</h1>
      <div className="flex justify-end mb-4">
        <Button asChild>
          <a href="/tasks?edit=new">新規タスク作成</a>
        </Button>
        {session.user.role === 'admin' && (
          <Button asChild variant="secondary">
            <a href="/tasks?backup=true">DBバックアップ</a>
          </Button>
        )}
      </div>
      <Suspense fallback={<div>Loading tasks...</div>}>
        <TaskList tasks={tasks} currentUserId={session.user.id} />
      </Suspense>

      {isEditModalOpen && (
        <TaskEditModal
          isOpen={isEditModalOpen}
          onClose={() => redirect('/tasks')}
          task={editingTask}
          projectId={projectId}
        />
      )}

      {isBackupModalOpen && (
        <BackupModal isOpen={isBackupModalOpen} onClose={() => redirect('/tasks')} />
      )}
    </div>
  );
}
