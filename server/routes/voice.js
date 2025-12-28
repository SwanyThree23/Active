import { Router } from 'express';
import db from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const ELEVENLABS_BASE = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io/v1';

// Get all voice clones
router.get('/', (req, res) => {
  try {
    const voices = db.prepare('SELECT * FROM voice_clones ORDER BY created_at DESC').all();
    res.json(voices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get voice clone stats
router.get('/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM voice_clones').get().count;
    const ready = db.prepare("SELECT COUNT(*) as count FROM voice_clones WHERE status = 'ready'").get().count;
    const totalUsage = db.prepare('SELECT SUM(usage) as sum FROM voice_clones').get().sum || 0;

    res.json({
      total,
      ready,
      training: total - ready,
      totalUsage,
      configured: !!process.env.ELEVENLABS_API_KEY
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single voice clone
router.get('/:id', (req, res) => {
  try {
    const voice = db.prepare('SELECT * FROM voice_clones WHERE id = ?').get(req.params.id);
    if (!voice) {
      return res.status(404).json({ error: 'Voice clone not found' });
    }
    res.json(voice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create voice clone
router.post('/', async (req, res) => {
  try {
    const { name, language = 'English' } = req.body;
    const id = uuidv4();

    db.prepare(`
      INSERT INTO voice_clones (id, name, status, language)
      VALUES (?, ?, 'training', ?)
    `).run(id, name, language);

    const voice = db.prepare('SELECT * FROM voice_clones WHERE id = ?').get(id);
    res.status(201).json(voice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update voice clone
router.put('/:id', (req, res) => {
  try {
    const { name, status, samples, quality, language } = req.body;

    db.prepare(`
      UPDATE voice_clones
      SET name = COALESCE(?, name),
          status = COALESCE(?, status),
          samples = COALESCE(?, samples),
          quality = COALESCE(?, quality),
          language = COALESCE(?, language),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, status, samples, quality, language, req.params.id);

    const voice = db.prepare('SELECT * FROM voice_clones WHERE id = ?').get(req.params.id);
    if (!voice) {
      return res.status(404).json({ error: 'Voice clone not found' });
    }
    res.json(voice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete voice clone
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM voice_clones WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Voice clone not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Synthesize speech
router.post('/:id/synthesize', async (req, res) => {
  try {
    const { text } = req.body;
    const voice = db.prepare('SELECT * FROM voice_clones WHERE id = ?').get(req.params.id);

    if (!voice) {
      return res.status(404).json({ error: 'Voice clone not found' });
    }

    if (voice.status !== 'ready') {
      return res.status(400).json({ error: 'Voice clone is not ready' });
    }

    // Increment usage
    db.prepare('UPDATE voice_clones SET usage = usage + 1, updated_at = datetime("now") WHERE id = ?').run(req.params.id);

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.json({
        success: true,
        voiceId: voice.id,
        voiceName: voice.name,
        textLength: text.length,
        simulated: true,
        message: 'Configure ELEVENLABS_API_KEY for real synthesis'
      });
    }

    // Real ElevenLabs API call
    const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voice.voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add voice samples
router.post('/:id/samples', (req, res) => {
  try {
    const { sampleCount = 1 } = req.body;

    db.prepare(`
      UPDATE voice_clones
      SET samples = samples + ?,
          quality = MIN(100, quality + ?),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(sampleCount, sampleCount * 2, req.params.id);

    const voice = db.prepare('SELECT * FROM voice_clones WHERE id = ?').get(req.params.id);

    // Auto-transition to ready if enough samples
    if (voice && voice.samples >= 10 && voice.status === 'training') {
      db.prepare("UPDATE voice_clones SET status = 'ready' WHERE id = ?").run(req.params.id);
    }

    res.json(db.prepare('SELECT * FROM voice_clones WHERE id = ?').get(req.params.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
