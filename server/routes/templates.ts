import { Router, Response } from 'express'
import { prisma } from '../../lib/db/prisma'
import { authenticate, optionalAuth, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

// Get all public templates
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { category, type, page = 1, limit = 20 } = req.query

    const where = {
      OR: [
        { isPublic: true },
        ...(req.user ? [{ userId: req.user.id }] : []),
      ],
      ...(category && { category: category as string }),
      ...(type && { type: type as string }),
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
      prisma.template.count({ where }),
    ])

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  })
)

// Get template categories
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await prisma.template.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { isPublic: true },
      orderBy: { _count: { id: 'desc' } },
    })

    res.json({
      success: true,
      data: categories.map((c) => ({
        name: c.category,
        count: c._count.id,
      })),
    })
  })
)

// Get single template
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const template = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { isPublic: true },
          ...(req.user ? [{ userId: req.user.id }] : []),
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    })

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      })
    }

    res.json({
      success: true,
      data: template,
    })
  })
)

// Create template
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, description, category, type, config, thumbnail, isPublic } = req.body

    const template = await prisma.template.create({
      data: {
        userId: req.user!.id,
        name,
        description,
        category,
        type,
        config: config || {},
        thumbnail,
        isPublic: isPublic || false,
      },
    })

    res.status(201).json({
      success: true,
      data: template,
    })
  })
)

// Update template
router.patch(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, description, category, config, thumbnail, isPublic } = req.body

    const existing = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      })
    }

    const template = await prisma.template.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(config && { config }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(isPublic !== undefined && { isPublic }),
      },
    })

    res.json({
      success: true,
      data: template,
    })
  })
)

// Delete template
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const existing = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      })
    }

    await prisma.template.delete({
      where: { id: req.params.id },
    })

    res.json({
      success: true,
      message: 'Template deleted',
    })
  })
)

// Use template (increment usage count and create content)
router.post(
  '/:id/use',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { variables } = req.body

    const template = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { isPublic: true },
          { userId: req.user!.id },
        ],
      },
    })

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      })
    }

    // Increment usage count
    await prisma.template.update({
      where: { id: template.id },
      data: { usageCount: { increment: 1 } },
    })

    // Create content from template
    const config = template.config as Record<string, unknown>

    // Apply variables to config
    let script = (config.script as string) || ''
    if (variables && typeof variables === 'object') {
      Object.entries(variables).forEach(([key, value]) => {
        script = script.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
      })
    }

    const content = await prisma.content.create({
      data: {
        userId: req.user!.id,
        type: template.type,
        title: `${template.name} - Copy`,
        script,
        avatar: config.avatar as string,
        voice: config.voice as string,
        status: 'DRAFT',
        metadata: {
          templateId: template.id,
          templateName: template.name,
          variables,
        },
      },
    })

    res.status(201).json({
      success: true,
      data: {
        template,
        content,
      },
    })
  })
)

// Get my templates
router.get(
  '/user/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const templates = await prisma.template.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      success: true,
      data: templates,
    })
  })
)

export default router
