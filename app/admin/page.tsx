'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface ReviewItem {
  id: string
  contentId: string
  aiOutput: string
  aiModel: string
  confidenceScore: number
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ESCALATED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  reason?: string
  createdAt: string
  content?: {
    title: string
    type: string
  }
  user?: {
    name: string
    email: string
  }
}

interface DashboardStats {
  reviews: {
    total: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
  }
  models: {
    count: number
    healthy: number
    degraded: number
    critical: number
  }
  shadow: {
    totalComparisons: number
    discrepancies: number
    discrepancyRate: number
  }
  learning: {
    total: number
    byStatus: Record<string, number>
  }
}

interface ModelHealth {
  modelId: string
  status: 'healthy' | 'degraded' | 'critical'
  metrics: {
    totalPredictions: number
    avgConfidence: number
    approvalRate: number
    avgLatency: number
  }
  alerts: Array<{
    type: string
    severity: string
    message: string
  }>
  trend: 'improving' | 'stable' | 'declining'
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'reviews' | 'models' | 'learning' | 'shadow'>('reviews')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [models, setModels] = useState<ModelHealth[]>([])
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // In production, these would be real API calls
      // Simulating data for development
      setStats({
        reviews: {
          total: 47,
          byStatus: { PENDING: 23, IN_REVIEW: 8, APPROVED: 12, REJECTED: 4 },
          byPriority: { LOW: 10, MEDIUM: 20, HIGH: 12, CRITICAL: 5 },
        },
        models: {
          count: 3,
          healthy: 2,
          degraded: 1,
          critical: 0,
        },
        shadow: {
          totalComparisons: 1250,
          discrepancies: 45,
          discrepancyRate: 3.6,
        },
        learning: {
          total: 156,
          byStatus: { pending: 89, selected: 34, processed: 33 },
        },
      })

      setReviews([
        {
          id: '1',
          contentId: 'content-1',
          aiOutput: 'Generated marketing script for product launch...',
          aiModel: 'claude-3-5-sonnet',
          confidenceScore: 0.72,
          status: 'PENDING',
          priority: 'HIGH',
          reason: 'Medium confidence - requires human review',
          createdAt: new Date().toISOString(),
          content: { title: 'Product Launch Script', type: 'VIDEO' },
          user: { name: 'John Doe', email: 'john@example.com' },
        },
        {
          id: '2',
          contentId: 'content-2',
          aiOutput: 'Tutorial script about AI development...',
          aiModel: 'claude-3-5-sonnet',
          confidenceScore: 0.58,
          status: 'ESCALATED',
          priority: 'CRITICAL',
          reason: 'Low confidence - escalated for senior review',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          content: { title: 'AI Tutorial', type: 'VIDEO' },
          user: { name: 'Jane Smith', email: 'jane@example.com' },
        },
      ])

      setModels([
        {
          modelId: 'claude-3-5-sonnet',
          status: 'healthy',
          metrics: {
            totalPredictions: 1250,
            avgConfidence: 0.87,
            approvalRate: 92.3,
            avgLatency: 1450,
          },
          alerts: [],
          trend: 'stable',
        },
        {
          modelId: 'claude-3-haiku',
          status: 'degraded',
          metrics: {
            totalPredictions: 890,
            avgConfidence: 0.78,
            approvalRate: 85.1,
            avgLatency: 890,
          },
          alerts: [
            { type: 'confidence', severity: 'medium', message: 'Confidence dropped by 8%' },
          ],
          trend: 'declining',
        },
      ])

      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setLoading(false)
    }
  }

  const handleApprove = async (reviewId: string) => {
    // API call to approve
    setReviews(prev => prev.filter(r => r.id !== reviewId))
    setSelectedReview(null)
  }

  const handleReject = async (reviewId: string) => {
    // API call to reject
    setReviews(prev => prev.filter(r => r.id !== reviewId))
    setSelectedReview(null)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'MEDIUM': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      default: return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-emerald-400'
      case 'degraded': return 'text-amber-400'
      case 'critical': return 'text-red-400'
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
              Admin Panel
            </h1>
            <span className="text-stone-500">|</span>
            <span className="text-stone-400">HITL & Model Monitoring</span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
              System Healthy
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="p-4">
              <div className="text-stone-400 text-sm">Pending Reviews</div>
              <div className="text-3xl font-bold text-amber-400">
                {stats?.reviews.byStatus.PENDING || 0}
              </div>
              <div className="text-stone-500 text-xs mt-1">
                {stats?.reviews.byPriority.CRITICAL || 0} critical
              </div>
            </CardContent>
          </Card>
          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="p-4">
              <div className="text-stone-400 text-sm">Model Health</div>
              <div className="text-3xl font-bold text-emerald-400">
                {stats?.models.healthy || 0}/{stats?.models.count || 0}
              </div>
              <div className="text-stone-500 text-xs mt-1">
                {stats?.models.degraded || 0} degraded
              </div>
            </CardContent>
          </Card>
          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="p-4">
              <div className="text-stone-400 text-sm">Shadow Discrepancies</div>
              <div className="text-3xl font-bold text-orange-400">
                {stats?.shadow.discrepancyRate.toFixed(1)}%
              </div>
              <div className="text-stone-500 text-xs mt-1">
                {stats?.shadow.discrepancies || 0} flagged
              </div>
            </CardContent>
          </Card>
          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="p-4">
              <div className="text-stone-400 text-sm">Learning Queue</div>
              <div className="text-3xl font-bold text-blue-400">
                {stats?.learning.byStatus?.pending || 0}
              </div>
              <div className="text-stone-500 text-xs mt-1">
                {stats?.learning.byStatus?.selected || 0} ready for batch
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          {(['reviews', 'models', 'learning', 'shadow'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === tab
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-stone-800/50 text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Review Queue Tab */}
        {activeTab === 'reviews' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Review List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Review Queue</h2>
              {reviews.length === 0 ? (
                <Card className="bg-stone-900/50 border-stone-800">
                  <CardContent className="p-8 text-center text-stone-400">
                    No pending reviews
                  </CardContent>
                </Card>
              ) : (
                reviews.map(review => (
                  <Card
                    key={review.id}
                    className={`bg-stone-900/50 border-stone-800 cursor-pointer transition-all hover:border-amber-500/30 ${
                      selectedReview?.id === review.id ? 'border-amber-500/50 ring-1 ring-amber-500/30' : ''
                    }`}
                    onClick={() => setSelectedReview(review)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{review.content?.title}</span>
                            <Badge variant="outline" className={getPriorityColor(review.priority)}>
                              {review.priority}
                            </Badge>
                            {review.status === 'ESCALATED' && (
                              <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                                ESCALATED
                              </Badge>
                            )}
                          </div>
                          <div className="text-stone-400 text-sm">
                            {review.user?.name} • {review.aiModel}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-amber-400">
                            {(review.confidenceScore * 100).toFixed(0)}%
                          </div>
                          <div className="text-stone-500 text-xs">confidence</div>
                        </div>
                      </div>
                      <p className="text-stone-400 text-sm mt-3 line-clamp-2">
                        {review.aiOutput}
                      </p>
                      <div className="text-stone-500 text-xs mt-2">
                        {review.reason}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Review Detail */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Review Detail</h2>
              {selectedReview ? (
                <Card className="bg-stone-900/50 border-stone-800 sticky top-24">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{selectedReview.content?.title}</span>
                      <Badge variant="outline" className={getPriorityColor(selectedReview.priority)}>
                        {selectedReview.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-stone-400 text-sm mb-1">Confidence Score</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-stone-800 rounded-full h-2">
                          <div
                            className="bg-amber-500 h-2 rounded-full"
                            style={{ width: `${selectedReview.confidenceScore * 100}%` }}
                          />
                        </div>
                        <span className="text-amber-400 font-medium">
                          {(selectedReview.confidenceScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-stone-400 text-sm mb-1">AI Output</div>
                      <div className="bg-stone-800/50 rounded-lg p-3 text-sm max-h-48 overflow-y-auto">
                        {selectedReview.aiOutput}
                      </div>
                    </div>

                    <div>
                      <div className="text-stone-400 text-sm mb-1">Reason</div>
                      <div className="text-sm text-stone-300">
                        {selectedReview.reason}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-stone-400">Model:</span>
                        <span className="text-white ml-2">{selectedReview.aiModel}</span>
                      </div>
                      <div>
                        <span className="text-stone-400">Type:</span>
                        <span className="text-white ml-2">{selectedReview.content?.type}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => handleApprove(selectedReview.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleReject(selectedReview.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-stone-900/50 border-stone-800">
                  <CardContent className="p-8 text-center text-stone-400">
                    Select a review to view details
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Model Health Tab */}
        {activeTab === 'models' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Model Health Monitor</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {models.map(model => (
                <Card key={model.modelId} className="bg-stone-900/50 border-stone-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{model.modelId}</span>
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
                        {model.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-stone-400 text-sm">Predictions</div>
                        <div className="text-xl font-bold">{model.metrics.totalPredictions}</div>
                      </div>
                      <div>
                        <div className="text-stone-400 text-sm">Avg Confidence</div>
                        <div className="text-xl font-bold text-amber-400">
                          {(model.metrics.avgConfidence * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-stone-400 text-sm">Approval Rate</div>
                        <div className="text-xl font-bold text-emerald-400">
                          {model.metrics.approvalRate.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-stone-400 text-sm">Avg Latency</div>
                        <div className="text-xl font-bold">{model.metrics.avgLatency}ms</div>
                      </div>
                    </div>

                    {model.alerts.length > 0 && (
                      <div className="border-t border-stone-800 pt-4">
                        <div className="text-stone-400 text-sm mb-2">Alerts</div>
                        {model.alerts.map((alert, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm bg-stone-800/50 rounded-lg px-3 py-2 mb-2"
                          >
                            <span className={
                              alert.severity === 'high' || alert.severity === 'critical'
                                ? 'text-red-400'
                                : 'text-amber-400'
                            }>
                              !
                            </span>
                            <span className="text-stone-300">{alert.message}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-stone-400">Trend:</span>
                      <span className={
                        model.trend === 'improving'
                          ? 'text-emerald-400'
                          : model.trend === 'declining'
                          ? 'text-red-400'
                          : 'text-stone-400'
                      }>
                        {model.trend === 'improving' ? '↑' : model.trend === 'declining' ? '↓' : '→'} {model.trend}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active Learning Tab */}
        {activeTab === 'learning' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Active Learning Pipeline</h2>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                Create Training Batch
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-stone-900/50 border-stone-800">
                <CardContent className="p-4">
                  <div className="text-stone-400 text-sm">Pending Samples</div>
                  <div className="text-3xl font-bold text-blue-400">
                    {stats?.learning.byStatus?.pending || 0}
                  </div>
                  <div className="text-stone-500 text-xs mt-1">
                    Awaiting selection
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-stone-900/50 border-stone-800">
                <CardContent className="p-4">
                  <div className="text-stone-400 text-sm">Selected for Training</div>
                  <div className="text-3xl font-bold text-amber-400">
                    {stats?.learning.byStatus?.selected || 0}
                  </div>
                  <div className="text-stone-500 text-xs mt-1">
                    Ready for batch
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-stone-900/50 border-stone-800">
                <CardContent className="p-4">
                  <div className="text-stone-400 text-sm">Processed</div>
                  <div className="text-3xl font-bold text-emerald-400">
                    {stats?.learning.byStatus?.processed || 0}
                  </div>
                  <div className="text-stone-500 text-xs mt-1">
                    Used in training
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="bg-stone-900/50 border-stone-800">
              <CardHeader>
                <h3 className="font-medium">Selection Criteria</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-stone-400">Uncertainty Weight</div>
                    <div className="text-xl font-bold">40%</div>
                  </div>
                  <div>
                    <div className="text-stone-400">Diversity Weight</div>
                    <div className="text-xl font-bold">30%</div>
                  </div>
                  <div>
                    <div className="text-stone-400">Recency Weight</div>
                    <div className="text-xl font-bold">15%</div>
                  </div>
                  <div>
                    <div className="text-stone-400">Impact Weight</div>
                    <div className="text-xl font-bold">15%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Shadow AI Tab */}
        {activeTab === 'shadow' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Shadow AI Monitoring</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-stone-900/50 border-stone-800">
                <CardContent className="p-4">
                  <div className="text-stone-400 text-sm">Total Comparisons</div>
                  <div className="text-3xl font-bold text-white">
                    {stats?.shadow.totalComparisons || 0}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-stone-900/50 border-stone-800">
                <CardContent className="p-4">
                  <div className="text-stone-400 text-sm">Discrepancies Found</div>
                  <div className="text-3xl font-bold text-orange-400">
                    {stats?.shadow.discrepancies || 0}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-stone-900/50 border-stone-800">
                <CardContent className="p-4">
                  <div className="text-stone-400 text-sm">Discrepancy Rate</div>
                  <div className="text-3xl font-bold text-amber-400">
                    {stats?.shadow.discrepancyRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="bg-stone-900/50 border-stone-800">
              <CardHeader>
                <h3 className="font-medium">Recent Discrepancies</h3>
              </CardHeader>
              <CardContent>
                <div className="text-stone-400 text-center py-8">
                  No recent discrepancies to display
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
