import { createMockRedis } from '@ioredis/mock';
import { getAssignmentWithTasks } from '@/lib/valkey';
import { GET } from '@/app/api/assignments/route';

jest.mock('ioredis', () => createMockRedis);

describe('GET /api/assignments', () => {
  it('returns 503 if Valkey is unavailable', async () => {
    const mockRedis = createMockRedis();
    mockRedis.ping = jest.fn().mockRejectedValue(new Error('Connection failed'));

    const response = await GET(new Request('http://localhost:3003/api/assignments'));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('ValkeyUnavailable');
  });

  it('returns assignments if Valkey is available', async () => {
    const mockRedis = createMockRedis();
    mockRedis.ping = jest.fn().mockResolvedValue('PONG');
    mockRedis.scanStream = jest.fn().mockReturnValue({
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          callback(['whiteboard:1', 'whiteboard:2']);
        } else if (event === 'end') {
          callback();
        }
      }),
    });

    const response = await GET(new Request('http://localhost:3003/api/assignments'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeInstanceOf(Array);
  });
});