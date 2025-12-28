import db from './database.js';

console.log('Running migrations...');

// Workflows table
db.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    executions INTEGER DEFAULT 0,
    nodes INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 100.0,
    avg_duration TEXT DEFAULT '0s',
    last_run TEXT,
    cost TEXT DEFAULT '$0.00/month',
    category TEXT,
    integrations TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// Workflow Executions table
db.exec(`
  CREATE TABLE IF NOT EXISTS workflow_executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status TEXT NOT NULL,
    duration TEXT,
    model TEXT,
    tokens INTEGER DEFAULT 0,
    error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
  )
`);

// AI Agents table
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    tasks INTEGER DEFAULT 0,
    model TEXT NOT NULL,
    specialty TEXT,
    cost TEXT DEFAULT '$0.00',
    uptime TEXT DEFAULT '100%',
    provider TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// OpenRouter Models table
db.exec(`
  CREATE TABLE IF NOT EXISTS openrouter_models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cost TEXT,
    speed TEXT,
    quality INTEGER DEFAULT 90,
    requests INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// LLMLingua Stats table
db.exec(`
  CREATE TABLE IF NOT EXISTS llmlingua_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compression_ratio REAL DEFAULT 0.5,
    tokens_compressed INTEGER DEFAULT 0,
    tokens_saved INTEGER DEFAULT 0,
    cost_saved REAL DEFAULT 0.0,
    accuracy_preserved REAL DEFAULT 97.8,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Voice Clones table
db.exec(`
  CREATE TABLE IF NOT EXISTS voice_clones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT DEFAULT 'ElevenLabs',
    status TEXT DEFAULT 'ready',
    samples INTEGER DEFAULT 0,
    quality INTEGER DEFAULT 90,
    usage INTEGER DEFAULT 0,
    language TEXT DEFAULT 'English',
    voice_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// Bloom Evaluations table
db.exec(`
  CREATE TABLE IF NOT EXISTS bloom_evaluations (
    id TEXT PRIMARY KEY,
    behavior TEXT NOT NULL,
    model TEXT NOT NULL,
    elicitation_rate REAL DEFAULT 0.0,
    avg_presence REAL DEFAULT 0.0,
    rollouts INTEGER DEFAULT 100,
    status TEXT DEFAULT 'pending',
    risk TEXT DEFAULT 'low',
    results TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
  )
`);

// MCP Connections table
db.exec(`
  CREATE TABLE IF NOT EXISTS mcp_connections (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    status TEXT DEFAULT 'connected',
    requests_count INTEGER DEFAULT 0,
    last_request TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Products table
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    category TEXT,
    images INTEGER DEFAULT 0,
    optimized INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// Analytics table
db.exec(`
  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric TEXT NOT NULL,
    value REAL NOT NULL,
    period TEXT DEFAULT 'daily',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// API Logs table
db.exec(`
  CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

console.log('Migrations completed successfully!');
