/**
 * Active Learning Pipeline Service
 * Implements intelligent sample selection for model improvement
 * Prioritizes high-value training examples from user feedback
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Selection strategy weights
const SELECTION_WEIGHTS = {
  UNCERTAINTY: 0.40,  // Prioritize uncertain predictions
  DIVERSITY: 0.30,    // Ensure variety in training data
  RECENCY: 0.15,      // Prefer recent samples
  IMPACT: 0.15,       // Prioritize high-impact corrections
}

// Batch configuration
const BATCH_CONFIG = {
  MIN_SAMPLES: 50,
  MAX_SAMPLES: 500,
  SELECTION_THRESHOLD: 0.60,
}

export interface TrainingSample {
  id: string
  input: string
  output: string
  correctedOutput?: string
  metadata: {
    category?: string
    source: string
    confidenceScore?: number
    feedbackRating?: number
  }
}

export interface SelectionScore {
  uncertaintyScore: number
  diversityScore: number
  recencyScore: number
  impactScore: number
  totalScore: number
}

export const activeLearningService = {
  /**
   * Process new feedback for active learning queue
   */
  async processFeedback(feedbackId: string) {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        reviewQueue: true,
      },
    })

    if (!feedback || !feedback.originalOutput) {
      return null
    }

    // Calculate selection scores
    const scores = await this.calculateSelectionScores(feedback)

    // Add to active learning queue if above threshold
    if (scores.totalScore >= BATCH_CONFIG.SELECTION_THRESHOLD) {
      await prisma.activeLearningQueue.create({
        data: {
          feedbackId,
          inputData: feedback.reviewQueue?.aiOutput || '',
          outputData: feedback.originalOutput,
          correctedData: feedback.correctedOutput || undefined,
          uncertaintyScore: scores.uncertaintyScore,
          diversityScore: scores.diversityScore,
          priorityScore: scores.totalScore,
          status: 'pending',
        },
      })
    }

    // Mark feedback as processed
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { usedForTraining: true },
    })

    return scores
  },

  /**
   * Calculate selection scores for a feedback sample
   */
  async calculateSelectionScores(feedback: {
    id: string
    type: string
    category?: string | null
    rating?: number | null
    originalOutput?: string | null
    correctedOutput?: string | null
    reviewQueue?: { confidenceScore: number } | null
  }): Promise<SelectionScore> {
    // Uncertainty score: Lower confidence = higher uncertainty value
    const confidenceScore = feedback.reviewQueue?.confidenceScore || 0.5
    const uncertaintyScore = 1 - confidenceScore

    // Diversity score: Check how different this sample is from existing queue
    const diversityScore = await this.calculateDiversityScore(
      feedback.originalOutput || '',
      feedback.category || undefined
    )

    // Recency score: Newer samples get higher scores
    const recencyScore = 1.0 // All new samples start with max recency

    // Impact score: Based on correction type and rating
    const impactScore = this.calculateImpactScore(feedback)

    // Calculate weighted total
    const totalScore =
      (uncertaintyScore * SELECTION_WEIGHTS.UNCERTAINTY) +
      (diversityScore * SELECTION_WEIGHTS.DIVERSITY) +
      (recencyScore * SELECTION_WEIGHTS.RECENCY) +
      (impactScore * SELECTION_WEIGHTS.IMPACT)

    return {
      uncertaintyScore,
      diversityScore,
      recencyScore,
      impactScore,
      totalScore,
    }
  },

  /**
   * Calculate diversity score based on existing queue samples
   */
  async calculateDiversityScore(
    content: string,
    category?: string
  ): Promise<number> {
    // Get recent queue items
    const recentItems = await prisma.activeLearningQueue.findMany({
      where: { status: 'pending' },
      take: 100,
      orderBy: { createdAt: 'desc' },
    })

    if (recentItems.length === 0) return 1.0

    // Calculate content similarity with existing items
    const similarities = recentItems.map(item => {
      return this.calculateTextSimilarity(content, item.outputData)
    })

    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length

    // Higher diversity = lower similarity to existing items
    return 1 - avgSimilarity
  },

  /**
   * Calculate simple text similarity
   */
  calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))

    const intersection = [...words1].filter(w => words2.has(w)).length
    const union = new Set([...words1, ...words2]).size

    return union > 0 ? intersection / union : 0
  },

  /**
   * Calculate impact score based on correction type
   */
  calculateImpactScore(feedback: {
    type: string
    rating?: number | null
    correctedOutput?: string | null
  }): number {
    let score = 0.5

    // Corrections have higher impact than ratings
    if (feedback.type === 'correction' && feedback.correctedOutput) {
      score += 0.3
    }

    // Lower ratings indicate more impactful corrections needed
    if (feedback.rating !== null && feedback.rating !== undefined) {
      score += (5 - feedback.rating) * 0.1
    }

    return Math.min(1, score)
  },

  /**
   * Create a training batch from queue
   */
  async createBatch(params?: {
    maxSamples?: number
    minScore?: number
    category?: string
  }) {
    const {
      maxSamples = BATCH_CONFIG.MAX_SAMPLES,
      minScore = BATCH_CONFIG.SELECTION_THRESHOLD,
      category,
    } = params || {}

    const where: Record<string, unknown> = {
      status: 'pending',
      priorityScore: { gte: minScore },
    }

    // Get top samples by priority
    const samples = await prisma.activeLearningQueue.findMany({
      where,
      orderBy: { priorityScore: 'desc' },
      take: maxSamples,
    })

    if (samples.length < BATCH_CONFIG.MIN_SAMPLES) {
      return {
        success: false,
        message: `Not enough samples (${samples.length}/${BATCH_CONFIG.MIN_SAMPLES})`,
        samples: [],
      }
    }

    // Generate batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Mark samples as selected
    await prisma.activeLearningQueue.updateMany({
      where: {
        id: { in: samples.map(s => s.id) },
      },
      data: {
        status: 'selected',
        batchId,
      },
    })

    // Format samples for training
    const trainingSamples: TrainingSample[] = samples.map(s => ({
      id: s.id,
      input: s.inputData,
      output: s.outputData,
      correctedOutput: s.correctedData || undefined,
      metadata: {
        source: 'active_learning',
        confidenceScore: s.uncertaintyScore,
      },
    }))

    return {
      success: true,
      batchId,
      samples: trainingSamples,
      stats: {
        total: samples.length,
        avgPriority: samples.reduce((a, s) => a + s.priorityScore, 0) / samples.length,
        avgUncertainty: samples.reduce((a, s) => a + s.uncertaintyScore, 0) / samples.length,
      },
    }
  },

  /**
   * Mark batch as processed after training
   */
  async completeBatch(batchId: string) {
    await prisma.activeLearningQueue.updateMany({
      where: { batchId },
      data: {
        status: 'processed',
        processedAt: new Date(),
      },
    })

    return { success: true, batchId }
  },

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [total, byStatus, avgScores] = await Promise.all([
      prisma.activeLearningQueue.count(),
      prisma.activeLearningQueue.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.activeLearningQueue.aggregate({
        _avg: {
          uncertaintyScore: true,
          diversityScore: true,
          priorityScore: true,
        },
      }),
    ])

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count
        return acc
      }, {} as Record<string, number>),
      avgScores: {
        uncertainty: avgScores._avg.uncertaintyScore || 0,
        diversity: avgScores._avg.diversityScore || 0,
        priority: avgScores._avg.priorityScore || 0,
      },
    }
  },

  /**
   * Clean up old processed samples
   */
  async cleanupOldSamples(daysOld = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await prisma.activeLearningQueue.deleteMany({
      where: {
        status: 'processed',
        processedAt: { lt: cutoffDate },
      },
    })

    return { deleted: result.count }
  },
}

export default activeLearningService
