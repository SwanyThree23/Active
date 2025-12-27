import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma, redis } from '../index';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const recordAnalyticsSchema = z.object({
  viewers: z.number().int().min(0).optional(),
  chatMessages: z.number().int().min(0).optional(),
  engagementScore: z.number().min(0).max(100).optional(),
  sentiment: z.number().min(-1).max(1).optional(),
  avgWatchTime: z.number().int().min(0).optional(),
});

// GET /api/analytics/stream/:streamId - Get stream analytics
router.get(
  '/stream/:streamId',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { streamId } = req.params;
    const { period = '1h', limit = '100' } = req.query;

    // Verify stream exists
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    // Calculate time range based on period
    const now = new Date();
    let startTime: Date;

    switch (period) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startTime = new Date(0);
        break;
      default:
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
    }

    const analytics = await prisma.streamAnalytics.findMany({
      where: {
        streamId,
        timestamp: { gte: startTime },
      },
      orderBy: { timestamp: 'asc' },
      take: parseInt(limit as string),
    });

    // Get current viewer count from Redis
    const currentViewers = await redis.hget(`stream:${streamId}:viewers`, 'count');

    res.json({
      analytics,
      currentViewers: parseInt(currentViewers || '0'),
      period,
      streamId,
    });
  })
);

// POST /api/analytics/stream/:streamId - Record analytics data point
router.post(
  '/stream/:streamId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { streamId } = req.params;
    const data = recordAnalyticsSchema.parse(req.body);

    // Verify stream exists and user owns it
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    if (stream.userId !== req.userId) {
      throw createError('Not authorized to record analytics for this stream', 403);
    }

    // Get current viewer count from Redis if not provided
    let viewers = data.viewers;
    if (viewers === undefined) {
      const currentViewers = await redis.hget(`stream:${streamId}:viewers`, 'count');
      viewers = parseInt(currentViewers || '0');
    }

    // Get the last analytics record to track peak viewers
    const lastAnalytics = await prisma.streamAnalytics.findFirst({
      where: { streamId },
      orderBy: { timestamp: 'desc' },
    });

    const peakViewers = Math.max(viewers, lastAnalytics?.peakViewers || 0);

    // Create analytics record
    const analytics = await prisma.streamAnalytics.create({
      data: {
        streamId,
        viewers,
        peakViewers,
        chatMessages: data.chatMessages || 0,
        engagementScore: data.engagementScore || 0,
        sentiment: data.sentiment || 0,
        avgWatchTime: data.avgWatchTime || 0,
      },
    });

    // Broadcast analytics update via Socket.IO
    const io = req.app.get('io');
    io.to(`stream:${streamId}`).emit('analytics-update', {
      streamId,
      analytics,
    });

    res.status(201).json({
      message: 'Analytics recorded',
      analytics,
    });
  })
);

// GET /api/analytics/stream/:streamId/summary - Get analytics summary
router.get(
  '/stream/:streamId/summary',
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

    // Check authorization (owner or public stream)
    if (stream.userId !== req.userId) {
      throw createError('Not authorized to view analytics summary', 403);
    }

    // Get all analytics for this stream
    const analytics = await prisma.streamAnalytics.findMany({
      where: { streamId },
      orderBy: { timestamp: 'asc' },
    });

    if (analytics.length === 0) {
      res.json({
        summary: {
          totalViewers: 0,
          peakViewers: 0,
          avgViewers: 0,
          totalChatMessages: 0,
          avgEngagement: 0,
          avgSentiment: 0,
          duration: 0,
          dataPoints: 0,
        },
      });
      return;
    }

    // Calculate summary statistics
    const peakViewers = Math.max(...analytics.map((a) => a.peakViewers));
    const totalChatMessages = analytics.reduce((sum, a) => sum + a.chatMessages, 0);
    const avgViewers = analytics.reduce((sum, a) => sum + a.viewers, 0) / analytics.length;
    const avgEngagement = analytics.reduce((sum, a) => sum + a.engagementScore, 0) / analytics.length;
    const avgSentiment = analytics.reduce((sum, a) => sum + a.sentiment, 0) / analytics.length;

    // Calculate stream duration
    const startTime = stream.startedAt || stream.createdAt;
    const endTime = stream.endedAt || new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    res.json({
      summary: {
        peakViewers,
        avgViewers: Math.round(avgViewers * 100) / 100,
        totalChatMessages,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        avgSentiment: Math.round(avgSentiment * 100) / 100,
        duration,
        dataPoints: analytics.length,
        startTime,
        endTime: stream.endedAt,
      },
    });
  })
);

// GET /api/analytics/user - Get user's overall analytics
router.get(
  '/user',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Get all streams for user
    const streams = await prisma.stream.findMany({
      where: { userId: req.userId },
      include: {
        analytics: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            chatMessages: true,
          },
        },
      },
    });

    const totalStreams = streams.length;
    const liveStreams = streams.filter((s) => s.status === 'live').length;
    const totalMessages = streams.reduce((sum, s) => sum + s._count.chatMessages, 0);

    // Get peak viewers across all streams
    const allAnalytics = await prisma.streamAnalytics.findMany({
      where: {
        stream: {
          userId: req.userId,
        },
      },
    });

    const peakViewers = allAnalytics.length > 0
      ? Math.max(...allAnalytics.map((a) => a.peakViewers))
      : 0;

    const avgEngagement = allAnalytics.length > 0
      ? allAnalytics.reduce((sum, a) => sum + a.engagementScore, 0) / allAnalytics.length
      : 0;

    res.json({
      overview: {
        totalStreams,
        liveStreams,
        totalMessages,
        peakViewers,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
      },
      recentStreams: streams.slice(0, 5),
    });
  })
);

// GET /api/analytics/stream/:streamId/realtime - Get real-time analytics
router.get(
  '/stream/:streamId/realtime',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { streamId } = req.params;

    // Verify stream exists
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    // Get current viewer count from Redis
    const viewers = await redis.hget(`stream:${streamId}:viewers`, 'count');

    // Get latest analytics
    const latestAnalytics = await prisma.streamAnalytics.findFirst({
      where: { streamId },
      orderBy: { timestamp: 'desc' },
    });

    // Get recent chat message count (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentMessages = await prisma.chatMessage.count({
      where: {
        streamId,
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    res.json({
      realtime: {
        viewers: parseInt(viewers || '0'),
        peakViewers: latestAnalytics?.peakViewers || 0,
        chatMessagesPerMinute: Math.round(recentMessages / 5),
        engagementScore: latestAnalytics?.engagementScore || 0,
        sentiment: latestAnalytics?.sentiment || 0,
        isLive: stream.status === 'live',
      },
    });
  })
);

export default router;
