import { Router } from 'express';
import db from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all agents
router.get('/', (req, res) => {
  try {
    const agents = db.prepare('SELECT * FROM agents ORDER BY created_at DESC').all();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent stats
router.get('/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM agents').get().count;
    const active = db.prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'active'").get().count;
    const totalTasks = db.prepare('SELECT SUM(tasks) as sum FROM agents').get().sum || 0;

    const byProvider = db.prepare(`
      SELECT provider, COUNT(*) as count, SUM(tasks) as tasks
      FROM agents
      GROUP BY provider
    `).all();

    res.json({ total, active, idle: total - active, totalTasks, byProvider });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single agent
router.get('/:id', (req, res) => {
  try {
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create agent
router.post('/', (req, res) => {
  try {
    const { name, model, specialty, provider } = req.body;
    const id = uuidv4();

    db.prepare(`
      INSERT INTO agents (id, name, model, specialty, provider)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, model, specialty, provider);

    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update agent
router.put('/:id', (req, res) => {
  try {
    const { name, status, model, specialty, provider } = req.body;

    db.prepare(`
      UPDATE agents
      SET name = COALESCE(?, name),
          status = COALESCE(?, status),
          model = COALESCE(?, model),
          specialty = COALESCE(?, specialty),
          provider = COALESCE(?, provider),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, status, model, specialty, provider, req.params.id);

    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete agent
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run agent task
router.post('/:id/run', (req, res) => {
  try {
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Increment task count
    db.prepare('UPDATE agents SET tasks = tasks + 1, updated_at = datetime("now") WHERE id = ?').run(req.params.id);

    res.json({
      success: true,
      agent: agent.name,
      taskId: uuidv4(),
      message: `Task queued for ${agent.name}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
