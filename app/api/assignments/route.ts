import { NextResponse } from "next/server";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";

const redis = new Redis(process.env.VALKEY_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

async function scanKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

type TaskStatus = "pending" | "dispatched" | "in_progress" | "validating" | "completed" | "failed";

type AssignmentEvent = {
  id: string;
  description: string;
  created_at: string;
  status: "pending";
};

function parseStatus(raw: string | undefined): TaskStatus {
  if (!raw) return "pending";
  if (raw === "completed") return "completed";
  if (raw === "in_progress") return "in_progress";
  if (raw === "dispatched") return "dispatched";
  if (raw === "validating") return "validating";
  if (raw.startsWith("failed") || raw.startsWith("qa_failed")) return "failed";
  return "pending";
}

export async function GET() {
  try {
    const keys = await scanKeys("whiteboard:*");

    const assignments = await Promise.all(
      keys
        .filter((k) => !k.replace("whiteboard:", "").startsWith("workflow-"))
        .map(async (key) => {
          const data = await redis.hgetall(key);
          const assignmentId = key.replace("whiteboard:", "");

          let tasks: object[] = [];
          let latestActivity: string | null = null;

          if (data.plan) {
            try {
              const plan = JSON.parse(data.plan);
              tasks = (plan.tasks || []).map((t: {
                id: string; type: string; assigned_to: string;
                description: string; depends_on: string[];
              }) => {
                const completedAt = data[`task_${t.id}_completed_at`] || null;
                if (completedAt && (!latestActivity || completedAt > latestActivity)) {
                  latestActivity = completedAt;
                }
                return {
                  id: t.id,
                  type: t.type,
                  assignedAgent: t.assigned_to,
                  description: t.description || "",
                  dependsOn: t.depends_on || [],
                  status: parseStatus(data[`task_${t.id}_status`]),
                  completedAt,
                };
              });
            } catch {}
          }

          return {
            id: assignmentId,
            planSummary: data.plan_summary || "",
            status: data.status || "unknown",
            createdAt: data.created_at || "",
            latestActivity,
            tasks,
          };
        })
    );

    assignments.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    if (typeof body.description !== 'string' || body.description.trim() === '') {
      return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
    }

    const event: AssignmentEvent = {
      id: uuidv4(),
      description: body.description.trim(),
      created_at: new Date().toISOString(),
      status: "pending",
    };

    await redis.lpush("queue:project_manager", JSON.stringify(event));
    return NextResponse.json({ success: true, id: event.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to queue assignment" },
      { status: 500 }
    );
  }
}
