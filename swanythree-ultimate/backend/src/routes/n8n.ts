import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { N8NMCPClient } from '../services/n8n-mcp/N8NMCPClient';

const router = Router();

// Initialize n8n MCP client
const n8nClient = new N8NMCPClient({
  baseUrl: process.env.N8N_BASE_URL || 'https://n8n.example.com',
  apiKey: process.env.N8N_API_KEY || '',
});

// Validation schemas
const executeWorkflowSchema = z.object({
  input: z.record(z.unknown()).optional(),
  streamId: z.string().uuid().optional(),
});

// GET /api/n8n/workflows - List available workflows
router.get(
  '/workflows',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const workflows = await n8nClient.listWorkflows();

      res.json({
        workflows: workflows.map((w) => ({
          id: w.id,
          name: w.name,
          active: w.active,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
        })),
      });
    } catch (error) {
      console.error('Failed to list workflows:', error);
      throw createError('Failed to fetch workflows from n8n', 503);
    }
  })
);

// GET /api/n8n/workflow/:workflowId - Get workflow details
router.get(
  '/workflow/:workflowId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workflowId } = req.params;

    try {
      const workflow = await n8nClient.getWorkflow(workflowId);

      res.json({ workflow });
    } catch (error) {
      console.error('Failed to get workflow:', error);
      throw createError('Failed to fetch workflow from n8n', 503);
    }
  })
);

// POST /api/n8n/execute/:workflowId - Execute a workflow
router.post(
  '/execute/:workflowId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workflowId } = req.params;
    const { input, streamId } = executeWorkflowSchema.parse(req.body);

    // Verify stream exists if provided
    if (streamId) {
      const stream = await prisma.stream.findUnique({
        where: { id: streamId },
      });

      if (!stream) {
        throw createError('Stream not found', 404);
      }
    }

    // Get workflow info
    let workflowName = 'Unknown';
    try {
      const workflow = await n8nClient.getWorkflow(workflowId);
      workflowName = workflow.name;
    } catch (error) {
      console.error('Failed to get workflow name:', error);
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        workflowName,
        userId: req.userId,
        streamId,
        status: 'pending',
        input: input || {},
      },
    });

    // Execute workflow
    try {
      const result = await n8nClient.executeWorkflow(workflowId, {
        ...input,
        executionId: execution.id,
        userId: req.userId,
        streamId,
      });

      // Update execution with result
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          output: result,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      res.json({
        message: 'Workflow executed successfully',
        execution: {
          id: execution.id,
          status: 'completed',
          output: result,
        },
      });
    } catch (error) {
      // Update execution with error
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      console.error('Workflow execution failed:', error);
      throw createError('Workflow execution failed', 500);
    }
  })
);

// GET /api/n8n/executions - List workflow executions
router.get(
  '/executions',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workflowId, status, limit = '20', offset = '0' } = req.query;

    const executions = await prisma.workflowExecution.findMany({
      where: {
        userId: req.userId,
        ...(workflowId && { workflowId: workflowId as string }),
        ...(status && { status: status as string }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.workflowExecution.count({
      where: {
        userId: req.userId,
        ...(workflowId && { workflowId: workflowId as string }),
        ...(status && { status: status as string }),
      },
    });

    res.json({
      executions,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  })
);

// GET /api/n8n/execution/:id - Get execution details
router.get(
  '/execution/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const execution = await prisma.workflowExecution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw createError('Execution not found', 404);
    }

    if (execution.userId !== req.userId) {
      throw createError('Not authorized to view this execution', 403);
    }

    res.json({ execution });
  })
);

// POST /api/n8n/webhook/:workflowId - Webhook trigger for workflows
router.post(
  '/webhook/:workflowId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workflowId } = req.params;

    try {
      const result = await n8nClient.triggerWebhook(workflowId, req.body);
      res.json({ result });
    } catch (error) {
      console.error('Webhook trigger failed:', error);
      throw createError('Webhook trigger failed', 500);
    }
  })
);

// Callback endpoint for n8n workflow completion
router.post(
  '/callback/execution/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, output, error } = req.body;

    const execution = await prisma.workflowExecution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw createError('Execution not found', 404);
    }

    await prisma.workflowExecution.update({
      where: { id },
      data: {
        status: status || 'completed',
        output: output || null,
        error: error || null,
        completedAt: new Date(),
      },
    });

    // Notify user via Socket.IO
    if (execution.userId) {
      const io = req.app.get('io');
      io.to(`user:${execution.userId}`).emit('workflow-completed', {
        executionId: id,
        status,
        output,
      });
    }

    res.json({ message: 'Execution updated' });
  })
);

export default router;
