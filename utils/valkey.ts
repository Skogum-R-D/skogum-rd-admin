import Redis from "ioredis";
import retry from "p-retry";

// Initialize Redis client with connection settings
const valkeyUrl = process.env.VALKEY_URL || "redis://localhost:6379";
const client = new Redis(valkeyUrl, {
  commandTimeout: 5000,
  retryStrategy: (times) => Math.min(times * 100, 5000),
  maxRetriesPerRequest: 3,
});

// Helper function to scan keys using SCAN command
async function* scanKeys(client: Redis, pattern: string) {
  let cursor = "0";
  do {
    const reply = await client.scan(cursor, "MATCH", pattern, "COUNT", "100");
    cursor = reply[0];
    for (const key of reply[1]) {
      yield key;
    }
  } while (cursor !== "0");
}

/**
 * Get all whiteboard:* keys from Valkey
 * @returns Array of whiteboard key names
 */
export async function getWhiteboardKeys(): Promise<string[]> {
  return await retry(
    async () => {
      const keys: string[] = [];
      for await (const key of scanKeys(client, "whiteboard:*")) {
        keys.push(key);
      }
      return keys;
    },
    { retries: 3 }
  );
}

/**
 * Get assignment data for a specific whiteboard key
 * @param key The whiteboard key
 * @returns Assignment data or null if not found
 */
export async function getAssignmentData(key: string): Promise<{
  id: string;
  plan_summary: string;
  status: string;
  created_at: string;
} | null> {
  return await retry(
    async () => {
      try {
        const rawData = await client.get(key);
        if (!rawData) return null;

        const data = JSON.parse(rawData);
        return {
          id: key.replace("whiteboard:", ""),
          plan_summary: data.plan_summary || "No summary available",
          status: data.status || "unknown",
          created_at: data.created_at || new Date().toISOString(),
        };
      } catch (err) {
        throw new Error(`Failed to parse assignment data for key ${key}: ${err}`);
      }
    },
    { retries: 3 }
  );
}

/**
 * Get task details for a specific assignment
 * @param assignmentId The assignment ID
 * @returns Array of task details
 */
export async function getTaskDetails(assignmentId: string): Promise<
  Array<{
    id: string;
    type: string;
    assigned_agent: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    completed_at?: string;
  }>
> {
  return await retry(
    async () => {
      try {
        // Get all keys matching the task pattern for this assignment
        const taskKeys: string[] = [];
        const pattern = `whiteboard:${assignmentId}:task:*`;
        
        for await (const key of scanKeys(client, pattern)) {
          taskKeys.push(key);
        }

        // Fetch all task data in parallel
        const tasksData = await Promise.all(
          taskKeys.map(async (key) => {
            const rawData = await client.get(key);
            if (!rawData) return null;
            
            try {
              const data = JSON.parse(rawData);
              return {
                id: key.split(":").pop() || "unknown",
                type: data.type || "unknown",
                assigned_agent: data.assigned_agent || "unassigned",
                status: data.status || "pending",
                completed_at: data.completed_at,
              };
            } catch (parseErr) {
              console.error(`Failed to parse task data for key ${key}:`, parseErr);
              return null;
            }
          })
        );

        return tasksData.filter((task): task is NonNullable<typeof task> => task !== null);
      } catch (err) {
        throw new Error(`Failed to fetch task details for assignment ${assignmentId}: ${err}`);
      }
    },
    { retries: 3 }
  );
}

/**
 * Get complete assignment data including tasks
 * @param assignmentId The assignment ID
 * @returns Complete assignment data with tasks
 */
export async function getCompleteAssignmentData(assignmentId: string): Promise<{
  assignment: Awaited<ReturnType<typeof getAssignmentData>>;
  tasks: Awaited<ReturnType<typeof getTaskDetails>>;
}> {
  return await retry(
    async () => {
      const [assignment, tasks] = await Promise.all([
        getAssignmentData(`whiteboard:${assignmentId}`),
        getTaskDetails(assignmentId),
      ]);
      
      if (!assignment) {
        throw new Error(`Assignment ${assignmentId} not found`);
      }
      
      return { assignment, tasks };
    },
    { retries: 3 }
  );
}

// Export the client for direct access if needed
export { client as valkeyClient };

export default {
  getWhiteboardKeys,
  getAssignmentData,
  getTaskDetails,
  getCompleteAssignmentData,
  valkeyClient: client,
};