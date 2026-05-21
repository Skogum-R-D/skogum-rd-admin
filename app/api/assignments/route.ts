import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.VALKEY_URL || 'redis://localhost:6379',
});

// Connect to Valkey
(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Valkey');
  } catch (err) {
    console.error('Failed to connect to Valkey:', err);
  }
})();

export async function GET() {
  try {
    const assignments = await redisClient.hGetAll('assignments');
    return NextResponse.json({ data: assignments });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}