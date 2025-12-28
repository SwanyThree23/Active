import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'

// General rate limiter
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown'
  },
})

// Stricter rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter for API-heavy endpoints
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'API rate limit exceeded. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Cost-based rate limiter for AI endpoints
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'AI generation limit reached. Please upgrade your plan or try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for enterprise users
    const user = (req as { user?: { tier?: string } }).user
    return user?.tier === 'enterprise'
  },
})
