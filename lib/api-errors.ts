import { NextResponse } from 'next/server';

export function createErrorResponse(
  error: { code: string; message: string; details?: unknown },
  status: number
) {
  return NextResponse.json(
    {
      error: error.code,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { details: error.details }),
    },
    { status }
  );
}