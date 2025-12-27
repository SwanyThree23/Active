import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma, redis } from './index';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

interface JWTPayload {
  userId: string;
  email: string;
  username: string;
}

export function setupSocketIO(io: SocketIOServer): void {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JWTPayload;
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.username} (${socket.id})`);

    // Join stream room
    socket.on('join-stream', async (streamId: string) => {
      socket.join(`stream:${streamId}`);
      console.log(`User ${socket.username} joined stream ${streamId}`);

      // Update viewer count in Redis
      await redis.hincrby(`stream:${streamId}:viewers`, 'count', 1);
      const viewerCount = await redis.hget(`stream:${streamId}:viewers`, 'count');

      // Broadcast updated viewer count
      io.to(`stream:${streamId}`).emit('viewer-count', {
        streamId,
        count: parseInt(viewerCount || '0'),
      });
    });

    // Leave stream room
    socket.on('leave-stream', async (streamId: string) => {
      socket.leave(`stream:${streamId}`);
      console.log(`User ${socket.username} left stream ${streamId}`);

      // Update viewer count in Redis
      await redis.hincrby(`stream:${streamId}:viewers`, 'count', -1);
      const viewerCount = await redis.hget(`stream:${streamId}:viewers`, 'count');
      const count = Math.max(0, parseInt(viewerCount || '0'));

      // Update Redis with corrected count
      await redis.hset(`stream:${streamId}:viewers`, 'count', count.toString());

      // Broadcast updated viewer count
      io.to(`stream:${streamId}`).emit('viewer-count', {
        streamId,
        count,
      });
    });

    // Chat message
    socket.on('chat-message', async (data: { streamId: string; message: string }) => {
      const { streamId, message } = data;

      // Rate limiting check
      const rateLimitKey = `ratelimit:chat:${socket.userId}`;
      const messageCount = await redis.incr(rateLimitKey);

      if (messageCount === 1) {
        await redis.expire(rateLimitKey, 10); // 10 second window
      }

      if (messageCount > 5) {
        socket.emit('error', { message: 'Rate limit exceeded. Please wait before sending more messages.' });
        return;
      }

      try {
        // Save message to database
        const chatMessage = await prisma.chatMessage.create({
          data: {
            streamId,
            userId: socket.userId!,
            message,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        });

        // Broadcast message to stream room
        io.to(`stream:${streamId}`).emit('new-message', {
          id: chatMessage.id,
          message: chatMessage.message,
          createdAt: chatMessage.createdAt,
          user: chatMessage.user,
        });

        // Update chat count in stream analytics (in background)
        updateChatCount(streamId).catch(console.error);
      } catch (error) {
        console.error('Error saving chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing-start', (streamId: string) => {
      socket.to(`stream:${streamId}`).emit('user-typing', {
        userId: socket.userId,
        username: socket.username,
      });
    });

    socket.on('typing-stop', (streamId: string) => {
      socket.to(`stream:${streamId}`).emit('user-stopped-typing', {
        userId: socket.userId,
      });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.username} (${socket.id})`);

      // Clean up viewer counts for all rooms the user was in
      const rooms = Array.from(socket.rooms);
      for (const room of rooms) {
        if (room.startsWith('stream:')) {
          const streamId = room.replace('stream:', '');
          await redis.hincrby(`stream:${streamId}:viewers`, 'count', -1);
          const viewerCount = await redis.hget(`stream:${streamId}:viewers`, 'count');
          const count = Math.max(0, parseInt(viewerCount || '0'));
          await redis.hset(`stream:${streamId}:viewers`, 'count', count.toString());

          io.to(room).emit('viewer-count', {
            streamId,
            count,
          });
        }
      }
    });
  });
}

async function updateChatCount(streamId: string): Promise<void> {
  // Get or create today's analytics record
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const analytics = await prisma.streamAnalytics.findFirst({
    where: {
      streamId,
      timestamp: {
        gte: today,
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });

  if (analytics) {
    await prisma.streamAnalytics.update({
      where: { id: analytics.id },
      data: {
        chatMessages: {
          increment: 1,
        },
      },
    });
  }
}
