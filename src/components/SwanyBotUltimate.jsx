import React, { useState, useEffect } from 'react';
import {
  Activity, Bell, Bot, CheckCircle, Clock, DollarSign, Home, Mic2,
  Network, Plus, RefreshCw, Rocket, Route, Settings, ShoppingCart,
  Sparkles, Target, TrendingUp, Workflow, Zap, BarChart3, Brain, Monitor, Play
} from 'lucide-react';

export default function SwanyBotUltimate() {
  const [auth, setAuth] = useState(false);
  const [pwd, setPwd] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [n8nWorkflows, setN8nWorkflows] = useState([]);
  const [workflowExecutions, setWorkflowExecutions] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle');

  const [aiAgents] = useState([
    { id: 1, name: 'Content Creator Pro', status: 'active', tasks: 847, model: 'Claude Sonnet 4.5', specialty: 'Blog posts, articles, scripts', cost: '$42.30', uptime: '99.8%', provider: 'anthropic' },
    { id: 2, name: 'SEO Optimizer Elite', status: 'active', tasks: 623, model: 'Gemini 3 Pro', specialty: 'Keywords, meta, rankings', cost: '$28.15', uptime: '99.5%', provider: 'google' },
    { id: 3, name: 'Video Production AI', status: 'idle', tasks: 234, model: 'GPT-5.2 + Runway', specialty: 'Editing, effects, thumbnails', cost: '$67.80', uptime: '98.2%', provider: 'openai' },
    { id: 4, name: 'Social Media Manager', status: 'active', tasks: 1456, model: 'Claude Opus 4', specialty: 'Posts, engagement, analytics', cost: '$35.60', uptime: '99.9%', provider: 'anthropic' },
    { id: 5, name: 'Code Development AI', status: 'active', tasks: 512, model: 'Claude Code', specialty: 'Full-stack, debugging, testing', cost: '$89.20', uptime: '99.7%', provider: 'anthropic' },
    { id: 6, name: 'Data Analyst Pro', status: 'active', tasks: 389, model: 'DeepSeek V3', specialty: 'Analytics, insights, predictions', cost: '$21.40', uptime: '99.6%', provider: 'deepseek' },
    { id: 7, name: 'Email Marketing AI', status: 'active', tasks: 892, model: 'GPT-5.2', specialty: 'Campaigns, A/B testing, automation', cost: '$31.90', uptime: '99.4%', provider: 'openai' },
    { id: 8, name: 'Image Generator', status: 'idle', tasks: 445, model: 'DALL-E 3 + Midjourney', specialty: 'Graphics, logos, brand assets', cost: '$54.70', uptime: '98.9%', provider: 'openai' }
  ]);

  const [openRouterConfig] = useState({
    enabled: true,
    models: [
      { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', cost: '$3/1M', speed: 'fast', quality: 95, requests: 4521 },
      { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', cost: '$15/1M', speed: 'medium', quality: 98, requests: 1247 },
      { id: 'openai/gpt-5.2', name: 'GPT-5.2', cost: '$10/1M', speed: 'fast', quality: 94, requests: 2834 },
      { id: 'google/gemini-3-pro', name: 'Gemini 3 Pro', cost: '$7/1M', speed: 'fast', quality: 92, requests: 1892 },
      { id: 'deepseek/deepseek-v3', name: 'DeepSeek V3', cost: '$0.27/1M', speed: 'very-fast', quality: 88, requests: 5621 }
    ],
    totalRequests: 16115,
    totalCost: '$287.45'
  });

  const [llmLinguaStats] = useState({
    compressionRatio: 0.5, tokensSaved: 892340, costSaved: '$445.67', preserveAccuracy: 97.8
  });

  const [voiceClones] = useState([
    { id: 1, name: 'Professional Narrator', provider: 'ElevenLabs', status: 'ready', samples: 15, quality: 95, usage: 2847, language: 'English' },
    { id: 2, name: 'Casual Host', provider: 'ElevenLabs', status: 'ready', samples: 22, quality: 92, usage: 1923, language: 'English' },
    { id: 3, name: 'Customer Service', provider: 'ElevenLabs', status: 'training', samples: 8, quality: 78, usage: 0, language: 'Multi' }
  ]);

  const [bloomEvaluations] = useState([
    { id: 1, behavior: 'Delusional Sycophancy', model: 'Claude Sonnet 4.5', elicitationRate: 23, avgPresence: 4.2, rollouts: 100, status: 'completed', risk: 'low' },
    { id: 2, behavior: 'Self-Preservation', model: 'GPT-5.2', elicitationRate: 67, avgPresence: 6.8, rollouts: 100, status: 'completed', risk: 'medium' },
    { id: 3, behavior: 'Instructed Sabotage', model: 'Gemini 3 Pro', elicitationRate: 12, avgPresence: 2.4, rollouts: 50, status: 'running', risk: 'low' },
    { id: 4, behavior: 'Self-Preferential Bias', model: 'Claude Opus 4', elicitationRate: 18, avgPresence: 3.6, rollouts: 100, status: 'completed', risk: 'low' }
  ]);

  const [mcpConfig] = useState({
    serverUrl: 'https://techmunity.app.n8n.cloud/mcp-server/http',
    accessToken: '******L8rs',
    connectedClients: ['Claude Desktop', 'Lovable', 'Cursor'],
    status: 'connected',
    activeConnections: 3,
    requestsToday: 1247,
    avgLatency: '45ms'
  });

  const [products] = useState([
    { id: 1, name: 'Elegant Diamond Ring', sku: 'JWL-001', price: 2499, stock: 12, category: 'Rings', images: 8, optimized: true, views: 1247 },
    { id: 2, name: 'Pearl Necklace Set', sku: 'JWL-002', price: 899, stock: 25, category: 'Necklaces', images: 6, optimized: true, views: 892 },
    { id: 3, name: 'Gold Bracelet', sku: 'JWL-003', price: 1299, stock: 18, category: 'Bracelets', images: 5, optimized: false, views: 634 },
    { id: 4, name: 'Sapphire Earrings', sku: 'JWL-004', price: 1899, stock: 8, category: 'Earrings', images: 7, optimized: true, views: 1456 }
  ]);

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const card = isDark ? 'bg-gray-800' : 'bg-white';
  const border = isDark ? 'border-gray-700' : 'border-gray-200';
  const text = isDark ? 'text-gray-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';

  const syncN8nWorkflows = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setN8nWorkflows([
        { id: 'wf_001', name: 'OpenRouter AI Pipeline', description: 'Multi-model routing with cost optimization', status: 'active', executions: 4892, successRate: 99.2, lastRun: '2m ago', cost: '$45.80/month', integrations: ['OpenRouter', 'LLMLingua', 'Supabase'] },
        { id: 'wf_002', name: 'Voice Clone Synthesis', description: 'ElevenLabs voice generation automation', status: 'active', executions: 678, successRate: 97.3, lastRun: '8m ago', cost: '$28.40/month', integrations: ['ElevenLabs', 'Storage', 'CDN'] },
        { id: 'wf_003', name: 'Bloom Evaluation Runner', description: 'Automated behavioral evaluation pipeline', status: 'active', executions: 289, successRate: 98.7, lastRun: '25m ago', cost: '$67.20/month', integrations: ['Anthropic', 'Database', 'Analytics'] },
        { id: 'wf_004', name: 'E-commerce Image Optimizer', description: 'AI-powered product image enhancement', status: 'active', executions: 1456, successRate: 96.4, lastRun: '5m ago', cost: '$34.90/month', integrations: ['Gemini Vision', 'Storage', 'Shopify'] },
        { id: 'wf_005', name: 'MCP Server Bridge', description: 'Claude Desktop/Cursor integration', status: 'active', executions: 3247, successRate: 99.8, lastRun: '30s ago', cost: '$12.60/month', integrations: ['MCP', 'Webhooks', 'Auth'] }
      ]);
      setWorkflowExecutions([
        { id: 'ex_001', workflow: 'OpenRouter AI Pipeline', status: 'success', duration: '7.2s', time: '1m ago', model: 'Claude Sonnet 4.5', tokens: 1247 },
        { id: 'ex_002', workflow: 'Voice Clone Synthesis', status: 'success', duration: '14.9s', time: '2m ago', model: 'ElevenLabs', tokens: 0 },
        { id: 'ex_003', workflow: 'E-commerce Image Optimizer', status: 'running', duration: '8.1s', time: 'now', model: 'Gemini Vision', tokens: 892 },
        { id: 'ex_004', workflow: 'MCP Server Bridge', status: 'success', duration: '0.9s', time: '30s ago', model: 'n/a', tokens: 0 },
        { id: 'ex_005', workflow: 'Bloom Evaluation Runner', status: 'success', duration: '2m 12s', time: '8m ago', model: 'Claude Opus 4', tokens: 8934 }
      ]);
      setSyncStatus('synced');
    }, 1500);
  };

  useEffect(() => { if (auth && n8nWorkflows.length === 0) syncN8nWorkflows(); }, [auth]);

  const activeAgents = aiAgents.filter(a => a.status === 'active').length;
  const totalTasks = aiAgents.reduce((sum, a) => sum + a.tasks, 0);

  const navItems = [
    { key: 'dashboard', icon: Home, label: 'Dashboard' },
    { key: 'n8n-workflows', icon: Workflow, label: 'n8n Workflows', badge: n8nWorkflows.length || '...' },
    { key: 'openrouter', icon: Route, label: 'OpenRouter', badge: 'NEW' },
    { key: 'llmlingua', icon: Zap, label: 'LLMLingua', badge: '50%' },
    { key: 'ai-agents', icon: Bot, label: 'AI Agents', badge: activeAgents },
    { key: 'voice-cloning', icon: Mic2, label: 'Voice Cloning', badge: voiceClones.length },
    { key: 'bloom-eval', icon: Target, label: 'Bloom Evaluation', badge: bloomEvaluations.length },
    { key: 'mcp-integration', icon: Network, label: 'MCP Integration', badge: mcpConfig.activeConnections },
    { key: 'ecommerce', icon: ShoppingCart, label: 'E-Commerce', badge: products.length },
    { key: 'analytics', icon: BarChart3, label: 'Analytics' },
    { key: 'settings', icon: Settings, label: 'Settings' }
  ];

  if (!auth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">SwanyBot Ultimate</h1>
            <p className="text-gray-600 font-semibold">Complete AI Business Platform</p>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {['n8n Cloud', 'OpenRouter', 'LLMLingua', 'ElevenLabs', 'Bloom', 'MCP'].map((tag, i) => (
                <span key={i} className={`px-2 py-1 text-xs rounded-full font-medium ${['bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700'][i]}`}>{tag}</span>
              ))}
            </div>
          </div>
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && pwd === 'swanypro2026' && setAuth(true)} placeholder="Enter password" className="w-full px-4 py-3 border-2 rounded-lg mb-4 focus:border-purple-500 focus:outline-none" />
          <button onClick={() => pwd === 'swanypro2026' && setAuth(true)} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-bold hover:opacity-90 shadow-lg">Access Platform</button>
          <p className="text-xs text-gray-500 mt-4 text-center">Password: swanypro2026</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Agents', value: activeAgents, sub: '+2 this week', color: 'purple', icon: Bot },
          { label: 'Total Tasks', value: totalTasks.toLocaleString(), sub: '+847 today', color: 'blue', icon: Activity },
          { label: 'Tokens Saved', value: '892K', sub: llmLinguaStats.costSaved + ' saved', color: 'green', icon: Zap },
          { label: 'MCP Requests', value: mcpConfig.requestsToday.toLocaleString(), sub: mcpConfig.avgLatency + ' avg', color: 'indigo', icon: Network }
        ].map((stat, i) => (
          <div key={i} className={`${card} rounded-xl p-5 border ${border}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={textMuted}>{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
                <p className="text-green-500 text-sm mt-1">{stat.sub}</p>
              </div>
              <div className={`w-12 h-12 bg-${stat.color}-500/20 rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-500`} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${card} rounded-xl border ${border} overflow-hidden`}>
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2"><Workflow className="w-5 h-5 text-purple-500" /><h3 className="font-bold">n8n Cloud Workflows</h3></div>
            <button onClick={syncN8nWorkflows} className={`p-2 rounded-lg hover:bg-gray-700 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}><RefreshCw className="w-4 h-4" /></button>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {n8nWorkflows.length === 0 ? (
              <div className="text-center py-8"><RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-purple-500" /><p className={textMuted}>Syncing...</p></div>
            ) : n8nWorkflows.map(wf => (
              <div key={wf.id} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'} hover:ring-2 ring-purple-500/50 cursor-pointer`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{wf.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-500">{wf.status}</span>
                </div>
                <p className={`text-sm ${textMuted} mb-2`}>{wf.description}</p>
                <div className="flex items-center gap-4 text-xs"><span className={text}>{wf.executions.toLocaleString()} runs</span><span className={text}>{wf.successRate}% success</span><span className={text}>{wf.lastRun}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className={`${card} rounded-xl border ${border} overflow-hidden`}>
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2"><Activity className="w-5 h-5 text-blue-500" /><h3 className="font-bold">Recent Executions</h3></div>
            <span className={`text-xs ${textMuted}`}>Live</span>
          </div>
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {workflowExecutions.map(ex => (
              <div key={ex.id} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${ex.status === 'success' ? 'bg-green-500' : ex.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`} />
                  <div><p className="font-medium text-sm">{ex.workflow}</p><p className={`text-xs ${textMuted}`}>{ex.model} {ex.tokens > 0 && `• ${ex.tokens} tokens`}</p></div>
                </div>
                <div className="text-right"><p className="text-sm font-medium">{ex.duration}</p><p className={`text-xs ${textMuted}`}>{ex.time}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={`${card} rounded-xl border ${border} overflow-hidden`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-green-500" /><h3 className="font-bold">AI Agent Swarm</h3></div>
          <span className="text-sm text-green-500 font-medium">{activeAgents} Active</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {aiAgents.slice(0, 4).map(agent => (
            <div key={agent.id} className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className={`text-xs px-2 py-0.5 rounded-full ${agent.provider === 'anthropic' ? 'bg-orange-500/20 text-orange-500' : agent.provider === 'openai' ? 'bg-green-500/20 text-green-500' : agent.provider === 'google' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>{agent.provider}</span>
              </div>
              <h4 className="font-semibold text-sm mb-1">{agent.name}</h4>
              <p className={`text-xs ${textMuted} mb-2`}>{agent.model}</p>
              <div className="flex items-center justify-between text-xs"><span>{agent.tasks} tasks</span><span className="text-green-500">{agent.cost}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderN8nWorkflows = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">n8n Cloud Workflows</h2><p className={textMuted}>Connected to techmunity.app.n8n.cloud</p></div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${syncStatus === 'synced' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
            <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} /><span className="text-sm font-medium">{syncStatus === 'synced' ? 'Synced' : 'Syncing...'}</span>
          </div>
          <button onClick={syncN8nWorkflows} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"><RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />Sync</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {n8nWorkflows.map(wf => (
          <div key={wf.id} className={`${card} rounded-xl border ${border} p-5 hover:ring-2 ring-purple-500/50`}>
            <div className="flex items-start justify-between mb-3">
              <div><h3 className="font-bold text-lg">{wf.name}</h3><p className={`text-sm ${textMuted}`}>{wf.description}</p></div>
              <span className="px-2 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-500">{wf.status}</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">{wf.integrations.map((int, i) => (<span key={i} className={`px-2 py-1 rounded-md text-xs ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>{int}</span>))}</div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div><p className={`text-xs ${textMuted}`}>Executions</p><p className="font-bold">{wf.executions.toLocaleString()}</p></div>
              <div><p className={`text-xs ${textMuted}`}>Success Rate</p><p className="font-bold text-green-500">{wf.successRate}%</p></div>
              <div><p className={`text-xs ${textMuted}`}>Last Run</p><p className="font-bold">{wf.lastRun}</p></div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-700"><span className={`text-sm ${textMuted}`}>Cost: {wf.cost}</span></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOpenRouter = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">OpenRouter Configuration</h2><p className={textMuted}>Multi-model routing with cost optimization</p></div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-green-500 text-sm font-medium">Connected</span></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[{ label: 'Total Requests', value: openRouterConfig.totalRequests.toLocaleString() }, { label: 'Total Cost', value: openRouterConfig.totalCost }, { label: 'Routing Strategy', value: 'Cost Optimized' }, { label: 'Fallback', value: 'Enabled', color: 'text-green-500' }].map((s, i) => (
          <div key={i} className={`${card} rounded-xl p-5 border ${border}`}><p className={textMuted}>{s.label}</p><p className={`text-2xl font-bold mt-1 ${s.color || ''}`}>{s.value}</p></div>
        ))}
      </div>
      <div className={`${card} rounded-xl border ${border} overflow-hidden`}>
        <div className="p-4 border-b border-gray-700"><h3 className="font-bold">Available Models</h3></div>
        <div className="p-4 space-y-3">
          {openRouterConfig.models.map((model, i) => (
            <div key={i} className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'} flex items-center justify-between`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${model.id.includes('anthropic') ? 'bg-orange-500/20' : model.id.includes('openai') ? 'bg-green-500/20' : model.id.includes('google') ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                  <Brain className={`w-5 h-5 ${model.id.includes('anthropic') ? 'text-orange-500' : model.id.includes('openai') ? 'text-green-500' : model.id.includes('google') ? 'text-blue-500' : 'text-purple-500'}`} />
                </div>
                <div><p className="font-semibold">{model.name}</p><p className={`text-sm ${textMuted}`}>{model.id}</p></div>
              </div>
              <div className="flex items-center gap-6">
                {[{ l: 'Cost', v: model.cost }, { l: 'Speed', v: model.speed }, { l: 'Quality', v: model.quality + '%' }, { l: 'Requests', v: model.requests.toLocaleString() }].map((d, j) => (
                  <div key={j} className="text-center"><p className={`text-xs ${textMuted}`}>{d.l}</p><p className="font-medium capitalize">{d.v}</p></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLLMLingua = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">LLMLingua Compression</h2><p className={textMuted}>Token optimization for cost savings</p></div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg"><Zap className="w-4 h-4 text-green-500" /><span className="text-green-500 text-sm font-medium">Active</span></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[{ label: 'Compression Ratio', value: '50%', sub: 'Reduction achieved', icon: Zap, color: 'yellow' }, { label: 'Tokens Saved', value: '892K', sub: 'Total saved', icon: TrendingUp, color: 'green' }, { label: 'Cost Saved', value: llmLinguaStats.costSaved, sub: 'This month', icon: DollarSign, color: 'green' }, { label: 'Accuracy Preserved', value: llmLinguaStats.preserveAccuracy + '%', sub: 'Semantic retention', icon: Target, color: 'blue' }].map((s, i) => (
          <div key={i} className={`${card} rounded-xl p-5 border ${border}`}>
            <div className="flex items-center justify-between mb-2"><p className={textMuted}>{s.label}</p><s.icon className={`w-5 h-5 text-${s.color}-500`} /></div>
            <p className="text-3xl font-bold">{s.value}</p><p className={`text-${s.color}-500 text-sm mt-1`}>{s.sub}</p>
          </div>
        ))}
      </div>
      <div className={`${card} rounded-xl border ${border} p-6`}>
        <h3 className="font-bold mb-4">Compression Statistics</h3>
        <div className="space-y-4">
          {[{ l: 'Token Reduction', v: 50, c: 'from-green-500 to-emerald-500' }, { l: 'Semantic Preservation', v: 97.8, c: 'from-blue-500 to-indigo-500' }, { l: 'Processing Speed', v: 85, c: 'from-purple-500 to-pink-500' }].map((b, i) => (
            <div key={i}><div className="flex justify-between mb-1"><span>{b.l}</span><span className="font-bold">{b.v}%</span></div><div className="h-3 bg-gray-700 rounded-full overflow-hidden"><div className={`h-full bg-gradient-to-r ${b.c} rounded-full`} style={{ width: b.v + '%' }} /></div></div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAIAgents = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">AI Agent Swarm</h2><p className={textMuted}>Multi-provider agent orchestration</p></div>
        <div className="flex items-center gap-3"><span className="text-green-500 font-medium">{activeAgents} Active</span><button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"><Plus className="w-4 h-4" />Add Agent</button></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {aiAgents.map(agent => (
          <div key={agent.id} className={`${card} rounded-xl border ${border} p-5 hover:ring-2 ring-purple-500/50`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`px-2 py-1 rounded-lg text-xs font-medium ${agent.provider === 'anthropic' ? 'bg-orange-500/20 text-orange-500' : agent.provider === 'openai' ? 'bg-green-500/20 text-green-500' : agent.provider === 'google' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>{agent.provider}</div>
              <div className={`w-3 h-3 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            </div>
            <h3 className="font-bold text-lg mb-1">{agent.name}</h3>
            <p className={`text-sm ${textMuted} mb-3`}>{agent.model}</p>
            <p className={`text-xs ${text} mb-4`}>{agent.specialty}</p>
            <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-gray-700">
              <div><p className="font-bold">{agent.tasks}</p><p className={`text-xs ${textMuted}`}>Tasks</p></div>
              <div><p className="font-bold text-green-500">{agent.cost}</p><p className={`text-xs ${textMuted}`}>Cost</p></div>
              <div><p className="font-bold">{agent.uptime}</p><p className={`text-xs ${textMuted}`}>Uptime</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVoiceCloning = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Voice Cloning</h2><p className={textMuted}>ElevenLabs voice synthesis automation</p></div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"><Plus className="w-4 h-4" />New Voice</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {voiceClones.map(voice => (
          <div key={voice.id} className={`${card} rounded-xl border ${border} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center"><Mic2 className="w-6 h-6 text-white" /></div>
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${voice.status === 'ready' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>{voice.status}</span>
            </div>
            <h3 className="font-bold text-lg mb-1">{voice.name}</h3>
            <p className={`text-sm ${textMuted} mb-4`}>{voice.provider} • {voice.language}</p>
            <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-gray-700">
              <div><p className="font-bold">{voice.samples}</p><p className={`text-xs ${textMuted}`}>Samples</p></div>
              <div><p className="font-bold">{voice.quality}%</p><p className={`text-xs ${textMuted}`}>Quality</p></div>
              <div><p className="font-bold">{voice.usage.toLocaleString()}</p><p className={`text-xs ${textMuted}`}>Uses</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBloomEval = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Bloom Evaluation Framework</h2><p className={textMuted}>AI behavioral alignment testing</p></div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"><Play className="w-4 h-4" />Run Evaluation</button>
      </div>
      <div className={`${card} rounded-xl border ${border} overflow-hidden`}>
        <div className="p-4 border-b border-gray-700"><h3 className="font-bold">Behavioral Evaluations</h3></div>
        <div className="p-4 space-y-4">
          {bloomEvaluations.map(ev => (
            <div key={ev.id} className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Target className={`w-5 h-5 ${ev.risk === 'low' ? 'text-green-500' : ev.risk === 'medium' ? 'text-yellow-500' : 'text-red-500'}`} />
                  <div><h4 className="font-semibold">{ev.behavior}</h4><p className={`text-sm ${textMuted}`}>{ev.model}</p></div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${ev.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>{ev.status}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><p className={`text-xs ${textMuted}`}>Elicitation Rate</p><p className="font-bold">{ev.elicitationRate}%</p></div>
                <div><p className={`text-xs ${textMuted}`}>Avg Presence</p><p className="font-bold">{ev.avgPresence}/10</p></div>
                <div><p className={`text-xs ${textMuted}`}>Rollouts</p><p className="font-bold">{ev.rollouts}</p></div>
                <div><p className={`text-xs ${textMuted}`}>Risk Level</p><p className={`font-bold capitalize ${ev.risk === 'low' ? 'text-green-500' : ev.risk === 'medium' ? 'text-yellow-500' : 'text-red-500'}`}>{ev.risk}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMCPIntegration = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">MCP Server Integration</h2><p className={textMuted}>Claude Desktop, Lovable, Cursor connection</p></div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg"><Network className="w-4 h-4 text-green-500" /><span className="text-green-500 text-sm font-medium">{mcpConfig.status}</span></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${card} rounded-xl p-5 border ${border}`}><p className={textMuted}>Active Connections</p><p className="text-3xl font-bold mt-1">{mcpConfig.activeConnections}</p></div>
        <div className={`${card} rounded-xl p-5 border ${border}`}><p className={textMuted}>Requests Today</p><p className="text-3xl font-bold mt-1">{mcpConfig.requestsToday.toLocaleString()}</p></div>
        <div className={`${card} rounded-xl p-5 border ${border}`}><p className={textMuted}>Avg Latency</p><p className="text-3xl font-bold mt-1">{mcpConfig.avgLatency}</p></div>
      </div>
      <div className={`${card} rounded-xl border ${border} p-6`}>
        <h3 className="font-bold mb-4">Server Configuration</h3>
        <div className="space-y-4">
          <div><label className={`text-sm ${textMuted}`}>Server URL</label><div className={`mt-1 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} font-mono text-sm`}>{mcpConfig.serverUrl}</div></div>
          <div><label className={`text-sm ${textMuted}`}>Access Token</label><div className={`mt-1 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} font-mono text-sm`}>{mcpConfig.accessToken}</div></div>
        </div>
      </div>
      <div className={`${card} rounded-xl border ${border} overflow-hidden`}>
        <div className="p-4 border-b border-gray-700"><h3 className="font-bold">Connected Clients</h3></div>
        <div className="p-4 space-y-3">
          {mcpConfig.connectedClients.map((client, i) => (
            <div key={i} className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center"><Monitor className="w-5 h-5 text-white" /></div>
                <div><p className="font-semibold">{client}</p><p className={`text-sm ${textMuted}`}>Connected</p></div>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEcommerce = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">E-Commerce Suite</h2><p className={textMuted}>Jewelry product management with AI optimization</p></div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"><Plus className="w-4 h-4" />Add Product</button>
      </div>
      <div className={`${card} rounded-xl border ${border} overflow-hidden`}>
        <div className="p-4 border-b border-gray-700"><h3 className="font-bold">Products</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-gray-700/50' : 'bg-gray-100'}>
              <tr>{['Product', 'SKU', 'Price', 'Stock', 'Images', 'Views', 'Optimized'].map((h, i) => (<th key={i} className="px-4 py-3 text-left text-sm font-semibold">{h}</th>))}</tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className={`border-t ${border} hover:${isDark ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div><div><p className="font-medium">{p.name}</p><p className={`text-xs ${textMuted}`}>{p.category}</p></div></div></td>
                  <td className="px-4 py-3 font-mono text-sm">{p.sku}</td>
                  <td className="px-4 py-3 font-bold">${p.price.toLocaleString()}</td>
                  <td className="px-4 py-3">{p.stock}</td>
                  <td className="px-4 py-3">{p.images}</td>
                  <td className="px-4 py-3">{p.views.toLocaleString()}</td>
                  <td className="px-4 py-3">{p.optimized ? <span className="flex items-center gap-1 text-green-500"><CheckCircle className="w-4 h-4" />Yes</span> : <span className="flex items-center gap-1 text-yellow-500"><Clock className="w-4 h-4" />Pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Analytics Dashboard</h2><p className={textMuted}>System-wide performance metrics</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[{ l: 'Total API Calls', v: '1.2M', s: '+15% this month' }, { l: 'Avg Response Time', v: '245ms', s: '-12% improved' }, { l: 'Success Rate', v: '99.7%', s: 'Above target' }, { l: 'Total Revenue', v: '$48.5K', s: '+23% growth' }].map((s, i) => (
          <div key={i} className={`${card} rounded-xl p-5 border ${border}`}><p className={textMuted}>{s.l}</p><p className="text-3xl font-bold mt-1">{s.v}</p><p className="text-green-500 text-sm mt-1">{s.s}</p></div>
        ))}
      </div>
      <div className={`${card} rounded-xl border ${border} p-6`}>
        <h3 className="font-bold mb-4">Performance Overview</h3>
        <div className="h-64 flex items-center justify-center"><div className="text-center"><BarChart3 className={`w-16 h-16 mx-auto mb-4 ${textMuted}`} /><p className={textMuted}>Analytics visualization</p></div></div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Settings</h2><p className={textMuted}>Configure your SwanyBot Ultimate instance</p></div>
      <div className={`${card} rounded-xl border ${border} p-6`}>
        <h3 className="font-bold mb-4">General Settings</h3>
        <div className="space-y-4">
          {[{ l: 'Dark Mode', d: 'Toggle dark/light theme', active: isDark, action: () => setTheme(isDark ? 'light' : 'dark') }, { l: 'Auto-sync Workflows', d: 'Automatically sync n8n workflows', active: true }, { l: 'LLMLingua Compression', d: 'Enable token compression', active: true }].map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <div><p className="font-medium">{s.l}</p><p className={`text-sm ${textMuted}`}>{s.d}</p></div>
              <button onClick={s.action} className={`w-12 h-6 rounded-full transition-colors ${s.active ? 'bg-purple-600' : 'bg-gray-500'} relative`}><div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${s.active ? 'right-0.5' : 'left-0.5'}`} /></button>
            </div>
          ))}
        </div>
      </div>
      <div className={`${card} rounded-xl border ${border} p-6`}>
        <h3 className="font-bold mb-4">API Keys</h3>
        <div className="space-y-4">
          {[{ l: 'OpenRouter API Key', v: 'sk-or-v1-****' }, { l: 'ElevenLabs API Key', v: '****' }, { l: 'n8n Cloud Webhook URL', v: 'https://techmunity.app.n8n.cloud' }].map((k, i) => (
            <div key={i}><label className={`text-sm ${textMuted}`}>{k.l}</label><input type={k.l.includes('Key') ? 'password' : 'text'} defaultValue={k.v} className={`w-full mt-1 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} border ${border}`} /></div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (tab) {
      case 'dashboard': return renderDashboard();
      case 'n8n-workflows': return renderN8nWorkflows();
      case 'openrouter': return renderOpenRouter();
      case 'llmlingua': return renderLLMLingua();
      case 'ai-agents': return renderAIAgents();
      case 'voice-cloning': return renderVoiceCloning();
      case 'bloom-eval': return renderBloomEval();
      case 'mcp-integration': return renderMCPIntegration();
      case 'ecommerce': return renderEcommerce();
      case 'analytics': return renderAnalytics();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  return (
    <div className={`min-h-screen ${bg} ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <nav className={`${card} border-b ${border} sticky top-0 z-50 shadow-lg backdrop-blur-lg bg-opacity-90`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-10 h-10 rounded-lg flex items-center justify-center shadow-lg"><Rocket className="w-6 h-6 text-white" /></div>
              <div><h1 className="text-lg font-black">SwanyBot Ultimate</h1><p className="text-xs text-gray-500">AI Business OS + n8n Cloud</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-xs font-semibold text-green-500">All Systems Online</span></div>
              <button className="relative p-2 hover:bg-gray-700 rounded-lg"><Bell className="w-5 h-5" /><span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /></button>
              <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="p-2 hover:bg-gray-700 rounded-lg">{isDark ? '🌙' : '☀️'}</button>
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg">S</div>
            </div>
          </div>
        </div>
      </nav>
      <div className="flex">
        <aside className={`${card} border-r ${border} w-64 min-h-screen p-4 shadow-lg hidden md:block`}>
          <div className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.key} onClick={() => setTab(item.key)} className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg font-semibold transition-all ${tab === item.key ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : `${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}`}>
                  <div className="flex items-center gap-3"><Icon className="w-4 h-4" /><span className="text-sm">{item.label}</span></div>
                  {item.badge && <span className={`px-2 py-0.5 rounded-full text-xs ${tab === item.key ? 'bg-white/20 text-white' : 'bg-purple-500/20 text-purple-500'}`}>{item.badge}</span>}
                </button>
              );
            })}
          </div>
        </aside>
        <main className="flex-1 p-6"><div className="max-w-6xl mx-auto">{renderContent()}</div></main>
      </div>
    </div>
  );
}
