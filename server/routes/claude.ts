import { Router, Response } from 'express'
import { prisma } from '../../lib/db/prisma'
import { authenticate, AuthenticatedRequest, requireTier } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { aiRateLimiter } from '../middleware/rateLimiter'
import { claudeClient } from '../../lib/integrations/claude'

const router = Router()

// Complete text
router.post(
  '/complete',
  authenticate,
  aiRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { prompt, maxTokens, temperature, systemPrompt } = req.body

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      })
    }

    const result = await claudeClient.complete({
      prompt,
      maxTokens: maxTokens || 2048,
      temperature: temperature || 0.7,
      systemPrompt,
    })

    // Log API usage
    await prisma.apiUsage.create({
      data: {
        userId: req.user!.id,
        service: 'claude',
        endpoint: '/complete',
        tokens: result.tokens.input + result.tokens.output,
        status: 'success',
      },
    })

    res.json({
      success: true,
      data: {
        content: result.content,
        tokens: result.tokens,
        model: result.model,
      },
    })
  })
)

// Generate script
router.post(
  '/script',
  authenticate,
  requireTier('pro', 'enterprise'),
  aiRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { topic, style, duration, targetAudience, includeHooks } = req.body

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required',
      })
    }

    const result = await claudeClient.generateScript({
      topic,
      style: style || 'professional',
      duration: duration || 60,
      targetAudience: targetAudience || 'general audience',
      includeHooks: includeHooks !== false,
    })

    // Log API usage
    await prisma.apiUsage.create({
      data: {
        userId: req.user!.id,
        service: 'claude',
        endpoint: '/script',
        tokens: result.tokens.input + result.tokens.output,
        status: 'success',
      },
    })

    res.json({
      success: true,
      data: {
        script: result.script,
        estimatedDuration: result.estimatedDuration,
        tokens: result.tokens,
      },
    })
  })
)

// Compress script
router.post(
  '/compress',
  authenticate,
  aiRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { text, targetRatio, preserveKeyPoints } = req.body

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      })
    }

    const result = await claudeClient.compressScript({
      text,
      targetRatio: targetRatio || 0.5,
      preserveKeyPoints: preserveKeyPoints !== false,
    })

    // Log API usage
    await prisma.apiUsage.create({
      data: {
        userId: req.user!.id,
        service: 'claude',
        endpoint: '/compress',
        tokens: result.originalTokens,
        status: 'success',
      },
    })

    res.json({
      success: true,
      data: {
        compressed: result.compressed,
        originalTokens: result.originalTokens,
        compressedTokens: result.compressedTokens,
        ratio: result.ratio,
        savings: result.originalTokens - result.compressedTokens,
      },
    })
  })
)

// Improve script
router.post(
  '/improve',
  authenticate,
  requireTier('pro', 'enterprise'),
  aiRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { script, feedback } = req.body

    if (!script || !feedback) {
      return res.status(400).json({
        success: false,
        error: 'Script and feedback are required',
      })
    }

    const result = await claudeClient.improveScript(script, feedback)

    // Log API usage
    await prisma.apiUsage.create({
      data: {
        userId: req.user!.id,
        service: 'claude',
        endpoint: '/improve',
        tokens: result.tokens.input + result.tokens.output,
        status: 'success',
      },
    })

    res.json({
      success: true,
      data: {
        improved: result.improved,
        changes: result.changes,
        tokens: result.tokens,
      },
    })
  })
)

// Generate newsletter content
router.post(
  '/newsletter',
  authenticate,
  requireTier('pro', 'enterprise'),
  aiRateLimiter,
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
        endpoint: '/newsletter',
        tokens: result.tokens.input + result.tokens.output,
        status: 'success',
      },
    })

    res.json({
      success: true,
      data: {
        content: result.content,
        subject: result.subject,
        tokens: result.tokens,
      },
    })
  })
)

export default router
