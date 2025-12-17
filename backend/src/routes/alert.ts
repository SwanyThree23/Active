import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const createAlertSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['FOLLOWER', 'SUBSCRIBER', 'DONATION', 'RAID', 'HOST', 'BITS', 'CUSTOM']),
  config: z.object({
    sound: z.boolean().optional(),
    duration: z.number().min(1).max(30).optional(),
    minAmount: z.number().optional(),
    template: z.string().optional(),
    animation: z.string().optional(),
  }),
  isEnabled: z.boolean().default(true),
})

const updateAlertSchema = createAlertSchema.partial()

// GET /api/alerts - Get user's alerts
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const alerts = await prisma.alert.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    })

    res.json(alerts)
  } catch (error) {
    next(error)
  }
})

// POST /api/alerts - Create alert
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const data = createAlertSchema.parse(req.body)

    const alert = await prisma.alert.create({
      data: {
        ...data,
        userId: req.user.id,
      },
    })

    res.status(201).json(alert)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// GET /api/alerts/:id
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const alert = await prisma.alert.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (!alert) throw new AppError('Alert not found', 404)

    res.json(alert)
  } catch (error) {
    next(error)
  }
})

// PATCH /api/alerts/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const data = updateAlertSchema.parse(req.body)

    const result = await prisma.alert.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      data,
    })

    if (result.count === 0) throw new AppError('Alert not found', 404)

    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
    })

    res.json(alert)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// DELETE /api/alerts/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const result = await prisma.alert.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (result.count === 0) throw new AppError('Alert not found', 404)

    res.json({ message: 'Alert deleted' })
  } catch (error) {
    next(error)
  }
})

// POST /api/alerts/:id/toggle
router.post('/:id/toggle', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const alert = await prisma.alert.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (!alert) throw new AppError('Alert not found', 404)

    const updated = await prisma.alert.update({
      where: { id: req.params.id },
      data: { isEnabled: !alert.isEnabled },
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
})

// POST /api/alerts/:id/test - Test alert (emit via Socket.io)
router.post('/:id/test', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const alert = await prisma.alert.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (!alert) throw new AppError('Alert not found', 404)

    // In production, this would emit via Socket.io
    // io.to(`user:${req.user.id}`).emit('alert:test', alert)

    res.json({ message: 'Test alert triggered', alert })
  } catch (error) {
    next(error)
  }
})

export default router
