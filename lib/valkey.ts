import Redis from 'ioredis';
import pRetry from 'p-retry';

// Define interfaces for type safety
interface Assignment {
  plan_summary: string;
  status: 'in_progress' | 'completed' | 'pending' | 'failed';
  timestamp: string;
}

interface Task {
  id: string;
  type: string;
  agent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completed_at?: string;
}

// Environment configuration
const VALKEY_URL = process.env.VALKEY_URL || 'redis://localhost:6379';

// Initialize Redis client with retry logic
const createRedisClient = async (): Promise<Redis> => {
  const client = new Redis(VALKEY_URL);

  // Test the connection
  await pRetry(
    async () => {
      await client.ping();
    },
    {
      retries: 3,
      minTimeout: 1000,
    }
  );

  return client;
};

// Fetch all keys matching the pattern 'whiteboard:*'
const fetchWhiteboardKeys = async (redis: Redis): Promise<string[]> => {
  const keys: string[] = [];
  const stream = redis.scanStream({
    match: 'whiteboard:*',
  });

  stream.on('data', (resultKeys: string[]) => {
    keys.push(...resultKeys);
  });

  await new Promise<void>((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  return keys;
};

// Retrieve assignment data for a given key
const getAssignmentData = async (redis: Redis, key: string): Promise<Assignment> => {
  const data = await redis.hgetall(key);

  if (!data.plan_summary || !data.status || !data.timestamp) {
    throw new Error(`Invalid assignment data for key: ${key}`);
  }

  return {
    plan_summary: data.plan_summary,
    status: data.status as Assignment['status'],
    timestamp: data.timestamp,
  };
};

// Retrieve task details for a given assignment key
const getTaskDetails = async (redis: Redis, key: string): Promise<Task[]> => {
  const tasks: Task[] = [];
  const taskKeys = await redis.keys(`${key}:tasks:*`);

  for (const taskKey of taskKeys) {
    const taskData = await redis.hgetall(taskKey);
    
    if (!taskData.id || !taskData.type || !taskData.agent || !taskData.status) {
      throw new Error(`Invalid task data for key: ${taskKey}`);
    }

    tasks.push({
      id: taskData.id,
      type: taskData.type,
      agent: taskData.agent,
      status: taskData.status as Task['status'],
      completed_at: taskData.completed_at || undefined,
    });
  }

  return tasks;
};

export {
  createRedisClient,
  fetchWhiteboardKeys,
  getAssignmentData,
  getTaskDetails,
  Assignment,
  Task,
};