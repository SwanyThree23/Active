import type { ElevenLabsVoice } from '@/types'

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

interface TTSOptions {
  voiceId: string
  text: string
  modelId?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
}

interface VoiceSettings {
  stability: number
  similarity_boost: number
  style?: number
  use_speaker_boost?: boolean
}

export const elevenLabsClient = {
  getHeaders(): HeadersInit {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
    }
  },

  async getVoices(): Promise<ElevenLabsVoice[]> {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`)
    }

    const data = await response.json()

    return data.voices.map((voice: {
      voice_id: string
      name: string
      category: string
      labels: Record<string, string>
      preview_url?: string
    }) => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      labels: voice.labels,
      previewUrl: voice.preview_url,
    }))
  },

  async getVoice(voiceId: string): Promise<ElevenLabsVoice> {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch voice: ${response.statusText}`)
    }

    const voice = await response.json()

    return {
      id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      labels: voice.labels,
      previewUrl: voice.preview_url,
    }
  },

  async textToSpeech(options: TTSOptions): Promise<{
    audio: ArrayBuffer
    contentType: string
  }> {
    const voiceSettings: VoiceSettings = {
      stability: options.stability ?? 0.5,
      similarity_boost: options.similarityBoost ?? 0.75,
    }

    if (options.style !== undefined) {
      voiceSettings.style = options.style
    }

    if (options.useSpeakerBoost !== undefined) {
      voiceSettings.use_speaker_boost = options.useSpeakerBoost
    }

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${options.voiceId}`,
      {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: options.text,
          model_id: options.modelId || 'eleven_monolingual_v1',
          voice_settings: voiceSettings,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`TTS failed: ${error}`)
    }

    const audio = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'audio/mpeg'

    return { audio, contentType }
  },

  async textToSpeechStream(options: TTSOptions): Promise<ReadableStream<Uint8Array>> {
    const voiceSettings: VoiceSettings = {
      stability: options.stability ?? 0.5,
      similarity_boost: options.similarityBoost ?? 0.75,
    }

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${options.voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: options.text,
          model_id: options.modelId || 'eleven_monolingual_v1',
          voice_settings: voiceSettings,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`TTS stream failed: ${response.statusText}`)
    }

    return response.body as ReadableStream<Uint8Array>
  },

  async cloneVoice(params: {
    name: string
    description?: string
    files: File[]
    labels?: Record<string, string>
  }): Promise<ElevenLabsVoice> {
    const formData = new FormData()
    formData.append('name', params.name)

    if (params.description) {
      formData.append('description', params.description)
    }

    if (params.labels) {
      formData.append('labels', JSON.stringify(params.labels))
    }

    params.files.forEach((file) => {
      formData.append('files', file)
    })

    const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Voice cloning failed: ${error}`)
    }

    const voice = await response.json()

    return {
      id: voice.voice_id,
      name: voice.name,
      category: 'cloned',
      labels: params.labels || {},
    }
  },

  async deleteVoice(voiceId: string): Promise<void> {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to delete voice: ${response.statusText}`)
    }
  },

  async getSubscriptionInfo(): Promise<{
    characterCount: number
    characterLimit: number
    tier: string
  }> {
    const response = await fetch(`${ELEVENLABS_API_URL}/user/subscription`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch subscription: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      characterCount: data.character_count,
      characterLimit: data.character_limit,
      tier: data.tier,
    }
  },

  async getHistory(pageSize = 100): Promise<{
    history: Array<{
      historyItemId: string
      voiceId: string
      voiceName: string
      text: string
      dateUnix: number
      characterCountChangeFrom: number
      characterCountChangeTo: number
      contentType: string
      state: string
    }>
  }> {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/history?page_size=${pageSize}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      history: data.history.map((item: {
        history_item_id: string
        voice_id: string
        voice_name: string
        text: string
        date_unix: number
        character_count_change_from: number
        character_count_change_to: number
        content_type: string
        state: string
      }) => ({
        historyItemId: item.history_item_id,
        voiceId: item.voice_id,
        voiceName: item.voice_name,
        text: item.text,
        dateUnix: item.date_unix,
        characterCountChangeFrom: item.character_count_change_from,
        characterCountChangeTo: item.character_count_change_to,
        contentType: item.content_type,
        state: item.state,
      })),
    }
  },
}

export default elevenLabsClient
