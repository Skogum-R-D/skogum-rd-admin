export interface Task {
  id: string;
  type: string;
  agent?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completed_at?: string;
}

export interface Assignment {
  id: string;
  plan_summary: string;
  status: 'in_progress' | 'completed' | 'dispatched';
  timestamp: string;
  tasks: Task[];
}

export interface WhiteboardData {
  assignments: Assignment[];
}