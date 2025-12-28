import { Router } from 'express';
import db from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all workflows
router.get('/', (req, res) => {
  try {
    const workflows = db.prepare('SELECT * FROM workflows ORDER BY created_at DESC').all();
    const parsed = workflows.map(w => ({
      ...w,
      integrations: JSON.parse(w.integrations || '[]')
    }));
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single workflow
router.get('/:id', (req, res) => {
  try {
    const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    workflow.integrations = JSON.parse(workflow.integrations || '[]');
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create workflow
router.post('/', (req, res) => {
  try {
    const { name, description, category, integrations } = req.body;
    const id = `wf_${uuidv4().slice(0, 8)}`;

    db.prepare(`
      INSERT INTO workflows (id, name, description, category, integrations)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, description, category, JSON.stringify(integrations || []));

    const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(id);
    workflow.integrations = JSON.parse(workflow.integrations || '[]');
    res.status(201).json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update workflow
router.put('/:id', (req, res) => {
  try {
    const { name, description, status, category, integrations } = req.body;

    db.prepare(`
      UPDATE workflows
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          category = COALESCE(?, category),
          integrations = COALESCE(?, integrations),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, description, status, category, integrations ? JSON.stringify(integrations) : null, req.params.id);

    const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    workflow.integrations = JSON.parse(workflow.integrations || '[]');
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete workflow
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM workflows WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get workflow executions
router.get('/:id/executions', (req, res) => {
  try {
    const executions = db.prepare(`
      SELECT * FROM workflow_executions
      WHERE workflow_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.params.id);
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger workflow execution (simulated or via n8n webhook)
router.post('/:id/execute', async (req, res) => {
  try {
    const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const executionId = `ex_${uuidv4().slice(0, 8)}`;
    const startTime = Date.now();

    // If n8n webhook is configured, trigger it
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const response = await fetch(`${process.env.N8N_WEBHOOK_URL}/webhook/${workflow.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        });
        const data = await response.json();

        const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
        db.prepare(`
          INSERT INTO workflow_executions (id, workflow_id, status, duration, model, tokens)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(executionId, workflow.id, 'success', duration, data.model || 'n/a', data.tokens || 0);

        // Update workflow stats
        db.prepare(`
          UPDATE workflows
          SET executions = executions + 1,
              last_run = 'just now',
              updated_at = datetime('now')
          WHERE id = ?
        `).run(workflow.id);

        return res.json({ executionId, status: 'success', data });
      } catch (err) {
        db.prepare(`
          INSERT INTO workflow_executions (id, workflow_id, status, duration, error)
          VALUES (?, ?, ?, ?, ?)
        `).run(executionId, workflow.id, 'failed', '0s', err.message);

        return res.status(500).json({ executionId, status: 'failed', error: err.message });
      }
    }

    // Simulated execution
    const duration = `${(Math.random() * 10 + 1).toFixed(1)}s`;
    db.prepare(`
      INSERT INTO workflow_executions (id, workflow_id, status, duration, model, tokens)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(executionId, workflow.id, 'success', duration, 'simulated', Math.floor(Math.random() * 1000));

    db.prepare(`
      UPDATE workflows
      SET executions = executions + 1,
          last_run = 'just now',
          updated_at = datetime('now')
      WHERE id = ?
    `).run(workflow.id);

    res.json({ executionId, status: 'success', simulated: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync with n8n cloud
router.post('/sync', async (req, res) => {
  try {
    // In production, this would fetch from n8n API
    const workflows = db.prepare('SELECT * FROM workflows').all();
    res.json({
      synced: true,
      count: workflows.length,
      source: process.env.N8N_WEBHOOK_URL || 'local'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
