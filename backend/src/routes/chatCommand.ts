import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const createCommandSchema = z.object({
  command: z
    .string()
    .min(2)
    .max(50)
    .regex(/^![\w]+$/, 'Command must start with ! and contain only letters, numbers, and underscores'),
  response: z.string().min(1).max(500),
  cooldown: z.number().min(0).max(3600).default(5),
  isEnabled: z.boolean().default(true),
})

const updateCommandSchema = createCommandSchema.partial()

// GET /api/commands - Get user's chat commands
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const commands = await prisma.chatCommand.findMany({
      where: { userId: req.user.id },
      orderBy: { command: 'asc' },
    })

    res.json(commands)
  } catch (error) {
    next(error)
  }
})

// POST /api/commands - Create chat command
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const data = createCommandSchema.parse(req.body)

    // Check if command already exists
    const existing = await prisma.chatCommand.findFirst({
      where: {
        userId: req.user.id,
        command: data.command,
      },
    })

    if (existing) {
      throw new AppError('Command already exists', 400)
    }

    const command = await prisma.chatCommand.create({
      data: {
        ...data,
        userId: req.user.id,
      },
    })

    res.status(201).json(command)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// GET /api/commands/:id
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const command = await prisma.chatCommand.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (!command) throw new AppError('Command not found', 404)

    res.json(command)
  } catch (error) {
    next(error)
  }
})

// PATCH /api/commands/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const data = updateCommandSchema.parse(req.body)

    // If updating command name, check for duplicates
    if (data.command) {
      const existing = await prisma.chatCommand.findFirst({
        where: {
          userId: req.user.id,
          command: data.command,
          NOT: { id: req.params.id },
        },
      })

      if (existing) {
        throw new AppError('Command already exists', 400)
      }
    }

    const result = await prisma.chatCommand.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      data,
    })

    if (result.count === 0) throw new AppError('Command not found', 404)

    const command = await prisma.chatCommand.findUnique({
      where: { id: req.params.id },
    })

    res.json(command)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// DELETE /api/commands/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const result = await prisma.chatCommand.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (result.count === 0) throw new AppError('Command not found', 404)

    res.json({ message: 'Command deleted' })
  } catch (error) {
    next(error)
  }
})

// POST /api/commands/:id/toggle
router.post('/:id/toggle', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401)

    const command = await prisma.chatCommand.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (!command) throw new AppError('Command not found', 404)

    const updated = await prisma.chatCommand.update({
      where: { id: req.params.id },
      data: { isEnabled: !command.isEnabled },
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
})

export default router
