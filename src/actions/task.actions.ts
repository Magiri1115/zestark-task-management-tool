'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generateNextTaskCode, formatLockTime } from '@/lib/utils';
import { createTaskSchema, updateTaskSchema } from '@/lib/validations';
import { z } from 'zod';

// 仮の権限チェック関数
async function checkPermission(userId: string, action: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || !user.role) {
    throw new Error('認証されていません');
  }

  const permissions: Record<string, string[]> = {
    admin: ['create', 'read', 'update', 'delete', 'unlock'],
    editor: ['create', 'read', 'update'],
    viewer: ['read'],
  };

  if (!permissions[user.role.name]?.includes(action)) {
    throw new Error('権限がありません');
  }
}

export async function getTasks(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('認証されていません');
  }
  await checkPermission(session.user.id, 'read');

  return await prisma.task.findMany({
    where: { project_id: projectId },
    include: {
      locked_by_user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { task_code: 'asc' },
  });
}

export async function createTask(data: z.infer<typeof createTaskSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('認証されていません');
  }
  await checkPermission(session.user.id, 'create');

  const validatedData = createTaskSchema.parse(data);

  const lastTask = await prisma.task.findFirst({
    where: { project_id: validatedData.project_id },
    orderBy: { task_code: 'desc' },
  });

  const nextCode = generateNextTaskCode(lastTask?.task_code);

  const task = await prisma.task.create({
    data: {
      ...validatedData,
      task_code: nextCode,
      id: crypto.randomUUID(),
    },
  });

  revalidatePath('/tasks');
  return task;
}

export async function updateTask(
  taskId: string,
  data: z.infer<typeof updateTaskSchema>
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('認証されていません');
  }
  await checkPermission(session.user.id, 'update');

  const validatedData = updateTaskSchema.parse(data);

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error('タスクが見つかりません');
  }

  if (task.locked_by !== session.user.id) {
    throw new Error('ロックを保持していません');
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...validatedData,
      locked_by: null,
      locked_at: null,
      updated_at: new Date(),
    },
  });

  revalidatePath('/tasks');
  return updated;
}

export async function deleteTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('認証されていません');
  }
  await checkPermission(session.user.id, 'delete');

  // 論理削除（将来拡張用）
  await prisma.task.delete({
    where: { id: taskId },
  });

  revalidatePath('/tasks');
  return { success: true };
}

export async function lockTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('認証されていません');
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { locked_by_user: true },
  });

  if (!task) {
    throw new Error('タスクが見つかりません');
  }

  const LOCK_TIMEOUT = 15 * 60 * 1000; // 15分
  const isExpired =
    task.locked_at && Date.now() - task.locked_at.getTime() > LOCK_TIMEOUT;

  if (task.locked_by && !isExpired) {
    throw new Error(
      `${task.locked_by_user?.name || '他のユーザー'} が編集中です（${formatLockTime(
        task.locked_at
      )}）`
    );
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      locked_by: session.user.id,
      locked_at: new Date(),
    },
  });

  revalidatePath('/tasks');
  return { success: true };
}

export async function unlockTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('認証されていません');
  }
  await checkPermission(session.user.id, 'unlock'); // 'unlock' action for admin

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });

  if (user?.role?.name !== 'admin') {
    throw new Error('管理者のみ実行可能です');
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      locked_by: null,
      locked_at: null,
    },
  });

  revalidatePath('/tasks');
  return { success: true };
}
