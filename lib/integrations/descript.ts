const DESCRIPT_API_URL = 'https://api.descript.com/v2'

interface DescriptProject {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  duration: number
  status: 'draft' | 'processing' | 'ready' | 'failed'
}

interface TranscriptWord {
  text: string
  start: number
  end: number
  confidence: number
  speaker?: string
}

interface OverdubVoice {
  id: string
  name: string
  owner: string
  isPublic: boolean
  sampleUrl?: string
}

export const descriptClient = {
  getHeaders(): HeadersInit {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DESCRIPT_API_KEY}`,
    }
  },

  // Project Management
  async createProject(name: string): Promise<DescriptProject> {
    const response = await fetch(`${DESCRIPT_API_URL}/projects`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create project: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      duration: data.duration || 0,
      status: data.status,
    }
  },

  async getProject(projectId: string): Promise<DescriptProject> {
    const response = await fetch(`${DESCRIPT_API_URL}/projects/${projectId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to get project: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      duration: data.duration || 0,
      status: data.status,
    }
  },

  async listProjects(): Promise<DescriptProject[]> {
    const response = await fetch(`${DESCRIPT_API_URL}/projects`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to list projects: ${response.statusText}`)
    }

    const data = await response.json()
    return data.projects.map((p: {
      id: string
      name: string
      created_at: string
      updated_at: string
      duration?: number
      status: string
    }) => ({
      id: p.id,
      name: p.name,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      duration: p.duration || 0,
      status: p.status,
    }))
  },

  async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(`${DESCRIPT_API_URL}/projects/${projectId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to delete project: ${response.statusText}`)
    }
  },

  // Media Upload
  async uploadMedia(
    projectId: string,
    file: File | Blob,
    options: { name?: string; type?: 'video' | 'audio' } = {}
  ): Promise<{
    id: string
    name: string
    duration: number
    status: string
  }> {
    const formData = new FormData()
    formData.append('file', file, options.name || 'media')

    if (options.type) {
      formData.append('type', options.type)
    }

    const response = await fetch(
      `${DESCRIPT_API_URL}/projects/${projectId}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DESCRIPT_API_KEY}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to upload media: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      duration: data.duration,
      status: data.status,
    }
  },

  // Transcription
  async getTranscript(projectId: string): Promise<{
    text: string
    words: TranscriptWord[]
    speakers: string[]
    duration: number
  }> {
    const response = await fetch(
      `${DESCRIPT_API_URL}/projects/${projectId}/transcript`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get transcript: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      text: data.text,
      words: data.words.map((w: {
        text: string
        start: number
        end: number
        confidence: number
        speaker?: string
      }) => ({
        text: w.text,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
        speaker: w.speaker,
      })),
      speakers: data.speakers || [],
      duration: data.duration,
    }
  },

  async updateTranscript(
    projectId: string,
    changes: Array<{
      type: 'insert' | 'delete' | 'replace'
      position: number
      text?: string
      length?: number
    }>
  ): Promise<void> {
    const response = await fetch(
      `${DESCRIPT_API_URL}/projects/${projectId}/transcript`,
      {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ changes }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to update transcript: ${response.statusText}`)
    }
  },

  // Overdub (AI Voice Cloning)
  async listOverdubVoices(): Promise<OverdubVoice[]> {
    const response = await fetch(`${DESCRIPT_API_URL}/overdub/voices`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to list overdub voices: ${response.statusText}`)
    }

    const data = await response.json()
    return data.voices.map((v: {
      id: string
      name: string
      owner: string
      is_public: boolean
      sample_url?: string
    }) => ({
      id: v.id,
      name: v.name,
      owner: v.owner,
      isPublic: v.is_public,
      sampleUrl: v.sample_url,
    }))
  },

  async generateOverdub(
    projectId: string,
    voiceId: string,
    text: string,
    position: number
  ): Promise<{
    id: string
    status: string
    duration: number
  }> {
    const response = await fetch(
      `${DESCRIPT_API_URL}/projects/${projectId}/overdub`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          voice_id: voiceId,
          text,
          position,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to generate overdub: ${response.statusText}`)
    }

    return response.json()
  },

  // Captions
  async generateCaptions(
    projectId: string,
    options: {
      style?: 'default' | 'minimal' | 'bold'
      maxCharsPerLine?: number
      position?: 'bottom' | 'top'
    } = {}
  ): Promise<{
    captions: Array<{
      start: number
      end: number
      text: string
    }>
    srt: string
    vtt: string
  }> {
    const response = await fetch(
      `${DESCRIPT_API_URL}/projects/${projectId}/captions`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          style: options.style || 'default',
          max_chars_per_line: options.maxCharsPerLine || 42,
          position: options.position || 'bottom',
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to generate captions: ${response.statusText}`)
    }

    return response.json()
  },

  // Export
  async exportProject(
    projectId: string,
    options: {
      format: 'mp4' | 'mp3' | 'wav' | 'srt' | 'vtt' | 'txt'
      quality?: 'low' | 'medium' | 'high'
      includeSubtitles?: boolean
    }
  ): Promise<{
    exportId: string
    status: string
    downloadUrl?: string
  }> {
    const response = await fetch(
      `${DESCRIPT_API_URL}/projects/${projectId}/export`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          format: options.format,
          quality: options.quality || 'high',
          include_subtitles: options.includeSubtitles,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to start export: ${response.statusText}`)
    }

    return response.json()
  },

  async getExportStatus(projectId: string, exportId: string): Promise<{
    status: 'pending' | 'processing' | 'ready' | 'failed'
    downloadUrl?: string
    error?: string
  }> {
    const response = await fetch(
      `${DESCRIPT_API_URL}/projects/${projectId}/export/${exportId}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get export status: ${response.statusText}`)
    }

    return response.json()
  },

  async waitForExport(
    projectId: string,
    exportId: string,
    options: { maxAttempts?: number; intervalMs?: number } = {}
  ): Promise<string> {
    const maxAttempts = options.maxAttempts || 60
    const intervalMs = options.intervalMs || 5000

    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getExportStatus(projectId, exportId)

      if (status.status === 'ready' && status.downloadUrl) {
        return status.downloadUrl
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Export failed')
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    throw new Error('Export timed out')
  },

  // Filler Word Removal
  async removeFillerWords(
    projectId: string,
    options: {
      words?: string[]
      threshold?: number
    } = {}
  ): Promise<{
    removedCount: number
    words: Array<{
      word: string
      count: number
      timeSaved: number
    }>
  }> {
    const response = await fetch(
      `${DESCRIPT_API_URL}/projects/${projectId}/filler-words`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          words: options.words || ['um', 'uh', 'like', 'you know', 'actually'],
          threshold: options.threshold || 0.8,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to remove filler words: ${response.statusText}`)
    }

    return response.json()
  },
}

export default descriptClient
