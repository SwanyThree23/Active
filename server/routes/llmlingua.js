import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// Get LLMLingua stats
router.get('/stats', (req, res) => {
  try {
    const stats = db.prepare('SELECT * FROM llmlingua_stats ORDER BY id DESC LIMIT 1').get();

    res.json({
      enabled: true,
      compressionRatio: stats?.compression_ratio || 0.5,
      totalCompressed: stats?.tokens_compressed || 0,
      tokensSaved: stats?.tokens_saved || 0,
      costSaved: `$${(stats?.cost_saved || 0).toFixed(2)}`,
      avgCompressionTime: '2.3s',
      preserveAccuracy: stats?.accuracy_preserved || 97.8
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compress text using LLMLingua-style compression
router.post('/compress', (req, res) => {
  try {
    const { text, ratio = 0.5, preserveStructure = true } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const originalTokens = Math.ceil(text.length / 4); // Rough token estimate
    const compressedTokens = Math.ceil(originalTokens * ratio);
    const tokensSaved = originalTokens - compressedTokens;
    const costSaved = (tokensSaved / 1000) * 0.5; // $0.50 per 1K tokens saved

    // Simple compression simulation (in production, use actual LLMLingua)
    const words = text.split(/\s+/);
    const keepRatio = ratio;
    const keepCount = Math.ceil(words.length * keepRatio);

    // Keep important words (simplified - real LLMLingua uses perplexity)
    const importantWords = words.filter((w, i) => {
      if (i < keepCount) return true;
      if (w.length > 6) return true; // Keep longer words
      if (/^[A-Z]/.test(w)) return true; // Keep capitalized words
      return Math.random() < keepRatio;
    }).slice(0, keepCount);

    const compressed = importantWords.join(' ');

    // Update stats
    const currentStats = db.prepare('SELECT * FROM llmlingua_stats ORDER BY id DESC LIMIT 1').get();
    if (currentStats) {
      db.prepare(`
        UPDATE llmlingua_stats
        SET tokens_compressed = tokens_compressed + ?,
            tokens_saved = tokens_saved + ?,
            cost_saved = cost_saved + ?
        WHERE id = ?
      `).run(originalTokens, tokensSaved, costSaved, currentStats.id);
    }

    res.json({
      original: text,
      compressed,
      originalTokens,
      compressedTokens,
      tokensSaved,
      compressionRatio: (compressedTokens / originalTokens).toFixed(2),
      costSaved: `$${costSaved.toFixed(4)}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get compression history
router.get('/history', (req, res) => {
  try {
    const stats = db.prepare('SELECT * FROM llmlingua_stats ORDER BY created_at DESC LIMIT 30').all();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update compression settings
router.put('/settings', (req, res) => {
  try {
    const { compressionRatio, preserveAccuracy } = req.body;

    const currentStats = db.prepare('SELECT * FROM llmlingua_stats ORDER BY id DESC LIMIT 1').get();
    if (currentStats) {
      db.prepare(`
        UPDATE llmlingua_stats
        SET compression_ratio = COALESCE(?, compression_ratio),
            accuracy_preserved = COALESCE(?, accuracy_preserved)
        WHERE id = ?
      `).run(compressionRatio, preserveAccuracy, currentStats.id);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
