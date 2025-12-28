import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import dotenv from 'dotenv'

import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import { rateLimiter } from './middleware/rateLimiter'

import authRoutes from './routes/auth'
import contentRoutes from './routes/content'
import claudeRoutes from './routes/claude'
import elevenLabsRoutes from './routes/elevenlabs'
import heygenRoutes from './routes/heygen'
import templateRoutes from './routes/templates'
import newsletterRoutes from './routes/newsletter'
import analyticsRoutes from './routes/analytics'
import webhookRoutes from './routes/webhooks'
import adminRoutes from './routes/admin'
import feedbackRoutes from './routes/feedback'
import { setupWebSocket } from './services/websocket'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development
}))
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(requestLogger)
app.use(rateLimiter)

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// API Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/content', contentRoutes)
app.use('/api/v1/claude', claudeRoutes)
app.use('/api/v1/elevenlabs', elevenLabsRoutes)
app.use('/api/v1/heygen', heygenRoutes)
app.use('/api/v1/templates', templateRoutes)
app.use('/api/v1/newsletter', newsletterRoutes)
app.use('/api/v1/analytics', analyticsRoutes)
app.use('/api/v1/webhooks', webhookRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/feedback', feedbackRoutes)

// WebSocket setup
setupWebSocket(io)

// Error handling
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  })
})

const PORT = process.env.PORT || 4000

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

export { app, io }
