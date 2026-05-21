import { NextResponse } from "next/server";
import Redis from "ioredis";

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

function parseStatus(raw: string | undefined): "pending" | "in_progress" | "completed" | "failed" {
  if (!raw) return "pending";
  if (raw === "completed") return "completed";
  if (raw === "in_progress" || raw === "dispatched" || raw === "validating") return "in_progress";
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
          if (data.plan) {
            try {
              const plan = JSON.parse(data.plan);
              tasks = (plan.tasks || []).map((t: { id: string; type: string; assigned_to: string }) => ({
                id: t.id,
                type: t.type,
                assignedAgent: t.assigned_to,
                status: parseStatus(data[`task_${t.id}_status`]),
                completedAt: data[`task_${t.id}_completed_at`] || null,
              }));
            } catch {}
          }

          return {
            id: assignmentId,
            planSummary: data.plan_summary || "",
            status: data.status || "unknown",
            createdAt: data.created_at || "",
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
