import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const createAutomationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  trigger: z.enum([
    'NEW_FOLLOWER',
    'NEW_SUBSCRIBER',
    'DONATION',
    'CHAT_MESSAGE',
    'STREAM_START',
    'STREAM_END',
    'SCHEDULED',
  ]),
  action: z.object({
    type: z.string(),
    template: z.string().optional(),
    webhook: z.string().url().optional(),
    delay: z.number().optional(),
  }),
  isEnabled: z.boolean().default(true),
})

const updateAutomationSchema = createAutomationSchema.partial()

// GET /api/automations - Get user's automations
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const automations = await prisma.automation.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    })

    res.json(automations)
  } catch (error) {
    next(error)
  }
})

// POST /api/automations - Create automation
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const data = createAutomationSchema.parse(req.body)

    const automation = await prisma.automation.create({
      data: {
        ...data,
        userId: req.user.id,
      },
    })

    res.status(201).json(automation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// GET /api/automations/:id
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const automation = await prisma.automation.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (!automation) throw new AppError('Automation not found', 404)

    res.json(automation)
  } catch (error) {
    next(error)
  }
})

// PATCH /api/automations/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const data = updateAutomationSchema.parse(req.body)

    const result = await prisma.automation.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      data,
    })

    if (result.count === 0) throw new AppError('Automation not found', 404)

    const automation = await prisma.automation.findUnique({
      where: { id: req.params.id },
    })

    res.json(automation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// DELETE /api/automations/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const result = await prisma.automation.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (result.count === 0) throw new AppError('Automation not found', 404)

    res.json({ message: 'Automation deleted' })
  } catch (error) {
    next(error)
  }
})

// POST /api/automations/:id/toggle - Enable/disable automation
router.post('/:id/toggle', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const automation = await prisma.automation.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (!automation) throw new AppError('Automation not found', 404)

    const updated = await prisma.automation.update({
      where: { id: req.params.id },
      data: { isEnabled: !automation.isEnabled },
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
})

export default router
