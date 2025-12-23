/**
 * SwanyBot Pro API Service Layer
 * Handles all external API communications including:
 * - Anthropic Claude API
 * - OpenRouter Multi-Model API
 * - ElevenLabs Voice Cloning
 * - LLM Lingua Prompt Compression
 * - MCP Server (n8n) Integration
 */

// ============================================================================
// API ENDPOINTS CONFIGURATION
// ============================================================================

export const API_ENDPOINTS = {
  anthropic: 'https://api.anthropic.com/v1/messages',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  elevenlabs: {
    tts: 'https://api.elevenlabs.io/v1/text-to-speech',
    voices: 'https://api.elevenlabs.io/v1/voices',
    clone: 'https://api.elevenlabs.io/v1/voices/add',
    history: 'https://api.elevenlabs.io/v1/history'
  },
  mcp: {
    n8n: 'https://techmunity.app.n8n.cloud/mcp-server/http'
  }
};

// ============================================================================
// OPENROUTER MODELS CONFIGURATION
// ============================================================================

export const OPENROUTER_MODELS = {
  // Anthropic Models
  'claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Best balance of intelligence and speed',
    costPer1kTokens: { input: 0.003, output: 0.015 },
    contextWindow: 200000,
    capabilities: ['text', 'vision', 'code', 'analysis']
  },
  'claude-3-opus': {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Most capable Claude model',
    costPer1kTokens: { input: 0.015, output: 0.075 },
    contextWindow: 200000,
    capabilities: ['text', 'vision', 'code', 'analysis', 'creative']
  },
  // OpenAI Models
  'gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Latest GPT-4 with vision',
    costPer1kTokens: { input: 0.005, output: 0.015 },
    contextWindow: 128000,
    capabilities: ['text', 'vision', 'code', 'analysis']
  },
  'gpt-4-turbo': {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    description: 'Fast GPT-4 variant',
    costPer1kTokens: { input: 0.01, output: 0.03 },
    contextWindow: 128000,
    capabilities: ['text', 'vision', 'code']
  },
  // Google Models
  'gemini-pro': {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    description: 'Google\'s advanced model',
    costPer1kTokens: { input: 0.00125, output: 0.005 },
    contextWindow: 1000000,
    capabilities: ['text', 'vision', 'code', 'analysis']
  },
  // Meta Models
  'llama-3.1-70b': {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    provider: 'Meta',
    description: 'Open source powerhouse',
    costPer1kTokens: { input: 0.0008, output: 0.0008 },
    contextWindow: 131072,
    capabilities: ['text', 'code', 'analysis']
  },
  // Mistral Models
  'mixtral-8x22b': {
    id: 'mistralai/mixtral-8x22b-instruct',
    name: 'Mixtral 8x22B',
    provider: 'Mistral',
    description: 'High-performance MoE model',
    costPer1kTokens: { input: 0.0009, output: 0.0009 },
    contextWindow: 65536,
    capabilities: ['text', 'code']
  }
};

// ============================================================================
// ELEVENLABS VOICE CONFIGURATIONS
// ============================================================================

export const ELEVENLABS_VOICES = {
  rachel: { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', accent: 'American' },
  adam: { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', accent: 'American' },
  josh: { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', accent: 'American' },
  bella: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', accent: 'American' },
  elli: { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', accent: 'American' },
  arnold: { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', accent: 'American' }
};

// ============================================================================
// ANTHROPIC API SERVICE
// ============================================================================

export const anthropicService = {
  /**
   * Send a message to Claude API
   */
  async sendMessage(apiKey, messages, options = {}) {
    const {
      model = 'claude-sonnet-4-20250514',
      maxTokens = 4096,
      temperature = 0.7,
      systemPrompt = ''
    } = options;

    try {
      const response = await fetch(API_ENDPOINTS.anthropic, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      const data = await response.json();
      return {
        success: true,
        content: data.content?.[0]?.text || '',
        usage: data.usage,
        model: data.model
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Stream a message from Claude API
   */
  async streamMessage(apiKey, messages, onChunk, options = {}) {
    const {
      model = 'claude-sonnet-4-20250514',
      maxTokens = 4096,
      systemPrompt = ''
    } = options;

    try {
      const response = await fetch(API_ENDPOINTS.anthropic, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          stream: true,
          system: systemPrompt,
          messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }]
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content_block_delta') {
                const text = data.delta?.text || '';
                fullContent += text;
                onChunk(text, fullContent);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      return { success: true, content: fullContent };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// ============================================================================
// OPENROUTER API SERVICE
// ============================================================================

export const openRouterService = {
  /**
   * Send a message through OpenRouter to any supported model
   */
  async sendMessage(apiKey, modelId, messages, options = {}) {
    const {
      maxTokens = 4096,
      temperature = 0.7,
      topP = 1,
      frequencyPenalty = 0,
      presencePenalty = 0
    } = options;

    try {
      const response = await fetch(API_ENDPOINTS.openrouter, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'SwanyBot Pro'
        },
        body: JSON.stringify({
          model: modelId,
          messages: Array.isArray(messages)
            ? messages
            : [{ role: 'user', content: messages }],
          max_tokens: maxTokens,
          temperature,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenRouter request failed');
      }

      const data = await response.json();
      return {
        success: true,
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage,
        model: data.model
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get available models from OpenRouter
   */
  async getModels(apiKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const data = await response.json();
      return { success: true, models: data.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get usage statistics
   */
  async getUsage(apiKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const data = await response.json();
      return { success: true, usage: data.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// ============================================================================
// ELEVENLABS VOICE SERVICE
// ============================================================================

export const elevenLabsService = {
  /**
   * Convert text to speech using ElevenLabs
   */
  async textToSpeech(apiKey, text, voiceId, options = {}) {
    const {
      modelId = 'eleven_monolingual_v1',
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0,
      useSpeakerBoost = true
    } = options;

    try {
      const response = await fetch(`${API_ENDPOINTS.elevenlabs.tts}/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: useSpeakerBoost
          }
        })
      });

      if (!response.ok) {
        throw new Error('Text-to-speech conversion failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      return { success: true, audioUrl, blob: audioBlob };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all available voices
   */
  async getVoices(apiKey) {
    try {
      const response = await fetch(API_ENDPOINTS.elevenlabs.voices, {
        headers: { 'xi-api-key': apiKey }
      });
      const data = await response.json();
      return { success: true, voices: data.voices };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Clone a voice from audio samples
   */
  async cloneVoice(apiKey, name, files, description = '') {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      files.forEach(file => formData.append('files', file));

      const response = await fetch(API_ENDPOINTS.elevenlabs.clone, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Voice cloning failed');
      }

      const data = await response.json();
      return { success: true, voiceId: data.voice_id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get voice history/usage
   */
  async getHistory(apiKey) {
    try {
      const response = await fetch(API_ENDPOINTS.elevenlabs.history, {
        headers: { 'xi-api-key': apiKey }
      });
      const data = await response.json();
      return { success: true, history: data.history };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// ============================================================================
// LLM LINGUA - PROMPT COMPRESSION SERVICE
// ============================================================================

export const llmLinguaService = {
  /**
   * Compress a prompt to reduce token usage
   * Uses extractive compression techniques
   */
  compressPrompt(text, options = {}) {
    const {
      compressionRatio = 0.5,
      preserveKeywords = [],
      preserveStructure = true
    } = options;

    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    // Calculate importance scores for each sentence
    const scoredSentences = sentences.map((sentence, index) => {
      let score = 0;

      // Position scoring (first and last sentences are more important)
      if (index === 0) score += 3;
      if (index === sentences.length - 1) score += 2;

      // Keyword preservation
      preserveKeywords.forEach(keyword => {
        if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
          score += 5;
        }
      });

      // Length scoring (moderate length sentences often contain key info)
      const wordCount = sentence.split(/\s+/).length;
      if (wordCount >= 5 && wordCount <= 25) score += 1;

      // Important indicator words
      const importantWords = ['important', 'key', 'must', 'critical', 'essential', 'required', 'note'];
      importantWords.forEach(word => {
        if (sentence.toLowerCase().includes(word)) score += 2;
      });

      return { sentence: sentence.trim(), score, index };
    });

    // Sort by score and select top sentences
    const targetCount = Math.max(1, Math.ceil(sentences.length * compressionRatio));
    const selected = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCount);

    // Reorder by original position if preserving structure
    if (preserveStructure) {
      selected.sort((a, b) => a.index - b.index);
    }

    const compressed = selected.map(s => s.sentence).join(' ');

    return {
      original: text,
      compressed,
      originalTokens: Math.ceil(text.length / 4),
      compressedTokens: Math.ceil(compressed.length / 4),
      compressionAchieved: 1 - (compressed.length / text.length),
      sentencesKept: selected.length,
      totalSentences: sentences.length
    };
  },

  /**
   * Smart truncation that preserves meaning
   */
  smartTruncate(text, maxTokens = 1000) {
    const estimatedTokens = Math.ceil(text.length / 4);

    if (estimatedTokens <= maxTokens) {
      return { text, truncated: false };
    }

    const maxChars = maxTokens * 4;
    const truncated = text.slice(0, maxChars);

    // Find last complete sentence
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );

    const cleanTruncated = lastSentenceEnd > maxChars * 0.5
      ? truncated.slice(0, lastSentenceEnd + 1)
      : truncated + '...';

    return { text: cleanTruncated, truncated: true, originalLength: text.length };
  },

  /**
   * Extract key points from text
   */
  extractKeyPoints(text, maxPoints = 5) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    const keyIndicators = [
      /\b(key|important|main|critical|essential|primary)\b/i,
      /\b(must|should|need to|required)\b/i,
      /\b(first|second|third|finally|lastly)\b/i,
      /\b(therefore|thus|hence|consequently)\b/i
    ];

    const keyPoints = sentences
      .filter(sentence => keyIndicators.some(regex => regex.test(sentence)))
      .slice(0, maxPoints)
      .map(s => s.trim());

    // If not enough key points found, take first sentences
    if (keyPoints.length < maxPoints) {
      const additional = sentences
        .filter(s => !keyPoints.includes(s.trim()))
        .slice(0, maxPoints - keyPoints.length)
        .map(s => s.trim());
      keyPoints.push(...additional);
    }

    return keyPoints;
  }
};

// ============================================================================
// MCP SERVER SERVICE (n8n Integration)
// ============================================================================

export const mcpService = {
  /**
   * Execute an n8n workflow via MCP server
   */
  async executeWorkflow(workflowId, payload = {}, options = {}) {
    const { timeout = 30000 } = options;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${API_ENDPOINTS.mcp.n8n}/workflow/${workflowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Workflow execution failed: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Workflow timeout' };
      }
      return { success: false, error: error.message };
    }
  },

  /**
   * Send a tool call to MCP server
   */
  async callTool(toolName, params = {}) {
    try {
      const response = await fetch(`${API_ENDPOINTS.mcp.n8n}/tools/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`Tool call failed: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, result: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get available MCP tools
   */
  async getTools() {
    try {
      const response = await fetch(`${API_ENDPOINTS.mcp.n8n}/tools`);
      const data = await response.json();
      return { success: true, tools: data.tools || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Health check for MCP server
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_ENDPOINTS.mcp.n8n}/health`);
      return { success: response.ok };
    } catch (error) {
      return { success: false };
    }
  }
};

// ============================================================================
// IMAGE OPTIMIZATION SERVICE
// ============================================================================

export const imageService = {
  /**
   * Compress and optimize an image
   */
  async optimizeImage(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.85,
      format = 'webp'
    } = options;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions
          let { width, height } = img;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              resolve({
                success: true,
                blob,
                url: URL.createObjectURL(blob),
                originalSize: file.size,
                optimizedSize: blob.size,
                compressionRatio: 1 - (blob.size / file.size),
                dimensions: { width, height }
              });
            },
            `image/${format}`,
            quality
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * Generate image variants for different platforms
   */
  async generateVariants(file) {
    const variants = {
      thumbnail: { maxWidth: 150, maxHeight: 150, quality: 0.8 },
      preview: { maxWidth: 400, maxHeight: 400, quality: 0.85 },
      standard: { maxWidth: 800, maxHeight: 800, quality: 0.9 },
      hd: { maxWidth: 1920, maxHeight: 1080, quality: 0.95 }
    };

    const results = {};
    for (const [name, opts] of Object.entries(variants)) {
      results[name] = await this.optimizeImage(file, opts);
    }
    return results;
  },

  /**
   * Extract dominant colors from image
   */
  async extractColors(imageUrl, colorCount = 5) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = ctx.getImageData(0, 0, 50, 50).data;
        const colorMap = {};

        for (let i = 0; i < imageData.length; i += 4) {
          const r = Math.round(imageData[i] / 32) * 32;
          const g = Math.round(imageData[i + 1] / 32) * 32;
          const b = Math.round(imageData[i + 2] / 32) * 32;
          const key = `${r},${g},${b}`;
          colorMap[key] = (colorMap[key] || 0) + 1;
        }

        const colors = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, colorCount)
          .map(([color]) => {
            const [r, g, b] = color.split(',').map(Number);
            return {
              rgb: { r, g, b },
              hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
            };
          });

        resolve({ success: true, colors });
      };
      img.onerror = () => resolve({ success: false, error: 'Failed to load image' });
      img.src = imageUrl;
    });
  }
};

export default {
  anthropicService,
  openRouterService,
  elevenLabsService,
  llmLinguaService,
  mcpService,
  imageService,
  OPENROUTER_MODELS,
  ELEVENLABS_VOICES
};
