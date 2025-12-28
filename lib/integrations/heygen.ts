import type { HeyGenAvatar, HeyGenVideoRequest } from '@/types'

const HEYGEN_API_URL = 'https://api.heygen.com/v2'

interface VideoGenerationResponse {
  video_id: string
  status: string
}

interface VideoStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url?: string
  thumbnail_url?: string
  duration?: number
  error?: string
}

export const heygenClient = {
  getHeaders(): HeadersInit {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.HEYGEN_API_KEY || '',
    }
  },

  async getAvatars(): Promise<HeyGenAvatar[]> {
    const response = await fetch(`${HEYGEN_API_URL}/avatars`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch avatars: ${response.statusText}`)
    }

    const data = await response.json()

    return data.data.avatars.map((avatar: {
      avatar_id: string
      avatar_name: string
      preview_image_url: string
      type: string
      gender?: string
    }) => ({
      id: avatar.avatar_id,
      name: avatar.avatar_name,
      thumbnail: avatar.preview_image_url,
      type: avatar.type === 'realistic' ? 'realistic' : 'animated',
      gender: avatar.gender,
    }))
  },

  async getAvatar(avatarId: string): Promise<HeyGenAvatar> {
    const response = await fetch(`${HEYGEN_API_URL}/avatars/${avatarId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch avatar: ${response.statusText}`)
    }

    const data = await response.json()
    const avatar = data.data

    return {
      id: avatar.avatar_id,
      name: avatar.avatar_name,
      thumbnail: avatar.preview_image_url,
      type: avatar.type === 'realistic' ? 'realistic' : 'animated',
      gender: avatar.gender,
    }
  },

  async generateVideo(request: HeyGenVideoRequest): Promise<{
    videoId: string
    status: string
  }> {
    const payload = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: request.avatarId,
            avatar_style: 'normal',
          },
          voice: request.voiceId
            ? { type: 'voice', voice_id: request.voiceId }
            : { type: 'text', input_text: request.script },
          background: request.background
            ? { type: 'color', value: request.background }
            : { type: 'color', value: '#FFFFFF' },
        },
      ],
      dimension: {
        width: request.quality === 'high' ? 1920 : request.quality === 'medium' ? 1280 : 854,
        height: request.quality === 'high' ? 1080 : request.quality === 'medium' ? 720 : 480,
      },
      aspect_ratio: '16:9',
      test: process.env.NODE_ENV !== 'production',
    }

    const response = await fetch(`${HEYGEN_API_URL}/video/generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Video generation failed: ${error}`)
    }

    const data: { data: VideoGenerationResponse } = await response.json()

    return {
      videoId: data.data.video_id,
      status: data.data.status,
    }
  },

  async getVideoStatus(videoId: string): Promise<VideoStatusResponse> {
    const response = await fetch(`${HEYGEN_API_URL}/video_status.get?video_id=${videoId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to get video status: ${response.statusText}`)
    }

    const data = await response.json()
    const status = data.data

    return {
      status: status.status,
      video_url: status.video_url,
      thumbnail_url: status.thumbnail_url,
      duration: status.duration,
      error: status.error,
    }
  },

  async waitForVideo(
    videoId: string,
    options: { maxAttempts?: number; intervalMs?: number } = {}
  ): Promise<VideoStatusResponse> {
    const maxAttempts = options.maxAttempts || 60
    const intervalMs = options.intervalMs || 5000

    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getVideoStatus(videoId)

      if (status.status === 'completed') {
        return status
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Video generation failed')
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    throw new Error('Video generation timed out')
  },

  async getVoices(): Promise<Array<{
    id: string
    name: string
    language: string
    gender: string
  }>> {
    const response = await fetch(`${HEYGEN_API_URL}/voices`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`)
    }

    const data = await response.json()

    return data.data.voices.map((voice: {
      voice_id: string
      voice_name: string
      language: string
      gender: string
    }) => ({
      id: voice.voice_id,
      name: voice.voice_name,
      language: voice.language,
      gender: voice.gender,
    }))
  },

  async getTalkingPhoto(): Promise<Array<{
    id: string
    name: string
    imageUrl: string
  }>> {
    const response = await fetch(`${HEYGEN_API_URL}/talking_photo`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch talking photos: ${response.statusText}`)
    }

    const data = await response.json()

    return data.data.talking_photos.map((photo: {
      talking_photo_id: string
      talking_photo_name: string
      preview_image_url: string
    }) => ({
      id: photo.talking_photo_id,
      name: photo.talking_photo_name,
      imageUrl: photo.preview_image_url,
    }))
  },

  async uploadTalkingPhoto(imageUrl: string): Promise<{
    id: string
    name: string
    imageUrl: string
  }> {
    const response = await fetch(`${HEYGEN_API_URL}/talking_photo`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ image_url: imageUrl }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to upload talking photo: ${error}`)
    }

    const data = await response.json()
    const photo = data.data

    return {
      id: photo.talking_photo_id,
      name: photo.talking_photo_name,
      imageUrl: photo.preview_image_url,
    }
  },

  async getQuota(): Promise<{
    remaining: number
    total: number
    used: number
  }> {
    const response = await fetch(`${HEYGEN_API_URL}/user/quota`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch quota: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      remaining: data.data.remaining_quota,
      total: data.data.quota_limit,
      used: data.data.quota_limit - data.data.remaining_quota,
    }
  },
}

export default heygenClient
