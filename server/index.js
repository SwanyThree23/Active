import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import workflowRoutes from './routes/workflows.js';
import agentRoutes from './routes/agents.js';
import openrouterRoutes from './routes/openrouter.js';
import llmlinguaRoutes from './routes/llmlingua.js';
import voiceRoutes from './routes/voice.js';
import bloomRoutes from './routes/bloom.js';
import mcpRoutes from './routes/mcp.js';
import productRoutes from './routes/products.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      n8n: process.env.N8N_WEBHOOK_URL ? 'configured' : 'not configured',
      openrouter: process.env.OPENROUTER_API_KEY ? 'configured' : 'not configured',
      elevenlabs: process.env.ELEVENLABS_API_KEY ? 'configured' : 'not configured',
      mcp: process.env.MCP_SERVER_URL ? 'configured' : 'not configured'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/openrouter', openrouterRoutes);
app.use('/api/llmlingua', llmlinguaRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/bloom', bloomRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/products', productRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`SwanyBot Ultimate API Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
