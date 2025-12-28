import { Server as SocketIOServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/db/prisma'
import type { JWTPayload } from '../../types'

interface AuthenticatedSocket extends Socket {
  userId?: string
}

export function setupWebSocket(io: SocketIOServer) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        return next(new Error('Authentication required'))
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret'
      ) as JWTPayload

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true },
      })

      if (!user) {
        return next(new Error('User not found'))
      }

      socket.userId = user.id
      next()
    } catch (error) {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`)

    // Join user's private room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`)
    }

    // Subscribe to content updates
    socket.on('subscribe:content', (contentId: string) => {
      socket.join(`content:${contentId}`)
      console.log(`User ${socket.userId} subscribed to content ${contentId}`)
    })

    socket.on('unsubscribe:content', (contentId: string) => {
      socket.leave(`content:${contentId}`)
    })

    // Subscribe to metrics updates (admin only)
    socket.on('subscribe:metrics', async () => {
      // Verify admin role
      const user = await prisma.user.findUnique({
        where: { id: socket.userId },
        select: { role: true },
      })

      if (user?.role === 'ADMIN') {
        socket.join('metrics')
        console.log(`Admin ${socket.userId} subscribed to metrics`)
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`)
    })
  })

  // Set up periodic metrics broadcast
  setInterval(async () => {
    try {
      const metrics = await getSystemMetrics()
      io.to('metrics').emit('metrics:update', metrics)
    } catch (error) {
      console.error('Error broadcasting metrics:', error)
    }
  }, 5000) // Every 5 seconds

  return {
    // Emit content status update
    emitContentUpdate: (contentId: string, data: object) => {
      io.to(`content:${contentId}`).emit('content:update', data)
    },

    // Emit to specific user
    emitToUser: (userId: string, event: string, data: object) => {
      io.to(`user:${userId}`).emit(event, data)
    },

    // Broadcast metrics
    emitMetrics: (metrics: object) => {
      io.to('metrics').emit('metrics:update', metrics)
    },

    // Emit notification
    emitNotification: (userId: string, notification: object) => {
      io.to(`user:${userId}`).emit('notification', notification)
    },
  }
}

async function getSystemMetrics() {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const [activeUsers, recentRequests, recentErrors] = await Promise.all([
    prisma.user.count({
      where: {
        lastLogin: { gte: new Date(now.getTime() - 15 * 60 * 1000) },
      },
    }),

    prisma.apiUsage.count({
      where: { createdAt: { gte: oneHourAgo } },
    }),

    prisma.apiUsage.count({
      where: {
        createdAt: { gte: oneHourAgo },
        status: { not: 'success' },
      },
    }),
  ])

  const errorRate = recentRequests > 0 ? (recentErrors / recentRequests) * 100 : 0

  return {
    timestamp: now.toISOString(),
    activeUsers,
    requestsLastHour: recentRequests,
    errorRate: Math.round(errorRate * 100) / 100,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  }
}

// Export singleton for use in routes
let wsInstance: ReturnType<typeof setupWebSocket> | null = null

export function getWebSocketInstance() {
  return wsInstance
}

export function setWebSocketInstance(instance: ReturnType<typeof setupWebSocket>) {
  wsInstance = instance
}
