import { NextApiRequest, NextApiResponse } from 'next';
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const assignments = await redisClient.hGetAll('assignments');
    return res.status(200).json({ data: assignments });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}