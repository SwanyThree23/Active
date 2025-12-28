// User Types
export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR'
export type UserTier = 'free' | 'pro' | 'enterprise'

export interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  role: UserRole
  tier: UserTier
  emailVerified: Date | null
  twoFactorEnabled: boolean
  preferences: UserPreferences
  createdAt: Date
  updatedAt: Date
  lastLogin: Date | null
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  notifications?: boolean
  defaultVoice?: string
  defaultAvatar?: string
  language?: string
}

// Content Types
export type ContentStatus = 'draft' | 'processing' | 'completed' | 'failed'
export type ContentType = 'video' | 'audio' | 'text' | 'newsletter' | 'social'

export interface Content {
  id: string
  userId: string
  type: ContentType
  title: string
  description?: string
  script?: string
  avatar?: string
  voice?: string
  workflow?: WorkflowConfig
  integrations: string[]
  duration?: number
  tokensSaved: number
  outputUrl?: string
  thumbnailUrl?: string
  status: ContentStatus
  metadata: ContentMetadata
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export interface ContentMetadata {
  originalTokens?: number
  compressedTokens?: number
  compressionRatio?: number
  voiceId?: string
  avatarId?: string
  quality?: 'low' | 'medium' | 'high'
}

// Workflow Types
export interface WorkflowConfig {
  steps: WorkflowStep[]
  triggers?: WorkflowTrigger[]
}

export interface WorkflowStep {
  id: string
  type: string
  service: string
  config: Record<string, unknown>
  dependencies?: string[]
}

export interface WorkflowTrigger {
  type: 'schedule' | 'webhook' | 'manual'
  config: Record<string, unknown>
}

// Template Types
export interface Template {
  id: string
  userId?: string
  name: string
  description?: string
  category: string
  type: ContentType
  config: TemplateConfig
  thumbnail?: string
  isPublic: boolean
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

export interface TemplateConfig {
  script?: string
  voice?: string
  avatar?: string
  style?: Record<string, unknown>
  variables?: TemplateVariable[]
}

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'select' | 'boolean'
  label: string
  defaultValue?: unknown
  options?: string[]
}

// Newsletter Types
export interface Newsletter {
  id: string
  userId: string
  title: string
  subject: string
  content: string
  beehiivId?: string
  status: 'draft' | 'scheduled' | 'sent' | 'failed'
  scheduledAt?: Date
  sentAt?: Date
  opens: number
  clicks: number
  subscribers: number
  createdAt: Date
  updatedAt: Date
}

// API Types
export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description?: string
  hits: number
  avgLatency: number
  status: 'healthy' | 'degraded' | 'down'
  lastHit?: Date
}

export interface ApiUsage {
  id: string
  userId: string
  service: string
  endpoint: string
  tokens: number
  cost: number
  latency: number
  status: string
  createdAt: Date
}

// Integration Types
export interface IntegrationConfig {
  name: string
  enabled: boolean
  apiKey?: string
  settings: Record<string, unknown>
}

export interface ClaudeRequest {
  prompt: string
  maxTokens?: number
  temperature?: number
  model?: string
  systemPrompt?: string
}

export interface ClaudeResponse {
  content: string
  tokens: {
    input: number
    output: number
  }
  model: string
}

export interface ElevenLabsVoice {
  id: string
  name: string
  category: string
  labels: Record<string, string>
  previewUrl?: string
}

export interface HeyGenAvatar {
  id: string
  name: string
  thumbnail: string
  type: 'realistic' | 'animated'
  gender?: string
}

export interface HeyGenVideoRequest {
  avatarId: string
  script: string
  voiceId?: string
  background?: string
  quality?: 'low' | 'medium' | 'high'
}

// Metrics Types
export interface SystemMetrics {
  timestamp: Date
  activeUsers: number
  totalRequests: number
  avgResponseTime: number
  errorRate: number
  cpuUsage: number
  memoryUsage: number
}

export interface DashboardMetrics {
  users: {
    total: number
    active: number
    new: number
  }
  content: {
    total: number
    thisWeek: number
    byType: Record<ContentType, number>
  }
  api: {
    totalCalls: number
    avgLatency: number
    errorRate: number
    byService: Record<string, number>
  }
  newsletter: {
    subscribers: number
    avgOpenRate: number
    avgClickRate: number
  }
}

// Product Hunt Types
export interface ProductHuntLaunch {
  id: string
  name: string
  tagline: string
  status: 'preparing' | 'launched' | 'completed'
  launchDate?: Date
  upvotes: number
  comments: number
  ranking?: number
  checklist: LaunchChecklistItem[]
}

export interface LaunchChecklistItem {
  id: string
  title: string
  description: string
  completed: boolean
  phase: 'pre-launch' | 'launch-day' | 'post-launch'
}

// Team Types
export interface Team {
  id: string
  name: string
  slug: string
  image?: string
  members: TeamMember[]
  createdAt: Date
  updatedAt: Date
}

export interface TeamMember {
  id: string
  userId: string
  teamId: string
  role: 'owner' | 'admin' | 'member'
  user?: User
  createdAt: Date
}

// Auth Types
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  tier: UserTier
  iat: number
  exp: number
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
