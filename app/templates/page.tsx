'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { Header } from '@/components/shared/Header'
import { Card, Button, Badge, Input } from '@/components/ui'
import { useToast } from '@/app/providers'
import {
  Search,
  Filter,
  Star,
  Copy,
  Eye,
  Video,
  Mic,
  FileText,
  Mail,
  Sparkles,
  Plus,
} from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string
  category: string
  type: string
  usageCount: number
  thumbnail?: string
  user?: { name: string }
}

const categories = [
  'All',
  'Marketing',
  'Education',
  'Entertainment',
  'Business',
  'Social Media',
]

const defaultTemplates: Template[] = [
  {
    id: '1',
    name: 'Product Demo Video',
    description: 'Professional product demonstration with AI avatar presenter',
    category: 'Marketing',
    type: 'VIDEO',
    usageCount: 1250,
  },
  {
    id: '2',
    name: 'Tutorial Explainer',
    description: 'Step-by-step tutorial format with clear explanations',
    category: 'Education',
    type: 'VIDEO',
    usageCount: 890,
  },
  {
    id: '3',
    name: 'Podcast Intro',
    description: 'Engaging podcast introduction with music bed',
    category: 'Entertainment',
    type: 'AUDIO',
    usageCount: 567,
  },
  {
    id: '4',
    name: 'Newsletter Weekly Digest',
    description: 'Curated weekly newsletter template with sections',
    category: 'Business',
    type: 'NEWSLETTER',
    usageCount: 432,
  },
  {
    id: '5',
    name: 'Social Media Script',
    description: 'Short-form video script for TikTok/Reels',
    category: 'Social Media',
    type: 'TEXT',
    usageCount: 2100,
  },
  {
    id: '6',
    name: 'Company Announcement',
    description: 'Professional company news and updates format',
    category: 'Business',
    type: 'VIDEO',
    usageCount: 345,
  },
]

export default function TemplatesPage() {
  const { addToast } = useToast()
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/v1/templates', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const { data } = await res.json()
        if (data.length > 0) {
          setTemplates(data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUseTemplate(templateId: string) {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/v1/templates/${templateId}/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        addToast({ title: 'Template applied! Redirecting to studio...', type: 'success' })
      } else {
        throw new Error('Failed to use template')
      }
    } catch (error) {
      addToast({ title: 'Failed to apply template', type: 'error' })
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return <Video className="w-4 h-4" />
      case 'AUDIO':
        return <Mic className="w-4 h-4" />
      case 'NEWSLETTER':
        return <Mail className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === 'All' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar />

      <main className="lg:pl-64">
        <Header title="Templates" />

        <div className="p-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-surface-100">Template Library</h2>
              <p className="text-surface-400 mt-1">
                Choose from pre-built templates to get started quickly
              </p>
            </div>
            <Button leftIcon={<Plus className="w-4 h-4" />}>Create Template</Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-100 placeholder-surface-400 focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-surface-700 rounded-lg mb-4" />
                  <div className="h-5 bg-surface-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-surface-700 rounded w-full mb-4" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-surface-700 rounded w-16" />
                    <div className="h-6 bg-surface-700 rounded w-20" />
                  </div>
                </Card>
              ))
            ) : filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => (
                <Card key={template.id} variant="hover" className="group">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-primary-600/20 to-accent-600/20 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                    <Sparkles className="w-12 h-12 text-primary-400/50" />
                    <div className="absolute inset-0 bg-surface-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" leftIcon={<Eye className="w-4 h-4" />}>
                        Preview
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-surface-100 group-hover:text-primary-400 transition-colors">
                        {template.name}
                      </h3>
                      <Badge variant="default" size="sm">
                        {getTypeIcon(template.type)}
                        <span className="ml-1">{template.type}</span>
                      </Badge>
                    </div>

                    <p className="text-sm text-surface-400 line-clamp-2">
                      {template.description}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-surface-700/50">
                      <div className="flex items-center gap-1 text-sm text-surface-400">
                        <Copy className="w-4 h-4" />
                        <span>{template.usageCount.toLocaleString()} uses</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUseTemplate(template.id)}
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Sparkles className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-surface-100 mb-2">
                  No templates found
                </h3>
                <p className="text-surface-400">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
