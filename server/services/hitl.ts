/**
 * Human-in-the-Loop (HITL) Service
 * Implements confidence-based routing, review queue management,
 * and feedback collection for AI output validation
 */

import { PrismaClient, ReviewStatus, ReviewPriority } from '@prisma/client'

const prisma = new PrismaClient()

// Confidence thresholds for routing decisions
export const CONFIDENCE_THRESHOLDS = {
  AUTO_APPROVE: 0.95,    // High confidence - auto-approve
  HUMAN_REVIEW: 0.70,    // Medium confidence - requires human review
  ESCALATE: 0.50,        // Low confidence - escalate to senior reviewer
  REJECT: 0.30,          // Very low confidence - auto-reject
}

export interface AIOutput {
  content: string
  model: string
  confidenceScore: number
  metadata?: Record<string, unknown>
}

export interface ReviewDecision {
  action: 'auto_approve' | 'queue_review' | 'escalate' | 'auto_reject'
  reason: string
  priority: ReviewPriority
}

export interface ReviewResult {
  approved: boolean
  feedback?: string
  corrections?: Record<string, unknown>
  reviewerId: string
}

export const hitlService = {
  /**
   * Determine the routing decision based on confidence score
   */
  determineAction(confidenceScore: number, category?: string): ReviewDecision {
    // Adjust thresholds based on content category
    const sensitiveCategories = ['medical', 'legal', 'financial', 'safety']
    const isSensitive = category && sensitiveCategories.includes(category.toLowerCase())

    const adjustedThresholds = isSensitive
      ? {
          AUTO_APPROVE: 0.98,
          HUMAN_REVIEW: 0.85,
          ESCALATE: 0.65,
          REJECT: 0.40,
        }
      : CONFIDENCE_THRESHOLDS

    if (confidenceScore >= adjustedThresholds.AUTO_APPROVE) {
      return {
        action: 'auto_approve',
        reason: 'High confidence score - automatically approved',
        priority: ReviewPriority.LOW,
      }
    } else if (confidenceScore >= adjustedThresholds.HUMAN_REVIEW) {
      return {
        action: 'queue_review',
        reason: 'Medium confidence - requires human review',
        priority: ReviewPriority.MEDIUM,
      }
    } else if (confidenceScore >= adjustedThresholds.ESCALATE) {
      return {
        action: 'escalate',
        reason: 'Low confidence - escalated for senior review',
        priority: ReviewPriority.HIGH,
      }
    } else {
      return {
        action: 'auto_reject',
        reason: 'Confidence too low - automatically rejected',
        priority: ReviewPriority.CRITICAL,
      }
    }
  },

  /**
   * Process AI output through the HITL pipeline
   */
  async processOutput(
    contentId: string,
    userId: string,
    output: AIOutput,
    category?: string
  ): Promise<{
    decision: ReviewDecision
    reviewId?: string
    approved: boolean
  }> {
    const decision = this.determineAction(output.confidenceScore, category)

    if (decision.action === 'auto_approve') {
      // Log the auto-approval for metrics
      await this.logMetrics(output.model, 'approved', output.confidenceScore)
      return { decision, approved: true }
    }

    if (decision.action === 'auto_reject') {
      await this.logMetrics(output.model, 'rejected', output.confidenceScore)
      return { decision, approved: false }
    }

    // Queue for human review
    const review = await prisma.reviewQueue.create({
      data: {
        contentId,
        userId,
        aiOutput: output.content,
        aiModel: output.model,
        confidenceScore: output.confidenceScore,
        status: decision.action === 'escalate' ? ReviewStatus.ESCALATED : ReviewStatus.PENDING,
        priority: decision.priority,
        reason: decision.reason,
        category,
      },
    })

    await this.logMetrics(
      output.model,
      decision.action === 'escalate' ? 'escalated' : 'pending',
      output.confidenceScore
    )

    return { decision, reviewId: review.id, approved: false }
  },

  /**
   * Get pending reviews for a reviewer
   */
  async getPendingReviews(reviewerId: string, options?: {
    status?: ReviewStatus
    priority?: ReviewPriority
    limit?: number
    offset?: number
  }) {
    const { status, priority, limit = 20, offset = 0 } = options || {}

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    } else {
      where.status = { in: [ReviewStatus.PENDING, ReviewStatus.ESCALATED] }
    }

    if (priority) {
      where.priority = priority
    }

    const [reviews, total] = await Promise.all([
      prisma.reviewQueue.findMany({
        where,
        include: {
          content: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.reviewQueue.count({ where }),
    ])

    return { reviews, total, limit, offset }
  },

  /**
   * Assign a review to a reviewer
   */
  async assignReview(reviewId: string, reviewerId: string) {
    return prisma.reviewQueue.update({
      where: { id: reviewId },
      data: {
        reviewerId,
        status: ReviewStatus.IN_REVIEW,
        assignedAt: new Date(),
      },
    })
  },

  /**
   * Submit a review decision
   */
  async submitReview(reviewId: string, result: ReviewResult) {
    const review = await prisma.reviewQueue.update({
      where: { id: reviewId },
      data: {
        approved: result.approved,
        humanFeedback: result.feedback,
        corrections: result.corrections || undefined,
        status: result.approved ? ReviewStatus.APPROVED : ReviewStatus.REJECTED,
        reviewedAt: new Date(),
      },
      include: {
        content: true,
      },
    })

    // Create feedback record for active learning
    if (result.feedback || result.corrections) {
      await prisma.feedback.create({
        data: {
          reviewQueueId: reviewId,
          contentId: review.contentId,
          userId: result.reviewerId,
          type: result.corrections ? 'correction' : 'rating',
          category: review.category || undefined,
          comment: result.feedback,
          originalOutput: review.aiOutput,
          correctedOutput: result.corrections
            ? JSON.stringify(result.corrections)
            : undefined,
        },
      })
    }

    // Log metrics
    await this.logMetrics(
      review.aiModel,
      result.approved ? 'approved' : 'rejected',
      review.confidenceScore
    )

    return review
  },

  /**
   * Get review statistics for dashboard
   */
  async getReviewStats(timeRange?: { start: Date; end: Date }) {
    const where: Record<string, unknown> = {}

    if (timeRange) {
      where.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end,
      }
    }

    const [total, byStatus, byPriority, avgReviewTime] = await Promise.all([
      prisma.reviewQueue.count({ where }),
      prisma.reviewQueue.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.reviewQueue.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      prisma.reviewQueue.aggregate({
        where: {
          ...where,
          reviewedAt: { not: null },
        },
        _avg: {
          confidenceScore: true,
        },
      }),
    ])

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count
        return acc
      }, {} as Record<string, number>),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count
        return acc
      }, {} as Record<string, number>),
      avgConfidenceScore: avgReviewTime._avg.confidenceScore || 0,
    }
  },

  /**
   * Log metrics for model performance tracking
   */
  async logMetrics(
    modelId: string,
    outcome: 'approved' | 'rejected' | 'escalated' | 'pending',
    confidenceScore: number
  ) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.modelMetrics.upsert({
      where: {
        modelId_modelVersion_timestamp: {
          modelId,
          modelVersion: 'latest',
          timestamp: today,
        },
      },
      update: {
        totalPredictions: { increment: 1 },
        ...(outcome === 'approved' && { approvedPredictions: { increment: 1 } }),
        ...(outcome === 'rejected' && { rejectedPredictions: { increment: 1 } }),
        ...(outcome === 'escalated' && { escalatedPredictions: { increment: 1 } }),
      },
      create: {
        modelId,
        modelVersion: 'latest',
        timestamp: today,
        totalPredictions: 1,
        approvedPredictions: outcome === 'approved' ? 1 : 0,
        rejectedPredictions: outcome === 'rejected' ? 1 : 0,
        escalatedPredictions: outcome === 'escalated' ? 1 : 0,
        avgConfidenceScore: confidenceScore,
      },
    })
  },

  /**
   * Calculate confidence score from model output
   * This can be customized based on the specific model's output format
   */
  calculateConfidence(modelOutput: {
    logprobs?: number[]
    finishReason?: string
    tokens?: { input: number; output: number }
  }): number {
    let confidence = 0.80 // Base confidence

    // Adjust based on finish reason
    if (modelOutput.finishReason === 'stop') {
      confidence += 0.10
    } else if (modelOutput.finishReason === 'length') {
      confidence -= 0.15
    }

    // Adjust based on log probabilities if available
    if (modelOutput.logprobs && modelOutput.logprobs.length > 0) {
      const avgLogProb = modelOutput.logprobs.reduce((a, b) => a + b, 0) / modelOutput.logprobs.length
      confidence += Math.min(0.10, Math.max(-0.20, avgLogProb / 10))
    }

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, confidence))
  },
}

export default hitlService
