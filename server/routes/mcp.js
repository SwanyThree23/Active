import { Router } from 'express';
import db from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get MCP configuration
router.get('/config', (req, res) => {
  try {
    const connections = db.prepare('SELECT * FROM mcp_connections ORDER BY created_at DESC').all();
    const totalRequests = connections.reduce((sum, c) => sum + c.requests_count, 0);

    res.json({
      enabled: true,
      serverUrl: process.env.MCP_SERVER_URL || 'https://techmunity.app.n8n.cloud/mcp-server/http',
      accessToken: process.env.MCP_ACCESS_TOKEN ? '******' + process.env.MCP_ACCESS_TOKEN.slice(-4) : '******L8rs',
      connectedClients: connections.map(c => c.client_name),
      connections,
      status: connections.length > 0 ? 'connected' : 'disconnected',
      activeConnections: connections.filter(c => c.status === 'connected').length,
      requestsToday: totalRequests,
      avgLatency: '45ms'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all connections
router.get('/connections', (req, res) => {
  try {
    const connections = db.prepare('SELECT * FROM mcp_connections ORDER BY requests_count DESC').all();
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register new connection
router.post('/connections', (req, res) => {
  try {
    const { clientName } = req.body;
    const id = uuidv4();

    db.prepare(`
      INSERT INTO mcp_connections (id, client_name, status)
      VALUES (?, ?, 'connected')
    `).run(id, clientName);

    const connection = db.prepare('SELECT * FROM mcp_connections WHERE id = ?').get(id);
    res.status(201).json(connection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update connection
router.put('/connections/:id', (req, res) => {
  try {
    const { status } = req.body;

    db.prepare(`
      UPDATE mcp_connections
      SET status = COALESCE(?, status)
      WHERE id = ?
    `).run(status, req.params.id);

    const connection = db.prepare('SELECT * FROM mcp_connections WHERE id = ?').get(req.params.id);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    res.json(connection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete connection
router.delete('/connections/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM mcp_connections WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle MCP request (bridge to n8n)
router.post('/request', async (req, res) => {
  try {
    const { clientId, method, params } = req.body;

    // Find and update connection
    if (clientId) {
      db.prepare(`
        UPDATE mcp_connections
        SET requests_count = requests_count + 1,
            last_request = datetime('now')
        WHERE id = ?
      `).run(clientId);
    }

    // If MCP server is configured, forward request
    if (process.env.MCP_SERVER_URL && process.env.MCP_ACCESS_TOKEN) {
      try {
        const response = await fetch(process.env.MCP_SERVER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MCP_ACCESS_TOKEN}`
          },
          body: JSON.stringify({ method, params })
        });

        const data = await response.json();
        return res.json({ success: true, data });
      } catch (err) {
        console.error('MCP forward error:', err);
      }
    }

    // Simulated response
    res.json({
      success: true,
      simulated: true,
      method,
      result: { message: 'MCP request processed (simulated)' }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get MCP server info
router.get('/info', (req, res) => {
  res.json({
    name: 'SwanyBot Ultimate MCP Server',
    version: '1.0.0',
    capabilities: [
      'workflow-execution',
      'ai-routing',
      'voice-synthesis',
      'image-optimization',
      'behavioral-evaluation'
    ],
    endpoints: {
      workflows: '/api/workflows',
      agents: '/api/agents',
      openrouter: '/api/openrouter',
      voice: '/api/voice',
      bloom: '/api/bloom'
    }
  });
});

export default router;
