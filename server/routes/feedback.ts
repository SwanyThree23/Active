/**
 * Feedback API Routes
 * Handles user feedback submission and retrieval for continuous improvement
 */

import { Router, Request, Response, NextFunction } from 'express'
import { feedbackLoopService } from '../services/feedback-loop'
import { authenticate } from '../middleware/auth'

const router = Router()

// All feedback routes require authentication
router.use(authenticate)

/**
 * Submit feedback for content
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contentId, type, rating, comment, correction, category } = req.body

    if (!contentId || !type) {
      return res.status(400).json({
        success: false,
        error: 'Content ID and type are required',
      })
    }

    const result = await feedbackLoopService.submitFeedback({
      contentId,
      userId: req.user!.id,
      type,
      rating,
      comment,
      correction,
      category,
    })

    res.json({
      success: true,
      data: result,
      message: 'Feedback submitted successfully',
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Get feedback summary for content
 */
router.get('/content/:contentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await feedbackLoopService.getContentFeedback(req.params.contentId)

    res.json({ success: true, data: summary })
  } catch (error) {
    next(error)
  }
})

/**
 * Get feedback analysis patterns
 */
router.get('/analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, modelId } = req.query

    const analysis = await feedbackLoopService.analyzeFeedbackPatterns({
      modelId: modelId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    })

    res.json({ success: true, data: analysis })
  } catch (error) {
    next(error)
  }
})

/**
 * Get improvement metrics
 */
router.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days, modelId } = req.query

    const metrics = await feedbackLoopService.getImprovementMetrics({
      days: days ? parseInt(days as string) : 30,
      modelId: modelId as string,
    })

    res.json({ success: true, data: metrics })
  } catch (error) {
    next(error)
  }
})

/**
 * Find similar improvements for content
 */
router.post('/similar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
      })
    }

    const result = await feedbackLoopService.findSimilarImprovements(content)

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

export default router
