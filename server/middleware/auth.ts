import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/db/prisma'
import type { JWTPayload, UserRole, UserTier } from '../../types'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: UserRole
    tier: UserTier
  }
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.accessToken

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided',
      })
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as JWTPayload

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, tier: true },
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not found',
      })
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      tier: user.tier.toLowerCase() as UserTier,
    }

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Token expired',
      })
    }

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid token',
    })
  }
}

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.accessToken

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret'
      ) as JWTPayload

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, tier: true },
      })

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role as UserRole,
          tier: user.tier.toLowerCase() as UserTier,
        }
      }
    }

    next()
  } catch {
    // Continue without auth for optional auth routes
    next()
  }
}

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      })
    }

    next()
  }
}

export const requireTier = (...tiers: UserTier[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // Enterprise has access to everything
    if (req.user.tier === 'enterprise') {
      return next()
    }

    // Pro has access to pro and free features
    if (req.user.tier === 'pro' && tiers.some(t => ['pro', 'free'].includes(t))) {
      return next()
    }

    // Check exact tier match
    if (!tiers.includes(req.user.tier)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'This feature requires a higher tier subscription',
      })
    }

    next()
  }
}
