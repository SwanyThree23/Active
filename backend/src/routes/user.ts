import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
})

// GET /api/users/profile
router.get('/profile', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            streams: true,
            automations: true,
            alerts: true,
            chatCommands: true,
          },
        },
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    res.json(user)
  } catch (error) {
    next(error)
  }
})

// PATCH /api/users/profile
router.patch('/profile', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401)
    }

    const validatedData = updateProfileSchema.parse(req.body)

    // Check if username is taken
    if (validatedData.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: validatedData.username,
          NOT: { id: req.user.id },
        },
      })

      if (existingUser) {
        throw new AppError('Username already taken', 400)
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: validatedData,
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        updatedAt: true,
      },
    })

    res.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// GET /api/users/:id (public profile)
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        isVerified: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    res.json(user)
  } catch (error) {
    next(error)
  }
})

// Admin routes
router.get('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          avatar: true,
          isVerified: true,
          isActive: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ])

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router
