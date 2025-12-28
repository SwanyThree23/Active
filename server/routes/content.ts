import { Router, Response } from 'express'
import { prisma } from '../../lib/db/prisma'
import { authenticate, AuthenticatedRequest, requireTier } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { claudeClient } from '../../lib/integrations/claude'
import { llmlinguaClient } from '../../lib/integrations/llmlingua'
import { n8nClient } from '../../lib/integrations/n8n'

const router = Router()

// Get all content for user
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { type, status, page = 1, limit = 20 } = req.query

    const where = {
      userId: req.user!.id,
      ...(type && { type: type as string }),
      ...(status && { status: status as string }),
    }

    const [contents, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.content.count({ where }),
    ])

    res.json({
      success: true,
      data: contents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  })
)

// Get single content
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const content = await prisma.content.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
      })
    }

    res.json({
      success: true,
      data: content,
    })
  })
)

// Create content
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { type, title, description, script, avatar, voice, integrations } = req.body

    const content = await prisma.content.create({
      data: {
        userId: req.user!.id,
        type,
        title,
        description,
        script,
        avatar,
        voice,
        integrations: integrations || [],
        status: 'DRAFT',
      },
    })

    res.status(201).json({
      success: true,
      data: content,
    })
  })
)

// Update content
router.patch(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { title, description, script, avatar, voice, status, metadata } = req.body

    const existing = await prisma.content.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
      })
    }

    const content = await prisma.content.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(script !== undefined && { script }),
        ...(avatar !== undefined && { avatar }),
        ...(voice !== undefined && { voice }),
        ...(status && { status }),
        ...(metadata && { metadata }),
      },
    })

    res.json({
      success: true,
      data: content,
    })
  })
)

// Delete content
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const existing = await prisma.content.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
      })
    }

    await prisma.content.delete({
      where: { id: req.params.id },
    })

    res.json({
      success: true,
      message: 'Content deleted',
    })
  })
)

// Generate content with AI
router.post(
  '/generate',
  authenticate,
  requireTier('pro', 'enterprise'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { topic, style, duration, targetAudience, type = 'VIDEO' } = req.body

    // Generate script with Claude
    const scriptResult = await claudeClient.generateScript({
      topic,
      style: style || 'professional',
      duration: duration || 60,
      targetAudience,
      includeHooks: true,
    })

    // Compress with LLMLingua for token optimization
    const compressed = llmlinguaClient.localSimpleCompress(scriptResult.script, 0.8)

    // Create content record
    const content = await prisma.content.create({
      data: {
        userId: req.user!.id,
        type,
        title: `${topic} - Generated Script`,
        script: scriptResult.script,
        duration: scriptResult.estimatedDuration,
        tokensSaved: compressed.savings.tokens,
        integrations: ['claude', 'llmlingua'],
        status: 'DRAFT',
        metadata: {
          originalTokens: compressed.originalTokens,
          compressedTokens: compressed.compressedTokens,
          compressionRatio: compressed.ratio,
          style,
          targetAudience,
        },
      },
    })

    // Log API usage
    await prisma.apiUsage.create({
      data: {
        userId: req.user!.id,
        service: 'claude',
        endpoint: '/content/generate',
        tokens: scriptResult.tokens.input + scriptResult.tokens.output,
        status: 'success',
      },
    })

    // Trigger N8N workflow if configured
    try {
      await n8nClient.triggerContentWorkflow({
        contentId: content.id,
        contentType: type,
        action: 'create',
        data: { topic, style },
      })
    } catch (error) {
      console.warn('N8N workflow trigger failed:', error)
    }

    res.status(201).json({
      success: true,
      data: {
        content,
        generation: {
          script: scriptResult.script,
          estimatedDuration: scriptResult.estimatedDuration,
          tokensUsed: scriptResult.tokens,
          tokensSaved: compressed.savings.tokens,
          compressionRatio: compressed.ratio,
        },
      },
    })
  })
)

// Process content (generate video/audio)
router.post(
  '/:id/process',
  authenticate,
  requireTier('pro', 'enterprise'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { avatarId, voiceId, quality = 'medium' } = req.body

    const content = await prisma.content.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
      })
    }

    if (!content.script) {
      return res.status(400).json({
        success: false,
        error: 'Content has no script to process',
      })
    }

    // Update status to processing
    await prisma.content.update({
      where: { id: content.id },
      data: {
        status: 'PROCESSING',
        avatar: avatarId,
        voice: voiceId,
      },
    })

    // Trigger N8N video workflow
    try {
      const result = await n8nClient.triggerVideoWorkflow({
        contentId: content.id,
        script: content.script,
        avatarId,
        voiceId,
        quality,
      })

      res.json({
        success: true,
        data: {
          contentId: content.id,
          status: 'processing',
          executionId: result.executionId,
        },
      })
    } catch (error) {
      // Rollback status on error
      await prisma.content.update({
        where: { id: content.id },
        data: { status: 'FAILED' },
      })

      throw error
    }
  })
)

// Compress script
router.post(
  '/:id/compress',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { targetRatio = 0.7 } = req.body

    const content = await prisma.content.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!content?.script) {
      return res.status(404).json({
        success: false,
        error: 'Content or script not found',
      })
    }

    const compressed = llmlinguaClient.localSimpleCompress(content.script, targetRatio)

    // Update content with compressed version
    await prisma.content.update({
      where: { id: content.id },
      data: {
        tokensSaved: compressed.savings.tokens,
        metadata: {
          ...(content.metadata as object || {}),
          originalTokens: compressed.originalTokens,
          compressedTokens: compressed.compressedTokens,
          compressionRatio: compressed.ratio,
        },
      },
    })

    res.json({
      success: true,
      data: {
        original: compressed.original,
        compressed: compressed.compressed,
        savings: compressed.savings,
      },
    })
  })
)

// Improve script with AI
router.post(
  '/:id/improve',
  authenticate,
  requireTier('pro', 'enterprise'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { feedback } = req.body

    const content = await prisma.content.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (!content?.script) {
      return res.status(404).json({
        success: false,
        error: 'Content or script not found',
      })
    }

    const result = await claudeClient.improveScript(content.script, feedback)

    // Update content with improved script
    await prisma.content.update({
      where: { id: content.id },
      data: {
        script: result.improved,
        integrations: [...new Set([...content.integrations, 'claude'])],
      },
    })

    // Log API usage
    await prisma.apiUsage.create({
      data: {
        userId: req.user!.id,
        service: 'claude',
        endpoint: '/content/improve',
        tokens: result.tokens.input + result.tokens.output,
        status: 'success',
      },
    })

    res.json({
      success: true,
      data: {
        improved: result.improved,
        changes: result.changes,
        tokensUsed: result.tokens,
      },
    })
  })
)

export default router
