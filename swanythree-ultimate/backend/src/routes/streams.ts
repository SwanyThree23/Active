import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { prisma, redis } from '../index';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const createStreamSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnailUrl: z.string().url().optional(),
});

const updateStreamSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
});

// GET /api/streams - List all live streams
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, category, limit = '20', offset = '0' } = req.query;

    const streams = await prisma.stream.findMany({
      where: {
        ...(status && { status: status as string }),
        ...(category && { category: category as string }),
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
      orderBy: [
        { status: 'asc' }, // 'live' streams first
        { startedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Get viewer counts from Redis
    const streamsWithViewers = await Promise.all(
      streams.map(async (stream) => {
        const viewerCount = await redis.hget(`stream:${stream.id}:viewers`, 'count');
        return {
          ...stream,
          viewerCount: parseInt(viewerCount || '0'),
        };
      })
    );

    const total = await prisma.stream.count({
      where: {
        ...(status && { status: status as string }),
        ...(category && { category: category as string }),
      },
    });

    res.json({
      streams: streamsWithViewers,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  })
);

// GET /api/streams/:id - Get stream details
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const stream = await prisma.stream.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        analytics: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    // Get viewer count from Redis
    const viewerCount = await redis.hget(`stream:${stream.id}:viewers`, 'count');

    res.json({
      stream: {
        ...stream,
        viewerCount: parseInt(viewerCount || '0'),
      },
    });
  })
);

// POST /api/streams/create - Create new stream
router.post(
  '/create',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = createStreamSchema.parse(req.body);

    // Generate unique stream key
    const streamKey = uuidv4();
    const rtmpUrl = `rtmp://stream.swanythree.com/live/${streamKey}`;

    const stream = await prisma.stream.create({
      data: {
        userId: req.userId!,
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags || [],
        thumbnailUrl: data.thumbnailUrl,
        streamKey,
        rtmpUrl,
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

    res.status(201).json({
      message: 'Stream created successfully',
      stream,
    });
  })
);

// PUT /api/streams/:id - Update stream
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = updateStreamSchema.parse(req.body);

    // Check ownership
    const stream = await prisma.stream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    if (stream.userId !== req.userId) {
      throw createError('Not authorized to update this stream', 403);
    }

    const updatedStream = await prisma.stream.update({
      where: { id },
      data,
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

    res.json({
      message: 'Stream updated successfully',
      stream: updatedStream,
    });
  })
);

// POST /api/streams/:id/start - Start streaming
router.post(
  '/:id/start',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Check ownership
    const stream = await prisma.stream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    if (stream.userId !== req.userId) {
      throw createError('Not authorized to start this stream', 403);
    }

    if (stream.status === 'live') {
      throw createError('Stream is already live', 400);
    }

    // Generate HLS URL
    const hlsUrl = `https://cdn.swanythree.com/hls/${stream.streamKey}/index.m3u8`;

    const updatedStream = await prisma.stream.update({
      where: { id },
      data: {
        status: 'live',
        hlsUrl,
        startedAt: new Date(),
        endedAt: null,
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

    // Initialize viewer count in Redis
    await redis.hset(`stream:${id}:viewers`, 'count', '0');

    // Create initial analytics record
    await prisma.streamAnalytics.create({
      data: {
        streamId: id,
        viewers: 0,
        peakViewers: 0,
        chatMessages: 0,
        engagementScore: 0,
        sentiment: 0,
      },
    });

    // Notify connected clients via Socket.IO
    const io = req.app.get('io');
    io.emit('stream-started', {
      streamId: id,
      stream: updatedStream,
    });

    res.json({
      message: 'Stream started successfully',
      stream: updatedStream,
    });
  })
);

// POST /api/streams/:id/end - End streaming
router.post(
  '/:id/end',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Check ownership
    const stream = await prisma.stream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    if (stream.userId !== req.userId) {
      throw createError('Not authorized to end this stream', 403);
    }

    if (stream.status !== 'live') {
      throw createError('Stream is not live', 400);
    }

    const updatedStream = await prisma.stream.update({
      where: { id },
      data: {
        status: 'ended',
        endedAt: new Date(),
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

    // Clear viewer count from Redis
    await redis.del(`stream:${id}:viewers`);

    // Notify connected clients via Socket.IO
    const io = req.app.get('io');
    io.to(`stream:${id}`).emit('stream-ended', {
      streamId: id,
    });
    io.emit('stream-ended', {
      streamId: id,
      stream: updatedStream,
    });

    res.json({
      message: 'Stream ended successfully',
      stream: updatedStream,
    });
  })
);

// DELETE /api/streams/:id - Delete stream
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Check ownership
    const stream = await prisma.stream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    if (stream.userId !== req.userId) {
      throw createError('Not authorized to delete this stream', 403);
    }

    if (stream.status === 'live') {
      throw createError('Cannot delete a live stream. End the stream first.', 400);
    }

    await prisma.stream.delete({
      where: { id },
    });

    // Clean up Redis
    await redis.del(`stream:${id}:viewers`);

    res.json({
      message: 'Stream deleted successfully',
    });
  })
);

// GET /api/streams/user/:userId - Get streams by user
router.get(
  '/user/:userId',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { status, limit = '20', offset = '0' } = req.query;

    const streams = await prisma.stream.findMany({
      where: {
        userId,
        ...(status && { status: status as string }),
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
      skip: parseInt(offset as string),
    });

    const total = await prisma.stream.count({
      where: {
        userId,
        ...(status && { status: status as string }),
      },
    });

    res.json({
      streams,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  })
);

export default router;
