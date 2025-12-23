import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity, Users, Mic, Radio, Video, BarChart3, Workflow,
  Bot, Zap, Globe, MessageSquare, Settings, Play, Square,
  TrendingUp, DollarSign, Clock, Cpu, Wifi, WifiOff,
  Youtube, Twitch, MessageCircle, Instagram, Music,
  ChevronRight, RefreshCw, Eye, Heart, Send, Volume2,
  Camera, Monitor, Layers, Sparkles, Shield, Lock, Unlock
} from 'lucide-react';

const API_URL = 'http://localhost:3000';

// ==================== AUTHENTICATION ====================

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">SwanyThree</h1>
            <p className="text-gray-400">Enterprise Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                required
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-gray-500 text-xs text-center mt-6">
            Password: swanypro2026
          </p>
        </div>
      </div>
    </div>
  );
};

// ==================== METRIC CARD ====================

const MetricCard = ({ icon: Icon, label, value, change, color, isAnimated = true }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isAnimated || typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }

    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, isAnimated]);

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"
           style={{ background: `linear-gradient(135deg, ${color}40, transparent)` }} />
      <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-[1.02]">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl" style={{ background: `linear-gradient(135deg, ${color}, ${color}80)` }}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {change && (
            <span className={`text-sm font-medium flex items-center gap-1 ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <TrendingUp className={`w-4 h-4 ${change < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(change)}%
            </span>
          )}
        </div>
        <div className="text-3xl font-black text-white mb-1">
          {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
        </div>
        <div className="text-sm text-gray-400">{label}</div>
      </div>
    </div>
  );
};

// ==================== SYSTEM STATUS MONITOR ====================

const SystemStatusMonitor = ({ services }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return 'bg-emerald-500';
      case 'degraded': return 'bg-yellow-500';
      case 'outage': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          System Status
        </h3>
        <span className="text-xs text-gray-400">12 services</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {services.map((service, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(service.status)} animate-pulse`} />
            <span className="text-xs text-gray-300 truncate">{service.service}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== WORKFLOW TRACKER ====================

const WorkflowTracker = ({ workflows }) => {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Workflow className="w-5 h-5 text-purple-400" />
        Active Workflows
      </h3>

      <div className="space-y-3">
        {workflows.slice(0, 5).map((workflow, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${workflow.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              <div>
                <div className="text-sm font-medium text-white">{workflow.name}</div>
                <div className="text-xs text-gray-400">{workflow.executions} executions</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== PLATFORM CONNECTIONS ====================

const PlatformConnections = ({ platforms }) => {
  const platformIcons = {
    twitch: Twitch,
    youtube: Youtube,
    discord: MessageCircle,
    tiktok: Video,
    instagram: Instagram
  };

  const platformColors = {
    twitch: '#9146FF',
    youtube: '#FF0000',
    discord: '#5865F2',
    tiktok: '#000000',
    instagram: '#E4405F'
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-cyan-400" />
        Platform Connections
      </h3>

      <div className="flex flex-wrap gap-3">
        {['twitch', 'youtube', 'discord', 'tiktok', 'instagram'].map((platform) => {
          const Icon = platformIcons[platform];
          const isConnected = platforms.some(p => p.platform === platform && p.is_connected);

          return (
            <div
              key={platform}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                isConnected ? 'bg-white/10' : 'bg-white/5 opacity-50'
              }`}
            >
              <Icon className="w-5 h-5" style={{ color: platformColors[platform] }} />
              <span className="text-sm text-white capitalize">{platform}</span>
              {isConnected ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-gray-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==================== COST SAVINGS BREAKDOWN ====================

const CostSavingsBreakdown = ({ costs }) => {
  const savings = [
    { service: 'LLMLingua', saved: 847, percentage: 45 },
    { service: 'Batch Processing', saved: 523, percentage: 32 },
    { service: 'Cache Hits', saved: 312, percentage: 28 },
    { service: 'Token Optimization', saved: 456, percentage: 38 }
  ];

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-emerald-400" />
        Cost Savings
      </h3>

      <div className="space-y-4">
        {savings.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">{item.service}</span>
              <span className="text-emerald-400">${item.saved} saved</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-1000"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-2xl font-black text-emerald-400">$2,138</div>
        <div className="text-sm text-gray-400">Total Monthly Savings</div>
      </div>
    </div>
  );
};

// ==================== STREAMING STUDIO ====================

const StreamingStudio = ({ stream, onStartStream, onStopStream }) => {
  const [viewerCount, setViewerCount] = useState(1247);
  const [chatRate, setChatRate] = useState(42);
  const [bitrate, setBitrate] = useState(6000);

  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 10 - 3));
      setChatRate(prev => Math.max(10, prev + Math.floor(Math.random() * 6 - 3)));
      setBitrate(prev => Math.max(4500, Math.min(8000, prev + Math.floor(Math.random() * 200 - 100))));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const chatMessages = [
    { user: 'TechNinja42', message: 'This stream is amazing!', badge: 'sub' },
    { user: 'CodeMaster', message: 'Can you show the API integration?', badge: 'mod' },
    { user: 'StreamFan99', message: 'First time here, loving it!', badge: null },
    { user: 'AIEnthusiast', message: 'The AI agents are incredible', badge: 'vip' },
    { user: 'DevOpsGuru', message: 'What cloud are you using?', badge: 'sub' }
  ];

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Video className="w-6 h-6 text-red-500" />
            Streaming Studio
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-emerald-400">OBS Connected</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 p-6">
        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden border border-white/10">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Monitor className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">Live Preview</p>
              </div>
            </div>

            {/* Live indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-bold text-white">LIVE</span>
            </div>

            {/* Viewer count */}
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full">
              <Eye className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-white">{viewerCount.toLocaleString()}</span>
            </div>

            {/* Stream metrics overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex gap-4">
              <div className="flex-1 bg-black/50 backdrop-blur-sm rounded-lg p-3">
                <div className="text-xs text-gray-400">Chat Rate</div>
                <div className="text-lg font-bold text-white">{chatRate}/min</div>
              </div>
              <div className="flex-1 bg-black/50 backdrop-blur-sm rounded-lg p-3">
                <div className="text-xs text-gray-400">Bitrate</div>
                <div className="text-lg font-bold text-white">{bitrate} kbps</div>
              </div>
              <div className="flex-1 bg-black/50 backdrop-blur-sm rounded-lg p-3">
                <div className="text-xs text-gray-400">Health</div>
                <div className="text-lg font-bold text-emerald-400">Excellent</div>
              </div>
            </div>
          </div>

          {/* Stream controls */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={onStartStream}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white font-bold rounded-xl transition-all"
            >
              <Play className="w-5 h-5" />
              Go Live
            </button>
            <button
              onClick={onStopStream}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all"
            >
              <Square className="w-5 h-5" />
              End
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex flex-col">
          <div className="bg-white/5 rounded-xl border border-white/10 flex-1 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h4 className="font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                Multi-Platform Chat
              </h4>
            </div>

            <div className="flex-1 p-4 space-y-3 max-h-64 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    msg.badge === 'mod' ? 'bg-green-500' :
                    msg.badge === 'vip' ? 'bg-purple-500' :
                    msg.badge === 'sub' ? 'bg-blue-500' : 'bg-gray-600'
                  }`}>
                    {msg.user[0]}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-cyan-400">{msg.user}: </span>
                    <span className="text-sm text-gray-300">{msg.message}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Send message..."
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-xl transition-all">
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* VDO.Ninja Room */}
          <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <h4 className="font-bold text-white flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4 text-orange-400" />
              VDO.Ninja Room
            </h4>
            <div className="flex gap-2">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                H
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                G1
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center text-gray-500">
                +
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== AI AGENTS HUB ====================

const AIAgentsHub = ({ agents, onAssignTask }) => {
  const [selectedAgent, setSelectedAgent] = useState(null);

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-purple-400" />
            AI Agents Hub
          </h3>
          <span className="text-sm text-gray-400">{agents.length} agents active</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
        {agents.map((agent, i) => {
          const gradientColors = agent.gradient_colors || ['#3b82f6', '#8b5cf6'];

          return (
            <div
              key={agent.id || i}
              onClick={() => setSelectedAgent(agent)}
              className="group relative cursor-pointer"
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-50 blur-xl group-hover:opacity-70 transition-opacity"
                style={{ background: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})` }}
              />
              <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-white/30 transition-all transform group-hover:scale-[1.02]">
                {/* Agent Avatar */}
                <div
                  className="w-14 h-14 rounded-xl mb-4 flex items-center justify-center text-2xl font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})` }}
                >
                  {agent.name?.[0] || 'A'}
                </div>

                {/* Agent Info */}
                <h4 className="text-lg font-bold text-white mb-1">{agent.name}</h4>
                <p className="text-sm text-gray-400 capitalize mb-3">{agent.type?.replace('_', ' ')}</p>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {(agent.specialties || []).slice(0, 2).map((spec, j) => (
                    <span key={j} className="text-xs px-2 py-1 bg-white/10 rounded-full text-gray-300">
                      {spec}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-lg font-bold text-white">{agent.tasks_completed || 0}</div>
                    <div className="text-xs text-gray-500">Tasks</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-lg font-bold text-emerald-400">${(agent.cost_usd || 0).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Cost</div>
                  </div>
                </div>

                {/* Voice Profile */}
                {agent.voice_id && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                    <Volume2 className="w-3 h-3" />
                    <span>ElevenLabs Voice</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD ====================

const HeroDashboard = ({ stats, services, workflows, platforms }) => {
  const metrics = [
    { icon: Bot, label: 'AI Agents', value: stats.agents || 8, change: 12, color: '#8b5cf6' },
    { icon: Zap, label: 'Tasks Completed', value: stats.tasks || 1247, change: 24, color: '#06b6d4' },
    { icon: Cpu, label: 'Tokens Used', value: stats.tokens || 2890000, change: 18, color: '#10b981' },
    { icon: Radio, label: 'Live Streams', value: stats.liveStreams || 3, change: 8, color: '#ef4444' },
    { icon: DollarSign, label: 'Total Cost', value: `$${stats.totalCost?.toFixed(2) || '127.45'}`, change: -15, color: '#f59e0b' },
    { icon: Activity, label: 'Uptime', value: `${stats.uptime || 99.9}%`, change: 0.2, color: '#ec4899' }
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric, i) => (
          <MetricCard key={i} {...metric} />
        ))}
      </div>

      {/* Status Panels */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SystemStatusMonitor services={services} />
        <WorkflowTracker workflows={workflows} />
        <PlatformConnections platforms={platforms} />
        <CostSavingsBreakdown />
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const SwanyThreeEmpire = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [agents, setAgents] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [systemStatus, setSystemStatus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('swanythree_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const headers = getAuthHeaders();

      const [statsRes, agentsRes, workflowsRes, platformsRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/api/stats`, { headers }).catch(() => ({ json: () => ({}) })),
        fetch(`${API_URL}/api/agents`, { headers }).catch(() => ({ json: () => [] })),
        fetch(`${API_URL}/api/workflows`, { headers }).catch(() => ({ json: () => [] })),
        fetch(`${API_URL}/api/platforms`, { headers }).catch(() => ({ json: () => [] })),
        fetch(`${API_URL}/api/system/status`, { headers }).catch(() => ({ json: () => [] }))
      ]);

      setStats(await statsRes.json?.() || {});
      setAgents(await agentsRes.json?.() || []);
      setWorkflows(await workflowsRes.json?.() || []);
      setPlatforms(await platformsRes.json?.() || []);
      setSystemStatus(await statusRes.json?.() || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      // Set demo data if API unavailable
      setAgents([
        { id: 1, name: 'ARIA', type: 'content_creator', specialties: ['Video Scripts', 'Social Posts'], tasks_completed: 342, cost_usd: 12.47, gradient_colors: ['#3b82f6', '#8b5cf6'], voice_id: 'EXAVITQu4vr4xnSDxMaL' },
        { id: 2, name: 'NEXUS', type: 'analyst', specialties: ['Data Analysis', 'Reporting'], tasks_completed: 189, cost_usd: 8.32, gradient_colors: ['#10b981', '#14b8a6'], voice_id: 'pNInz6obpgDQGcFmaJgB' },
        { id: 3, name: 'ECHO', type: 'moderator', specialties: ['Chat Moderation', 'Community'], tasks_completed: 567, cost_usd: 4.21, gradient_colors: ['#f59e0b', '#ef4444'], voice_id: 'yoZ06aMxZJJ28mfd3POQ' },
        { id: 4, name: 'PULSE', type: 'podcast_producer', specialties: ['Podcasts', 'Audio'], tasks_completed: 78, cost_usd: 23.89, gradient_colors: ['#ec4899', '#8b5cf6'], voice_id: 'ThT5KcBeYPX3keUQqHPh' },
        { id: 5, name: 'CIPHER', type: 'developer', specialties: ['Code Gen', 'Debugging'], tasks_completed: 234, cost_usd: 18.56, gradient_colors: ['#06b6d4', '#3b82f6'], voice_id: '21m00Tcm4TlvDq8ikWAM' },
        { id: 6, name: 'NOVA', type: 'researcher', specialties: ['Research', 'Summaries'], tasks_completed: 156, cost_usd: 9.78, gradient_colors: ['#8b5cf6', '#ec4899'], voice_id: 'AZnzlk1XvdvUeBnXmlld' },
        { id: 7, name: 'VEGA', type: 'video_creator', specialties: ['Video Editing', 'Thumbnails'], tasks_completed: 89, cost_usd: 31.24, gradient_colors: ['#ef4444', '#f59e0b'], voice_id: 'jBpfuIE2acCO8z3wKNLl' },
        { id: 8, name: 'ORION', type: 'strategist', specialties: ['Planning', 'Growth'], tasks_completed: 112, cost_usd: 14.67, gradient_colors: ['#14b8a6', '#10b981'], voice_id: 'onwK4e9ZLuTAKqWW03F9' }
      ]);
      setWorkflows([
        { id: 1, name: 'AI Content Pipeline', status: 'active', executions: 1247 },
        { id: 2, name: 'Stream Automation', status: 'active', executions: 892 },
        { id: 3, name: 'Podcast Generation', status: 'active', executions: 234 },
        { id: 4, name: 'Live Avatar System', status: 'active', executions: 156 },
        { id: 5, name: 'Agent Orchestration', status: 'active', executions: 567 }
      ]);
      setSystemStatus([
        { service: 'API Gateway', status: 'operational' },
        { service: 'Database', status: 'operational' },
        { service: 'Redis Cache', status: 'operational' },
        { service: 'N8N Workflows', status: 'operational' },
        { service: 'Claude API', status: 'operational' },
        { service: 'ElevenLabs', status: 'operational' },
        { service: 'HeyGen', status: 'degraded' },
        { service: 'VDO.Ninja', status: 'operational' },
        { service: 'OBS WebSocket', status: 'operational' },
        { service: 'Twitch API', status: 'operational' },
        { service: 'YouTube API', status: 'operational' },
        { service: 'Discord Bot', status: 'operational' }
      ]);
      setPlatforms([
        { platform: 'twitch', is_connected: true },
        { platform: 'youtube', is_connected: true },
        { platform: 'discord', is_connected: true }
      ]);
      setStats({
        agents: 8,
        tasks: 1767,
        tokens: 2890000,
        liveStreams: 2,
        totalCost: 122.14,
        uptime: 99.9
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    const token = localStorage.getItem('swanythree_token');
    if (token) {
      setUser({ email: 'user@swanythree.com' });
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (user) {
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchData]);

  const handleLogin = async (email, password) => {
    // Demo login - password: swanypro2026
    if (password === 'swanypro2026') {
      const demoToken = 'demo_token_' + Date.now();
      localStorage.setItem('swanythree_token', demoToken);
      setUser({ email });
      fetchData();
      return;
    }

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const data = await response.json();
    localStorage.setItem('swanythree_token', data.token);
    setUser(data.user);
    fetchData();
  };

  const handleLogout = () => {
    localStorage.removeItem('swanythree_token');
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading SwanyThree Empire...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'streaming', label: 'Streaming', icon: Video },
    { id: 'agents', label: 'AI Agents', icon: Bot },
    { id: 'workflows', label: 'Workflows', icon: Workflow },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black">SwanyThree</h1>
                  <p className="text-xs text-gray-400">Enterprise Dashboard</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={fetchData}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium">{user.username || user.email}</div>
                  <div className="text-xs text-gray-400">Pro Plan</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                  title="Logout"
                >
                  <Lock className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && (
          <HeroDashboard
            stats={stats}
            services={systemStatus}
            workflows={workflows}
            platforms={platforms}
          />
        )}

        {activeTab === 'streaming' && (
          <StreamingStudio
            onStartStream={() => console.log('Starting stream...')}
            onStopStream={() => console.log('Stopping stream...')}
          />
        )}

        {activeTab === 'agents' && (
          <AIAgentsHub
            agents={agents}
            onAssignTask={(agentId, task) => console.log('Assigning task:', agentId, task)}
          />
        )}

        {activeTab === 'workflows' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Workflow className="w-6 h-6 text-purple-400" />
              N8N Workflows
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((workflow, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-3 h-3 rounded-full ${workflow.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                    <h4 className="font-bold text-white">{workflow.name}</h4>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{workflow.executions} executions</span>
                    <span className="text-cyan-400 capitalize">{workflow.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Settings className="w-6 h-6 text-gray-400" />
              Settings
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <h4 className="font-medium text-white mb-2">API Keys</h4>
                <p className="text-sm text-gray-400">Manage your service API keys in the secure vault.</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <h4 className="font-medium text-white mb-2">Notifications</h4>
                <p className="text-sm text-gray-400">Configure alerts and notification preferences.</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <h4 className="font-medium text-white mb-2">Integrations</h4>
                <p className="text-sm text-gray-400">Connect and manage platform integrations.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/10 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>SwanyThree Empire v1.0.0</span>
            <span>Powered by Claude AI + N8N + MCP</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SwanyThreeEmpire;
