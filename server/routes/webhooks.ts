import { Router, Request, Response } from 'express'
import { prisma } from '../../lib/db/prisma'
import { asyncHandler } from '../middleware/errorHandler'
import crypto from 'crypto'

const router = Router()

// Verify webhook signature
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${digest}`)
  )
}

// HeyGen video completion webhook
router.post(
  '/heygen/video',
  asyncHandler(async (req: Request, res: Response) => {
    const { event, data } = req.body

    if (event === 'video.completed') {
      const { video_id, video_url, thumbnail_url, duration } = data

      // Find content with this video ID in metadata
      const content = await prisma.content.findFirst({
        where: {
          metadata: {
            path: ['videoId'],
            equals: video_id,
          },
        },
      })

      if (content) {
        await prisma.content.update({
          where: { id: content.id },
          data: {
            status: 'COMPLETED',
            outputUrl: video_url,
            thumbnailUrl: thumbnail_url,
            duration,
          },
        })
      }
    }

    if (event === 'video.failed') {
      const { video_id, error } = data

      const content = await prisma.content.findFirst({
        where: {
          metadata: {
            path: ['videoId'],
            equals: video_id,
          },
        },
      })

      if (content) {
        await prisma.content.update({
          where: { id: content.id },
          data: {
            status: 'FAILED',
            metadata: {
              ...(content.metadata as object || {}),
              error,
            },
          },
        })
      }
    }

    res.json({ success: true })
  })
)

// Beehiiv webhook
router.post(
  '/beehiiv',
  asyncHandler(async (req: Request, res: Response) => {
    const { type, data } = req.body

    switch (type) {
      case 'subscription.created':
        // Handle new subscriber
        console.log('New subscriber:', data.email)
        break

      case 'subscription.deleted':
        // Handle unsubscribe
        console.log('Unsubscribed:', data.email)
        break

      case 'post.sent':
        // Update newsletter stats
        const newsletter = await prisma.newsletter.findFirst({
          where: { beehiivId: data.post_id },
        })

        if (newsletter) {
          await prisma.newsletter.update({
            where: { id: newsletter.id },
            data: {
              status: 'sent',
              sentAt: new Date(),
            },
          })
        }
        break
    }

    res.json({ success: true })
  })
)

// N8N workflow completion webhook
router.post(
  '/n8n/workflow',
  asyncHandler(async (req: Request, res: Response) => {
    const { workflowId, executionId, status, data } = req.body

    console.log('N8N workflow completed:', {
      workflowId,
      executionId,
      status,
    })

    // Handle content-related workflow completions
    if (data?.contentId) {
      const content = await prisma.content.findUnique({
        where: { id: data.contentId },
      })

      if (content) {
        await prisma.content.update({
          where: { id: content.id },
          data: {
            status: status === 'success' ? 'COMPLETED' : 'FAILED',
            ...(data.outputUrl && { outputUrl: data.outputUrl }),
            ...(data.thumbnailUrl && { thumbnailUrl: data.thumbnailUrl }),
            metadata: {
              ...(content.metadata as object || {}),
              workflowExecutionId: executionId,
              workflowStatus: status,
            },
          },
        })
      }
    }

    res.json({ success: true })
  })
)

// Descript export completion webhook
router.post(
  '/descript/export',
  asyncHandler(async (req: Request, res: Response) => {
    const { project_id, export_id, status, download_url } = req.body

    if (status === 'ready') {
      // Find content with this Descript project
      const content = await prisma.content.findFirst({
        where: {
          metadata: {
            path: ['descriptProjectId'],
            equals: project_id,
          },
        },
      })

      if (content) {
        await prisma.content.update({
          where: { id: content.id },
          data: {
            status: 'COMPLETED',
            outputUrl: download_url,
            metadata: {
              ...(content.metadata as object || {}),
              descriptExportId: export_id,
            },
          },
        })
      }
    }

    res.json({ success: true })
  })
)

// Product Hunt launch updates
router.post(
  '/producthunt',
  asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-producthunt-signature'] as string
    const secret = process.env.PRODUCTHUNT_WEBHOOK_SECRET || ''

    if (secret && signature) {
      const isValid = verifySignature(
        JSON.stringify(req.body),
        signature,
        secret
      )

      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid signature',
        })
      }
    }

    const { event, data } = req.body

    console.log('Product Hunt webhook:', event, data)

    // Handle different event types
    switch (event) {
      case 'post.featured':
        console.log('Product featured!', data)
        break

      case 'vote.created':
        console.log('New vote:', data)
        break

      case 'comment.created':
        console.log('New comment:', data)
        break
    }

    res.json({ success: true })
  })
)

// Generic status webhook for async operations
router.post(
  '/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { type, id, status, data } = req.body

    console.log('Status webhook:', { type, id, status })

    if (type === 'content') {
      await prisma.content.update({
        where: { id },
        data: {
          status: status.toUpperCase(),
          ...(data?.outputUrl && { outputUrl: data.outputUrl }),
          ...(data?.thumbnailUrl && { thumbnailUrl: data.thumbnailUrl }),
        },
      })
    }

    res.json({ success: true })
  })
)

export default router
