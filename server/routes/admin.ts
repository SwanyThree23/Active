/**
 * Admin Routes for HITL Workflows and Content Moderation
 * Provides endpoints for review queue management, model monitoring,
 * and system administration
 */

import { Router, Request, Response, NextFunction } from 'express'
import { PrismaClient, ReviewStatus, ReviewPriority } from '@prisma/client'
import { hitlService } from '../services/hitl'
import { shadowAiService } from '../services/shadow-ai'
import { activeLearningService } from '../services/active-learning'
import { modelMonitoringService } from '../services/model-monitoring'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// All admin routes require authentication and admin/moderator role
router.use(authenticateToken)
router.use(requireRole(['ADMIN', 'MODERATOR']))

// ===========================================
// Review Queue Management
// ===========================================

/**
 * Get pending reviews
 */
router.get('/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      priority,
      page = '1',
      limit = '20',
    } = req.query

    const result = await hitlService.getPendingReviews(req.user!.userId, {
      status: status as ReviewStatus,
      priority: priority as ReviewPriority,
      limit: parseInt(limit as string),
      offset: (parseInt(page as string) - 1) * parseInt(limit as string),
    })

    res.json({
      success: true,
      data: result.reviews,
      pagination: {
        page: parseInt(page as string),
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Get a single review
 */
router.get('/reviews/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await prisma.reviewQueue.findUnique({
      where: { id: req.params.id },
      include: {
        content: true,
        user: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
        feedbackItems: true,
      },
    })

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      })
    }

    res.json({ success: true, data: review })
  } catch (error) {
    next(error)
  }
})

/**
 * Assign a review to self
 */
router.post('/reviews/:id/assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await hitlService.assignReview(req.params.id, req.user!.userId)

    res.json({
      success: true,
      data: review,
      message: 'Review assigned successfully',
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Submit a review decision
 */
router.post('/reviews/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { approved, feedback, corrections } = req.body

    const review = await hitlService.submitReview(req.params.id, {
      approved,
      feedback,
      corrections,
      reviewerId: req.user!.userId,
    })

    res.json({
      success: true,
      data: review,
      message: approved ? 'Content approved' : 'Content rejected',
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Get review statistics
 */
router.get('/reviews/stats/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query

    const timeRange = startDate && endDate
      ? {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        }
      : undefined

    const stats = await hitlService.getReviewStats(timeRange)

    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
})

// ===========================================
// Model Monitoring
// ===========================================

/**
 * Get all models health status
 */
router.get('/models/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await modelMonitoringService.getAllModelsHealth()

    res.json({ success: true, data: health })
  } catch (error) {
    next(error)
  }
})

/**
 * Get single model health
 */
router.get('/models/:modelId/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await modelMonitoringService.getModelHealth(req.params.modelId)

    res.json({ success: true, data: health })
  } catch (error) {
    next(error)
  }
})

/**
 * Get historical metrics for a model
 */
router.get('/models/:modelId/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30
    const metrics = await modelMonitoringService.getHistoricalMetrics(req.params.modelId, days)

    res.json({ success: true, data: metrics })
  } catch (error) {
    next(error)
  }
})

// ===========================================
// Shadow AI Monitoring
// ===========================================

/**
 * Get shadow comparison stats
 */
router.get('/shadow/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, model } = req.query

    const stats = await shadowAiService.getStats({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      primaryModel: model as string,
    })

    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
})

/**
 * Get recent discrepancies
 */
router.get('/shadow/discrepancies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const discrepancies = await shadowAiService.getDiscrepancies(limit)

    res.json({ success: true, data: discrepancies })
  } catch (error) {
    next(error)
  }
})

// ===========================================
// Active Learning Queue
// ===========================================

/**
 * Get active learning queue stats
 */
router.get('/learning/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await activeLearningService.getQueueStats()

    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
})

/**
 * Create a training batch
 */
router.post('/learning/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { maxSamples, minScore, category } = req.body
    const result = await activeLearningService.createBatch({
      maxSamples,
      minScore,
      category,
    })

    res.json({
      success: result.success,
      data: result,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Mark batch as complete
 */
router.post('/learning/batch/:batchId/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await activeLearningService.completeBatch(req.params.batchId)

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

/**
 * Cleanup old processed samples
 */
router.post('/learning/cleanup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { daysOld } = req.body
    const result = await activeLearningService.cleanupOldSamples(daysOld)

    res.json({
      success: true,
      data: result,
      message: `Cleaned up ${result.deleted} old samples`,
    })
  } catch (error) {
    next(error)
  }
})

// ===========================================
// System Statistics
// ===========================================

/**
 * Get dashboard summary for admin
 */
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      reviewStats,
      modelHealth,
      shadowStats,
      learningStats,
      userCount,
      contentCount,
    ] = await Promise.all([
      hitlService.getReviewStats(),
      modelMonitoringService.getAllModelsHealth(),
      shadowAiService.getStats(),
      activeLearningService.getQueueStats(),
      prisma.user.count(),
      prisma.content.count(),
    ])

    res.json({
      success: true,
      data: {
        reviews: reviewStats,
        models: {
          count: modelHealth.length,
          healthy: modelHealth.filter(m => m.status === 'healthy').length,
          degraded: modelHealth.filter(m => m.status === 'degraded').length,
          critical: modelHealth.filter(m => m.status === 'critical').length,
        },
        shadow: shadowStats,
        learning: learningStats,
        users: userCount,
        content: contentCount,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Get confidence threshold configuration
 */
router.get('/config/thresholds', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { CONFIDENCE_THRESHOLDS } = await import('../services/hitl')

    res.json({
      success: true,
      data: CONFIDENCE_THRESHOLDS,
    })
  } catch (error) {
    next(error)
  }
})

export default router
