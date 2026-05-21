import { NextResponse } from "next/server";
import Redis from "ioredis";

const redis = new Redis(process.env.VALKEY_URL || "redis://localhost:6379");

export async function GET() {
  try {
    const keys = await redis.keys("whiteboard:*");
    const assignments = await Promise.all(
      keys.map(async (key) => {
        const data = await redis.hgetall(key);
        return { id: key, ...data };
      })
    );
    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}
