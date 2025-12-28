/**
 * Shadow AI Pattern Service
 * Runs secondary AI models in parallel for validation and comparison
 * Helps detect model drift and quality issues before they affect users
 */

import { PrismaClient } from '@prisma/client'
import claudeClient from '@/lib/integrations/claude'

const prisma = new PrismaClient()

// Similarity thresholds for discrepancy detection
const SIMILARITY_THRESHOLDS = {
  HIGH: 0.90,        // Very similar outputs
  MEDIUM: 0.70,      // Reasonably similar
  LOW: 0.50,         // Notable differences
  DISCREPANCY: 0.30, // Significant discrepancy - flag for review
}

// Confidence difference threshold for flagging
const CONFIDENCE_DELTA_THRESHOLD = 0.20

export interface ModelPrediction {
  model: string
  output: string
  confidence: number
  latency: number
  tokens?: { input: number; output: number }
}

export interface ShadowComparisonResult {
  similarity: number
  confidenceDelta: number
  latencyDelta: number
  discrepancyFlag: boolean
  analysis?: string
}

export interface ShadowRunResult {
  primary: ModelPrediction
  shadow: ModelPrediction
  comparison: ShadowComparisonResult
  contentId?: string
}

export const shadowAiService = {
  /**
   * Run a prompt through both primary and shadow models
   */
  async runWithShadow(params: {
    prompt: string
    systemPrompt?: string
    primaryModel?: string
    shadowModel?: string
    contentId?: string
    saveResults?: boolean
  }): Promise<ShadowRunResult> {
    const {
      prompt,
      systemPrompt,
      primaryModel = 'claude-3-5-sonnet-20241022',
      shadowModel = 'claude-3-haiku-20240307',
      contentId,
      saveResults = true,
    } = params

    // Run both models in parallel
    const [primaryResult, shadowResult] = await Promise.all([
      this.runModel(primaryModel, prompt, systemPrompt),
      this.runModel(shadowModel, prompt, systemPrompt),
    ])

    // Compare outputs
    const comparison = await this.compareOutputs(primaryResult, shadowResult)

    const result: ShadowRunResult = {
      primary: primaryResult,
      shadow: shadowResult,
      comparison,
      contentId,
    }

    // Save shadow prediction if requested
    if (saveResults && contentId) {
      await this.saveShadowPrediction(result)
    }

    // Log metrics
    await this.logShadowMetrics(result)

    return result
  },

  /**
   * Run a single model and measure performance
   */
  async runModel(
    model: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<ModelPrediction> {
    const startTime = Date.now()

    try {
      const response = await claudeClient.complete({
        prompt,
        systemPrompt,
        model,
        maxTokens: 2048,
      })

      const latency = Date.now() - startTime

      // Calculate confidence from response metadata
      const confidence = this.estimateConfidence(response)

      return {
        model,
        output: response.content,
        confidence,
        latency,
        tokens: response.tokens,
      }
    } catch (error) {
      return {
        model,
        output: '',
        confidence: 0,
        latency: Date.now() - startTime,
      }
    }
  },

  /**
   * Compare outputs from primary and shadow models
   */
  async compareOutputs(
    primary: ModelPrediction,
    shadow: ModelPrediction
  ): Promise<ShadowComparisonResult> {
    // Calculate text similarity using Jaccard similarity
    const similarity = this.calculateSimilarity(primary.output, shadow.output)

    // Calculate confidence and latency deltas
    const confidenceDelta = Math.abs(primary.confidence - shadow.confidence)
    const latencyDelta = primary.latency - shadow.latency

    // Determine if this is a discrepancy
    const discrepancyFlag =
      similarity < SIMILARITY_THRESHOLDS.DISCREPANCY ||
      confidenceDelta > CONFIDENCE_DELTA_THRESHOLD

    // Generate analysis if there's a significant discrepancy
    let analysis: string | undefined
    if (discrepancyFlag) {
      analysis = this.generateDiscrepancyAnalysis(primary, shadow, similarity, confidenceDelta)
    }

    return {
      similarity,
      confidenceDelta,
      latencyDelta,
      discrepancyFlag,
      analysis,
    }
  },

  /**
   * Calculate similarity between two text outputs
   * Uses a combination of Jaccard similarity and semantic overlap
   */
  calculateSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0
    if (text1 === text2) return 1

    // Tokenize into words
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2))
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2))

    // Calculate Jaccard similarity
    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])

    const jaccardSimilarity = intersection.size / union.size

    // Calculate length similarity
    const lengthRatio = Math.min(text1.length, text2.length) / Math.max(text1.length, text2.length)

    // Calculate n-gram overlap (bigrams)
    const bigrams1 = this.getBigrams(text1)
    const bigrams2 = this.getBigrams(text2)
    const bigramIntersection = new Set([...bigrams1].filter(b => bigrams2.has(b)))
    const bigramUnion = new Set([...bigrams1, ...bigrams2])
    const bigramSimilarity = bigramUnion.size > 0
      ? bigramIntersection.size / bigramUnion.size
      : 0

    // Weighted combination
    return (jaccardSimilarity * 0.4) + (lengthRatio * 0.2) + (bigramSimilarity * 0.4)
  },

  /**
   * Get bigrams from text
   */
  getBigrams(text: string): Set<string> {
    const words = text.toLowerCase().split(/\s+/)
    const bigrams = new Set<string>()

    for (let i = 0; i < words.length - 1; i++) {
      bigrams.add(`${words[i]} ${words[i + 1]}`)
    }

    return bigrams
  },

  /**
   * Estimate confidence from Claude response
   */
  estimateConfidence(response: { content: string; tokens: { input: number; output: number } }): number {
    let confidence = 0.80

    // Longer, more detailed responses typically indicate higher confidence
    const outputLength = response.content.length
    if (outputLength > 500) confidence += 0.05
    if (outputLength > 1000) confidence += 0.05

    // Check for uncertainty markers in the response
    const uncertaintyMarkers = [
      'might', 'could', 'perhaps', 'possibly', 'maybe',
      'uncertain', 'not sure', 'unclear', 'approximately'
    ]

    const lowerContent = response.content.toLowerCase()
    for (const marker of uncertaintyMarkers) {
      if (lowerContent.includes(marker)) {
        confidence -= 0.03
      }
    }

    // Check for confidence markers
    const confidenceMarkers = [
      'definitely', 'certainly', 'clearly', 'obviously',
      'without doubt', 'specifically'
    ]

    for (const marker of confidenceMarkers) {
      if (lowerContent.includes(marker)) {
        confidence += 0.02
      }
    }

    return Math.max(0, Math.min(1, confidence))
  },

  /**
   * Generate analysis for discrepancies
   */
  generateDiscrepancyAnalysis(
    primary: ModelPrediction,
    shadow: ModelPrediction,
    similarity: number,
    confidenceDelta: number
  ): string {
    const issues: string[] = []

    if (similarity < SIMILARITY_THRESHOLDS.DISCREPANCY) {
      issues.push(`Low output similarity (${(similarity * 100).toFixed(1)}%)`)
    }

    if (confidenceDelta > CONFIDENCE_DELTA_THRESHOLD) {
      issues.push(`High confidence delta (${(confidenceDelta * 100).toFixed(1)}%)`)
    }

    if (primary.output.length === 0) {
      issues.push('Primary model returned empty output')
    }

    if (shadow.output.length === 0) {
      issues.push('Shadow model returned empty output')
    }

    const lengthDiff = Math.abs(primary.output.length - shadow.output.length)
    if (lengthDiff > 500) {
      issues.push(`Significant length difference (${lengthDiff} chars)`)
    }

    return issues.join('; ')
  },

  /**
   * Save shadow prediction to database
   */
  async saveShadowPrediction(result: ShadowRunResult) {
    if (!result.contentId) return

    await prisma.shadowPrediction.create({
      data: {
        contentId: result.contentId,
        primaryModel: result.primary.model,
        primaryOutput: result.primary.output,
        primaryConfidence: result.primary.confidence,
        primaryLatency: result.primary.latency,
        shadowModel: result.shadow.model,
        shadowOutput: result.shadow.output,
        shadowConfidence: result.shadow.confidence,
        shadowLatency: result.shadow.latency,
        outputSimilarity: result.comparison.similarity,
        confidenceDelta: result.comparison.confidenceDelta,
        latencyDelta: result.comparison.latencyDelta,
        discrepancyFlag: result.comparison.discrepancyFlag,
      },
    })
  },

  /**
   * Log shadow comparison metrics
   */
  async logShadowMetrics(result: ShadowRunResult) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Update primary model metrics
    await prisma.modelMetrics.upsert({
      where: {
        modelId_modelVersion_timestamp: {
          modelId: result.primary.model,
          modelVersion: 'latest',
          timestamp: today,
        },
      },
      update: {
        totalPredictions: { increment: 1 },
        avgLatency: result.primary.latency,
      },
      create: {
        modelId: result.primary.model,
        modelVersion: 'latest',
        timestamp: today,
        totalPredictions: 1,
        avgLatency: result.primary.latency,
        avgConfidenceScore: result.primary.confidence,
      },
    })

    // Update shadow model metrics
    await prisma.modelMetrics.upsert({
      where: {
        modelId_modelVersion_timestamp: {
          modelId: result.shadow.model,
          modelVersion: 'latest',
          timestamp: today,
        },
      },
      update: {
        totalPredictions: { increment: 1 },
        avgLatency: result.shadow.latency,
      },
      create: {
        modelId: result.shadow.model,
        modelVersion: 'latest',
        timestamp: today,
        totalPredictions: 1,
        avgLatency: result.shadow.latency,
        avgConfidenceScore: result.shadow.confidence,
      },
    })
  },

  /**
   * Get shadow comparison statistics
   */
  async getStats(params?: {
    startDate?: Date
    endDate?: Date
    primaryModel?: string
  }) {
    const { startDate, endDate, primaryModel } = params || {}

    const where: Record<string, unknown> = {}

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate
      if (endDate) (where.createdAt as Record<string, Date>).lte = endDate
    }

    if (primaryModel) {
      where.primaryModel = primaryModel
    }

    const [total, discrepancies, avgSimilarity] = await Promise.all([
      prisma.shadowPrediction.count({ where }),
      prisma.shadowPrediction.count({ where: { ...where, discrepancyFlag: true } }),
      prisma.shadowPrediction.aggregate({
        where,
        _avg: {
          outputSimilarity: true,
          confidenceDelta: true,
          latencyDelta: true,
        },
      }),
    ])

    return {
      totalComparisons: total,
      discrepancies,
      discrepancyRate: total > 0 ? (discrepancies / total) * 100 : 0,
      avgSimilarity: avgSimilarity._avg.outputSimilarity || 0,
      avgConfidenceDelta: avgSimilarity._avg.confidenceDelta || 0,
      avgLatencyDelta: avgSimilarity._avg.latencyDelta || 0,
    }
  },

  /**
   * Get recent discrepancies for review
   */
  async getDiscrepancies(limit = 20) {
    return prisma.shadowPrediction.findMany({
      where: { discrepancyFlag: true },
      include: {
        content: {
          select: { id: true, title: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  },
}

export default shadowAiService
