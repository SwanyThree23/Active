import Anthropic from '@anthropic-ai/sdk'
import type { ClaudeRequest, ClaudeResponse } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
})

export interface ScriptGenerationRequest {
  topic: string
  style?: 'professional' | 'casual' | 'educational' | 'entertaining'
  duration?: number // seconds
  includeHooks?: boolean
  targetAudience?: string
}

export interface CompressionRequest {
  text: string
  targetRatio?: number // 0.1 to 0.9
  preserveKeyPoints?: boolean
}

export const claudeClient = {
  async complete(request: ClaudeRequest): Promise<ClaudeResponse> {
    const response = await anthropic.messages.create({
      model: request.model || 'claude-3-5-sonnet-20241022',
      max_tokens: request.maxTokens || 4096,
      messages: [
        {
          role: 'user',
          content: request.prompt,
        },
      ],
      system: request.systemPrompt,
    })

    const textContent = response.content.find(block => block.type === 'text')
    const content = textContent?.type === 'text' ? textContent.text : ''

    return {
      content,
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      model: response.model,
    }
  },

  async generateScript(request: ScriptGenerationRequest): Promise<{
    script: string
    estimatedDuration: number
    tokens: { input: number; output: number }
  }> {
    const systemPrompt = `You are an expert content scriptwriter. Generate engaging, well-structured scripts for video and audio content.
Format the output as a ready-to-read script with clear sections, natural pauses indicated by "...", and emphasis markers in *asterisks*.
Include hooks, transitions, and calls-to-action as appropriate.`

    const prompt = `Create a ${request.style || 'professional'} script about: ${request.topic}

Requirements:
- Target duration: ${request.duration || 60} seconds (approximately ${Math.round((request.duration || 60) * 2.5)} words)
- Target audience: ${request.targetAudience || 'general audience'}
${request.includeHooks ? '- Include an attention-grabbing hook at the beginning' : ''}
- Include natural transitions and a clear call-to-action

Output the script in a format ready for voice synthesis.`

    const response = await this.complete({
      prompt,
      systemPrompt,
      maxTokens: 2048,
    })

    const wordCount = response.content.split(/\s+/).length
    const estimatedDuration = Math.round(wordCount / 2.5) // ~150 words per minute

    return {
      script: response.content,
      estimatedDuration,
      tokens: response.tokens,
    }
  },

  async compressScript(request: CompressionRequest): Promise<{
    compressed: string
    originalTokens: number
    compressedTokens: number
    ratio: number
  }> {
    const targetRatio = request.targetRatio || 0.5
    const originalTokens = Math.ceil(request.text.length / 4)
    const targetTokens = Math.round(originalTokens * targetRatio)

    const systemPrompt = `You are an expert at compressing text while maintaining its core meaning and impact.
Preserve the essential message, key points, and any calls-to-action.
${request.preserveKeyPoints ? 'Ensure all key points are retained.' : ''}`

    const prompt = `Compress the following text to approximately ${Math.round(targetRatio * 100)}% of its original length (target: ~${targetTokens} tokens).
Maintain the core message and natural flow.

Original text:
${request.text}

Provide only the compressed version without any explanations.`

    const response = await this.complete({
      prompt,
      systemPrompt,
      maxTokens: targetTokens + 100,
    })

    const compressedTokens = Math.ceil(response.content.length / 4)

    return {
      compressed: response.content,
      originalTokens,
      compressedTokens,
      ratio: Math.round((1 - compressedTokens / originalTokens) * 100),
    }
  },

  async improveScript(script: string, feedback: string): Promise<{
    improved: string
    changes: string[]
    tokens: { input: number; output: number }
  }> {
    const systemPrompt = `You are an expert content editor. Improve scripts based on feedback while maintaining the original intent and style.`

    const prompt = `Improve the following script based on the feedback provided.

Original Script:
${script}

Feedback:
${feedback}

Provide:
1. The improved script
2. A list of changes made

Format:
IMPROVED SCRIPT:
[improved script here]

CHANGES:
- [change 1]
- [change 2]
...`

    const response = await this.complete({
      prompt,
      systemPrompt,
      maxTokens: 3000,
    })

    const parts = response.content.split('CHANGES:')
    const improved = parts[0].replace('IMPROVED SCRIPT:', '').trim()
    const changesText = parts[1] || ''
    const changes = changesText
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean)

    return {
      improved,
      changes,
      tokens: response.tokens,
    }
  },

  async generateNewsletterContent(params: {
    topic: string
    style: string
    sections: string[]
    targetLength: number
  }): Promise<{
    content: string
    subject: string
    tokens: { input: number; output: number }
  }> {
    const systemPrompt = `You are an expert newsletter writer. Create engaging, valuable newsletter content that readers will love.
Use markdown formatting for structure. Include actionable insights and maintain a ${params.style} tone.`

    const prompt = `Write a newsletter about: ${params.topic}

Sections to include: ${params.sections.join(', ')}
Target length: ${params.targetLength} words

Also provide a compelling subject line that encourages opens.

Format:
SUBJECT: [subject line]

CONTENT:
[newsletter content in markdown]`

    const response = await this.complete({
      prompt,
      systemPrompt,
      maxTokens: 4000,
    })

    const subjectMatch = response.content.match(/SUBJECT:\s*(.+?)(?:\n|CONTENT:)/s)
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Weekly Newsletter'

    const contentMatch = response.content.match(/CONTENT:\s*([\s\S]+)/s)
    const content = contentMatch ? contentMatch[1].trim() : response.content

    return {
      content,
      subject,
      tokens: response.tokens,
    }
  },
}

export default claudeClient
