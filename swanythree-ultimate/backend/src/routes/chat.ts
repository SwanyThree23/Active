import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma, redis } from '../index';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// Rate limit configuration
const RATE_LIMIT_WINDOW = 10; // seconds
const RATE_LIMIT_MAX = 5; // messages per window

// Validation schemas
const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(500, 'Message too long'),
});

// GET /api/chat/stream/:streamId - Get chat messages for a stream
router.get(
  '/stream/:streamId',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { streamId } = req.params;
    const { limit = '50', before, after } = req.query;

    // Verify stream exists
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        streamId,
        isModerated: false,
        ...(before && { createdAt: { lt: new Date(before as string) } }),
        ...(after && { createdAt: { gt: new Date(after as string) } }),
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
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    // Reverse to get chronological order
    messages.reverse();

    res.json({
      messages,
      streamId,
    });
  })
);

// POST /api/chat/stream/:streamId - Send a chat message
router.post(
  '/stream/:streamId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { streamId } = req.params;
    const { message } = sendMessageSchema.parse(req.body);

    // Verify stream exists and is live
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    if (stream.status !== 'live') {
      throw createError('Cannot send messages to an offline stream', 400);
    }

    // Rate limiting
    const rateLimitKey = `ratelimit:chat:${req.userId}`;
    const messageCount = await redis.incr(rateLimitKey);

    if (messageCount === 1) {
      await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW);
    }

    if (messageCount > RATE_LIMIT_MAX) {
      const ttl = await redis.ttl(rateLimitKey);
      throw createError(`Rate limit exceeded. Try again in ${ttl} seconds.`, 429);
    }

    // Create message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        streamId,
        userId: req.userId!,
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

    // Broadcast message via Socket.IO
    const io = req.app.get('io');
    io.to(`stream:${streamId}`).emit('new-message', {
      id: chatMessage.id,
      message: chatMessage.message,
      createdAt: chatMessage.createdAt,
      user: chatMessage.user,
    });

    res.status(201).json({
      message: 'Message sent',
      chatMessage,
    });
  })
);

// DELETE /api/chat/:messageId - Delete a chat message (moderation)
router.delete(
  '/:messageId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { messageId } = req.params;

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        stream: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!message) {
      throw createError('Message not found', 404);
    }

    // Check authorization: user must be message author or stream owner
    const isAuthor = message.userId === req.userId;
    const isStreamOwner = message.stream.userId === req.userId;

    if (!isAuthor && !isStreamOwner) {
      throw createError('Not authorized to delete this message', 403);
    }

    // Soft delete by marking as moderated
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { isModerated: true },
    });

    // Broadcast deletion via Socket.IO
    const io = req.app.get('io');
    io.to(`stream:${message.streamId}`).emit('message-deleted', {
      messageId,
    });

    res.json({
      message: 'Message deleted',
    });
  })
);

// POST /api/chat/:messageId/report - Report a chat message
router.post(
  '/:messageId/report',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { messageId } = req.params;
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw createError('Message not found', 404);
    }

    // Store report in Redis for review
    const reportKey = `chat:report:${messageId}`;
    await redis.hincrby(reportKey, 'count', 1);
    await redis.hset(reportKey, `reporter:${req.userId}`, reason || 'No reason provided');
    await redis.expire(reportKey, 86400 * 7); // 7 days

    // Auto-moderate if too many reports
    const reportCount = await redis.hget(reportKey, 'count');
    if (parseInt(reportCount || '0') >= 5) {
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: { isModerated: true },
      });

      // Broadcast deletion via Socket.IO
      const io = req.app.get('io');
      io.to(`stream:${message.streamId}`).emit('message-deleted', {
        messageId,
      });
    }

    res.json({
      message: 'Report submitted',
    });
  })
);

// GET /api/chat/stream/:streamId/stats - Get chat statistics
router.get(
  '/stream/:streamId/stats',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { streamId } = req.params;

    // Verify stream exists
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    // Check authorization
    if (stream.userId !== req.userId) {
      throw createError('Not authorized to view chat stats', 403);
    }

    const totalMessages = await prisma.chatMessage.count({
      where: { streamId },
    });

    const uniqueUsers = await prisma.chatMessage.groupBy({
      by: ['userId'],
      where: { streamId },
    });

    const moderatedMessages = await prisma.chatMessage.count({
      where: { streamId, isModerated: true },
    });

    // Get messages per minute (last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentMessages = await prisma.chatMessage.count({
      where: {
        streamId,
        createdAt: { gte: tenMinutesAgo },
      },
    });

    res.json({
      stats: {
        totalMessages,
        uniqueUsers: uniqueUsers.length,
        moderatedMessages,
        messagesPerMinute: Math.round(recentMessages / 10),
      },
    });
  })
);

export default router;
