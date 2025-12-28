'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { Header } from '@/components/shared/Header'
import { Card, Button, Badge } from '@/components/ui'
import { StatsCard } from '@/components/shared/StatsCard'
import { useToast } from '@/app/providers'
import {
  Mail,
  Users,
  Eye,
  MousePointer,
  Plus,
  Send,
  Calendar,
  FileText,
  Sparkles,
  TrendingUp,
  Clock,
  MoreVertical,
} from 'lucide-react'

interface Newsletter {
  id: string
  title: string
  subject: string
  status: string
  opens: number
  clicks: number
  subscribers: number
  createdAt: string
  sentAt?: string
}

export default function NewsletterPage() {
  const { addToast } = useToast()
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Form state
  const [topic, setTopic] = useState('')
  const [style, setStyle] = useState('informative')

  useEffect(() => {
    fetchNewsletters()
  }, [])

  async function fetchNewsletters() {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/v1/newsletter', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const { data } = await res.json()
        setNewsletters(data)
      }
    } catch (error) {
      console.error('Failed to fetch newsletters:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGenerateNewsletter() {
    if (!topic) {
      addToast({ title: 'Please enter a topic', type: 'error' })
      return
    }

    setIsGenerating(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/v1/newsletter/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, style }),
      })

      if (res.ok) {
        const { data } = await res.json()
        setNewsletters([data.newsletter, ...newsletters])
        setShowCreateModal(false)
        setTopic('')
        addToast({ title: 'Newsletter generated!', type: 'success' })
      }
    } catch (error) {
      addToast({ title: 'Failed to generate newsletter', type: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSendNewsletter(id: string) {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/v1/newsletter/${id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        fetchNewsletters()
        addToast({ title: 'Newsletter sent successfully!', type: 'success' })
      }
    } catch (error) {
      addToast({ title: 'Failed to send newsletter', type: 'error' })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'primary'> = {
      draft: 'default',
      sent: 'success',
      scheduled: 'warning',
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const stats = {
    totalSubscribers: 12400,
    avgOpenRate: 42.5,
    avgClickRate: 8.3,
    totalSent: newsletters.filter((n) => n.status === 'sent').length,
  }

  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar />

      <main className="lg:pl-64">
        <Header title="Newsletter" />

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6">
            <StatsCard
              title="Total Subscribers"
              value={stats.totalSubscribers.toLocaleString()}
              icon={<Users className="w-6 h-6" />}
              trend={{ value: 5.2, label: 'this month' }}
            />
            <StatsCard
              title="Avg Open Rate"
              value={`${stats.avgOpenRate}%`}
              icon={<Eye className="w-6 h-6" />}
              trend={{ value: 2.1, label: 'vs last month' }}
            />
            <StatsCard
              title="Avg Click Rate"
              value={`${stats.avgClickRate}%`}
              icon={<MousePointer className="w-6 h-6" />}
              trend={{ value: 0.8, label: 'vs last month' }}
            />
            <StatsCard
              title="Newsletters Sent"
              value={stats.totalSent}
              icon={<Send className="w-6 h-6" />}
              subtitle="This month"
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-surface-100">Campaigns</h2>
              <p className="text-surface-400 mt-1">
                Create and manage your newsletter campaigns
              </p>
            </div>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              Create Newsletter
            </Button>
          </div>

          {/* Newsletters List */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-surface-400">
                      Campaign
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-surface-400">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-surface-400">
                      Opens
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-surface-400">
                      Clicks
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-surface-400">
                      Date
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-surface-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-surface-800">
                        <td colSpan={6} className="py-4 px-4">
                          <div className="animate-pulse flex items-center gap-4">
                            <div className="w-10 h-10 bg-surface-700 rounded-lg" />
                            <div className="flex-1">
                              <div className="h-4 bg-surface-700 rounded w-1/3 mb-2" />
                              <div className="h-3 bg-surface-700 rounded w-1/4" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : newsletters.length > 0 ? (
                    newsletters.map((newsletter) => (
                      <tr
                        key={newsletter.id}
                        className="border-b border-surface-800 hover:bg-surface-800/50"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-600/20 text-primary-400 flex items-center justify-center">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-surface-100">
                                {newsletter.title}
                              </p>
                              <p className="text-sm text-surface-400 truncate max-w-xs">
                                {newsletter.subject}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">{getStatusBadge(newsletter.status)}</td>
                        <td className="py-4 px-4 text-surface-100">
                          {newsletter.opens > 0
                            ? `${((newsletter.opens / newsletter.subscribers) * 100).toFixed(1)}%`
                            : '-'}
                        </td>
                        <td className="py-4 px-4 text-surface-100">
                          {newsletter.clicks > 0
                            ? `${((newsletter.clicks / newsletter.subscribers) * 100).toFixed(1)}%`
                            : '-'}
                        </td>
                        <td className="py-4 px-4 text-surface-400">
                          {new Date(
                            newsletter.sentAt || newsletter.createdAt
                          ).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {newsletter.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendNewsletter(newsletter.id)}
                              >
                                Send
                              </Button>
                            )}
                            <button className="p-2 hover:bg-surface-700 rounded-lg">
                              <MoreVertical className="w-4 h-4 text-surface-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <Mail className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-surface-100 mb-2">
                          No newsletters yet
                        </h3>
                        <p className="text-surface-400 mb-4">
                          Create your first AI-powered newsletter
                        </p>
                        <Button onClick={() => setShowCreateModal(true)}>
                          Create Newsletter
                        </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
            <Card className="w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-surface-100">
                  Create Newsletter
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-surface-700 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Topic</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="What's your newsletter about?"
                    className="input h-24 resize-none"
                  />
                </div>

                <div>
                  <label className="label">Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['informative', 'casual', 'professional', 'engaging'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize ${
                          style === s
                            ? 'border-primary-500 bg-primary-600/10 text-primary-400'
                            : 'border-surface-700 text-surface-400 hover:border-surface-600'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleGenerateNewsletter}
                    isLoading={isGenerating}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                  >
                    Generate with AI
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
