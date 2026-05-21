import { NextResponse } from "next/server";
import Redis from "ioredis";

const redis = new Redis(process.env.VALKEY_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get("assignmentId");

  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId query param required" }, { status: 400 });
  }

  try {
    const data = await redis.hgetall(`whiteboard:${assignmentId}`);
    if (!data.plan) {
      return NextResponse.json({ tasks: [] });
    }
    const plan = JSON.parse(data.plan);
    const tasks = (plan.tasks || []).map((t: { id: string; type: string; assigned_to: string }) => ({
      id: t.id,
      type: t.type,
      assignedAgent: t.assigned_to,
      status: data[`task_${t.id}_status`] || "pending",
      completedAt: data[`task_${t.id}_completed_at`] || null,
    }));
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}
