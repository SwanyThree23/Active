const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || ''
const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678/api/v1'

interface Workflow {
  id: string
  name: string
  active: boolean
  nodes: WorkflowNode[]
  connections: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

interface WorkflowNode {
  id: string
  name: string
  type: string
  position: [number, number]
  parameters: Record<string, unknown>
}

interface Execution {
  id: string
  workflowId: string
  status: 'running' | 'success' | 'error' | 'waiting'
  startedAt: string
  stoppedAt?: string
  data?: Record<string, unknown>
  error?: string
}

interface WebhookPayload {
  event: string
  data: Record<string, unknown>
  timestamp: string
  source: string
}

export const n8nClient = {
  getHeaders(): HeadersInit {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': process.env.N8N_API_KEY || '',
    }
  },

  // Webhooks
  async triggerWebhook(
    path: string,
    payload: Record<string, unknown>
  ): Promise<{
    success: boolean
    executionId?: string
    data?: unknown
  }> {
    const webhookUrl = `${N8N_WEBHOOK_URL}/${path}`

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
        source: 'ai-content-studio',
      }),
    })

    if (!response.ok) {
      throw new Error(`Webhook trigger failed: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      success: true,
      executionId: data.executionId,
      data: data,
    }
  },

  async triggerContentWorkflow(params: {
    contentId: string
    contentType: string
    action: 'create' | 'update' | 'publish' | 'delete'
    data: Record<string, unknown>
  }): Promise<{ success: boolean; executionId?: string }> {
    return this.triggerWebhook('content', {
      event: `content.${params.action}`,
      contentId: params.contentId,
      contentType: params.contentType,
      data: params.data,
    })
  },

  async triggerNewsletterWorkflow(params: {
    newsletterId: string
    action: 'draft' | 'schedule' | 'send'
    data: Record<string, unknown>
  }): Promise<{ success: boolean; executionId?: string }> {
    return this.triggerWebhook('newsletter', {
      event: `newsletter.${params.action}`,
      newsletterId: params.newsletterId,
      data: params.data,
    })
  },

  async triggerVideoWorkflow(params: {
    contentId: string
    script: string
    avatarId: string
    voiceId: string
    quality: string
  }): Promise<{ success: boolean; executionId?: string }> {
    return this.triggerWebhook('video', {
      event: 'video.generate',
      ...params,
    })
  },

  // Workflows (requires n8n API access)
  async getWorkflows(): Promise<Workflow[]> {
    const response = await fetch(`${N8N_API_URL}/workflows`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to get workflows: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data.map((w: {
      id: string
      name: string
      active: boolean
      nodes: WorkflowNode[]
      connections: Record<string, unknown>
      createdAt: string
      updatedAt: string
    }) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      nodes: w.nodes,
      connections: w.connections,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }))
  },

  async getWorkflow(workflowId: string): Promise<Workflow> {
    const response = await fetch(`${N8N_API_URL}/workflows/${workflowId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to get workflow: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      active: data.active,
      nodes: data.nodes,
      connections: data.connections,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  },

  async activateWorkflow(workflowId: string): Promise<void> {
    const response = await fetch(
      `${N8N_API_URL}/workflows/${workflowId}/activate`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to activate workflow: ${response.statusText}`)
    }
  },

  async deactivateWorkflow(workflowId: string): Promise<void> {
    const response = await fetch(
      `${N8N_API_URL}/workflows/${workflowId}/deactivate`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to deactivate workflow: ${response.statusText}`)
    }
  },

  // Executions
  async getExecutions(workflowId?: string): Promise<Execution[]> {
    const params = new URLSearchParams()
    if (workflowId) params.append('workflowId', workflowId)

    const response = await fetch(`${N8N_API_URL}/executions?${params}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to get executions: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data.map((e: {
      id: string
      workflowId: string
      status: string
      startedAt: string
      stoppedAt?: string
      data?: Record<string, unknown>
    }) => ({
      id: e.id,
      workflowId: e.workflowId,
      status: e.status,
      startedAt: e.startedAt,
      stoppedAt: e.stoppedAt,
      data: e.data,
    }))
  },

  async getExecution(executionId: string): Promise<Execution> {
    const response = await fetch(`${N8N_API_URL}/executions/${executionId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to get execution: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      workflowId: data.workflowId,
      status: data.status,
      startedAt: data.startedAt,
      stoppedAt: data.stoppedAt,
      data: data.data,
      error: data.error,
    }
  },

  async retryExecution(executionId: string): Promise<Execution> {
    const response = await fetch(
      `${N8N_API_URL}/executions/${executionId}/retry`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to retry execution: ${response.statusText}`)
    }

    return response.json()
  },

  // Predefined workflow templates for AI Content Studio
  getWorkflowTemplates(): Array<{
    id: string
    name: string
    description: string
    trigger: string
    nodes: string[]
  }> {
    return [
      {
        id: 'content-generation',
        name: 'Content Generation Pipeline',
        description: 'Automated content creation with Claude, ElevenLabs, and HeyGen',
        trigger: 'Webhook',
        nodes: ['Claude Script', 'LLMLingua Compress', 'ElevenLabs TTS', 'HeyGen Video'],
      },
      {
        id: 'newsletter-automation',
        name: 'Newsletter Automation',
        description: 'Automated newsletter creation and distribution via Beehiiv',
        trigger: 'Schedule',
        nodes: ['Claude Generate', 'Beehiiv Create', 'Beehiiv Schedule'],
      },
      {
        id: 'video-processing',
        name: 'Video Processing Pipeline',
        description: 'Process videos with transcription, captions, and editing',
        trigger: 'Webhook',
        nodes: ['Whisperflow Transcribe', 'Descript Edit', 'Descript Captions', 'Export'],
      },
      {
        id: 'social-distribution',
        name: 'Social Distribution',
        description: 'Distribute content across multiple platforms',
        trigger: 'Webhook',
        nodes: ['Format Content', 'Post Twitter', 'Post LinkedIn', 'Post Newsletter'],
      },
      {
        id: 'launch-tracker',
        name: 'Product Hunt Launch Tracker',
        description: 'Track and report on Product Hunt launches',
        trigger: 'Schedule (Hourly)',
        nodes: ['Fetch Stats', 'Compare Rankings', 'Send Alerts', 'Update Dashboard'],
      },
    ]
  },
}

export default n8nClient
