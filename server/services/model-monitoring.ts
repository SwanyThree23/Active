/**
 * Model Monitoring Service
 * Real-time monitoring of AI model performance, drift detection,
 * and automated alerting for quality degradation
 */

import { PrismaClient } from '@prisma/client'
import { io } from '../index'

const prisma = new PrismaClient()

// Drift detection thresholds
const DRIFT_THRESHOLDS = {
  CONFIDENCE_DROP: 0.10,      // Alert if avg confidence drops by 10%
  ACCURACY_DROP: 0.05,        // Alert if accuracy drops by 5%
  LATENCY_INCREASE: 0.20,     // Alert if latency increases by 20%
  ERROR_RATE_INCREASE: 0.02,  // Alert if error rate increases by 2%
}

// Time windows for comparison
const TIME_WINDOWS = {
  CURRENT: 24 * 60 * 60 * 1000,    // Last 24 hours
  BASELINE: 7 * 24 * 60 * 60 * 1000, // Last 7 days
}

export interface MetricSnapshot {
  timestamp: Date
  totalPredictions: number
  avgConfidence: number
  approvalRate: number
  rejectionRate: number
  escalationRate: number
  avgLatency: number
  errorRate: number
}

export interface DriftAlert {
  id: string
  modelId: string
  type: 'confidence' | 'accuracy' | 'latency' | 'error_rate' | 'distribution'
  severity: 'low' | 'medium' | 'high' | 'critical'
  currentValue: number
  baselineValue: number
  delta: number
  message: string
  timestamp: Date
}

export interface ModelHealth {
  modelId: string
  status: 'healthy' | 'degraded' | 'critical'
  metrics: MetricSnapshot
  alerts: DriftAlert[]
  trend: 'improving' | 'stable' | 'declining'
}

export const modelMonitoringService = {
  /**
   * Record a prediction for monitoring
   */
  async recordPrediction(params: {
    modelId: string
    confidenceScore: number
    latency: number
    approved?: boolean
    escalated?: boolean
    error?: boolean
  }) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.modelMetrics.upsert({
      where: {
        modelId_modelVersion_timestamp: {
          modelId: params.modelId,
          modelVersion: 'latest',
          timestamp: today,
        },
      },
      update: {
        totalPredictions: { increment: 1 },
        ...(params.approved && { approvedPredictions: { increment: 1 } }),
        ...(params.escalated && { escalatedPredictions: { increment: 1 } }),
        ...(!params.approved && !params.escalated && { rejectedPredictions: { increment: 1 } }),
        avgConfidenceScore: params.confidenceScore,
        avgLatency: params.latency,
      },
      create: {
        modelId: params.modelId,
        modelVersion: 'latest',
        timestamp: today,
        totalPredictions: 1,
        approvedPredictions: params.approved ? 1 : 0,
        rejectedPredictions: !params.approved && !params.escalated ? 1 : 0,
        escalatedPredictions: params.escalated ? 1 : 0,
        avgConfidenceScore: params.confidenceScore,
        avgLatency: params.latency,
      },
    })

    // Check for drift after recording
    await this.checkForDrift(params.modelId)
  },

  /**
   * Get current metrics snapshot for a model
   */
  async getMetricsSnapshot(modelId: string, timeWindow?: number): Promise<MetricSnapshot> {
    const windowMs = timeWindow || TIME_WINDOWS.CURRENT
    const startDate = new Date(Date.now() - windowMs)

    const metrics = await prisma.modelMetrics.findMany({
      where: {
        modelId,
        timestamp: { gte: startDate },
      },
    })

    if (metrics.length === 0) {
      return {
        timestamp: new Date(),
        totalPredictions: 0,
        avgConfidence: 0,
        approvalRate: 0,
        rejectionRate: 0,
        escalationRate: 0,
        avgLatency: 0,
        errorRate: 0,
      }
    }

    const totals = metrics.reduce(
      (acc, m) => ({
        predictions: acc.predictions + m.totalPredictions,
        approved: acc.approved + m.approvedPredictions,
        rejected: acc.rejected + m.rejectedPredictions,
        escalated: acc.escalated + m.escalatedPredictions,
        confidence: acc.confidence + m.avgConfidenceScore * m.totalPredictions,
        latency: acc.latency + m.avgLatency * m.totalPredictions,
      }),
      { predictions: 0, approved: 0, rejected: 0, escalated: 0, confidence: 0, latency: 0 }
    )

    const total = totals.predictions || 1

    return {
      timestamp: new Date(),
      totalPredictions: totals.predictions,
      avgConfidence: totals.confidence / total,
      approvalRate: (totals.approved / total) * 100,
      rejectionRate: (totals.rejected / total) * 100,
      escalationRate: (totals.escalated / total) * 100,
      avgLatency: totals.latency / total,
      errorRate: 0, // Would need separate error tracking
    }
  },

  /**
   * Check for model drift by comparing current metrics to baseline
   */
  async checkForDrift(modelId: string): Promise<DriftAlert[]> {
    const [current, baseline] = await Promise.all([
      this.getMetricsSnapshot(modelId, TIME_WINDOWS.CURRENT),
      this.getMetricsSnapshot(modelId, TIME_WINDOWS.BASELINE),
    ])

    const alerts: DriftAlert[] = []

    // Check confidence drift
    if (baseline.avgConfidence > 0) {
      const confidenceDelta = (baseline.avgConfidence - current.avgConfidence) / baseline.avgConfidence
      if (confidenceDelta > DRIFT_THRESHOLDS.CONFIDENCE_DROP) {
        alerts.push({
          id: `drift_conf_${Date.now()}`,
          modelId,
          type: 'confidence',
          severity: confidenceDelta > 0.20 ? 'high' : 'medium',
          currentValue: current.avgConfidence,
          baselineValue: baseline.avgConfidence,
          delta: confidenceDelta,
          message: `Confidence score dropped by ${(confidenceDelta * 100).toFixed(1)}%`,
          timestamp: new Date(),
        })
      }
    }

    // Check approval rate (accuracy proxy)
    if (baseline.approvalRate > 0) {
      const accuracyDelta = (baseline.approvalRate - current.approvalRate) / baseline.approvalRate
      if (accuracyDelta > DRIFT_THRESHOLDS.ACCURACY_DROP) {
        alerts.push({
          id: `drift_acc_${Date.now()}`,
          modelId,
          type: 'accuracy',
          severity: accuracyDelta > 0.15 ? 'critical' : 'high',
          currentValue: current.approvalRate,
          baselineValue: baseline.approvalRate,
          delta: accuracyDelta,
          message: `Approval rate dropped by ${(accuracyDelta * 100).toFixed(1)}%`,
          timestamp: new Date(),
        })
      }
    }

    // Check latency drift
    if (baseline.avgLatency > 0) {
      const latencyDelta = (current.avgLatency - baseline.avgLatency) / baseline.avgLatency
      if (latencyDelta > DRIFT_THRESHOLDS.LATENCY_INCREASE) {
        alerts.push({
          id: `drift_lat_${Date.now()}`,
          modelId,
          type: 'latency',
          severity: latencyDelta > 0.50 ? 'high' : 'medium',
          currentValue: current.avgLatency,
          baselineValue: baseline.avgLatency,
          delta: latencyDelta,
          message: `Latency increased by ${(latencyDelta * 100).toFixed(1)}%`,
          timestamp: new Date(),
        })
      }
    }

    // Store drift detection result
    if (alerts.length > 0) {
      await this.recordDriftDetection(modelId, alerts)
      this.emitAlerts(alerts)
    }

    return alerts
  },

  /**
   * Record drift detection in database
   */
  async recordDriftDetection(modelId: string, alerts: DriftAlert[]) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const maxSeverity = alerts.reduce((max, alert) => {
      const severities = { low: 1, medium: 2, high: 3, critical: 4 }
      return severities[alert.severity] > severities[max] ? alert.severity : max
    }, 'low' as 'low' | 'medium' | 'high' | 'critical')

    await prisma.modelMetrics.upsert({
      where: {
        modelId_modelVersion_timestamp: {
          modelId,
          modelVersion: 'latest',
          timestamp: today,
        },
      },
      update: {
        driftDetected: true,
        driftScore: alerts.length / 4, // Normalize to 0-1
      },
      create: {
        modelId,
        modelVersion: 'latest',
        timestamp: today,
        driftDetected: true,
        driftScore: alerts.length / 4,
      },
    })
  },

  /**
   * Emit alerts through WebSocket
   */
  emitAlerts(alerts: DriftAlert[]) {
    try {
      if (io) {
        io.to('admin').emit('model:drift', { alerts })
      }
    } catch (error) {
      console.error('Failed to emit drift alerts:', error)
    }
  },

  /**
   * Get model health status
   */
  async getModelHealth(modelId: string): Promise<ModelHealth> {
    const metrics = await this.getMetricsSnapshot(modelId)
    const alerts = await this.checkForDrift(modelId)

    // Determine status based on alerts
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
    if (alerts.some(a => a.severity === 'critical')) {
      status = 'critical'
    } else if (alerts.some(a => a.severity === 'high')) {
      status = 'degraded'
    }

    // Calculate trend based on recent metrics
    const trend = await this.calculateTrend(modelId)

    return {
      modelId,
      status,
      metrics,
      alerts,
      trend,
    }
  },

  /**
   * Calculate performance trend
   */
  async calculateTrend(modelId: string): Promise<'improving' | 'stable' | 'declining'> {
    const metrics = await prisma.modelMetrics.findMany({
      where: { modelId },
      orderBy: { timestamp: 'desc' },
      take: 7,
    })

    if (metrics.length < 3) return 'stable'

    // Calculate trend from confidence and approval rates
    const recentAvg = (metrics[0].avgConfidenceScore + metrics[1].avgConfidenceScore) / 2
    const olderAvg = (metrics[metrics.length - 2].avgConfidenceScore + metrics[metrics.length - 1].avgConfidenceScore) / 2

    const change = (recentAvg - olderAvg) / olderAvg

    if (change > 0.05) return 'improving'
    if (change < -0.05) return 'declining'
    return 'stable'
  },

  /**
   * Get all models health summary
   */
  async getAllModelsHealth(): Promise<ModelHealth[]> {
    // Get unique model IDs
    const models = await prisma.modelMetrics.findMany({
      select: { modelId: true },
      distinct: ['modelId'],
    })

    const healthPromises = models.map(m => this.getModelHealth(m.modelId))
    return Promise.all(healthPromises)
  },

  /**
   * Get historical metrics for charting
   */
  async getHistoricalMetrics(modelId: string, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await prisma.modelMetrics.findMany({
      where: {
        modelId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    })

    return metrics.map(m => ({
      date: m.timestamp.toISOString().split('T')[0],
      totalPredictions: m.totalPredictions,
      approved: m.approvedPredictions,
      rejected: m.rejectedPredictions,
      escalated: m.escalatedPredictions,
      avgConfidence: m.avgConfidenceScore,
      avgLatency: m.avgLatency,
      driftScore: m.driftScore,
    }))
  },
}

export default modelMonitoringService
