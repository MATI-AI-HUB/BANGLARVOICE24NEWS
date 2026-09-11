// frontend/lib/rate-limit.ts
// Global rate limiter using Upstash Redis

import { Ratelimit } from '@upstash/ratelimit'; // for redis
import { Redis } from '@upstash/redis'; // see https://upstash.com/docs/redis/sdks/nextjs/sdk

// Create a new ratelimiter, that allows 10 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: 'banglarvoice_ratelimit',
});

export default ratelimit;
