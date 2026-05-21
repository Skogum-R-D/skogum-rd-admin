import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { redis, getWhiteboardKeys, getAssignmentData, getTaskDetails, getAllAssignments } from './valkey';
import Redis from 'ioredis';

describe('Valkey Utility Module', () => {
  beforeAll(async () => {
    // Use a test Redis instance
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('should connect to Valkey', async () => {
    const ping = await redis.ping();
    expect(ping).toBe('PONG');
  });

  it('should return empty array when no whiteboard keys exist', async () => {
    const keys = await getWhiteboardKeys();
    expect(keys).toEqual([]);
  });

  it('should create and retrieve assignment data', async () => {
    // Create test data
    const testKey = 'whiteboard:test-assignment-1';
    await redis.hset(testKey, {
      plan_summary: 'Test plan summary',
      status: 'in_progress',
      created_at: new Date().toISOString()
    });

    const assignment = await getAssignmentData(testKey);
    expect(assignment.id).toBe('test-assignment-1');
    expect(assignment.planSummary).toBe('Test plan summary');
    expect(assignment.status).toBe('in_progress');
  });

  it('should create and retrieve task data', async () => {
    const taskKey = 'whiteboard:test-assignment-1:tasks:task-1';
    await redis.hset(taskKey, {
      type: 'data_collection',
      assigned_agent: 'agent-1',
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    const tasks = await getTaskDetails('test-assignment-1');
    expect(tasks.length).toBe(1);
    expect(tasks[0].type).toBe('data_collection');
    expect(tasks[0].assignedAgent).toBe('agent-1');
    expect(tasks[0].status).toBe('completed');
  });

  it('should retrieve all assignments with tasks', async () => {
    const assignments = await getAllAssignments();
    expect(assignments.length).toBeGreaterThan(0);
    expect(assignments[0].tasks.length).toBeGreaterThan(0);
  });
});
