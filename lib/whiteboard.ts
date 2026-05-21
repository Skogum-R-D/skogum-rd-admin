import redis from './redis';
import { Assignment, Task, WhiteboardData } from './types';
import pRetry from 'p-retry';
import { parseISO, utcToZonedTime } from 'date-fns-tz';

/**
 * Fetch all whiteboard:* keys from Valkey using SCAN
 * @returns Promise<string[]> Array of whiteboard key names
 */
export async function getWhiteboardKeys(): Promise<string[]> {
  return await pRetry(
    async () => {
      const keys: string[] = [];
      const stream = redis.scanStream({ match: 'whiteboard:*' });

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (resultKeys: string[]) => {
          keys.push(...resultKeys);
        });
        stream.on('end', () => resolve());
        stream.on('error', (error) => reject(error));
      });

      return keys;
    },
    {
      onFailedAttempt: (error) => {
        console.warn(`SCAN attempt ${error.attemptNumber} failed. Retrying...`);
      },
      retries: 3,
      minTimeout: 500,
      maxTimeout: 2000,
    }
  );
}

/**
 * Parse raw Valkey hash data into structured Assignment object
 * @param key The whiteboard key name
 * @param data Raw hash data from Valkey
 * @returns Parsed Assignment object
 */
function parseAssignmentData(key: string, data: Record<string, string>): Assignment {
  // Extract assignment ID from key (e.g., 'whiteboard:123' -> '123')
  const id = key.replace('whiteboard:', '');

  // Parse timestamp and normalize to UTC
  let timestamp = data.timestamp || new Date().toISOString();
  try {
    const parsedDate = parseISO(timestamp);
    timestamp = utcToZonedTime(parsedDate, 'UTC').toISOString();
  } catch (error) {
    console.warn(`Invalid timestamp format for ${key}: ${timestamp}`);
    timestamp = new Date().toISOString();
  }

  // Parse tasks if they exist
  let tasks: Task[] = [];
  if (data.tasks) {
    try {
      const parsedTasks = JSON.parse(data.tasks);
      if (Array.isArray(parsedTasks)) {
        tasks = parsedTasks.map((task: any) => ({
          id: task.id || '',
          type: task.type || 'unknown',
          agent: task.agent,
          status: task.status || 'pending',
          completed_at: task.completed_at,
        }));
      }
    } catch (error) {
      console.warn(`Failed to parse tasks for ${key}: ${data.tasks}`);
    }
  }

  return {
    id,
    plan_summary: data.plan_summary || 'No summary available',
    status: (data.status as Assignment['status']) || 'dispatched',
    timestamp,
    tasks,
  };
}

/**
 * Fetch assignment data for a specific whiteboard key
 * @param key The whiteboard key name
 * @returns Promise<Assignment> Parsed assignment data
 */
export async function getAssignmentData(key: string): Promise<Assignment> {
  return await pRetry(
    async () => {
      // Use HGETALL to fetch hash data
      const data = await redis.hgetall(key);

      if (!data || Object.keys(data).length === 0) {
        throw new Error(`No data found for key ${key}`);
      }

      return parseAssignmentData(key, data);
    },
    {
      onFailedAttempt: (error) => {
        console.warn(`Attempt ${error.attemptNumber} failed for key ${key}. Retrying...`);
      },
      retries: 2,
      minTimeout: 200,
      maxTimeout: 1000,
    }
  );
}

/**
 * Fetch all whiteboard assignments with their tasks
 * @returns Promise<WhiteboardData> Complete whiteboard data
 */
export async function getAllWhiteboardData(): Promise<WhiteboardData> {
  try {
    const keys = await getWhiteboardKeys();
    
    // Fetch all assignments in parallel
    const assignments = await Promise.all(
      keys.map((key) => getAssignmentData(key))
    );

    // Sort by timestamp (newest first)
    assignments.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return { assignments };
  } catch (error) {
    console.error('Failed to fetch whiteboard data:', error);
    return { assignments: [] };
  }
}

/**
 * Get task count statistics for an assignment
 * @param assignment Assignment object
 * @returns Object with task counts by status
 */
export function getTaskStats(assignment: Assignment) {
  const stats = {
    total: assignment.tasks.length,
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
  };

  assignment.tasks.forEach((task) => {
    switch (task.status) {
      case 'pending':
        stats.pending++;
        break;
      case 'in_progress':
        stats.in_progress++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'failed':
        stats.failed++;
        break;
    }
  });

  return stats;
}