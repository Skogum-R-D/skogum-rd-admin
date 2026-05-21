import { NextResponse } from 'next/server';
import { getRedisClient, getTasks } from '@/lib/valkey';
import { createErrorResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get('assignmentId');

  if (!assignmentId) {
    return createErrorResponse(
      { code: 'InvalidQuery', message: 'Missing assignmentId parameter' },
      400
    );
  }

  try {
    const client = await getRedisClient();
    await client.ping(); // Test connection

    const tasks = await getTasks(assignmentId);

    const response = NextResponse.json({
      data: tasks,
    });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    logger.error({ error }, 'Failed to fetch tasks');

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