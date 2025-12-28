import mongoose from 'mongoose'

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnection: typeof mongoose | undefined
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_content_studio'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

async function connectMongoDB(): Promise<typeof mongoose> {
  if (globalThis.mongooseConnection) {
    return globalThis.mongooseConnection
  }

  try {
    const connection = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })

    console.log('MongoDB connected')

    if (process.env.NODE_ENV !== 'production') {
      globalThis.mongooseConnection = connection
    }

    return connection
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw error
  }
}

// Schemas for MongoDB collections (used for logs, analytics, etc.)

const analyticsEventSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  event: { type: String, required: true, index: true },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
  sessionId: String,
  userAgent: String,
  ip: String,
})

const apiLogSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  method: { type: String, required: true },
  path: { type: String, required: true, index: true },
  statusCode: { type: Number, required: true },
  latency: { type: Number, required: true },
  requestBody: mongoose.Schema.Types.Mixed,
  responseBody: mongoose.Schema.Types.Mixed,
  error: String,
  timestamp: { type: Date, default: Date.now, index: true },
  ip: String,
  userAgent: String,
})

const contentGenerationLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  contentId: { type: String, required: true, index: true },
  service: { type: String, required: true, index: true },
  input: mongoose.Schema.Types.Mixed,
  output: mongoose.Schema.Types.Mixed,
  tokensUsed: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  latency: { type: Number, default: 0 },
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  error: String,
  timestamp: { type: Date, default: Date.now, index: true },
})

const metricsSnapshotSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  type: { type: String, required: true, index: true },
  metrics: { type: mongoose.Schema.Types.Mixed, required: true },
  period: { type: String, enum: ['minute', 'hour', 'day'], default: 'minute' },
})

// Models
export const AnalyticsEvent = mongoose.models.AnalyticsEvent ||
  mongoose.model('AnalyticsEvent', analyticsEventSchema)

export const ApiLog = mongoose.models.ApiLog ||
  mongoose.model('ApiLog', apiLogSchema)

export const ContentGenerationLog = mongoose.models.ContentGenerationLog ||
  mongoose.model('ContentGenerationLog', contentGenerationLogSchema)

export const MetricsSnapshot = mongoose.models.MetricsSnapshot ||
  mongoose.model('MetricsSnapshot', metricsSnapshotSchema)

export { connectMongoDB }
export default mongoose
