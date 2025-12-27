import { Router, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

const AGENT_ORCHESTRATOR_URL = process.env.AGENT_ORCHESTRATOR_URL || 'http://agent-orchestrator:8002';

// Agent types
const AGENT_TYPES = ['moderation', 'highlights', 'analytics', 'summary', 'sentiment'] as const;
type AgentType = typeof AGENT_TYPES[number];

// Validation schemas
const createTaskSchema = z.object({
  agentType: z.enum(AGENT_TYPES),
  taskType: z.string().min(1),
  streamId: z.string().uuid().optional(),
  input: z.record(z.unknown()).optional(),
  priority: z.number().int().min(0).max(10).optional(),
});

// POST /api/agents/task - Create a new AI task
router.post(
  '/task',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = createTaskSchema.parse(req.body);

    // Verify stream exists if provided
    if (data.streamId) {
      const stream = await prisma.stream.findUnique({
        where: { id: data.streamId },
      });

      if (!stream) {
        throw createError('Stream not found', 404);
      }
    }

    // Create task in database
    const task = await prisma.task.create({
      data: {
        userId: req.userId,
        streamId: data.streamId,
        agentType: data.agentType,
        taskType: data.taskType,
        status: 'pending',
        priority: data.priority || 0,
        input: data.input || {},
      },
    });

    // Send task to agent orchestrator
    try {
      await axios.post(`${AGENT_ORCHESTRATOR_URL}/tasks`, {
        taskId: task.id,
        agentType: data.agentType,
        taskType: data.taskType,
        input: data.input,
        priority: data.priority,
      });

      // Update task status to processing
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'processing',
          startedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to send task to agent orchestrator:', error);
      // Task will be picked up later by a worker
    }

    res.status(201).json({
      message: 'Task created',
      task,
    });
  })
);

// GET /api/agents/tasks - List tasks
router.get(
  '/tasks',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, agentType, streamId, limit = '20', offset = '0' } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        userId: req.userId,
        ...(status && { status: status as string }),
        ...(agentType && { agentType: agentType as string }),
        ...(streamId && { streamId: streamId as string }),
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.task.count({
      where: {
        userId: req.userId,
        ...(status && { status: status as string }),
        ...(agentType && { agentType: agentType as string }),
        ...(streamId && { streamId: streamId as string }),
      },
    });

    res.json({
      tasks,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  })
);

// GET /api/agents/task/:taskId - Get task status and result
router.get(
  '/task/:taskId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw createError('Task not found', 404);
    }

    if (task.userId !== req.userId) {
      throw createError('Not authorized to view this task', 403);
    }

    res.json({ task });
  })
);

// POST /api/agents/task/:taskId/cancel - Cancel a pending task
router.post(
  '/task/:taskId/cancel',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw createError('Task not found', 404);
    }

    if (task.userId !== req.userId) {
      throw createError('Not authorized to cancel this task', 403);
    }

    if (task.status === 'completed' || task.status === 'failed') {
      throw createError('Cannot cancel a completed or failed task', 400);
    }

    // Notify agent orchestrator to cancel
    try {
      await axios.post(`${AGENT_ORCHESTRATOR_URL}/tasks/${taskId}/cancel`);
    } catch (error) {
      console.error('Failed to cancel task in orchestrator:', error);
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        error: 'Cancelled by user',
        completedAt: new Date(),
      },
    });

    res.json({
      message: 'Task cancelled',
      task: updatedTask,
    });
  })
);

// POST /api/agents/task/:taskId/callback - Callback from agent orchestrator
router.post(
  '/task/:taskId/callback',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { taskId } = req.params;
    const { status, output, error } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw createError('Task not found', 404);
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: status || 'completed',
        output: output || null,
        error: error || null,
        completedAt: new Date(),
      },
    });

    // Notify via Socket.IO
    const io = req.app.get('io');
    if (task.userId) {
      io.to(`user:${task.userId}`).emit('task-completed', {
        taskId,
        status: updatedTask.status,
        output: updatedTask.output,
      });
    }

    res.json({
      message: 'Task updated',
      task: updatedTask,
    });
  })
);

// GET /api/agents/types - List available agent types
router.get(
  '/types',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    res.json({
      agentTypes: AGENT_TYPES.map((type) => ({
        id: type,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        description: getAgentDescription(type),
      })),
    });
  })
);

function getAgentDescription(type: AgentType): string {
  const descriptions: Record<AgentType, string> = {
    moderation: 'AI-powered content moderation for chat messages and stream content',
    highlights: 'Automatic detection and extraction of stream highlights',
    analytics: 'Advanced analytics and insights generation',
    summary: 'Generate summaries of streams and chat conversations',
    sentiment: 'Analyze sentiment in chat messages and viewer engagement',
  };
  return descriptions[type];
}

export default router;
