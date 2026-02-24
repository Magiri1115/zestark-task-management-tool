import { z } from 'zod';

export const createTaskSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1, 'タスク名は必須です'),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
  phase: z.string().min(1, 'フェーズは必須です'),
  effort_hours: z.number().min(0, '工数は0以上である必要があります'),
  effort_level: z.enum(['LIGHT', 'MEDIUM', 'HEAVY']),
  description: z.string().nullable().optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  name: z.string().min(1, 'タスク名は必須です').optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  phase: z.string().min(1, 'フェーズは必須です').optional(),
  effort_hours: z.number().min(0, '工数は0以上である必要があります').optional(),
  effort_level: z.enum(['LIGHT', 'MEDIUM', 'HEAVY']).optional(),
  description: z.string().nullable().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上である必要があります'),
});
