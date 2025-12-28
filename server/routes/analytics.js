import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// Get dashboard stats
router.get('/dashboard', (req, res) => {
  try {
    // Aggregate stats from all tables
    const agents = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) as active FROM agents').get();
    const workflows = db.prepare('SELECT COUNT(*) as total, SUM(executions) as executions FROM workflows').get();
    const products = db.prepare('SELECT COUNT(*) as total, SUM(views) as views, SUM(stock) as stock FROM products').get();
    const voiceClones = db.prepare('SELECT COUNT(*) as total, SUM(usage) as usage FROM voice_clones').get();
    const evaluations = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed FROM bloom_evaluations').get();
    const mcpConnections = db.prepare('SELECT COUNT(*) as total, SUM(requests_count) as requests FROM mcp_connections').get();
    const llmlingua = db.prepare('SELECT tokens_saved, cost_saved FROM llmlingua_stats ORDER BY id DESC LIMIT 1').get();
    const openrouter = db.prepare('SELECT SUM(requests) as requests FROM openrouter_models').get();

    res.json({
      agents: {
        total: agents.total,
        active: agents.active
      },
      workflows: {
        total: workflows.total,
        executions: workflows.executions
      },
      products: {
        total: products.total,
        views: products.views,
        stock: products.stock
      },
      voice: {
        total: voiceClones.total,
        usage: voiceClones.usage
      },
      evaluations: {
        total: evaluations.total,
        completed: evaluations.completed
      },
      mcp: {
        connections: mcpConnections.total,
        requests: mcpConnections.requests
      },
      llmlingua: {
        tokensSaved: llmlingua?.tokens_saved || 0,
        costSaved: llmlingua?.cost_saved || 0
      },
      openrouter: {
        requests: openrouter?.requests || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get performance metrics
router.get('/performance', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT
        strftime('%H', created_at) as hour,
        COUNT(*) as requests,
        AVG(response_time) as avg_response_time
      FROM api_logs
      WHERE created_at > datetime('now', '-24 hours')
      GROUP BY hour
      ORDER BY hour
    `).all();

    const statusCodes = db.prepare(`
      SELECT
        status_code,
        COUNT(*) as count
      FROM api_logs
      WHERE created_at > datetime('now', '-24 hours')
      GROUP BY status_code
    `).all();

    res.json({
      hourlyRequests: logs,
      statusCodes,
      summary: {
        totalRequests: logs.reduce((sum, l) => sum + l.requests, 0),
        avgResponseTime: logs.reduce((sum, l) => sum + (l.avg_response_time || 0), 0) / (logs.length || 1),
        successRate: 99.7 // Placeholder
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get revenue metrics
router.get('/revenue', (req, res) => {
  try {
    const products = db.prepare('SELECT price, stock, views FROM products').all();
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const avgProductPrice = products.reduce((sum, p) => sum + p.price, 0) / (products.length || 1);

    res.json({
      totalInventoryValue,
      avgProductPrice,
      estimatedMonthlyRevenue: totalInventoryValue * 0.15, // 15% sell-through estimate
      productCount: products.length,
      totalViews: products.reduce((sum, p) => sum + p.views, 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cost breakdown
router.get('/costs', (req, res) => {
  try {
    const workflows = db.prepare('SELECT name, cost FROM workflows').all();
    const llmlingua = db.prepare('SELECT cost_saved FROM llmlingua_stats ORDER BY id DESC LIMIT 1').get();

    const workflowCosts = workflows.map(w => ({
      name: w.name,
      cost: parseFloat(w.cost?.replace('$', '').replace('/month', '') || 0)
    }));

    const totalWorkflowCost = workflowCosts.reduce((sum, w) => sum + w.cost, 0);

    res.json({
      workflows: workflowCosts,
      totalWorkflowCost,
      llmlinguaSavings: llmlingua?.cost_saved || 0,
      netCost: totalWorkflowCost - (llmlingua?.cost_saved || 0),
      estimatedMonthlyCost: totalWorkflowCost
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log API request (middleware helper)
router.post('/log', (req, res) => {
  try {
    const { endpoint, method, statusCode, responseTime } = req.body;

    db.prepare(`
      INSERT INTO api_logs (endpoint, method, status_code, response_time)
      VALUES (?, ?, ?, ?)
    `).run(endpoint, method, statusCode, responseTime);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system health
router.get('/health', (req, res) => {
  try {
    const dbCheck = db.prepare('SELECT 1').get();

    res.json({
      status: 'healthy',
      database: dbCheck ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        n8n: process.env.N8N_WEBHOOK_URL ? 'configured' : 'not configured',
        openrouter: process.env.OPENROUTER_API_KEY ? 'configured' : 'not configured',
        elevenlabs: process.env.ELEVENLABS_API_KEY ? 'configured' : 'not configured',
        mcp: process.env.MCP_SERVER_URL ? 'configured' : 'not configured'
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

export default router;
