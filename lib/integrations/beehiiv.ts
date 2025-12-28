const BEEHIIV_API_URL = 'https://api.beehiiv.com/v2'

interface Subscriber {
  id: string
  email: string
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  tags: string[]
  customFields: Record<string, string>
}

interface Campaign {
  id: string
  subject: string
  previewText: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent'
  scheduledAt?: string
  sentAt?: string
  stats?: CampaignStats
}

interface CampaignStats {
  sent: number
  delivered: number
  opened: number
  clicked: number
  openRate: number
  clickRate: number
  unsubscribed: number
}

interface Publication {
  id: string
  name: string
  subdomain: string
  customDomain?: string
  subscriberCount: number
}

export const beehiivClient = {
  getHeaders(): HeadersInit {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.BEEHIIV_API_KEY}`,
    }
  },

  getPublicationId(): string {
    return process.env.BEEHIIV_PUBLICATION_ID || ''
  },

  // Publication
  async getPublication(): Promise<Publication> {
    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${this.getPublicationId()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get publication: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: data.data.id,
      name: data.data.name,
      subdomain: data.data.subdomain,
      customDomain: data.data.custom_domain,
      subscriberCount: data.data.subscriber_count,
    }
  },

  // Subscribers
  async getSubscribers(options: {
    status?: 'active' | 'inactive' | 'pending'
    limit?: number
    page?: number
  } = {}): Promise<{
    subscribers: Subscriber[]
    total: number
    page: number
    totalPages: number
  }> {
    const params = new URLSearchParams()
    if (options.status) params.append('status', options.status)
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.page) params.append('page', options.page.toString())

    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${this.getPublicationId()}/subscriptions?${params}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get subscribers: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      subscribers: data.data.map((s: {
        id: string
        email: string
        status: string
        created_at: string
        tags: string[]
        custom_fields: Record<string, string>
      }) => ({
        id: s.id,
        email: s.email,
        status: s.status,
        createdAt: s.created_at,
        tags: s.tags || [],
        customFields: s.custom_fields || {},
      })),
      total: data.total_results,
      page: data.page,
      totalPages: data.total_pages,
    }
  },

  async addSubscriber(params: {
    email: string
    tags?: string[]
    customFields?: Record<string, string>
    reactivate?: boolean
    sendWelcomeEmail?: boolean
  }): Promise<Subscriber> {
    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${this.getPublicationId()}/subscriptions`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          email: params.email,
          reactivate_existing: params.reactivate ?? false,
          send_welcome_email: params.sendWelcomeEmail ?? true,
          tags: params.tags,
          custom_fields: params.customFields,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to add subscriber: ${error}`)
    }

    const data = await response.json()
    return {
      id: data.data.id,
      email: data.data.email,
      status: data.data.status,
      createdAt: data.data.created_at,
      tags: data.data.tags || [],
      customFields: data.data.custom_fields || {},
    }
  },

  async updateSubscriber(
    subscriberId: string,
    params: {
      tags?: string[]
      customFields?: Record<string, string>
    }
  ): Promise<Subscriber> {
    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${this.getPublicationId()}/subscriptions/${subscriberId}`,
      {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({
          tags: params.tags,
          custom_fields: params.customFields,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to update subscriber: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: data.data.id,
      email: data.data.email,
      status: data.data.status,
      createdAt: data.data.created_at,
      tags: data.data.tags || [],
      customFields: data.data.custom_fields || {},
    }
  },

  async unsubscribe(subscriberId: string): Promise<void> {
    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${this.getPublicationId()}/subscriptions/${subscriberId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to unsubscribe: ${response.statusText}`)
    }
  },

  // Posts/Campaigns
  async getPosts(options: {
    status?: 'draft' | 'scheduled' | 'published'
    limit?: number
    page?: number
  } = {}): Promise<{
    posts: Campaign[]
    total: number
  }> {
    const params = new URLSearchParams()
    if (options.status) params.append('status', options.status)
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.page) params.append('page', options.page.toString())

    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${this.getPublicationId()}/posts?${params}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get posts: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      posts: data.data.map((p: {
        id: string
        subject_line: string
        preview_text: string
        status: string
        scheduled_at?: string
        sent_at?: string
        stats?: {
          sent: number
          delivered: number
          opened: number
          clicked: number
          open_rate: number
          click_rate: number
          unsubscribed: number
        }
      }) => ({
        id: p.id,
        subject: p.subject_line,
        previewText: p.preview_text,
        status: p.status,
        scheduledAt: p.scheduled_at,
        sentAt: p.sent_at,
        stats: p.stats ? {
          sent: p.stats.sent,
          delivered: p.stats.delivered,
          opened: p.stats.opened,
          clicked: p.stats.clicked,
          openRate: p.stats.open_rate,
          clickRate: p.stats.click_rate,
          unsubscribed: p.stats.unsubscribed,
        } : undefined,
      })),
      total: data.total_results,
    }
  },

  async createPost(params: {
    subject: string
    previewText?: string
    content: string
    contentFormat?: 'html' | 'markdown'
    tags?: string[]
  }): Promise<Campaign> {
    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${this.getPublicationId()}/posts`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          subject_line: params.subject,
          preview_text: params.previewText,
          content: params.content,
          content_format: params.contentFormat || 'html',
          tags: params.tags,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create post: ${error}`)
    }

    const data = await response.json()
    return {
      id: data.data.id,
      subject: data.data.subject_line,
      previewText: data.data.preview_text,
      status: data.data.status,
    }
  },

  async schedulePost(postId: string, scheduledAt: Date): Promise<Campaign> {
    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${this.getPublicationId()}/posts/${postId}/schedule`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          scheduled_at: scheduledAt.toISOString(),
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to schedule post: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: data.data.id,
      subject: data.data.subject_line,
      previewText: data.data.preview_text,
      status: data.data.status,
      scheduledAt: data.data.scheduled_at,
    }
  },

  async sendPost(postId: string): Promise<Campaign> {
    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${this.getPublicationId()}/posts/${postId}/send`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to send post: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: data.data.id,
      subject: data.data.subject_line,
      previewText: data.data.preview_text,
      status: data.data.status,
      sentAt: data.data.sent_at,
    }
  },

  async getPostStats(postId: string): Promise<CampaignStats> {
    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${this.getPublicationId()}/posts/${postId}/stats`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get post stats: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      sent: data.data.sent,
      delivered: data.data.delivered,
      opened: data.data.opened,
      clicked: data.data.clicked,
      openRate: data.data.open_rate,
      clickRate: data.data.click_rate,
      unsubscribed: data.data.unsubscribed,
    }
  },

  // Analytics
  async getAnalytics(options: {
    startDate?: Date
    endDate?: Date
  } = {}): Promise<{
    subscribers: {
      total: number
      newThisPeriod: number
      growthRate: number
    }
    engagement: {
      avgOpenRate: number
      avgClickRate: number
      totalOpens: number
      totalClicks: number
    }
  }> {
    const params = new URLSearchParams()
    if (options.startDate) params.append('start_date', options.startDate.toISOString())
    if (options.endDate) params.append('end_date', options.endDate.toISOString())

    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${this.getPublicationId()}/analytics?${params}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get analytics: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      subscribers: {
        total: data.data.subscribers.total,
        newThisPeriod: data.data.subscribers.new,
        growthRate: data.data.subscribers.growth_rate,
      },
      engagement: {
        avgOpenRate: data.data.engagement.avg_open_rate,
        avgClickRate: data.data.engagement.avg_click_rate,
        totalOpens: data.data.engagement.total_opens,
        totalClicks: data.data.engagement.total_clicks,
      },
    }
  },

  // Tags
  async getTags(): Promise<string[]> {
    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${this.getPublicationId()}/tags`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get tags: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data.map((t: { name: string }) => t.name)
  },
}

export default beehiivClient
