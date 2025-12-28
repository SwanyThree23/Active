const LLMLINGUA_API_URL = process.env.LLMLINGUA_API_URL || 'https://api.llmlingua.io/v1'

interface CompressionOptions {
  targetRatio?: number // 0.1 to 0.9
  maxTokens?: number
  preserveImportant?: boolean
  preserveQuotes?: boolean
  preserveCode?: boolean
  model?: 'default' | 'aggressive' | 'balanced'
}

interface CompressionResult {
  original: string
  compressed: string
  originalTokens: number
  compressedTokens: number
  ratio: number
  savings: {
    tokens: number
    percentage: number
    estimatedCost: number
  }
}

interface PromptOptimizationResult {
  optimizedPrompt: string
  originalTokens: number
  optimizedTokens: number
  savings: number
  suggestions: string[]
}

export const llmlinguaClient = {
  getHeaders(): HeadersInit {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LLMLINGUA_API_KEY}`,
    }
  },

  async compress(text: string, options: CompressionOptions = {}): Promise<CompressionResult> {
    const response = await fetch(`${LLMLINGUA_API_URL}/compress`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        text,
        target_ratio: options.targetRatio || 0.5,
        max_tokens: options.maxTokens,
        preserve_important: options.preserveImportant ?? true,
        preserve_quotes: options.preserveQuotes ?? true,
        preserve_code: options.preserveCode ?? true,
        model: options.model || 'balanced',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Compression failed: ${error}`)
    }

    const data = await response.json()

    const tokenSavings = data.original_tokens - data.compressed_tokens
    // Approximate cost savings based on GPT-4 pricing ($0.03/1K tokens)
    const estimatedCostSavings = (tokenSavings / 1000) * 0.03

    return {
      original: text,
      compressed: data.compressed_text,
      originalTokens: data.original_tokens,
      compressedTokens: data.compressed_tokens,
      ratio: data.compression_ratio,
      savings: {
        tokens: tokenSavings,
        percentage: Math.round((tokenSavings / data.original_tokens) * 100),
        estimatedCost: estimatedCostSavings,
      },
    }
  },

  async compressBatch(
    texts: string[],
    options: CompressionOptions = {}
  ): Promise<CompressionResult[]> {
    const response = await fetch(`${LLMLINGUA_API_URL}/compress/batch`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        texts,
        target_ratio: options.targetRatio || 0.5,
        max_tokens: options.maxTokens,
        preserve_important: options.preserveImportant ?? true,
        model: options.model || 'balanced',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Batch compression failed: ${error}`)
    }

    const data = await response.json()

    return data.results.map((result: {
      original_text: string
      compressed_text: string
      original_tokens: number
      compressed_tokens: number
      compression_ratio: number
    }, index: number) => {
      const tokenSavings = result.original_tokens - result.compressed_tokens
      return {
        original: texts[index],
        compressed: result.compressed_text,
        originalTokens: result.original_tokens,
        compressedTokens: result.compressed_tokens,
        ratio: result.compression_ratio,
        savings: {
          tokens: tokenSavings,
          percentage: Math.round((tokenSavings / result.original_tokens) * 100),
          estimatedCost: (tokenSavings / 1000) * 0.03,
        },
      }
    })
  },

  async optimizePrompt(
    prompt: string,
    options: {
      targetModel?: string
      maxTokens?: number
      preserveInstructions?: boolean
    } = {}
  ): Promise<PromptOptimizationResult> {
    const response = await fetch(`${LLMLINGUA_API_URL}/optimize-prompt`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        prompt,
        target_model: options.targetModel || 'gpt-4',
        max_tokens: options.maxTokens,
        preserve_instructions: options.preserveInstructions ?? true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Prompt optimization failed: ${error}`)
    }

    const data = await response.json()

    return {
      optimizedPrompt: data.optimized_prompt,
      originalTokens: data.original_tokens,
      optimizedTokens: data.optimized_tokens,
      savings: data.original_tokens - data.optimized_tokens,
      suggestions: data.suggestions || [],
    }
  },

  async extractKeyPoints(text: string): Promise<{
    keyPoints: string[]
    summary: string
    originalTokens: number
    summaryTokens: number
  }> {
    const response = await fetch(`${LLMLINGUA_API_URL}/extract-key-points`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Key point extraction failed: ${error}`)
    }

    const data = await response.json()

    return {
      keyPoints: data.key_points,
      summary: data.summary,
      originalTokens: data.original_tokens,
      summaryTokens: data.summary_tokens,
    }
  },

  async calculateTokens(text: string, model = 'gpt-4'): Promise<{
    tokens: number
    characters: number
    words: number
    estimatedCost: number
  }> {
    const response = await fetch(`${LLMLINGUA_API_URL}/count-tokens`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text, model }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token calculation failed: ${error}`)
    }

    const data = await response.json()

    // Cost estimates based on model
    const costPerToken: Record<string, number> = {
      'gpt-4': 0.00003,
      'gpt-3.5-turbo': 0.000002,
      'claude-3-opus': 0.000015,
      'claude-3-sonnet': 0.000003,
    }

    return {
      tokens: data.tokens,
      characters: data.characters,
      words: data.words,
      estimatedCost: data.tokens * (costPerToken[model] || 0.00003),
    }
  },

  async analyzeRedundancy(text: string): Promise<{
    redundancyScore: number
    redundantPhrases: Array<{
      phrase: string
      count: number
      suggestion: string
    }>
    recommendations: string[]
  }> {
    const response = await fetch(`${LLMLINGUA_API_URL}/analyze-redundancy`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Redundancy analysis failed: ${error}`)
    }

    return response.json()
  },

  // Local fallback methods when API is not available
  localEstimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  },

  localSimpleCompress(text: string, targetRatio = 0.7): CompressionResult {
    const words = text.split(/\s+/)
    const targetWordCount = Math.floor(words.length * targetRatio)
    const compressed = words.slice(0, targetWordCount).join(' ')

    const originalTokens = this.localEstimateTokens(text)
    const compressedTokens = this.localEstimateTokens(compressed)

    return {
      original: text,
      compressed,
      originalTokens,
      compressedTokens,
      ratio: targetRatio,
      savings: {
        tokens: originalTokens - compressedTokens,
        percentage: Math.round((1 - targetRatio) * 100),
        estimatedCost: ((originalTokens - compressedTokens) / 1000) * 0.03,
      },
    }
  },
}

export default llmlinguaClient
