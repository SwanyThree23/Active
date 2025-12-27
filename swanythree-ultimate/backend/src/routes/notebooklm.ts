import { Router, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

const NOTEBOOKLM_BRIDGE_URL = process.env.NOTEBOOKLM_BRIDGE_URL || 'http://notebooklm-bridge:8013';

// Validation schemas
const createNotebookSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  sources: z.array(z.object({
    type: z.enum(['text', 'url', 'file', 'stream']),
    content: z.string(),
    title: z.string().optional(),
  })),
});

const generatePodcastSchema = z.object({
  title: z.string().optional(),
  hostVoices: z.array(z.object({
    name: z.string(),
    voiceId: z.string(),
  })).length(2).optional(),
  duration: z.enum(['short', 'medium', 'long']).optional(),
});

const chatSchema = z.object({
  message: z.string().min(1).max(1000),
});

// POST /api/notebooklm/notebook/create - Create a new notebook
router.post(
  '/notebook/create',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = createNotebookSchema.parse(req.body);

    // Create notebook in database
    const notebook = await prisma.notebook.create({
      data: {
        userId: req.userId!,
        title: data.title,
        description: data.description,
        sources: data.sources,
      },
    });

    // Send to NotebookLM bridge for synthesis
    try {
      const response = await axios.post(`${NOTEBOOKLM_BRIDGE_URL}/synthesize`, {
        notebookId: notebook.id,
        sources: data.sources,
      });

      // Update notebook with synthesis
      await prisma.notebook.update({
        where: { id: notebook.id },
        data: {
          synthesis: response.data.synthesis,
          summary: response.data.summary,
          keyInsights: response.data.keyInsights || [],
        },
      });
    } catch (error) {
      console.error('Failed to synthesize notebook:', error);
      // Notebook will be synthesized later
    }

    res.status(201).json({
      message: 'Notebook created',
      notebook,
    });
  })
);

// GET /api/notebooklm/notebooks - List user's notebooks
router.get(
  '/notebooks',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = '20', offset = '0' } = req.query;

    const notebooks = await prisma.notebook.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        podcasts: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const total = await prisma.notebook.count({
      where: { userId: req.userId },
    });

    res.json({
      notebooks,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  })
);

// GET /api/notebooklm/notebook/:id - Get notebook details
router.get(
  '/notebook/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const notebook = await prisma.notebook.findUnique({
      where: { id },
      include: {
        podcasts: true,
      },
    });

    if (!notebook) {
      throw createError('Notebook not found', 404);
    }

    if (notebook.userId !== req.userId) {
      throw createError('Not authorized to view this notebook', 403);
    }

    res.json({ notebook });
  })
);

// PUT /api/notebooklm/notebook/:id - Update notebook
router.put(
  '/notebook/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const updateSchema = z.object({
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
    });
    const data = updateSchema.parse(req.body);

    const notebook = await prisma.notebook.findUnique({
      where: { id },
    });

    if (!notebook) {
      throw createError('Notebook not found', 404);
    }

    if (notebook.userId !== req.userId) {
      throw createError('Not authorized to update this notebook', 403);
    }

    const updatedNotebook = await prisma.notebook.update({
      where: { id },
      data,
    });

    res.json({
      message: 'Notebook updated',
      notebook: updatedNotebook,
    });
  })
);

// DELETE /api/notebooklm/notebook/:id - Delete notebook
router.delete(
  '/notebook/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const notebook = await prisma.notebook.findUnique({
      where: { id },
    });

    if (!notebook) {
      throw createError('Notebook not found', 404);
    }

    if (notebook.userId !== req.userId) {
      throw createError('Not authorized to delete this notebook', 403);
    }

    await prisma.notebook.delete({
      where: { id },
    });

    res.json({
      message: 'Notebook deleted',
    });
  })
);

// POST /api/notebooklm/notebook/:id/podcast - Generate podcast from notebook
router.post(
  '/notebook/:id/podcast',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = generatePodcastSchema.parse(req.body);

    const notebook = await prisma.notebook.findUnique({
      where: { id },
    });

    if (!notebook) {
      throw createError('Notebook not found', 404);
    }

    if (notebook.userId !== req.userId) {
      throw createError('Not authorized to generate podcast for this notebook', 403);
    }

    if (!notebook.synthesis) {
      throw createError('Notebook has not been synthesized yet', 400);
    }

    // Create podcast record
    const podcast = await prisma.podcast.create({
      data: {
        notebookId: id,
        title: data.title || `${notebook.title} Podcast`,
        hostVoices: data.hostVoices || [
          { name: 'Host 1', voiceId: 'default-1' },
          { name: 'Host 2', voiceId: 'default-2' },
        ],
        status: 'generating',
      },
    });

    // Send to NotebookLM bridge for podcast generation
    try {
      axios.post(`${NOTEBOOKLM_BRIDGE_URL}/podcast/generate`, {
        podcastId: podcast.id,
        notebookId: id,
        synthesis: notebook.synthesis,
        keyInsights: notebook.keyInsights,
        hostVoices: data.hostVoices,
        duration: data.duration || 'medium',
      }).catch(console.error);
    } catch (error) {
      console.error('Failed to start podcast generation:', error);
    }

    res.status(201).json({
      message: 'Podcast generation started',
      podcast,
    });
  })
);

// GET /api/notebooklm/podcast/:id - Get podcast details
router.get(
  '/podcast/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const podcast = await prisma.podcast.findUnique({
      where: { id },
      include: {
        notebook: {
          select: {
            userId: true,
            title: true,
          },
        },
      },
    });

    if (!podcast) {
      throw createError('Podcast not found', 404);
    }

    if (podcast.notebook.userId !== req.userId) {
      throw createError('Not authorized to view this podcast', 403);
    }

    res.json({ podcast });
  })
);

// POST /api/notebooklm/notebook/:id/chat - Chat with notebook
router.post(
  '/notebook/:id/chat',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { message } = chatSchema.parse(req.body);

    const notebook = await prisma.notebook.findUnique({
      where: { id },
    });

    if (!notebook) {
      throw createError('Notebook not found', 404);
    }

    if (notebook.userId !== req.userId) {
      throw createError('Not authorized to chat with this notebook', 403);
    }

    // Send to NotebookLM bridge for chat response
    try {
      const response = await axios.post(`${NOTEBOOKLM_BRIDGE_URL}/chat`, {
        notebookId: id,
        message,
        context: {
          synthesis: notebook.synthesis,
          sources: notebook.sources,
          keyInsights: notebook.keyInsights,
        },
      });

      res.json({
        response: response.data.response,
        sources: response.data.sources,
      });
    } catch (error) {
      console.error('Chat error:', error);
      throw createError('Failed to get chat response', 500);
    }
  })
);

// POST /api/notebooklm/notebook/:id/add-source - Add source to notebook
router.post(
  '/notebook/:id/add-source',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const sourceSchema = z.object({
      type: z.enum(['text', 'url', 'file', 'stream']),
      content: z.string(),
      title: z.string().optional(),
    });
    const source = sourceSchema.parse(req.body);

    const notebook = await prisma.notebook.findUnique({
      where: { id },
    });

    if (!notebook) {
      throw createError('Notebook not found', 404);
    }

    if (notebook.userId !== req.userId) {
      throw createError('Not authorized to update this notebook', 403);
    }

    const currentSources = notebook.sources as unknown[];
    const updatedNotebook = await prisma.notebook.update({
      where: { id },
      data: {
        sources: [...currentSources, source],
      },
    });

    // Re-synthesize with new source
    try {
      axios.post(`${NOTEBOOKLM_BRIDGE_URL}/synthesize`, {
        notebookId: id,
        sources: updatedNotebook.sources,
      }).catch(console.error);
    } catch (error) {
      console.error('Failed to re-synthesize:', error);
    }

    res.json({
      message: 'Source added',
      notebook: updatedNotebook,
    });
  })
);

// Callback endpoint for NotebookLM bridge
router.post(
  '/callback/podcast/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, audioUrl, script, duration, error } = req.body;

    const podcast = await prisma.podcast.findUnique({
      where: { id },
      include: {
        notebook: {
          select: { userId: true },
        },
      },
    });

    if (!podcast) {
      throw createError('Podcast not found', 404);
    }

    await prisma.podcast.update({
      where: { id },
      data: {
        status: status || 'completed',
        audioUrl,
        script,
        duration,
      },
    });

    // Notify user via Socket.IO
    const io = req.app.get('io');
    io.to(`user:${podcast.notebook.userId}`).emit('podcast-ready', {
      podcastId: id,
      status,
      audioUrl,
    });

    res.json({ message: 'Podcast updated' });
  })
);

router.post(
  '/callback/synthesis/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { synthesis, summary, keyInsights, error } = req.body;

    const notebook = await prisma.notebook.findUnique({
      where: { id },
    });

    if (!notebook) {
      throw createError('Notebook not found', 404);
    }

    await prisma.notebook.update({
      where: { id },
      data: {
        synthesis,
        summary,
        keyInsights: keyInsights || [],
      },
    });

    // Notify user via Socket.IO
    const io = req.app.get('io');
    io.to(`user:${notebook.userId}`).emit('notebook-synthesized', {
      notebookId: id,
    });

    res.json({ message: 'Notebook synthesis updated' });
  })
);

export default router;
