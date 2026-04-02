import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

const windowMs = 60 * 1000;
const max = Number(process.env.RATE_LIMIT_PER_MIN || 100);

let redisClient = null;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3
  });
  redisClient.on('error', (err) => console.error('[redis]', err.message));
}

const store = redisClient
  ? new RedisStore({
      sendCommand: (command, ...args) => redisClient.call(command, ...args)
    })
  : undefined;

/** Per build plan: ~100 req/min per IP; Redis when REDIS_URL is set. */
export const apiLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  ...(store ? { store } : {}),
  skip: (req) => {
    const u = req.originalUrl || req.url || '';
    return u.includes('/api/v1/auth') || u.includes('/health');
  }
});
