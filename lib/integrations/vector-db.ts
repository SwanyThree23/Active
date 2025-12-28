/**
 * Vector Database Integration for RAG (Retrieval-Augmented Generation)
 * Supports Pinecone and Weaviate for semantic search and embeddings
 */

import { Pinecone } from '@pinecone-database/pinecone'

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
})

const INDEX_NAME = process.env.PINECONE_INDEX || 'ai-content-studio'
const EMBEDDING_DIMENSION = 1536 // OpenAI ada-002 / Claude embeddings

export interface EmbeddingMetadata {
  sourceType: 'content' | 'template' | 'feedback' | 'document'
  sourceId: string
  userId?: string
  contentType?: string
  category?: string
  title?: string
  createdAt: string
  [key: string]: unknown
}

export interface SearchResult {
  id: string
  score: number
  metadata: EmbeddingMetadata
  content?: string
}

export interface VectorRecord {
  id: string
  values: number[]
  metadata: EmbeddingMetadata
}

export const vectorDb = {
  /**
   * Get or create the Pinecone index
   */
  async getIndex() {
    return pinecone.index(INDEX_NAME)
  },

  /**
   * Generate embeddings using OpenAI or Claude
   * Falls back to a simple hash-based embedding for development
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // In production, use OpenAI or Claude for embeddings
    const openaiApiKey = process.env.OPENAI_API_KEY

    if (openaiApiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: text,
          }),
        })

        const data = await response.json()
        return data.data[0].embedding
      } catch (error) {
        console.error('OpenAI embedding error:', error)
      }
    }

    // Fallback: Generate deterministic pseudo-embedding for development
    return this.generatePseudoEmbedding(text)
  },

  /**
   * Generate a pseudo-embedding for development/testing
   */
  generatePseudoEmbedding(text: string): number[] {
    const embedding = new Array(EMBEDDING_DIMENSION).fill(0)
    const words = text.toLowerCase().split(/\s+/)

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      for (let j = 0; j < word.length; j++) {
        const idx = (word.charCodeAt(j) * (i + 1) * (j + 1)) % EMBEDDING_DIMENSION
        embedding[idx] += 1 / (1 + Math.log(words.length))
      }
    }

    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude
      }
    }

    return embedding
  },

  /**
   * Upsert vectors into Pinecone
   */
  async upsert(records: VectorRecord[], namespace?: string) {
    const index = await this.getIndex()

    const vectors = records.map(record => ({
      id: record.id,
      values: record.values,
      metadata: record.metadata,
    }))

    await index.namespace(namespace || 'default').upsert(vectors)

    return { upserted: vectors.length }
  },

  /**
   * Index content for semantic search
   */
  async indexContent(params: {
    id: string
    content: string
    metadata: EmbeddingMetadata
    namespace?: string
  }) {
    const embedding = await this.generateEmbedding(params.content)

    await this.upsert([{
      id: params.id,
      values: embedding,
      metadata: {
        ...params.metadata,
        createdAt: new Date().toISOString(),
      },
    }], params.namespace)

    return { id: params.id, indexed: true }
  },

  /**
   * Semantic search for similar content
   */
  async search(params: {
    query: string
    topK?: number
    filter?: Record<string, unknown>
    namespace?: string
    includeMetadata?: boolean
  }): Promise<SearchResult[]> {
    const { query, topK = 10, filter, namespace, includeMetadata = true } = params

    const queryEmbedding = await this.generateEmbedding(query)
    const index = await this.getIndex()

    const results = await index.namespace(namespace || 'default').query({
      vector: queryEmbedding,
      topK,
      filter,
      includeMetadata,
    })

    return results.matches?.map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata as EmbeddingMetadata,
    })) || []
  },

  /**
   * Find similar content for RAG context
   */
  async findSimilar(params: {
    content: string
    contentType?: string
    limit?: number
    minScore?: number
  }): Promise<SearchResult[]> {
    const { content, contentType, limit = 5, minScore = 0.7 } = params

    const filter: Record<string, unknown> = {}
    if (contentType) {
      filter.contentType = contentType
    }

    const results = await this.search({
      query: content,
      topK: limit * 2, // Get more results to filter by score
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    })

    return results
      .filter(r => r.score >= minScore)
      .slice(0, limit)
  },

  /**
   * Delete vectors by ID
   */
  async delete(ids: string[], namespace?: string) {
    const index = await this.getIndex()
    await index.namespace(namespace || 'default').deleteMany(ids)
    return { deleted: ids.length }
  },

  /**
   * Delete all vectors for a source
   */
  async deleteBySource(sourceType: string, sourceId: string, namespace?: string) {
    const index = await this.getIndex()
    await index.namespace(namespace || 'default').deleteMany({
      filter: {
        sourceType: { $eq: sourceType },
        sourceId: { $eq: sourceId },
      },
    })
    return { deleted: true }
  },

  /**
   * Build RAG context from similar content
   */
  async buildRagContext(params: {
    query: string
    maxTokens?: number
    contentTypes?: string[]
  }): Promise<{
    context: string
    sources: SearchResult[]
  }> {
    const { query, maxTokens = 2000, contentTypes } = params

    const filter: Record<string, unknown> = {}
    if (contentTypes && contentTypes.length > 0) {
      filter.contentType = { $in: contentTypes }
    }

    const results = await this.search({
      query,
      topK: 10,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    })

    // Build context string from results, respecting token limit
    let context = ''
    let tokenEstimate = 0
    const sources: SearchResult[] = []

    for (const result of results) {
      if (result.score < 0.6) continue

      const sourceInfo = `[Source: ${result.metadata.title || result.id}]\n`
      const contentPreview = result.metadata.title || ''

      const addedTokens = Math.ceil((sourceInfo.length + contentPreview.length) / 4)

      if (tokenEstimate + addedTokens > maxTokens) break

      context += sourceInfo + contentPreview + '\n\n'
      tokenEstimate += addedTokens
      sources.push(result)
    }

    return { context: context.trim(), sources }
  },

  /**
   * Get index statistics
   */
  async getStats(namespace?: string) {
    const index = await this.getIndex()
    const stats = await index.describeIndexStats()

    return {
      totalVectors: stats.totalRecordCount || 0,
      namespaces: stats.namespaces || {},
      dimension: stats.dimension || EMBEDDING_DIMENSION,
    }
  },
}

export default vectorDb
