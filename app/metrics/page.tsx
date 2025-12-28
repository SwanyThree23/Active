'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface MVPMetrics {
  kpis: {
    approvalRate: number
    avgConfidence: number
    humanReviewRate: number
    escalationRate: number
    avgLatency: number
    costPerPrediction: number
  }
  targets: {
    approvalRate: number
    avgConfidence: number
    humanReviewRate: number
    escalationRate: number
    avgLatency: number
    costPerPrediction: number
  }
  trends: {
    metric: string
    current: number
    previous: number
    change: number
    status: 'improving' | 'stable' | 'declining'
  }[]
  feedbackMetrics: {
    totalFeedback: number
    avgRating: number
    correctionRate: number
    improvementTrend: 'improving' | 'stable' | 'declining'
  }
  modelComparison: {
    modelId: string
    predictions: number
    approvalRate: number
    avgLatency: number
    status: 'healthy' | 'degraded' | 'critical'
  }[]
}

const TARGET_KPIs = {
  approvalRate: 85,
  avgConfidence: 0.85,
  humanReviewRate: 15,
  escalationRate: 5,
  avgLatency: 2000,
  costPerPrediction: 0.05,
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MVPMetrics | null>(null)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [timeRange])

  const fetchMetrics = async () => {
    // Simulated data for development
    setMetrics({
      kpis: {
        approvalRate: 87.3,
        avgConfidence: 0.82,
        humanReviewRate: 12.4,
        escalationRate: 3.8,
        avgLatency: 1450,
        costPerPrediction: 0.042,
      },
      targets: TARGET_KPIs,
      trends: [
        { metric: 'Approval Rate', current: 87.3, previous: 84.1, change: 3.2, status: 'improving' },
        { metric: 'Avg Confidence', current: 0.82, previous: 0.80, change: 0.02, status: 'improving' },
        { metric: 'Review Rate', current: 12.4, previous: 15.2, change: -2.8, status: 'improving' },
        { metric: 'Latency (ms)', current: 1450, previous: 1380, change: 70, status: 'declining' },
        { metric: 'Cost/Prediction', current: 0.042, previous: 0.045, change: -0.003, status: 'improving' },
      ],
      feedbackMetrics: {
        totalFeedback: 1247,
        avgRating: 4.2,
        correctionRate: 8.5,
        improvementTrend: 'improving',
      },
      modelComparison: [
        { modelId: 'claude-3-5-sonnet', predictions: 8450, approvalRate: 89.2, avgLatency: 1520, status: 'healthy' },
        { modelId: 'claude-3-haiku', predictions: 3210, approvalRate: 82.1, avgLatency: 890, status: 'degraded' },
      ],
    })
    setLoading(false)
  }

  const getStatusColor = (actual: number, target: number, inverse = false) => {
    const ratio = inverse ? target / actual : actual / target
    if (ratio >= 1) return 'text-emerald-400'
    if (ratio >= 0.9) return 'text-amber-400'
    return 'text-red-400'
  }

  const getTrendIcon = (status: 'improving' | 'stable' | 'declining') => {
    switch (status) {
      case 'improving': return '↑'
      case 'declining': return '↓'
      default: return '→'
    }
  }

  const getTrendColor = (status: 'improving' | 'stable' | 'declining') => {
    switch (status) {
      case 'improving': return 'text-emerald-400'
      case 'declining': return 'text-red-400'
      default: return 'text-stone-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-amber-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              MVP Metrics Dashboard
            </h1>
            <span className="text-stone-500">|</span>
            <span className="text-stone-400">AI Performance KPIs</span>
          </div>
          <div className="flex items-center gap-2">
            {(['24h', '7d', '30d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  timeRange === range
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-stone-800/50 text-stone-400 hover:text-white hover:bg-stone-800'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="p-4">
              <div className="text-stone-400 text-sm">Approval Rate</div>
              <div className={`text-2xl font-bold ${getStatusColor(metrics!.kpis.approvalRate, TARGET_KPIs.approvalRate)}`}>
                {metrics!.kpis.approvalRate}%
              </div>
              <div className="text-stone-500 text-xs mt-1">
                Target: {TARGET_KPIs.approvalRate}%
              </div>
            </CardContent>
          </Card>
          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="p-4">
              <div className="text-stone-400 text-sm">Avg Confidence</div>
              <div className={`text-2xl font-bold ${getStatusColor(metrics!.kpis.avgConfidence, TARGET_KPIs.avgConfidence)}`}>
                {(metrics!.kpis.avgConfidence * 100).toFixed(0)}%
              </div>
              <div className="text-stone-500 text-xs mt-1">
                Target: {(TARGET_KPIs.avgConfidence * 100)}%
              </div>
            </CardContent>
          </Card>
          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="p-4">
              <div className="text-stone-400 text-sm">Human Review</div>
              <div className={`text-2xl font-bold ${getStatusColor(TARGET_KPIs.humanReviewRate, metrics!.kpis.humanReviewRate, true)}`}>
                {metrics!.kpis.humanReviewRate}%
              </div>
              <div className="text-stone-500 text-xs mt-1">
                Target: &lt;{TARGET_KPIs.humanReviewRate}%
              </div>
            </CardContent>
          </Card>
          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="p-4">
              <div className="text-stone-400 text-sm">Escalation Rate</div>
              <div className={`text-2xl font-bold ${getStatusColor(TARGET_KPIs.escalationRate, metrics!.kpis.escalationRate, true)}`}>
                {metrics!.kpis.escalationRate}%
              </div>
              <div className="text-stone-500 text-xs mt-1">
                Target: &lt;{TARGET_KPIs.escalationRate}%
              </div>
            </CardContent>
          </Card>
          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="p-4">
              <div className="text-stone-400 text-sm">Avg Latency</div>
              <div className={`text-2xl font-bold ${getStatusColor(TARGET_KPIs.avgLatency, metrics!.kpis.avgLatency, true)}`}>
                {metrics!.kpis.avgLatency}ms
              </div>
              <div className="text-stone-500 text-xs mt-1">
                Target: &lt;{TARGET_KPIs.avgLatency}ms
              </div>
            </CardContent>
          </Card>
          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="p-4">
              <div className="text-stone-400 text-sm">Cost/Prediction</div>
              <div className={`text-2xl font-bold ${getStatusColor(TARGET_KPIs.costPerPrediction, metrics!.kpis.costPerPrediction, true)}`}>
                ${metrics!.kpis.costPerPrediction.toFixed(3)}
              </div>
              <div className="text-stone-500 text-xs mt-1">
                Target: &lt;${TARGET_KPIs.costPerPrediction}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trends */}
          <Card className="bg-stone-900/50 border-stone-800">
            <CardHeader>
              <h2 className="text-lg font-semibold">Performance Trends</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics!.trends.map((trend, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-xl ${getTrendColor(trend.status)}`}>
                        {getTrendIcon(trend.status)}
                      </span>
                      <span className="text-white">{trend.metric}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-stone-400">
                        {trend.previous.toLocaleString()} →
                      </span>
                      <span className="text-white font-medium">
                        {trend.current.toLocaleString()}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          trend.status === 'improving'
                            ? 'border-emerald-500/30 text-emerald-400'
                            : trend.status === 'declining'
                            ? 'border-red-500/30 text-red-400'
                            : 'border-stone-500/30 text-stone-400'
                        }
                      >
                        {trend.change > 0 ? '+' : ''}{trend.change.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Feedback Metrics */}
          <Card className="bg-stone-900/50 border-stone-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Feedback Metrics</h2>
                <Badge
                  variant="outline"
                  className={
                    metrics!.feedbackMetrics.improvementTrend === 'improving'
                      ? 'border-emerald-500/30 text-emerald-400'
                      : 'border-stone-500/30 text-stone-400'
                  }
                >
                  {getTrendIcon(metrics!.feedbackMetrics.improvementTrend)} {metrics!.feedbackMetrics.improvementTrend}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-stone-400 text-sm">Total Feedback</div>
                  <div className="text-3xl font-bold text-white">
                    {metrics!.feedbackMetrics.totalFeedback.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-stone-400 text-sm">Avg Rating</div>
                  <div className="text-3xl font-bold text-amber-400">
                    {metrics!.feedbackMetrics.avgRating}/5
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-stone-400 text-sm mb-2">Correction Rate</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-stone-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
                        style={{ width: `${metrics!.feedbackMetrics.correctionRate}%` }}
                      />
                    </div>
                    <span className="text-white font-medium">
                      {metrics!.feedbackMetrics.correctionRate}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model Comparison */}
        <Card className="bg-stone-900/50 border-stone-800">
          <CardHeader>
            <h2 className="text-lg font-semibold">Model Comparison</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-800">
                    <th className="text-left py-3 px-4 text-stone-400 font-medium">Model</th>
                    <th className="text-right py-3 px-4 text-stone-400 font-medium">Predictions</th>
                    <th className="text-right py-3 px-4 text-stone-400 font-medium">Approval Rate</th>
                    <th className="text-right py-3 px-4 text-stone-400 font-medium">Avg Latency</th>
                    <th className="text-right py-3 px-4 text-stone-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics!.modelComparison.map((model, idx) => (
                    <tr key={idx} className="border-b border-stone-800 last:border-0">
                      <td className="py-3 px-4 font-medium">{model.modelId}</td>
                      <td className="py-3 px-4 text-right text-stone-300">{model.predictions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={getStatusColor(model.approvalRate, TARGET_KPIs.approvalRate)}>
                          {model.approvalRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-stone-300">{model.avgLatency}ms</td>
                      <td className="py-3 px-4 text-right">
                        <Badge
                          variant="outline"
                          className={
                            model.status === 'healthy'
                              ? 'border-emerald-500/30 text-emerald-400'
                              : model.status === 'degraded'
                              ? 'border-amber-500/30 text-amber-400'
                              : 'border-red-500/30 text-red-400'
                          }
                        >
                          {model.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* MVP Success Criteria */}
        <Card className="bg-stone-900/50 border-stone-800 mt-8">
          <CardHeader>
            <h2 className="text-lg font-semibold">MVP Success Criteria</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: 'Accuracy Rate', target: '≥85%', current: metrics!.kpis.approvalRate, met: metrics!.kpis.approvalRate >= 85 },
                { name: 'Human Review Load', target: '≤15%', current: metrics!.kpis.humanReviewRate, met: metrics!.kpis.humanReviewRate <= 15 },
                { name: 'Response Time', target: '≤2s', current: metrics!.kpis.avgLatency / 1000, met: metrics!.kpis.avgLatency <= 2000, unit: 's' },
                { name: 'User Satisfaction', target: '≥4/5', current: metrics!.feedbackMetrics.avgRating, met: metrics!.feedbackMetrics.avgRating >= 4 },
              ].map((criteria, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    criteria.met
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-stone-400 text-sm">{criteria.name}</span>
                    <span className={criteria.met ? 'text-emerald-400' : 'text-red-400'}>
                      {criteria.met ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">
                      {criteria.current.toFixed(criteria.unit === 's' ? 2 : 1)}{criteria.unit || '%'}
                    </span>
                    <span className="text-stone-400 text-sm">/ {criteria.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
