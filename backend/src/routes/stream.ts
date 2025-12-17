import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const createStreamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  platform: z.enum(['TWITCH', 'YOUTUBE', 'KICK', 'CUSTOM']),
  rtmpUrl: z.string().url().optional(),
  streamKey: z.string().optional(),
})

const updateStreamSchema = createStreamSchema.partial()

// GET /api/streams - Get user's streams
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const streams = await prisma.stream.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    })

    res.json(streams)
  } catch (error) {
    next(error)
  }
})

// POST /api/streams - Create new stream
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const data = createStreamSchema.parse(req.body)

    const stream = await prisma.stream.create({
      data: {
        ...data,
        userId: req.user.id,
      },
    })

    res.status(201).json(stream)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// GET /api/streams/:id - Get stream by ID
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const stream = await prisma.stream.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (!stream) throw new AppError('Stream not found', 404)

    res.json(stream)
  } catch (error) {
    next(error)
  }
})

// PATCH /api/streams/:id - Update stream
router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const data = updateStreamSchema.parse(req.body)

    const stream = await prisma.stream.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      data,
    })

    if (stream.count === 0) throw new AppError('Stream not found', 404)

    const updated = await prisma.stream.findUnique({
      where: { id: req.params.id },
    })

    res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// DELETE /api/streams/:id - Delete stream
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const result = await prisma.stream.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (result.count === 0) throw new AppError('Stream not found', 404)

    res.json({ message: 'Stream deleted' })
  } catch (error) {
    next(error)
  }
})

// POST /api/streams/:id/go-live - Start streaming
router.post('/:id/go-live', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const stream = await prisma.stream.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      data: {
        isLive: true,
        startedAt: new Date(),
      },
    })

    if (stream.count === 0) throw new AppError('Stream not found', 404)

    res.json({ message: 'Stream is now live!' })
  } catch (error) {
    next(error)
  }
})

// POST /api/streams/:id/end - End streaming
router.post('/:id/end', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const stream = await prisma.stream.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      data: {
        isLive: false,
        endedAt: new Date(),
      },
    })

    if (stream.count === 0) throw new AppError('Stream not found', 404)

    res.json({ message: 'Stream ended' })
  } catch (error) {
    next(error)
  }
})

export default router
