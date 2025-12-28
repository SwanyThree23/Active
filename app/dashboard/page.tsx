'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { Header } from '@/components/shared/Header'
import { StatsCard } from '@/components/shared/StatsCard'
import { MetricCard } from '@/components/shared/MetricCard'
import { Card, Badge, Button } from '@/components/ui'
import { useAuth } from '@/app/providers'
import {
  FileText,
  Mic,
  Video,
  Users,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight,
} from 'lucide-react'

interface DashboardMetrics {
  content: {
    total: number
    thisWeek: number
    byType: Record<string, number>
  }
  api: {
    totalCalls: number
    avgLatency: number
    errorRate: number
    byService: Record<string, { calls: number; tokens: number }>
  }
  newsletter: {
    total: number
    totalOpens: number
    avgOpenRate: number
  }
}

interface RecentContent {
  id: string
  title: string
  type: string
  status: string
  createdAt: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [recentContent, setRecentContent] = useState<RecentContent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      const token = localStorage.getItem('accessToken')
      const [metricsRes, contentRes] = await Promise.all([
        fetch('/api/v1/analytics/metrics', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/content?limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (metricsRes.ok) {
        const { data } = await metricsRes.json()
        setMetrics(data)
      }

      if (contentRes.ok) {
        const { data } = await contentRes.json()
        setRecentContent(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success'
      case 'processing':
        return 'warning'
      case 'failed':
        return 'error'
      default:
        return 'default'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video':
        return <Video className="w-4 h-4" />
      case 'audio':
        return <Mic className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar />

      <main className="lg:pl-64">
        <Header title="Dashboard" />

        <div className="p-6 space-y-6">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-surface-100">
                Welcome back, {user?.name || 'Creator'}!
              </h2>
              <p className="text-surface-400 mt-1">
                Here&apos;s what&apos;s happening with your content today.
              </p>
            </div>
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              Create New Content
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Content"
              value={metrics?.content.total || 0}
              icon={<FileText className="w-6 h-6" />}
              trend={{ value: 12, label: 'vs last week' }}
            />
            <StatsCard
              title="Created This Week"
              value={metrics?.content.thisWeek || 0}
              icon={<TrendingUp className="w-6 h-6" />}
              trend={{ value: 8, label: 'vs last week' }}
            />
            <StatsCard
              title="API Calls"
              value={metrics?.api.totalCalls || 0}
              icon={<Zap className="w-6 h-6" />}
              subtitle={`${metrics?.api.avgLatency || 0}ms avg latency`}
            />
            <StatsCard
              title="Newsletter Subscribers"
              value="12.4K"
              icon={<Users className="w-6 h-6" />}
              trend={{ value: 5, label: 'this month' }}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Content */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-surface-100">Recent Content</h3>
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View All
                </Button>
              </div>

              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-lg bg-surface-800/50">
                        <div className="w-10 h-10 rounded-lg bg-surface-700" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-surface-700 rounded w-1/3" />
                          <div className="h-3 bg-surface-700 rounded w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentContent.length > 0 ? (
                  recentContent.map((content) => (
                    <div
                      key={content.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-surface-800/50 hover:bg-surface-800 transition-colors cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary-600/20 text-primary-400 flex items-center justify-center">
                        {getTypeIcon(content.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-surface-100 truncate">
                          {content.title}
                        </p>
                        <p className="text-sm text-surface-400">
                          {new Date(content.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(content.status) as 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'}>
                        {content.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-surface-600 mx-auto mb-3" />
                    <p className="text-surface-400">No content yet</p>
                    <Button variant="outline" size="sm" className="mt-4">
                      Create Your First Content
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Service Status */}
            <Card>
              <h3 className="text-lg font-semibold text-surface-100 mb-6">Service Status</h3>

              <div className="space-y-3">
                <MetricCard label="Claude API" value="Connected" status="healthy" />
                <MetricCard label="ElevenLabs" value="Connected" status="healthy" />
                <MetricCard label="HeyGen" value="Connected" status="healthy" />
                <MetricCard label="Beehiiv" value="Connected" status="healthy" />
                <MetricCard label="Whisperflow" value="Pending" status="degraded" />
              </div>

              <div className="mt-6 pt-6 border-t border-surface-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-400">Error Rate</span>
                  <span className="text-success-400">
                    {metrics?.api.errorRate || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-surface-400">Avg Latency</span>
                  <span className="text-surface-100">
                    {metrics?.api.avgLatency || 0}ms
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { icon: FileText, label: 'Generate Script', color: 'primary' },
              { icon: Mic, label: 'Create Voice', color: 'accent' },
              { icon: Video, label: 'Make Video', color: 'success' },
              { icon: Zap, label: 'Run Workflow', color: 'primary' },
            ].map((action) => (
              <Card
                key={action.label}
                variant="interactive"
                className="flex items-center gap-4 cursor-pointer"
              >
                <div className={`p-3 rounded-lg bg-${action.color}-600/20 text-${action.color}-400`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-surface-100">{action.label}</span>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
