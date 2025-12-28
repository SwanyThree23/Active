const WHISPERFLOW_API_URL = process.env.WHISPERFLOW_API_URL || 'https://api.whisperflow.io/v1'

interface TranscriptionSegment {
  id: number
  start: number
  end: number
  text: string
  speaker?: string
  confidence: number
}

interface TranscriptionResult {
  text: string
  segments: TranscriptionSegment[]
  language: string
  duration: number
  speakers?: string[]
}

interface DiarizationSpeaker {
  id: string
  label: string
  segments: Array<{
    start: number
    end: number
    text: string
  }>
  totalDuration: number
}

export const whisperflowClient = {
  getHeaders(): HeadersInit {
    return {
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.WHISPERFLOW_API_KEY}`,
    }
  },

  async transcribe(
    audioFile: File | Blob | ArrayBuffer,
    options: {
      language?: string
      prompt?: string
      responseFormat?: 'json' | 'text' | 'srt' | 'vtt'
      timestampGranularity?: 'word' | 'segment'
    } = {}
  ): Promise<TranscriptionResult> {
    const formData = new FormData()

    if (audioFile instanceof ArrayBuffer) {
      formData.append('file', new Blob([audioFile], { type: 'audio/mpeg' }), 'audio.mp3')
    } else {
      formData.append('file', audioFile)
    }

    if (options.language) {
      formData.append('language', options.language)
    }

    if (options.prompt) {
      formData.append('prompt', options.prompt)
    }

    formData.append('response_format', options.responseFormat || 'json')

    if (options.timestampGranularity) {
      formData.append('timestamp_granularities[]', options.timestampGranularity)
    }

    const response = await fetch(`${WHISPERFLOW_API_URL}/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHISPERFLOW_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Transcription failed: ${error}`)
    }

    const data = await response.json()

    return {
      text: data.text,
      segments: data.segments?.map((seg: {
        id: number
        start: number
        end: number
        text: string
        speaker?: string
        confidence?: number
      }) => ({
        id: seg.id,
        start: seg.start,
        end: seg.end,
        text: seg.text,
        speaker: seg.speaker,
        confidence: seg.confidence || 1.0,
      })) || [],
      language: data.language,
      duration: data.duration,
      speakers: data.speakers,
    }
  },

  async transcribeWithDiarization(
    audioFile: File | Blob | ArrayBuffer,
    options: {
      language?: string
      numSpeakers?: number
      minSpeakers?: number
      maxSpeakers?: number
    } = {}
  ): Promise<{
    transcription: TranscriptionResult
    speakers: DiarizationSpeaker[]
  }> {
    const formData = new FormData()

    if (audioFile instanceof ArrayBuffer) {
      formData.append('file', new Blob([audioFile], { type: 'audio/mpeg' }), 'audio.mp3')
    } else {
      formData.append('file', audioFile)
    }

    formData.append('diarize', 'true')

    if (options.language) {
      formData.append('language', options.language)
    }

    if (options.numSpeakers) {
      formData.append('num_speakers', options.numSpeakers.toString())
    }

    if (options.minSpeakers) {
      formData.append('min_speakers', options.minSpeakers.toString())
    }

    if (options.maxSpeakers) {
      formData.append('max_speakers', options.maxSpeakers.toString())
    }

    const response = await fetch(`${WHISPERFLOW_API_URL}/transcriptions/diarize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHISPERFLOW_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Diarization failed: ${error}`)
    }

    const data = await response.json()

    const speakers: DiarizationSpeaker[] = data.speakers.map((speaker: {
      id: string
      label: string
      segments: Array<{ start: number; end: number; text: string }>
    }) => ({
      id: speaker.id,
      label: speaker.label,
      segments: speaker.segments,
      totalDuration: speaker.segments.reduce(
        (acc: number, seg: { start: number; end: number }) => acc + (seg.end - seg.start),
        0
      ),
    }))

    return {
      transcription: {
        text: data.text,
        segments: data.segments?.map((seg: {
          id: number
          start: number
          end: number
          text: string
          speaker?: string
          confidence?: number
        }) => ({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.text,
          speaker: seg.speaker,
          confidence: seg.confidence || 1.0,
        })) || [],
        language: data.language,
        duration: data.duration,
        speakers: data.speaker_labels,
      },
      speakers,
    }
  },

  async translateAudio(
    audioFile: File | Blob | ArrayBuffer,
    targetLanguage = 'en'
  ): Promise<{
    originalText: string
    translatedText: string
    originalLanguage: string
    targetLanguage: string
  }> {
    const formData = new FormData()

    if (audioFile instanceof ArrayBuffer) {
      formData.append('file', new Blob([audioFile], { type: 'audio/mpeg' }), 'audio.mp3')
    } else {
      formData.append('file', audioFile)
    }

    formData.append('target_language', targetLanguage)

    const response = await fetch(`${WHISPERFLOW_API_URL}/translations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHISPERFLOW_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Translation failed: ${error}`)
    }

    const data = await response.json()

    return {
      originalText: data.original_text,
      translatedText: data.translated_text,
      originalLanguage: data.original_language,
      targetLanguage: data.target_language,
    }
  },

  async generateSubtitles(
    audioFile: File | Blob | ArrayBuffer,
    format: 'srt' | 'vtt' = 'srt',
    options: {
      language?: string
      maxCharsPerLine?: number
      maxLinesPerSubtitle?: number
    } = {}
  ): Promise<string> {
    const formData = new FormData()

    if (audioFile instanceof ArrayBuffer) {
      formData.append('file', new Blob([audioFile], { type: 'audio/mpeg' }), 'audio.mp3')
    } else {
      formData.append('file', audioFile)
    }

    formData.append('response_format', format)

    if (options.language) {
      formData.append('language', options.language)
    }

    if (options.maxCharsPerLine) {
      formData.append('max_chars_per_line', options.maxCharsPerLine.toString())
    }

    if (options.maxLinesPerSubtitle) {
      formData.append('max_lines_per_subtitle', options.maxLinesPerSubtitle.toString())
    }

    const response = await fetch(`${WHISPERFLOW_API_URL}/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHISPERFLOW_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Subtitle generation failed: ${error}`)
    }

    return response.text()
  },

  async detectLanguage(audioFile: File | Blob | ArrayBuffer): Promise<{
    language: string
    confidence: number
    alternatives: Array<{ language: string; confidence: number }>
  }> {
    const formData = new FormData()

    if (audioFile instanceof ArrayBuffer) {
      formData.append('file', new Blob([audioFile], { type: 'audio/mpeg' }), 'audio.mp3')
    } else {
      formData.append('file', audioFile)
    }

    const response = await fetch(`${WHISPERFLOW_API_URL}/detect-language`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHISPERFLOW_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Language detection failed: ${error}`)
    }

    return response.json()
  },
}

export default whisperflowClient
