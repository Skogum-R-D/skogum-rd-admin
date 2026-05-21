import Redis from 'ioredis';
import { z } from 'zod';
import pRetry from 'p-retry';
import { logger } from './logger';

// Validate VALKEY_URL on startup
const ValkeyUrlSchema = z.string().url().refine(
  (url) => url.startsWith('redis://') || url.startsWith('rediss://'),
  { message: 'VALKEY_URL must be a Redis URL' }
);

const valkeyUrl = ValkeyUrlSchema.parse(process.env.VALKEY_URL);

let redisClient: Redis | null = null;

export async function getRedisClient(): Promise<Redis> {
  if (redisClient) {
    return redisClient;
  }

  const client = new Redis(valkeyUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 2000);
      logger.warn(`Valkey connection retry attempt ${times}. Delaying for ${delay}ms...`);
      return delay;
    },
  });

  client.on('error', (error) => {
    logger.error({ error }, 'Valkey client error');
  });

  redisClient = client;
  return client;
}

// Schemas for data validation
const AssignmentSchema = z.object({
  id: z.string(),
  plan_summary: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  timestamp: z.union([
    z.string().datetime(),
    z.number().transform((n) => new Date(n * 1000).toISOString()),
  ]),
});

const TaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  assigned_agent: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  completed_at: z.union([
    z.string().datetime(),
    z.number().transform((n) => new Date(n * 1000).toISOString()),
    z.null(),
  ]).nullable(),
});

export async function scanWhiteboardKeys(pattern: string = 'whiteboard:*'): Promise<string[]> {
  const client = await getRedisClient();
  const keys: string[] = [];

  const stream = client.scanStream({
    match: pattern,
    count: 100,
  });

  const scanTimeout = setTimeout(() => {
    stream.destroy(new Error('Scan operation timed out'));
  }, 5000); // 5-second timeout

  stream.on('data', (resultKeys: string[]) => {
    keys.push(...resultKeys);
  });

  await new Promise<void>((resolve, reject) => {
    stream.on('end', () => {
      clearTimeout(scanTimeout);
      resolve();
    });
    stream.on('error', (error) => {
      clearTimeout(scanTimeout);
      reject(error);
    });
  });

  return keys;
}

export async function getAssignment(assignmentId: string) {
  const client = await getRedisClient();
  const data = await client.hgetall(`whiteboard:${assignmentId}`);

  if (Object.keys(data).length === 0) {
    return null;
  }

  const parsedData = AssignmentSchema.safeParse({
    id: assignmentId,
    plan_summary: data.plan_summary,
    status: data.status,
    timestamp: data.timestamp,
  });

  if (!parsedData.success) {
    logger.error({ error: parsedData.error, data }, 'Failed to parse assignment data');
    throw new Error('Invalid assignment data');
  }

  return parsedData.data;
}

export async function getTasks(assignmentId: string) {
  const client = await getRedisClient();
  const taskIds = await client.lrange(`whiteboard:${assignmentId}:tasks`, 0, -1);

  const tasks = await Promise.all(
    taskIds.map(async (taskId) => {
      const taskData = await client.hgetall(`whiteboard:${assignmentId}:task:${taskId}`);
      const parsedTask = TaskSchema.safeParse({
        id: taskId,
        type: taskData.type,
        assigned_agent: taskData.assigned_agent,
        status: taskData.status,
        completed_at: taskData.completed_at,
      });

      if (!parsedTask.success) {
        logger.error({ error: parsedTask.error, taskData }, 'Failed to parse task data');
        throw new Error('Invalid task data');
      }

      return parsedTask.data;
    })
  );

  return tasks;
}

export async function getAssignmentWithTasks(assignmentId: string) {
  const [assignment, tasks] = await Promise.all([
    getAssignment(assignmentId),
    getTasks(assignmentId),
  ]);

  if (!assignment) {
    return null;
  }

  return {
    assignment,
    tasks,
  };
}