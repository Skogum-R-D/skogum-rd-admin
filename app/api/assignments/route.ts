import { NextResponse } from 'next/server';
import { getRedisClient, scanWhiteboardKeys, getAssignmentWithTasks } from '@/lib/valkey';
import { createErrorResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor') || '0';

  try {
    const client = await getRedisClient();
    await client.ping(); // Test connection

    const keys = await scanWhiteboardKeys();
    const assignments = await Promise.all(
      keys.map(async (key) => {
        const assignmentId = key.replace('whiteboard:', '');
        const data = await getAssignmentWithTasks(assignmentId);
        return data;
      })
    );

    const validAssignments = assignments.filter((assignment) => assignment !== null);

    const response = NextResponse.json({
      data: validAssignments,
      cursor: '0', // Placeholder for pagination
    });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    logger.error({ error }, 'Failed to fetch assignments');

    if (error instanceof Error) {
      if (error.message.includes('Connection failed')) {
        return createErrorResponse(
          { code: 'ValkeyUnavailable', message: 'Failed to connect to Valkey' },
          503
        );
      }
    }

    return createErrorResponse(
      { code: 'InternalServerError', message: 'An unexpected error occurred' },
      500
    );
  }
}