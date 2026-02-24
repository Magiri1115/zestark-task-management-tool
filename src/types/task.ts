export type Task = {
  id: string;
  project_id: string;
  task_code: string;
  name: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  phase: string;
  effort_hours: number;
  effort_level: 'LIGHT' | 'MEDIUM' | 'HEAVY';
  description: string | null;
  locked_by: string | null;
  locked_at: Date | null;
  created_at: Date;
  updated_at: Date;
  locked_by_user?: {
    id: string;
    name: string;
  } | null;
};

export type CreateTaskInput = {
  project_id: string;
  name: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  phase: string;
  effort_hours: number;
  effort_level: 'LIGHT' | 'MEDIUM' | 'HEAVY';
  description?: string | null;
};

export type UpdateTaskInput = {
  id?: string;
  project_id?: string;
  name?: string;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  phase?: string;
  effort_hours?: number;
  effort_level?: 'LIGHT' | 'MEDIUM' | 'HEAVY';
  description?: string | null;
};
