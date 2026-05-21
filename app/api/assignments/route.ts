// app/api/assignments/route.ts
import { NextResponse } from 'next/server';
import { scanWhiteboardKeys, getAssignmentWithTasks } from '@/lib/valkey';
import { z } from 'zod';
import pRetry from 'p-retry';

const QuerySchema = z.object({
  cursor: z.string().optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Validate query params
    const { searchParams } = new URL(request.url);
    const query = QuerySchema.parse(Object.fromEntries(searchParams));

    // Fetch data with retry logic
    const keys = await pRetry(() => scanWhiteboardKeys(), {
      retries: 3,
      minTimeout: 100,
      maxTimeout: 1000,
    });

    const assignments = await Promise.all(
      keys.map((key) => 
        pRetry(() => getAssignmentWithTasks(key), {
          retries: 3,
          minTimeout: 100,
          maxTimeout: 1000,
        })
      )
    );

    // Format response
    return NextResponse.json({
      data: { assignments },
      meta: {
        timestamp: new Date().toISOString(),
        valkeyUrl: process.env.VALKEY_URL?.replace(/:\/\/.+@/, '://***:***@'),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'InvalidQuery', details: error.flatten() },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes('Valkey')) {
      return NextResponse.json(
        { error: 'ValkeyUnavailable', details: 'Failed to connect to Valkey' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'InternalServerError' },
      { status: 500 }
    );
  }
}