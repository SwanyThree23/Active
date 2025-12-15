import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import { rateLimit } from 'express-rate-limit'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import { errorHandler } from './middleware/errorHandler.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

const PORT = process.env.PORT || 4000

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(limiter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  socket.on('join-stream', (streamId: string) => {
    socket.join(`stream:${streamId}`)
    console.log(`${socket.id} joined stream:${streamId}`)
  })

  socket.on('leave-stream', (streamId: string) => {
    socket.leave(`stream:${streamId}`)
    console.log(`${socket.id} left stream:${streamId}`)
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })
})

// Error handling
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

httpServer.listen(PORT, () => {
  console.log(`🚀 SwanyBot Pro API running on http://localhost:${PORT}`)
  console.log(`📡 WebSocket server ready`)
})

export { io }
