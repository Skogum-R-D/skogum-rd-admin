import { createMockRedis } from '@ioredis/mock';
import { GET } from '@/app/api/tasks/route';

jest.mock('ioredis', () => createMockRedis);

describe('GET /api/tasks', () => {
  it('returns 400 if assignmentId is missing', async () => {
    const response = await GET(new Request('http://localhost:3003/api/tasks'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('InvalidQuery');
  });

  it('returns 503 if Valkey is unavailable', async () => {
    const mockRedis = createMockRedis();
    mockRedis.ping = jest.fn().mockRejectedValue(new Error('Connection failed'));

    const response = await GET(new Request('http://localhost:3003/api/tasks?assignmentId=1'));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('ValkeyUnavailable');
  });

  it('returns tasks if Valkey is available', async () => {
    const mockRedis = createMockRedis();
    mockRedis.ping = jest.fn().mockResolvedValue('PONG');
    mockRedis.lrange = jest.fn().mockResolvedValue(['task1', 'task2']);
    mockRedis.hgetall = jest.fn().mockResolvedValue({
      type: 'test',
      assigned_agent: 'agent1',
      status: 'completed',
      completed_at: '2023-01-01T00:00:00Z',
    });

    const response = await GET(new Request('http://localhost:3003/api/tasks?assignmentId=1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeInstanceOf(Array);
  });
});