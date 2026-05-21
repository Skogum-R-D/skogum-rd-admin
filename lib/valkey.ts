import { Redis } from 'ioredis';
import retry from 'p-retry';
import { z } from 'zod';
import 'server-only';

// Interfaces for Valkey data structures
interface Assignment {
  plan_summary: string;
  status: 'in_progress' | 'completed' | 'dispatched';
  timestamp: string; // ISO 8601
}

interface Task {
  id: string;
  type: string;
  agent: string;
  status: string;
  completed_at?: string;
}

// Zod schemas for runtime validation
const AssignmentSchema = z.object({
  plan_summary: z.string(),
  status: z.enum(['in_progress', 'completed', 'dispatched']),
  timestamp: z.string().datetime(),
});

const TaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  agent: z.string(),
  status: z.string(),
  completed_at: z.string().datetime().optional(),
});

// Initialize Redis client with connection retry logic
let redis: Redis;

async function getRedisClient(): Promise<Redis> {
  if (!redis) {
    const valkeyUrl = process.env.VALKEY_URL || 'redis://localhost:6379';
    
    redis = new Redis(valkeyUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        return Math.min(times * 100, 2000);
      },
    });

    // Test connection with retry
    await retry(
      async () => {
        const ping = await redis.ping();
        if (ping !== 'PONG') {
          throw new Error('Valkey connection failed');
        }
      },
      { retries: 3, minTimeout: 1000 }
    );
  }
  return redis;
}

// Scan for all whiteboard:* keys using non-blocking SCAN
async function scanWhiteboardKeys(): Promise<string[]> {
  const client = await getRedisClient();
  const keys: string[] = [];
  const seen = new Set<string>();

  const stream = client.scanStream({
    match: 'whiteboard:*',
    count: 100,
  });

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (resultKeys) => {
      for (const key of resultKeys) {
        if (!seen.has(key)) {
          seen.add(key);
          keys.push(key);
        }
      }
    });

    stream.on('end', () => resolve());
    stream.on('error', (err) => reject(err));
  });

  return keys;
}

// Get assignment data with validation
async function getAssignment(key: string): Promise<Assignment> {
  const client = await getRedisClient();
  const data = await client.hgetall(key);
  
  if (Object.keys(data).length === 0) {
    throw new Error(`Assignment not found: ${key}`);
  }

  return AssignmentSchema.parse(data);
}

// Get task details for an assignment
async function getTasks(key: string): Promise<Task[]> {
  const client = await getRedisClient();
  const tasksData = await client.hget(key, 'tasks');
  
  if (!tasksData) {
    return [];
  }

  try {
    const tasks = JSON.parse(tasksData);
    if (!Array.isArray(tasks)) {
      return [];
    }
    
    return tasks.map((task) => TaskSchema.parse(task));
  } catch (error) {
    console.error(`Failed to parse tasks for ${key}:`, error);
    return [];
  }
}

// Get full assignment data including tasks
async function getAssignmentWithTasks(key: string): Promise<{
  assignment: Assignment;
  tasks: Task[];
}> {
  const [assignment, tasks] = await Promise.all([
    getAssignment(key),
    getTasks(key),
  ]);

  return { assignment, tasks };
}

export {
  scanWhiteboardKeys,
  getAssignment,
  getTasks,
  getAssignmentWithTasks,
  type Assignment,
  type Task,
};