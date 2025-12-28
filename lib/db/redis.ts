import Redis from 'ioredis'

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined
}

const getRedisClient = (): Redis => {
  if (globalThis.redis) {
    return globalThis.redis
  }

  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    connectTimeout: 10000,
  })

  redis.on('error', (err) => {
    console.error('Redis connection error:', err)
  })

  redis.on('connect', () => {
    console.log('Redis connected')
  })

  if (process.env.NODE_ENV !== 'production') {
    globalThis.redis = redis
  }

  return redis
}

export const redis = getRedisClient()

// Cache utilities
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key)
    if (!value) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return value as unknown as T
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized)
    } else {
      await redis.set(key, serialized)
    }
  },

  async del(key: string): Promise<void> {
    await redis.del(key)
  },

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  },

  async increment(key: string): Promise<number> {
    return redis.incr(key)
  },

  async expire(key: string, seconds: number): Promise<void> {
    await redis.expire(key, seconds)
  },

  async ttl(key: string): Promise<number> {
    return redis.ttl(key)
  },
}

// Rate limiting utilities
export const rateLimiter = {
  async checkLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `ratelimit:${identifier}`
    const now = Math.floor(Date.now() / 1000)
    const windowStart = now - windowSeconds

    // Remove old entries
    await redis.zremrangebyscore(key, '-inf', windowStart)

    // Count current requests
    const count = await redis.zcard(key)

    if (count >= limit) {
      const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES')
      const resetAt = oldestEntry.length > 1
        ? parseInt(oldestEntry[1]) + windowSeconds
        : now + windowSeconds

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      }
    }

    // Add new request
    await redis.zadd(key, now, `${now}:${Math.random()}`)
    await redis.expire(key, windowSeconds)

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: now + windowSeconds,
    }
  },
}

export default redis
