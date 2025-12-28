/**
 * Feedback Loop Service
 * Implements continuous model improvement through user feedback collection,
 * analysis, and integration with active learning pipeline
 */

import { PrismaClient } from '@prisma/client'
import { activeLearningService } from './active-learning'
import { modelMonitoringService } from './model-monitoring'
import { vectorDb } from '@/lib/integrations/vector-db'

const prisma = new PrismaClient()

// Feedback processing configuration
const FEEDBACK_CONFIG = {
  BATCH_SIZE: 10,
  MIN_RATING_FOR_POSITIVE: 4,
  CORRECTION_WEIGHT: 2.0,
  NEGATIVE_FEEDBACK_THRESHOLD: 2,
}

export interface UserFeedback {
  contentId: string
  userId: string
  type: 'rating' | 'correction' | 'suggestion' | 'report'
  rating?: number
  comment?: string
  correction?: {
    original: string
    corrected: string
  }
  category?: string
}

export interface FeedbackAnalysis {
  overallSentiment: 'positive' | 'neutral' | 'negative'
  commonIssues: string[]
  improvementSuggestions: string[]
  qualityScore: number
}

export interface ImprovementMetrics {
  feedbackCount: number
  avgRating: number
  correctionRate: number
  improvementTrend: 'improving' | 'stable' | 'declining'
  topCategories: { category: string; count: number }[]
}

export const feedbackLoopService = {
  /**
   * Submit user feedback
   */
  async submitFeedback(feedback: UserFeedback): Promise<{ id: string; processed: boolean }> {
    // Get associated review queue item if exists
    const reviewQueue = await prisma.reviewQueue.findFirst({
      where: { contentId: feedback.contentId },
      orderBy: { createdAt: 'desc' },
    })

    // Create feedback record
    const feedbackRecord = await prisma.feedback.create({
      data: {
        contentId: feedback.contentId,
        reviewQueueId: reviewQueue?.id,
        userId: feedback.userId,
        type: feedback.type,
        category: feedback.category,
        rating: feedback.rating,
        comment: feedback.comment,
        originalOutput: feedback.correction?.original,
        correctedOutput: feedback.correction?.corrected,
      },
    })

    // Process feedback for active learning
    if (feedback.type === 'correction' || (feedback.rating && feedback.rating <= FEEDBACK_CONFIG.NEGATIVE_FEEDBACK_THRESHOLD)) {
      await activeLearningService.processFeedback(feedbackRecord.id)
    }

    // Update model metrics based on feedback
    if (reviewQueue) {
      const isPositive = feedback.rating && feedback.rating >= FEEDBACK_CONFIG.MIN_RATING_FOR_POSITIVE
      await modelMonitoringService.recordPrediction({
        modelId: reviewQueue.aiModel,
        confidenceScore: reviewQueue.confidenceScore,
        latency: 0,
        approved: isPositive,
      })
    }

    // Index feedback for similarity search
    if (feedback.correction?.corrected) {
      await vectorDb.indexContent({
        id: feedbackRecord.id,
        content: feedback.correction.corrected,
        metadata: {
          sourceType: 'feedback',
          sourceId: feedbackRecord.id,
          category: feedback.category || 'general',
          createdAt: new Date().toISOString(),
        },
      })
    }

    return { id: feedbackRecord.id, processed: true }
  },

  /**
   * Get feedback summary for a content piece
   */
  async getContentFeedback(contentId: string): Promise<{
    ratings: number[]
    avgRating: number
    corrections: number
    suggestions: number
    reports: number
  }> {
    const feedback = await prisma.feedback.findMany({
      where: { contentId },
    })

    const ratings = feedback
      .filter(f => f.rating !== null)
      .map(f => f.rating as number)

    return {
      ratings,
      avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      corrections: feedback.filter(f => f.type === 'correction').length,
      suggestions: feedback.filter(f => f.type === 'suggestion').length,
      reports: feedback.filter(f => f.type === 'report').length,
    }
  },

  /**
   * Analyze feedback patterns for a model
   */
  async analyzeFeedbackPatterns(params?: {
    modelId?: string
    startDate?: Date
    endDate?: Date
  }): Promise<FeedbackAnalysis> {
    const { startDate, endDate } = params || {}

    const where: Record<string, unknown> = {}
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate
      if (endDate) (where.createdAt as Record<string, Date>).lte = endDate
    }

    const feedback = await prisma.feedback.findMany({
      where,
      include: {
        reviewQueue: true,
      },
    })

    // Analyze sentiment based on ratings
    const ratings = feedback.filter(f => f.rating !== null).map(f => f.rating as number)
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 3

    let overallSentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
    if (avgRating >= 4) overallSentiment = 'positive'
    else if (avgRating <= 2) overallSentiment = 'negative'

    // Identify common issues from categories
    const categoryCount = feedback.reduce((acc, f) => {
      if (f.category) {
        acc[f.category] = (acc[f.category] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const commonIssues = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category)

    // Extract improvement suggestions from corrections
    const corrections = feedback.filter(f => f.type === 'correction' && f.correctedOutput)
    const improvementSuggestions = this.extractImprovementSuggestions(corrections)

    // Calculate quality score (0-100)
    const qualityScore = Math.round(
      (avgRating / 5) * 100 *
      (1 - (corrections.length / (feedback.length || 1)) * 0.3)
    )

    return {
      overallSentiment,
      commonIssues,
      improvementSuggestions,
      qualityScore: Math.max(0, Math.min(100, qualityScore)),
    }
  },

  /**
   * Extract improvement suggestions from correction feedback
   */
  extractImprovementSuggestions(corrections: Array<{
    originalOutput: string | null
    correctedOutput: string | null
    category: string | null
  }>): string[] {
    const suggestions: string[] = []

    // Analyze correction patterns
    const lengthChanges = corrections.filter(c => {
      if (!c.originalOutput || !c.correctedOutput) return false
      return Math.abs(c.originalOutput.length - c.correctedOutput.length) > 100
    })

    if (lengthChanges.length > corrections.length * 0.3) {
      const avgLengthChange = lengthChanges.reduce((sum, c) => {
        const orig = c.originalOutput?.length || 0
        const corr = c.correctedOutput?.length || 0
        return sum + (corr - orig)
      }, 0) / lengthChanges.length

      if (avgLengthChange > 0) {
        suggestions.push('Users often expand outputs - consider generating more detailed content')
      } else {
        suggestions.push('Users often shorten outputs - consider being more concise')
      }
    }

    // Analyze category-based patterns
    const categoryCorrections = corrections.reduce((acc, c) => {
      if (c.category) {
        acc[c.category] = (acc[c.category] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    Object.entries(categoryCorrections)
      .filter(([, count]) => count >= 3)
      .forEach(([category]) => {
        suggestions.push(`Frequent corrections in "${category}" category - review model behavior`)
      })

    return suggestions.slice(0, 5)
  },

  /**
   * Get improvement metrics over time
   */
  async getImprovementMetrics(params?: {
    days?: number
    modelId?: string
  }): Promise<ImprovementMetrics> {
    const { days = 30 } = params || {}
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const feedback = await prisma.feedback.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        reviewQueue: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const ratings = feedback.filter(f => f.rating !== null).map(f => f.rating as number)
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

    const corrections = feedback.filter(f => f.type === 'correction')
    const correctionRate = feedback.length > 0 ? (corrections.length / feedback.length) * 100 : 0

    // Calculate trend by comparing first and second half
    const midpoint = Math.floor(feedback.length / 2)
    const firstHalfRatings = ratings.slice(0, midpoint)
    const secondHalfRatings = ratings.slice(midpoint)

    const firstAvg = firstHalfRatings.length > 0
      ? firstHalfRatings.reduce((a, b) => a + b, 0) / firstHalfRatings.length
      : 0
    const secondAvg = secondHalfRatings.length > 0
      ? secondHalfRatings.reduce((a, b) => a + b, 0) / secondHalfRatings.length
      : 0

    let improvementTrend: 'improving' | 'stable' | 'declining' = 'stable'
    if (secondAvg - firstAvg > 0.3) improvementTrend = 'improving'
    else if (firstAvg - secondAvg > 0.3) improvementTrend = 'declining'

    // Get top categories
    const categoryCount = feedback.reduce((acc, f) => {
      if (f.category) {
        acc[f.category] = (acc[f.category] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }))

    return {
      feedbackCount: feedback.length,
      avgRating,
      correctionRate,
      improvementTrend,
      topCategories,
    }
  },

  /**
   * Find similar content for improvement suggestions
   */
  async findSimilarImprovements(content: string): Promise<{
    suggestions: Array<{
      original: string
      improved: string
      similarity: number
    }>
  }> {
    const results = await vectorDb.findSimilar({
      content,
      contentType: 'feedback',
      limit: 5,
      minScore: 0.7,
    })

    // Get the corresponding feedback records
    const feedbackIds = results.map(r => r.metadata.sourceId)
    const feedbackRecords = await prisma.feedback.findMany({
      where: { id: { in: feedbackIds } },
    })

    const suggestions = feedbackRecords
      .filter(f => f.originalOutput && f.correctedOutput)
      .map(f => {
        const result = results.find(r => r.metadata.sourceId === f.id)
        return {
          original: f.originalOutput || '',
          improved: f.correctedOutput || '',
          similarity: result?.score || 0,
        }
      })

    return { suggestions }
  },

  /**
   * Trigger model improvement cycle
   */
  async triggerImprovementCycle(params?: {
    minSamples?: number
    category?: string
  }): Promise<{
    success: boolean
    batchId?: string
    samplesProcessed?: number
    message: string
  }> {
    const { minSamples = 50, category } = params || {}

    // Get analysis of current feedback
    const analysis = await this.analyzeFeedbackPatterns()

    // Check if we have enough negative feedback to warrant improvement
    if (analysis.qualityScore > 80 && analysis.overallSentiment === 'positive') {
      return {
        success: false,
        message: 'Model quality is high, no improvement needed at this time',
      }
    }

    // Create training batch from active learning queue
    const batch = await activeLearningService.createBatch({
      minScore: 0.5,
      maxSamples: 200,
      category,
    })

    if (!batch.success) {
      return {
        success: false,
        message: batch.message || 'Failed to create training batch',
      }
    }

    return {
      success: true,
      batchId: batch.batchId,
      samplesProcessed: batch.samples?.length || 0,
      message: `Created training batch with ${batch.samples?.length || 0} samples`,
    }
  },
}

export default feedbackLoopService
