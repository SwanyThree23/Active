import db from './database.js';
import { v4 as uuidv4 } from 'uuid';

console.log('Seeding database...');

// Clear existing data
db.exec('DELETE FROM workflows');
db.exec('DELETE FROM workflow_executions');
db.exec('DELETE FROM agents');
db.exec('DELETE FROM openrouter_models');
db.exec('DELETE FROM voice_clones');
db.exec('DELETE FROM bloom_evaluations');
db.exec('DELETE FROM mcp_connections');
db.exec('DELETE FROM products');

// Seed Workflows
const workflows = [
  { id: 'wf_001', name: 'OpenRouter AI Pipeline', description: 'Multi-model routing with cost optimization', status: 'active', executions: 4892, nodes: 28, success_rate: 99.2, avg_duration: '8.5s', last_run: '2m ago', cost: '$45.80/month', category: 'ai', integrations: JSON.stringify(['OpenRouter', 'LLMLingua', 'Supabase']) },
  { id: 'wf_002', name: 'Voice Clone Synthesis', description: 'ElevenLabs voice generation automation', status: 'active', executions: 678, nodes: 22, success_rate: 97.3, avg_duration: '15.2s', last_run: '8m ago', cost: '$28.40/month', category: 'voice', integrations: JSON.stringify(['ElevenLabs', 'Storage', 'CDN']) },
  { id: 'wf_003', name: 'Bloom Evaluation Runner', description: 'Automated behavioral evaluation pipeline', status: 'active', executions: 289, nodes: 35, success_rate: 98.7, avg_duration: '2m 34s', last_run: '25m ago', cost: '$67.20/month', category: 'evaluation', integrations: JSON.stringify(['Anthropic', 'Database', 'Analytics']) },
  { id: 'wf_004', name: 'E-commerce Image Optimizer', description: 'AI-powered product image enhancement', status: 'active', executions: 1456, nodes: 31, success_rate: 96.4, avg_duration: '12.8s', last_run: '5m ago', cost: '$34.90/month', category: 'ecommerce', integrations: JSON.stringify(['Gemini Vision', 'Storage', 'Shopify']) },
  { id: 'wf_005', name: 'MCP Server Bridge', description: 'Claude Desktop/Cursor integration', status: 'active', executions: 3247, nodes: 18, success_rate: 99.8, avg_duration: '1.2s', last_run: '30s ago', cost: '$12.60/month', category: 'integration', integrations: JSON.stringify(['MCP', 'Webhooks', 'Auth']) }
];

const insertWorkflow = db.prepare(`
  INSERT INTO workflows (id, name, description, status, executions, nodes, success_rate, avg_duration, last_run, cost, category, integrations)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

workflows.forEach(w => {
  insertWorkflow.run(w.id, w.name, w.description, w.status, w.executions, w.nodes, w.success_rate, w.avg_duration, w.last_run, w.cost, w.category, w.integrations);
});

// Seed AI Agents
const agents = [
  { id: uuidv4(), name: 'Content Creator Pro', status: 'active', tasks: 847, model: 'Claude Sonnet 4.5', specialty: 'Blog posts, articles, scripts', cost: '$42.30', uptime: '99.8%', provider: 'anthropic' },
  { id: uuidv4(), name: 'SEO Optimizer Elite', status: 'active', tasks: 623, model: 'Gemini 3 Pro', specialty: 'Keywords, meta, rankings', cost: '$28.15', uptime: '99.5%', provider: 'google' },
  { id: uuidv4(), name: 'Video Production AI', status: 'idle', tasks: 234, model: 'GPT-5.2 + Runway', specialty: 'Editing, effects, thumbnails', cost: '$67.80', uptime: '98.2%', provider: 'openai' },
  { id: uuidv4(), name: 'Social Media Manager', status: 'active', tasks: 1456, model: 'Claude Opus 4', specialty: 'Posts, engagement, analytics', cost: '$35.60', uptime: '99.9%', provider: 'anthropic' },
  { id: uuidv4(), name: 'Code Development AI', status: 'active', tasks: 512, model: 'Claude Code', specialty: 'Full-stack, debugging, testing', cost: '$89.20', uptime: '99.7%', provider: 'anthropic' },
  { id: uuidv4(), name: 'Data Analyst Pro', status: 'active', tasks: 389, model: 'DeepSeek V3', specialty: 'Analytics, insights, predictions', cost: '$21.40', uptime: '99.6%', provider: 'deepseek' },
  { id: uuidv4(), name: 'Email Marketing AI', status: 'active', tasks: 892, model: 'GPT-5.2', specialty: 'Campaigns, A/B testing, automation', cost: '$31.90', uptime: '99.4%', provider: 'openai' },
  { id: uuidv4(), name: 'Image Generator', status: 'idle', tasks: 445, model: 'DALL-E 3 + Midjourney', specialty: 'Graphics, logos, brand assets', cost: '$54.70', uptime: '98.9%', provider: 'openai' }
];

const insertAgent = db.prepare(`
  INSERT INTO agents (id, name, status, tasks, model, specialty, cost, uptime, provider)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

agents.forEach(a => {
  insertAgent.run(a.id, a.name, a.status, a.tasks, a.model, a.specialty, a.cost, a.uptime, a.provider);
});

// Seed OpenRouter Models
const models = [
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', cost: '$3/1M', speed: 'fast', quality: 95, requests: 4521 },
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', cost: '$15/1M', speed: 'medium', quality: 98, requests: 1247 },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2', cost: '$10/1M', speed: 'fast', quality: 94, requests: 2834 },
  { id: 'google/gemini-3-pro', name: 'Gemini 3 Pro', cost: '$7/1M', speed: 'fast', quality: 92, requests: 1892 },
  { id: 'deepseek/deepseek-v3', name: 'DeepSeek V3', cost: '$0.27/1M', speed: 'very-fast', quality: 88, requests: 5621 }
];

const insertModel = db.prepare(`
  INSERT INTO openrouter_models (id, name, cost, speed, quality, requests)
  VALUES (?, ?, ?, ?, ?, ?)
`);

models.forEach(m => {
  insertModel.run(m.id, m.name, m.cost, m.speed, m.quality, m.requests);
});

// Seed Voice Clones
const voiceClones = [
  { id: uuidv4(), name: 'Professional Narrator', provider: 'ElevenLabs', status: 'ready', samples: 15, quality: 95, usage: 2847, language: 'English' },
  { id: uuidv4(), name: 'Casual Host', provider: 'ElevenLabs', status: 'ready', samples: 22, quality: 92, usage: 1923, language: 'English' },
  { id: uuidv4(), name: 'Customer Service', provider: 'ElevenLabs', status: 'training', samples: 8, quality: 78, usage: 0, language: 'Multi' }
];

const insertVoice = db.prepare(`
  INSERT INTO voice_clones (id, name, provider, status, samples, quality, usage, language)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

voiceClones.forEach(v => {
  insertVoice.run(v.id, v.name, v.provider, v.status, v.samples, v.quality, v.usage, v.language);
});

// Seed Bloom Evaluations
const evaluations = [
  { id: uuidv4(), behavior: 'Delusional Sycophancy', model: 'Claude Sonnet 4.5', elicitation_rate: 23, avg_presence: 4.2, rollouts: 100, status: 'completed', risk: 'low' },
  { id: uuidv4(), behavior: 'Self-Preservation', model: 'GPT-5.2', elicitation_rate: 67, avg_presence: 6.8, rollouts: 100, status: 'completed', risk: 'medium' },
  { id: uuidv4(), behavior: 'Instructed Sabotage', model: 'Gemini 3 Pro', elicitation_rate: 12, avg_presence: 2.4, rollouts: 50, status: 'running', risk: 'low' },
  { id: uuidv4(), behavior: 'Self-Preferential Bias', model: 'Claude Opus 4', elicitation_rate: 18, avg_presence: 3.6, rollouts: 100, status: 'completed', risk: 'low' }
];

const insertEval = db.prepare(`
  INSERT INTO bloom_evaluations (id, behavior, model, elicitation_rate, avg_presence, rollouts, status, risk)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

evaluations.forEach(e => {
  insertEval.run(e.id, e.behavior, e.model, e.elicitation_rate, e.avg_presence, e.rollouts, e.status, e.risk);
});

// Seed MCP Connections
const connections = [
  { id: uuidv4(), client_name: 'Claude Desktop', status: 'connected', requests_count: 847 },
  { id: uuidv4(), client_name: 'Lovable', status: 'connected', requests_count: 234 },
  { id: uuidv4(), client_name: 'Cursor', status: 'connected', requests_count: 166 }
];

const insertConnection = db.prepare(`
  INSERT INTO mcp_connections (id, client_name, status, requests_count)
  VALUES (?, ?, ?, ?)
`);

connections.forEach(c => {
  insertConnection.run(c.id, c.client_name, c.status, c.requests_count);
});

// Seed Products
const products = [
  { id: uuidv4(), name: 'Elegant Diamond Ring', sku: 'JWL-001', price: 2499, stock: 12, category: 'Rings', images: 8, optimized: 1, views: 1247 },
  { id: uuidv4(), name: 'Pearl Necklace Set', sku: 'JWL-002', price: 899, stock: 25, category: 'Necklaces', images: 6, optimized: 1, views: 892 },
  { id: uuidv4(), name: 'Gold Bracelet', sku: 'JWL-003', price: 1299, stock: 18, category: 'Bracelets', images: 5, optimized: 0, views: 634 },
  { id: uuidv4(), name: 'Sapphire Earrings', sku: 'JWL-004', price: 1899, stock: 8, category: 'Earrings', images: 7, optimized: 1, views: 1456 }
];

const insertProduct = db.prepare(`
  INSERT INTO products (id, name, sku, price, stock, category, images, optimized, views)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

products.forEach(p => {
  insertProduct.run(p.id, p.name, p.sku, p.price, p.stock, p.category, p.images, p.optimized, p.views);
});

// Seed LLMLingua Stats
db.prepare(`
  INSERT INTO llmlingua_stats (compression_ratio, tokens_compressed, tokens_saved, cost_saved, accuracy_preserved)
  VALUES (?, ?, ?, ?, ?)
`).run(0.5, 15247, 892340, 445.67, 97.8);

console.log('Database seeded successfully!');
