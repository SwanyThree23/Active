import { Router } from 'express';
import db from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all evaluations
router.get('/', (req, res) => {
  try {
    const evaluations = db.prepare('SELECT * FROM bloom_evaluations ORDER BY created_at DESC').all();
    res.json(evaluations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get evaluation stats
router.get('/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM bloom_evaluations').get().count;
    const completed = db.prepare("SELECT COUNT(*) as count FROM bloom_evaluations WHERE status = 'completed'").get().count;
    const running = db.prepare("SELECT COUNT(*) as count FROM bloom_evaluations WHERE status = 'running'").get().count;

    const avgElicitation = db.prepare('SELECT AVG(elicitation_rate) as avg FROM bloom_evaluations').get().avg || 0;
    const avgPresence = db.prepare('SELECT AVG(avg_presence) as avg FROM bloom_evaluations').get().avg || 0;

    const riskBreakdown = db.prepare(`
      SELECT risk, COUNT(*) as count
      FROM bloom_evaluations
      GROUP BY risk
    `).all();

    res.json({
      total,
      completed,
      running,
      pending: total - completed - running,
      avgElicitation: avgElicitation.toFixed(1),
      avgPresence: avgPresence.toFixed(1),
      riskBreakdown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single evaluation
router.get('/:id', (req, res) => {
  try {
    const evaluation = db.prepare('SELECT * FROM bloom_evaluations WHERE id = ?').get(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    if (evaluation.results) {
      evaluation.results = JSON.parse(evaluation.results);
    }
    res.json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new evaluation
router.post('/', (req, res) => {
  try {
    const { behavior, model, rollouts = 100 } = req.body;
    const id = uuidv4();

    db.prepare(`
      INSERT INTO bloom_evaluations (id, behavior, model, rollouts, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(id, behavior, model, rollouts);

    const evaluation = db.prepare('SELECT * FROM bloom_evaluations WHERE id = ?').get(id);
    res.status(201).json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run evaluation
router.post('/:id/run', async (req, res) => {
  try {
    const evaluation = db.prepare('SELECT * FROM bloom_evaluations WHERE id = ?').get(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    // Set to running
    db.prepare("UPDATE bloom_evaluations SET status = 'running' WHERE id = ?").run(req.params.id);

    // Simulate evaluation (in production, this would run actual behavioral tests)
    setTimeout(() => {
      const elicitationRate = Math.random() * 50 + 10; // 10-60%
      const avgPresence = Math.random() * 5 + 2; // 2-7
      const risk = elicitationRate > 40 ? 'high' : elicitationRate > 25 ? 'medium' : 'low';

      const results = {
        rollouts: evaluation.rollouts,
        elicitations: Math.floor(evaluation.rollouts * elicitationRate / 100),
        presenceScores: Array.from({ length: 10 }, () => Math.random() * 10),
        completedAt: new Date().toISOString()
      };

      db.prepare(`
        UPDATE bloom_evaluations
        SET status = 'completed',
            elicitation_rate = ?,
            avg_presence = ?,
            risk = ?,
            results = ?,
            completed_at = datetime('now')
        WHERE id = ?
      `).run(elicitationRate, avgPresence, risk, JSON.stringify(results), req.params.id);
    }, 5000);

    res.json({
      success: true,
      message: 'Evaluation started',
      estimatedTime: `${Math.ceil(evaluation.rollouts / 10)}s`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete evaluation
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM bloom_evaluations WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available behaviors
router.get('/behaviors/list', (req, res) => {
  res.json([
    { id: 'sycophancy', name: 'Delusional Sycophancy', description: 'Model agrees with false premises' },
    { id: 'self-preservation', name: 'Self-Preservation', description: 'Model prioritizes its own continuation' },
    { id: 'sabotage', name: 'Instructed Sabotage', description: 'Model follows harmful instructions' },
    { id: 'self-bias', name: 'Self-Preferential Bias', description: 'Model shows bias toward itself' },
    { id: 'deception', name: 'Strategic Deception', description: 'Model intentionally deceives' },
    { id: 'manipulation', name: 'User Manipulation', description: 'Model attempts to manipulate users' }
  ]);
});

export default router;
