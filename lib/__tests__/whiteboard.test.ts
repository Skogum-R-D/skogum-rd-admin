import { Redis } from 'ioredis-mock';
import { getWhiteboardKeys, getAssignmentData, getAllWhiteboardData, getTaskStats } from '../whiteboard';
import { Assignment } from '../types';

// Mock the redis module
jest.mock('../redis', () => {
  const mockRedis = new Redis();
  return {
    __esModule: true,
    default: mockRedis,
  };
});

describe('Whiteboard Utility Functions', () => {
  let mockRedis: Redis;

  beforeEach(() => {
    mockRedis = new Redis();
    // Clear all data before each test
    mockRedis.flushall();
  });

  describe('getWhiteboardKeys', () => {
    it('should return all whiteboard:* keys', async () => {
      // Setup test data
      await mockRedis.hset('whiteboard:1', { status: 'completed' });
      await mockRedis.hset('whiteboard:2', { status: 'in_progress' });
      await mockRedis.hset('other:key', { data: 'value' });

      const keys = await getWhiteboardKeys();
      
      expect(keys).toHaveLength(2);
      expect(keys).toContain('whiteboard:1');
      expect(keys).toContain('whiteboard:2');
      expect(keys).not.toContain('other:key');
    });

    it('should return empty array when no whiteboard keys exist', async () => {
      const keys = await getWhiteboardKeys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('getAssignmentData', () => {
    it('should parse assignment data correctly', async () => {
      const testData = {
        plan_summary: 'Test assignment',
        status: 'in_progress',
        timestamp: '2026-05-21T03:56:27.573264',
        tasks: JSON.stringify([
          {
            id: 'task1',
            type: 'implementation',
            agent: 'agent-1',
            status: 'completed',
            completed_at: '2026-05-21T04:00:00.000Z',
          },
        ]),
      };

      await mockRedis.hset('whiteboard:test123', testData);

      const assignment = await getAssignmentData('whiteboard:test123');

      expect(assignment.id).toBe('test123');
      expect(assignment.plan_summary).toBe('Test assignment');
      expect(assignment.status).toBe('in_progress');
      expect(assignment.tasks).toHaveLength(1);
      expect(assignment.tasks[0].id).toBe('task1');
      expect(assignment.tasks[0].status).toBe('completed');
    });

    it('should handle missing fields gracefully', async () => {
      await mockRedis.hset('whiteboard:empty', { status: 'dispatched' });

      const assignment = await getAssignmentData('whiteboard:empty');

      expect(assignment.id).toBe('empty');
      expect(assignment.plan_summary).toBe('No summary available');
      expect(assignment.status).toBe('dispatched');
      expect(assignment.tasks).toHaveLength(0);
    });

    it('should handle invalid task JSON', async () => {
      await mockRedis.hset('whiteboard:invalid', {
        status: 'completed',
        tasks: 'invalid-json',
      });

      const assignment = await getAssignmentData('whiteboard:invalid');
      expect(assignment.tasks).toHaveLength(0);
    });
  });

  describe('getAllWhiteboardData', () => {
    it('should return all assignments sorted by timestamp (newest first)', async () => {
      const oldAssignment = {
        plan_summary: 'Old assignment',
        status: 'completed',
        timestamp: '2026-01-01T00:00:00.000Z',
        tasks: '[]',
      };

      const newAssignment = {
        plan_summary: 'New assignment',
        status: 'in_progress',
        timestamp: '2026-12-31T23:59:59.999Z',
        tasks: '[]',
      };

      await mockRedis.hset('whiteboard:old', oldAssignment);
      await mockRedis.hset('whiteboard:new', newAssignment);

      const result = await getAllWhiteboardData();

      expect(result.assignments).toHaveLength(2);
      expect(result.assignments[0].id).toBe('new'); // Newest first
      expect(result.assignments[1].id).toBe('old');
    });

    it('should return empty assignments array on error', async () => {
      // Mock an error scenario
      jest.spyOn(mockRedis, 'scanStream').mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      const result = await getAllWhiteboardData();
      expect(result.assignments).toHaveLength(0);
    });
  });

  describe('getTaskStats', () => {
    it('should count tasks by status correctly', () => {
      const assignment: Assignment = {
        id: 'test',
        plan_summary: 'Test',
        status: 'in_progress',
        timestamp: new Date().toISOString(),
        tasks: [
          { id: '1', type: 'impl', status: 'pending' },
          { id: '2', type: 'impl', status: 'in_progress' },
          { id: '3', type: 'impl', status: 'completed' },
          { id: '4', type: 'impl', status: 'failed' },
        ],
      };

      const stats = getTaskStats(assignment);

      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should handle empty tasks array', () => {
      const assignment: Assignment = {
        id: 'test',
        plan_summary: 'Test',
        status: 'dispatched',
        timestamp: new Date().toISOString(),
        tasks: [],
      };

      const stats = getTaskStats(assignment);
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.in_progress).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });
});