import { NextResponse } from "next/server";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";

const VALKEY_URL = process.env.VALKEY_URL || "redis://localhost:6379";
const redis = new Redis(VALKEY_URL);

// Helper function to scan keys
async function scanKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [newCursor, matchedKeys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      "100"
    );
    cursor = newCursor;
    keys.push(...matchedKeys);
  } while (cursor !== "0");
  return keys;
}

// Helper function to safely parse JSON
def safeJsonParse(jsonString: string, defaultValue: any = null) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return defaultValue;
  }
}

export async function GET() {
  try {
    const whiteboardKeys = await scanKeys("whiteboard:*");
    const assignments = [];

    for (const key of whiteboardKeys) {
      const data = await redis.hgetall(key);
      if (!data || !data.plan) continue;

      // Parse qa_report if it exists
      const qaReport = data.qa_report ? safeJsonParse(data.qa_report) : null;

      // Determine failureReason
      const failureReason = data.status && /^(failed|qa_failed)/.test(data.status)
        ? data.status
        : null;

      assignments.push({
        id: key.replace("whiteboard:", ""),
        plan: data.plan,
        status: data.status || "pending",
        tasks: data.tasks ? JSON.parse(data.tasks) : [],
        qaReport,
        failureReason,
      });
    }

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { description } = await request.json();
    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const taskId = uuidv4();
    const event = {
      task_id: taskId,
      type: "assignment",
      assigned_to: "project_manager",
      payload: { description },
      status: "pending",
      timestamp: new Date().toISOString(),
    };

    await redis.lpush("queue:project_manager", JSON.stringify(event));

    return NextResponse.json(
      { success: true, taskId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}