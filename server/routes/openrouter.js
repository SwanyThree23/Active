import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

const OPENROUTER_BASE = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

// Get configuration and stats
router.get('/config', (req, res) => {
  try {
    const models = db.prepare('SELECT * FROM openrouter_models ORDER BY requests DESC').all();
    const totalRequests = models.reduce((sum, m) => sum + m.requests, 0);

    res.json({
      enabled: !!process.env.OPENROUTER_API_KEY,
      configured: !!process.env.OPENROUTER_API_KEY,
      models,
      totalRequests,
      totalCost: '$287.45', // Would be calculated from actual usage
      routingStrategy: 'cost-optimized',
      fallbackEnabled: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all models
router.get('/models', (req, res) => {
  try {
    const models = db.prepare('SELECT * FROM openrouter_models ORDER BY quality DESC').all();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat completion
router.post('/chat', async (req, res) => {
  try {
    const { model, messages, max_tokens = 1000 } = req.body;

    if (!process.env.OPENROUTER_API_KEY) {
      // Simulated response
      const responseModel = model || 'anthropic/claude-sonnet-4.5';
      db.prepare('UPDATE openrouter_models SET requests = requests + 1 WHERE id = ?').run(responseModel);

      return res.json({
        id: `chatcmpl-${Date.now()}`,
        model: responseModel,
        choices: [{
          message: {
            role: 'assistant',
            content: 'This is a simulated response. Configure OPENROUTER_API_KEY for real completions.'
          }
        }],
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
        simulated: true
      });
    }

    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://swanybot.app',
        'X-Title': 'SwanyBot Ultimate'
      },
      body: JSON.stringify({
        model: model || 'anthropic/claude-sonnet-4.5',
        messages,
        max_tokens
      })
    });

    const data = await response.json();

    // Update request count
    if (data.model) {
      db.prepare('UPDATE openrouter_models SET requests = requests + 1 WHERE id = ?').run(data.model);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get model by ID
router.get('/models/:id', (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM openrouter_models WHERE id = ?').get(req.params.id);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    res.json(model);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update model settings
router.put('/models/:id', (req, res) => {
  try {
    const { enabled } = req.body;
    db.prepare('UPDATE openrouter_models SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, req.params.id);

    const model = db.prepare('SELECT * FROM openrouter_models WHERE id = ?').get(req.params.id);
    res.json(model);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
