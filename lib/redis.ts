import { Redis } from 'ioredis';
import pRetry from 'p-retry';

// Validate VALKEY_URL environment variable
if (!process.env.VALKEY_URL) {
  throw new Error('VALKEY_URL is required');
}

// Validate the URL format
const redisUrl = new URL(process.env.VALKEY_URL);
if (redisUrl.protocol !== 'redis:') {
  throw new Error('VALKEY_URL must use redis:// protocol');
}

// Create singleton Redis client with connection pooling
const redis = new Redis(process.env.VALKEY_URL, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false, // Fail fast if Valkey is down
  lazyConnect: true,
});

// Connect with retry logic
const connectWithRetry = async () => {
  await pRetry(
    async () => {
      await redis.connect();
      // Test the connection
      await redis.ping();
    },
    {
      onFailedAttempt: (error) => {
        console.warn(`Attempt ${error.attemptNumber} failed. Retrying...`);
      },
      retries: 5,
      minTimeout: 1000,
      maxTimeout: 5000,
    }
  );
};

// Initialize connection
connectWithRetry().catch((error) => {
  console.error('Failed to connect to Valkey:', error);
  process.exit(1);
});

export default redis;