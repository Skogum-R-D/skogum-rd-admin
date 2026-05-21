import Redis from 'ioredis';

// Default Valkey connection URL
const DEFAULT_VALKEY_URL = 'redis://localhost:6379';

// Get Valkey URL from environment variable or use default
const valkeyUrl = process.env.VALKEY_URL || DEFAULT_VALKEY_URL;

// Create Redis client instance
const redis = new Redis(valkeyUrl);

// Interface for Assignment data
export interface Assignment {
  id: string;
  planSummary: string;
  status: string;
  createdAt: string;
  tasks: Task[];
}

// Interface for Task data
export interface Task {
  id: string;
  type: string;
  assignedAgent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completedAt?: string;
}

/**
 * Get all whiteboard keys from Valkey
 * @returns Promise<string[]> - Array of whiteboard key names
 */
export async function getWhiteboardKeys(): Promise<string[]> {
  try {
    const keys = await redis.keys('whiteboard:*');
    return keys;
  } catch (error) {
    console.error('Error fetching whiteboard keys:', error);
    throw error;
  }
}

/**
 * Get assignment data from Valkey
 * @param key - The whiteboard key
 * @returns Promise<Assignment> - Assignment data
 */
export async function getAssignmentData(key: string): Promise<Assignment> {
  try {
    const data = await redis.hgetall(key);
    
    // Parse the data into Assignment structure
    const assignment: Assignment = {
      id: key.replace('whiteboard:', ''),
      planSummary: data.plan_summary || 'No summary available',
      status: data.status || 'unknown',
      createdAt: data.created_at || new Date().toISOString(),
      tasks: []
    };
    
    return assignment;
  } catch (error) {
    console.error(`Error fetching assignment data for key ${key}:`, error);
    throw error;
  }
}

/**
 * Get task details for an assignment
 * @param assignmentId - The assignment ID
 * @returns Promise<Task[]> - Array of tasks
 */
export async function getTaskDetails(assignmentId: string): Promise<Task[]> {
  try {
    const taskKeys = await redis.keys(`whiteboard:${assignmentId}:tasks:*`);
    
    const tasks: Task[] = [];
    
    for (const taskKey of taskKeys) {
      const taskData = await redis.hgetall(taskKey);
      
      const task: Task = {
        id: taskKey.split(':').pop() || '',
        type: taskData.type || 'unknown',
        assignedAgent: taskData.assigned_agent || 'unassigned',
        status: taskData.status as Task['status'] || 'pending',
        completedAt: taskData.completed_at || undefined
      };
      
      tasks.push(task);
    }
    
    return tasks;
  } catch (error) {
    console.error(`Error fetching task details for assignment ${assignmentId}:`, error);
    throw error;
  }
}

/**
 * Get complete assignment data including tasks
 * @param key - The whiteboard key
 * @returns Promise<Assignment> - Complete assignment with tasks
 */
export async function getCompleteAssignmentData(key: string): Promise<Assignment> {
  try {
    const assignment = await getAssignmentData(key);
    const tasks = await getTaskDetails(assignment.id);
    
    return {
      ...assignment,
      tasks
    };
  } catch (error) {
    console.error(`Error fetching complete assignment data for key ${key}:`, error);
    throw error;
  }
}

/**
 * Get all assignments with their tasks
 * @returns Promise<Assignment[]> - Array of complete assignments
 */
export async function getAllAssignments(): Promise<Assignment[]> {
  try {
    const keys = await getWhiteboardKeys();
    
    const assignments = await Promise.all(
      keys.map(key => getCompleteAssignmentData(key))
    );
    
    // Sort by createdAt (newest first)
    return assignments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error fetching all assignments:', error);
    throw error;
  }
}

// Export the redis client for direct access if needed
export { redis };
