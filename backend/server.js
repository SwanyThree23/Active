const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const Redis = require('ioredis');
const Anthropic = require('@anthropic-ai/sdk');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configuration
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/swanythree'
});
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
const JWT_SECRET = process.env.JWT_SECRET || 'swanythree-secret-2026';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ==================== ENCRYPTION UTILITIES ====================

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(encrypted, iv, authTag) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'hex')),
    decipher.final()
  ]).toString('utf8');
}

// ==================== AUTH MIDDLEWARE ====================

const auth = (req, res, next) => {
  // Public routes
  if (req.path.startsWith('/api/auth') || req.path === '/health') {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

app.use(auth);

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password required' });
    }

    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, created_at',
      [email, username, hash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // Create default AI agents for new user
    await createDefaultAgents(user.id);

    res.json({ user, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        subscription_tier: user.subscription_tier
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, username, subscription_tier, settings, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ==================== VAULT (API KEY MANAGEMENT) ====================

app.post('/api/vault/store', async (req, res) => {
  try {
    const { service, apiKey } = req.body;
    const { encrypted, iv, authTag } = encrypt(apiKey);

    const keysResult = await db.query('SELECT api_keys FROM users WHERE id = $1', [req.user.userId]);
    const currentKeys = keysResult.rows[0].api_keys || {};
    currentKeys[service] = { encrypted, iv, authTag };

    await db.query('UPDATE users SET api_keys = $1 WHERE id = $2', [currentKeys, req.user.userId]);

    res.json({ stored: true, service });
  } catch (err) {
    console.error('Vault store error:', err);
    res.status(500).json({ error: 'Failed to store key' });
  }
});

app.get('/api/vault/keys', async (req, res) => {
  try {
    const result = await db.query('SELECT api_keys FROM users WHERE id = $1', [req.user.userId]);
    const services = Object.keys(result.rows[0].api_keys || {});
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch keys' });
  }
});

app.delete('/api/vault/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const keysResult = await db.query('SELECT api_keys FROM users WHERE id = $1', [req.user.userId]);
    const currentKeys = keysResult.rows[0].api_keys || {};
    delete currentKeys[service];

    await db.query('UPDATE users SET api_keys = $1 WHERE id = $2', [currentKeys, req.user.userId]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete key' });
  }
});

// ==================== STREAMS ====================

app.get('/api/streams', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM streams WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

app.post('/api/streams', async (req, res) => {
  try {
    const { title, platform, obs_config } = req.body;
    const result = await db.query(
      'INSERT INTO streams (user_id, title, platform, obs_config) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, title, platform, obs_config || {}]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

app.post('/api/streams/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      'UPDATE streams SET status = $1, started_at = NOW() WHERE id = $2 AND user_id = $3',
      ['live', id, req.user.userId]
    );

    io.emit('stream:started', { streamId: id, userId: req.user.userId });
    res.json({ streaming: true, streamId: id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

app.post('/api/streams/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      'UPDATE streams SET status = $1, ended_at = NOW() WHERE id = $2 AND user_id = $3',
      ['offline', id, req.user.userId]
    );

    io.emit('stream:stopped', { streamId: id });
    res.json({ streaming: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to stop stream' });
  }
});

app.put('/api/streams/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const { metrics } = req.body;

    await db.query(
      'UPDATE streams SET metrics = metrics || $1 WHERE id = $2 AND user_id = $3',
      [metrics, id, req.user.userId]
    );

    io.emit('stream:metrics', { streamId: id, metrics });
    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update metrics' });
  }
});

// ==================== WORKFLOWS ====================

app.get('/api/workflows', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM workflows WHERE user_id = $1 ORDER BY last_run DESC NULLS LAST',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

app.post('/api/workflows', async (req, res) => {
  try {
    const { name, description, n8n_workflow_id, config } = req.body;
    const result = await db.query(
      'INSERT INTO workflows (user_id, name, description, n8n_workflow_id, config) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.userId, name, description, n8n_workflow_id, config || {}]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { input } = req.body;

    // Update execution count
    await db.query(
      'UPDATE workflows SET executions = executions + 1, last_run = NOW() WHERE id = $1',
      [id]
    );

    io.emit('workflow:executed', { workflowId: id, input });
    res.json({ executed: true, workflowId: id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// ==================== AI AGENTS ====================

async function createDefaultAgents(userId) {
  const defaultAgents = [
    { name: 'ARIA', type: 'content_creator', voice_id: 'EXAVITQu4vr4xnSDxMaL', specialties: ['Video Scripts', 'Social Posts'], gradient_colors: ['#3b82f6', '#8b5cf6'] },
    { name: 'NEXUS', type: 'analyst', voice_id: 'pNInz6obpgDQGcFmaJgB', specialties: ['Data Analysis', 'Reporting'], gradient_colors: ['#10b981', '#14b8a6'] },
    { name: 'ECHO', type: 'moderator', voice_id: 'yoZ06aMxZJJ28mfd3POQ', specialties: ['Chat Moderation', 'Community'], gradient_colors: ['#f59e0b', '#ef4444'] },
    { name: 'PULSE', type: 'podcast_producer', voice_id: 'ThT5KcBeYPX3keUQqHPh', specialties: ['Podcasts', 'Audio'], gradient_colors: ['#ec4899', '#8b5cf6'] },
    { name: 'CIPHER', type: 'developer', voice_id: '21m00Tcm4TlvDq8ikWAM', specialties: ['Code Gen', 'Debugging'], gradient_colors: ['#06b6d4', '#3b82f6'] },
    { name: 'NOVA', type: 'researcher', voice_id: 'AZnzlk1XvdvUeBnXmlld', specialties: ['Research', 'Summaries'], gradient_colors: ['#8b5cf6', '#ec4899'] },
    { name: 'VEGA', type: 'video_creator', voice_id: 'jBpfuIE2acCO8z3wKNLl', specialties: ['Video Editing', 'Thumbnails'], gradient_colors: ['#ef4444', '#f59e0b'] },
    { name: 'ORION', type: 'strategist', voice_id: 'onwK4e9ZLuTAKqWW03F9', specialties: ['Planning', 'Growth'], gradient_colors: ['#14b8a6', '#10b981'] }
  ];

  for (const agent of defaultAgents) {
    await db.query(
      'INSERT INTO ai_agents (user_id, name, type, voice_id, specialties, gradient_colors) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, agent.name, agent.type, agent.voice_id, JSON.stringify(agent.specialties), JSON.stringify(agent.gradient_colors)]
    );
  }
}

app.get('/api/agents', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM ai_agents WHERE user_id = $1 ORDER BY created_at',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.post('/api/agents', async (req, res) => {
  try {
    const { name, type, voice_id, personality, specialties, gradient_colors } = req.body;
    const result = await db.query(
      'INSERT INTO ai_agents (user_id, name, type, voice_id, personality, specialties, gradient_colors) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.userId, name, type, voice_id, personality || {}, specialties || [], gradient_colors || ['#3b82f6', '#8b5cf6']]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

app.post('/api/agents/:id/task', async (req, res) => {
  try {
    const { id } = req.params;
    const { task, input } = req.body;
    const start = Date.now();

    // Get agent details
    const agentResult = await db.query('SELECT * FROM ai_agents WHERE id = $1', [id]);
    const agent = agentResult.rows[0];

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Execute task with Claude
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are ${agent.name}, an AI agent specializing in: ${agent.specialties?.join(', ')}.
               Your personality: ${JSON.stringify(agent.personality)}.
               Respond in character and provide actionable results.`,
      messages: [{ role: 'user', content: `Task: ${task}\nInput: ${JSON.stringify(input)}` }]
    });

    const output = response.content[0].text;
    const duration = Date.now() - start;
    const tokens = response.usage.input_tokens + response.usage.output_tokens;
    const cost = (tokens / 1000) * 0.003; // Approximate cost

    // Log execution
    await db.query(
      'INSERT INTO skill_executions (user_id, agent_id, skill_name, input_data, output_data, tokens_used, cost_usd, duration_ms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [req.user.userId, id, task, input, { result: output }, tokens, cost, duration]
    );

    // Update agent stats
    await db.query(
      'UPDATE ai_agents SET tasks_completed = tasks_completed + 1, tokens_used = tokens_used + $1, cost_usd = cost_usd + $2 WHERE id = $3',
      [tokens, cost, id]
    );

    res.json({ output, duration, tokens, cost, agentName: agent.name });
  } catch (err) {
    console.error('Agent task error:', err);
    res.status(500).json({ error: 'Failed to execute agent task' });
  }
});

// ==================== SKILLS ====================

app.post('/api/skills/execute', async (req, res) => {
  try {
    const { skillName, input } = req.body;
    const start = Date.now();

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Execute the skill "${skillName}" with the following input: ${JSON.stringify(input)}.
                  Return a structured JSON response with the results.`
      }]
    });

    let output;
    try {
      output = JSON.parse(response.content[0].text);
    } catch {
      output = { result: response.content[0].text };
    }

    const duration = Date.now() - start;
    const tokens = response.usage.input_tokens + response.usage.output_tokens;
    const cost = (tokens / 1000) * 0.003;

    await db.query(
      'INSERT INTO skill_executions (user_id, skill_name, input_data, output_data, tokens_used, cost_usd, duration_ms) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.userId, skillName, input, output, tokens, cost, duration]
    );

    res.json({ output, duration, tokens, cost });
  } catch (err) {
    console.error('Skill execution error:', err);
    res.status(500).json({ error: 'Failed to execute skill' });
  }
});

app.get('/api/skills/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await db.query(
      'SELECT * FROM skill_executions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [req.user.userId, limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch skill history' });
  }
});

// ==================== VDO.NINJA ====================

app.get('/api/vdoninja/rooms', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM vdoninja_rooms WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.post('/api/vdoninja/rooms', async (req, res) => {
  try {
    const { room_name, settings } = req.body;
    const roomId = `swany-${crypto.randomBytes(8).toString('hex')}`;
    const hostUrl = `https://vdo.ninja/?room=${roomId}&push&director`;

    const result = await db.query(
      'INSERT INTO vdoninja_rooms (user_id, room_id, room_name, host_url, settings) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.userId, roomId, room_name, hostUrl, settings || {}]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.post('/api/vdoninja/rooms/:id/guest', async (req, res) => {
  try {
    const { id } = req.params;
    const { guest_name } = req.body;

    const roomResult = await db.query('SELECT * FROM vdoninja_rooms WHERE id = $1', [id]);
    const room = roomResult.rows[0];

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const guestUrl = `https://vdo.ninja/?room=${room.room_id}&push`;
    const guests = room.guests || [];
    guests.push({ name: guest_name, url: guestUrl, joined_at: new Date() });

    await db.query('UPDATE vdoninja_rooms SET guests = $1 WHERE id = $2', [JSON.stringify(guests), id]);

    res.json({ guestUrl, guest_name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add guest' });
  }
});

// ==================== PLATFORM CONNECTIONS ====================

app.get('/api/platforms', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, platform, platform_user_id, is_connected, metadata, created_at FROM platform_connections WHERE user_id = $1',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

app.post('/api/platforms/connect', async (req, res) => {
  try {
    const { platform, access_token, refresh_token, platform_user_id, metadata } = req.body;

    const encryptedAccess = encrypt(access_token);
    const encryptedRefresh = refresh_token ? encrypt(refresh_token) : null;

    await db.query(
      `INSERT INTO platform_connections (user_id, platform, platform_user_id, access_token_encrypted, refresh_token_encrypted, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, platform) DO UPDATE SET
         access_token_encrypted = $4,
         refresh_token_encrypted = $5,
         metadata = $6,
         is_connected = true`,
      [req.user.userId, platform, platform_user_id, encryptedAccess, encryptedRefresh, metadata || {}]
    );

    res.json({ connected: true, platform });
  } catch (err) {
    res.status(500).json({ error: 'Failed to connect platform' });
  }
});

// ==================== ANALYTICS & STATS ====================

app.get('/api/stats', async (req, res) => {
  try {
    const [
      agentsResult,
      skillsResult,
      streamsResult,
      costResult
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as count, SUM(tasks_completed) as tasks FROM ai_agents WHERE user_id = $1', [req.user.userId]),
      db.query('SELECT COUNT(*) as count, SUM(tokens_used) as tokens FROM skill_executions WHERE user_id = $1', [req.user.userId]),
      db.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = $2) as live FROM streams WHERE user_id = $1', [req.user.userId, 'live']),
      db.query('SELECT COALESCE(SUM(amount_usd), 0) as total FROM cost_tracking WHERE user_id = $1', [req.user.userId])
    ]);

    res.json({
      agents: parseInt(agentsResult.rows[0].count) || 0,
      tasks: parseInt(agentsResult.rows[0].tasks) || 0,
      skills: parseInt(skillsResult.rows[0].count) || 0,
      tokens: parseInt(skillsResult.rows[0].tokens) || 0,
      streams: parseInt(streamsResult.rows[0].total) || 0,
      liveStreams: parseInt(streamsResult.rows[0].live) || 0,
      totalCost: parseFloat(costResult.rows[0].total) || 0,
      uptime: 99.9
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/stats/costs', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = parseInt(period) || 30;

    const result = await db.query(
      `SELECT service, SUM(amount_usd) as total, COUNT(*) as count
       FROM cost_tracking
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY service
       ORDER BY total DESC`,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cost breakdown' });
  }
});

// ==================== SYSTEM STATUS ====================

app.get('/api/system/status', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM system_status ORDER BY service');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

// ==================== MCP ROUTES (for MCP Server integration) ====================

app.post('/api/mcp/create_stream', async (req, res) => {
  try {
    const { title, platform } = req.body;
    const result = await db.query(
      'INSERT INTO streams (user_id, title, platform) VALUES ($1, $2, $3) RETURNING *',
      [req.user.userId, title, platform]
    );
    res.json({ success: true, stream: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

app.post('/api/mcp/generate_voice', async (req, res) => {
  try {
    const { text, voice_id, agent_id } = req.body;
    // In production, this would call ElevenLabs API
    res.json({
      success: true,
      audio_url: `https://api.elevenlabs.io/v1/text-to-speech/${voice_id || 'default'}`,
      text_length: text.length,
      estimated_duration: Math.ceil(text.length / 15) // ~15 chars per second
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate voice' });
  }
});

app.post('/api/mcp/execute_skill', async (req, res) => {
  try {
    const { skill_name, input } = req.body;
    // Forward to skills endpoint
    req.body.skillName = skill_name;
    const response = await fetch(`http://localhost:${PORT}/api/skills/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify({ skillName: skill_name, input })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to execute skill' });
  }
});

app.post('/api/mcp/get_analytics', async (req, res) => {
  try {
    const { metric_type } = req.body;
    let data;

    switch (metric_type) {
      case 'costs':
        const costsResult = await db.query(
          'SELECT service, SUM(amount_usd) as total FROM cost_tracking WHERE user_id = $1 GROUP BY service',
          [req.user.userId]
        );
        data = costsResult.rows;
        break;
      case 'tokens':
        const tokensResult = await db.query(
          'SELECT SUM(tokens_used) as total, COUNT(*) as executions FROM skill_executions WHERE user_id = $1',
          [req.user.userId]
        );
        data = tokensResult.rows[0];
        break;
      case 'streams':
        const streamsResult = await db.query(
          'SELECT status, COUNT(*) as count FROM streams WHERE user_id = $1 GROUP BY status',
          [req.user.userId]
        );
        data = streamsResult.rows;
        break;
      default:
        data = {};
    }

    res.json({ metric_type, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ==================== WEBSOCKET HANDLERS ====================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('chat:message', async (msg) => {
    try {
      await db.query(
        'INSERT INTO chat_messages (stream_id, platform, username, message) VALUES ($1, $2, $3, $4)',
        [msg.streamId, msg.platform, msg.username, msg.message]
      );
      io.emit('chat:message', { ...msg, timestamp: new Date() });
    } catch (err) {
      console.error('Chat message error:', err);
    }
  });

  socket.on('stream:metrics', (data) => {
    io.emit('stream:metrics', data);
  });

  socket.on('agent:task:start', (data) => {
    io.emit('agent:task:start', data);
  });

  socket.on('agent:task:complete', (data) => {
    io.emit('agent:task:complete', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ███████╗██╗    ██╗ █████╗ ███╗   ██╗██╗   ██╗      ║
║   ██╔════╝██║    ██║██╔══██╗████╗  ██║╚██╗ ██╔╝      ║
║   ███████╗██║ █╗ ██║███████║██╔██╗ ██║ ╚████╔╝       ║
║   ╚════██║██║███╗██║██╔══██║██║╚██╗██║  ╚██╔╝        ║
║   ███████║╚███╔███╔╝██║  ██║██║ ╚████║   ██║         ║
║   ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝         ║
║                                                       ║
║   SwanyThree Ultimate API v1.0.0                     ║
║   Running on port ${PORT}                               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
