import { Router, Response } from 'express'
import { prisma } from '../../lib/db/prisma'
import { authenticate, AuthenticatedRequest, requireTier } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { aiRateLimiter } from '../middleware/rateLimiter'
import { elevenLabsClient } from '../../lib/integrations/elevenlabs'

const router = Router()

// Get available voices
router.get(
  '/voices',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const voices = await elevenLabsClient.getVoices()

    res.json({
      success: true,
      data: voices,
    })
  })
)

// Get single voice
router.get(
  '/voices/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const voice = await elevenLabsClient.getVoice(req.params.id)

    res.json({
      success: true,
      data: voice,
    })
  })
)

// Text to speech
router.post(
  '/tts',
  authenticate,
  requireTier('pro', 'enterprise'),
  aiRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { voiceId, text, modelId, stability, similarityBoost, style } = req.body

    if (!voiceId || !text) {
      return res.status(400).json({
        success: false,
        error: 'Voice ID and text are required',
      })
    }

    const result = await elevenLabsClient.textToSpeech({
      voiceId,
      text,
      modelId,
      stability,
      similarityBoost,
      style,
    })

    // Log API usage
    await prisma.apiUsage.create({
      data: {
        userId: req.user!.id,
        service: 'elevenlabs',
        endpoint: '/tts',
        tokens: text.length, // Character count
        status: 'success',
      },
    })

    res.setHeader('Content-Type', result.contentType)
    res.send(Buffer.from(result.audio))
  })
)

// Text to speech (stream)
router.post(
  '/tts/stream',
  authenticate,
  requireTier('pro', 'enterprise'),
  aiRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { voiceId, text, modelId, stability, similarityBoost } = req.body

    if (!voiceId || !text) {
      return res.status(400).json({
        success: false,
        error: 'Voice ID and text are required',
      })
    }

    const stream = await elevenLabsClient.textToSpeechStream({
      voiceId,
      text,
      modelId,
      stability,
      similarityBoost,
    })

    // Log API usage
    await prisma.apiUsage.create({
      data: {
        userId: req.user!.id,
        service: 'elevenlabs',
        endpoint: '/tts/stream',
        tokens: text.length,
        status: 'success',
      },
    })

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Transfer-Encoding', 'chunked')

    const reader = stream.getReader()

    async function read() {
      const { done, value } = await reader.read()
      if (done) {
        res.end()
        return
      }
      res.write(value)
      await read()
    }

    await read()
  })
)

// Get subscription info
router.get(
  '/subscription',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const subscription = await elevenLabsClient.getSubscriptionInfo()

    res.json({
      success: true,
      data: subscription,
    })
  })
)

// Get history
router.get(
  '/history',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageSize } = req.query

    const history = await elevenLabsClient.getHistory(Number(pageSize) || 100)

    res.json({
      success: true,
      data: history,
    })
  })
)

export default router
