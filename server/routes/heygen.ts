import { Router, Response } from 'express'
import { prisma } from '../../lib/db/prisma'
import { authenticate, AuthenticatedRequest, requireTier } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { aiRateLimiter } from '../middleware/rateLimiter'
import { heygenClient } from '../../lib/integrations/heygen'

const router = Router()

// Get available avatars
router.get(
  '/avatars',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const avatars = await heygenClient.getAvatars()

    res.json({
      success: true,
      data: avatars,
    })
  })
)

// Get single avatar
router.get(
  '/avatars/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const avatar = await heygenClient.getAvatar(req.params.id)

    res.json({
      success: true,
      data: avatar,
    })
  })
)

// Get available voices
router.get(
  '/voices',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const voices = await heygenClient.getVoices()

    res.json({
      success: true,
      data: voices,
    })
  })
)

// Generate avatar video
router.post(
  '/avatar',
  authenticate,
  requireTier('pro', 'enterprise'),
  aiRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { avatarId, script, voiceId, background, quality } = req.body

    if (!avatarId || !script) {
      return res.status(400).json({
        success: false,
        error: 'Avatar ID and script are required',
      })
    }

    const result = await heygenClient.generateVideo({
      avatarId,
      script,
      voiceId,
      background,
      quality: quality || 'medium',
    })

    // Log API usage
    await prisma.apiUsage.create({
      data: {
        userId: req.user!.id,
        service: 'heygen',
        endpoint: '/avatar',
        tokens: script.length,
        status: 'success',
      },
    })

    res.json({
      success: true,
      data: {
        videoId: result.videoId,
        status: result.status,
      },
    })
  })
)

// Get video status
router.get(
  '/video/:videoId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = await heygenClient.getVideoStatus(req.params.videoId)

    res.json({
      success: true,
      data: status,
    })
  })
)

// Get talking photos
router.get(
  '/talking-photos',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const photos = await heygenClient.getTalkingPhoto()

    res.json({
      success: true,
      data: photos,
    })
  })
)

// Upload talking photo
router.post(
  '/talking-photos',
  authenticate,
  requireTier('pro', 'enterprise'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { imageUrl } = req.body

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required',
      })
    }

    const photo = await heygenClient.uploadTalkingPhoto(imageUrl)

    res.json({
      success: true,
      data: photo,
    })
  })
)

// Get quota
router.get(
  '/quota',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const quota = await heygenClient.getQuota()

    res.json({
      success: true,
      data: quota,
    })
  })
)

export default router
