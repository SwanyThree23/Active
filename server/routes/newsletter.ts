import { Router, Response } from 'express'
import { prisma } from '../../lib/db/prisma'
import { authenticate, AuthenticatedRequest, requireTier } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { beehiivClient } from '../../lib/integrations/beehiiv'
import { claudeClient } from '../../lib/integrations/claude'

const router = Router()

// Get all newsletters for user
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, page = 1, limit = 20 } = req.query

    const where = {
      userId: req.user!.id,
      ...(status && { status: status as string }),
    }

    const [newsletters, total] = await Promise.all([
      prisma.newsletter.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.newsletter.count({ where }),
    ])

    res.json({
      success: true,
      data: newsletters,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  })
)

// Get single newsletter
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const newsletter = await prisma.newsletter.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!newsletter) {
      return res.status(404).json({
        success: false,
        error: 'Newsletter not found',
      })
    }

    res.json({
      success: true,
      data: newsletter,
    })
  })
)

// Create newsletter
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { title, subject, content } = req.body

    const newsletter = await prisma.newsletter.create({
      data: {
        userId: req.user!.id,
        title,
        subject,
        content,
        status: 'draft',
      },
    })

    res.status(201).json({
      success: true,
      data: newsletter,
    })
  })
)

// Update newsletter
router.patch(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { title, subject, content } = req.body

    const existing = await prisma.newsletter.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Newsletter not found',
      })
    }

    if (existing.status === 'sent') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update a sent newsletter',
      })
    }

    const newsletter = await prisma.newsletter.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(subject && { subject }),
        ...(content && { content }),
      },
    })

    res.json({
      success: true,
      data: newsletter,
    })
  })
)

// Delete newsletter
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const existing = await prisma.newsletter.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Newsletter not found',
      })
    }

    await prisma.newsletter.delete({
      where: { id: req.params.id },
    })

    res.json({
      success: true,
      message: 'Newsletter deleted',
    })
  })
)

// Generate newsletter content with AI
router.post(
  '/generate',
  authenticate,
  requireTier('pro', 'enterprise'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { topic, style, sections, targetLength } = req.body

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required',
      })
    }

    const result = await claudeClient.generateNewsletterContent({
      topic,
      style: style || 'informative',
      sections: sections || ['intro', 'main-content', 'takeaways', 'cta'],
      targetLength: targetLength || 500,
    })

    // Log API usage
    await prisma.apiUsage.create({
      data: {
        userId: req.user!.id,
        service: 'claude',
        endpoint: '/newsletter/generate',
        tokens: result.tokens.input + result.tokens.output,
        status: 'success',
      },
    })

    // Create newsletter draft
    const newsletter = await prisma.newsletter.create({
      data: {
        userId: req.user!.id,
        title: topic,
        subject: result.subject,
        content: result.content,
        status: 'draft',
      },
    })

    res.status(201).json({
      success: true,
      data: {
        newsletter,
        tokens: result.tokens,
      },
    })
  })
)

// Send newsletter via Beehiiv
router.post(
  '/:id/send',
  authenticate,
  requireTier('pro', 'enterprise'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const newsletter = await prisma.newsletter.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!newsletter) {
      return res.status(404).json({
        success: false,
        error: 'Newsletter not found',
      })
    }

    if (newsletter.status === 'sent') {
      return res.status(400).json({
        success: false,
        error: 'Newsletter already sent',
      })
    }

    // Create post in Beehiiv
    const beehiivPost = await beehiivClient.createPost({
      subject: newsletter.subject,
      previewText: newsletter.title,
      content: newsletter.content,
      contentFormat: 'markdown',
    })

    // Send the post
    const sentPost = await beehiivClient.sendPost(beehiivPost.id)

    // Get publication info for subscriber count
    const publication = await beehiivClient.getPublication()

    // Update newsletter record
    const updated = await prisma.newsletter.update({
      where: { id: newsletter.id },
      data: {
        beehiivId: beehiivPost.id,
        status: 'sent',
        sentAt: new Date(),
        subscribers: publication.subscriberCount,
      },
    })

    res.json({
      success: true,
      data: {
        newsletter: updated,
        beehiiv: sentPost,
      },
    })
  })
)

// Schedule newsletter
router.post(
  '/:id/schedule',
  authenticate,
  requireTier('pro', 'enterprise'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { scheduledAt } = req.body

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'Scheduled date is required',
      })
    }

    const newsletter = await prisma.newsletter.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!newsletter) {
      return res.status(404).json({
        success: false,
        error: 'Newsletter not found',
      })
    }

    // Create and schedule in Beehiiv
    const beehiivPost = await beehiivClient.createPost({
      subject: newsletter.subject,
      previewText: newsletter.title,
      content: newsletter.content,
      contentFormat: 'markdown',
    })

    const scheduledPost = await beehiivClient.schedulePost(
      beehiivPost.id,
      new Date(scheduledAt)
    )

    // Update newsletter record
    const updated = await prisma.newsletter.update({
      where: { id: newsletter.id },
      data: {
        beehiivId: beehiivPost.id,
        status: 'scheduled',
        scheduledAt: new Date(scheduledAt),
      },
    })

    res.json({
      success: true,
      data: {
        newsletter: updated,
        beehiiv: scheduledPost,
      },
    })
  })
)

// Get newsletter stats
router.get(
  '/:id/stats',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const newsletter = await prisma.newsletter.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!newsletter) {
      return res.status(404).json({
        success: false,
        error: 'Newsletter not found',
      })
    }

    if (!newsletter.beehiivId) {
      return res.status(400).json({
        success: false,
        error: 'Newsletter not synced with Beehiiv',
      })
    }

    const stats = await beehiivClient.getPostStats(newsletter.beehiivId)

    // Update local record
    await prisma.newsletter.update({
      where: { id: newsletter.id },
      data: {
        opens: stats.opened,
        clicks: stats.clicked,
      },
    })

    res.json({
      success: true,
      data: {
        ...stats,
        openRate: stats.openRate,
        clickRate: stats.clickRate,
      },
    })
  })
)

// Get Beehiiv publication info
router.get(
  '/beehiiv/publication',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const publication = await beehiivClient.getPublication()

    res.json({
      success: true,
      data: publication,
    })
  })
)

// Get Beehiiv analytics
router.get(
  '/beehiiv/analytics',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { startDate, endDate } = req.query

    const analytics = await beehiivClient.getAnalytics({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    })

    res.json({
      success: true,
      data: analytics,
    })
  })
)

export default router
