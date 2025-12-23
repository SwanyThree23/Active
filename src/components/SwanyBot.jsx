import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video, Play, Square, MessageSquare, BarChart3, FileText, Settings, X, Download,
  Eye, EyeOff, Check, Lock, Key, TrendingUp, Users, Mail, ShoppingCart, Calendar,
  Gift, Palette, Headphones, Volume2, VolumeX, Send, Zap, Rocket, Bell, Image,
  Wand2, Layers, Bot, Mic, MicOff, Pause, RefreshCw, Upload, Trash2, ChevronDown,
  ChevronRight, Copy, ExternalLink, Globe, Cpu, Sparkles, Database, Workflow,
  MoreHorizontal, Grid, List, Filter, Search, Plus, Minus, RotateCcw, Save,
  Share2, Clock, Activity, AlertCircle, CheckCircle, Info
} from 'lucide-react';

import { useAppStore, useChatStore, useImageStore, useScriptStore } from '../store/useStore';
import { useAIAgents, AI_AGENTS } from '../hooks/useAIAgents';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useImageOptimization } from '../hooks/useImageOptimization';
import { useVoiceCloning } from '../hooks/useVoiceCloning';
import {
  anthropicService, openRouterService, llmLinguaService, mcpService,
  OPENROUTER_MODELS, ELEVENLABS_VOICES
} from '../services/apiService';

// ============================================================================
// NOTIFICATION COMPONENT
// ============================================================================

const Notification = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />
  };

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  return (
    <div className={`${colors[notification.type] || colors.info} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in`}>
      {icons[notification.type]}
      <span>{notification.message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================================
// FEATURE BUTTON COMPONENT
// ============================================================================

const FeatureButton = ({ id, label, icon: Icon, color, isActive, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`glass rounded-xl p-4 hover:bg-white/20 transition-all duration-300 flex flex-col items-center gap-2 ${isActive ? 'ring-2 ring-purple-500 bg-white/20' : ''}`}
  >
    <Icon className={`w-6 h-6 text-${color}-400`} />
    <span className="text-xs font-semibold text-gray-300">{label}</span>
  </button>
);

// ============================================================================
// VAULT PANEL COMPONENT
// ============================================================================

const VaultPanel = () => {
  const { vault, setVaultKey } = useAppStore();
  const [showKeys, setShowKeys] = useState({});
  const [saved, setSaved] = useState({});

  const providers = [
    { key: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
    { key: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-...' },
    { key: 'elevenlabs', label: 'ElevenLabs', placeholder: 'xi-...' },
    { key: 'gemini', label: 'Google Gemini', placeholder: 'AIza...' }
  ];

  const saveKey = (provider) => {
    setSaved(prev => ({ ...prev, [provider]: true }));
    setTimeout(() => setSaved(prev => ({ ...prev, [provider]: false })), 2000);
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm mb-4">
        Securely store your API keys. Keys are saved locally in your browser.
      </p>

      {providers.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-2">
          <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            {vault[key] ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Lock className="w-4 h-4 text-gray-500" />}
            {label}
          </label>
          <div className="flex gap-2">
            <input
              type={showKeys[key] ? 'text' : 'password'}
              value={vault[key]}
              onChange={(e) => setVaultKey(key, e.target.value)}
              placeholder={placeholder}
              className="input-glass flex-1"
            />
            <button
              onClick={() => setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))}
              className="px-4 glass-dark rounded-lg hover:bg-white/10"
            >
              {showKeys[key] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              onClick={() => saveKey(key)}
              className={`px-4 rounded-lg font-semibold ${saved[key] ? 'bg-green-500' : 'btn-primary'}`}
            >
              {saved[key] ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            </button>
          </div>
        </div>
      ))}

      <div className="mt-6 p-4 glass-dark rounded-lg">
        <h4 className="font-semibold text-purple-400 mb-2">Connection Status</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {providers.map(({ key, label }) => (
            <div key={key} className={`flex items-center gap-2 ${vault[key] ? 'text-green-400' : 'text-gray-500'}`}>
              <div className={`w-2 h-2 rounded-full ${vault[key] ? 'bg-green-400' : 'bg-gray-500'}`} />
              {label.split(' ')[0]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CHAT PANEL COMPONENT
// ============================================================================

const ChatPanel = () => {
  const { vault } = useAppStore();
  const { messages, isLoading, streamingContent } = useChatStore();
  const { agents, activeAgent, activeAgentConfig, setActiveAgent, sendMessageToAgent } = useAIAgents();
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('anthropic');
  const [openRouterModel, setOpenRouterModel] = useState('claude-3.5-sonnet');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const message = input;
    setInput('');

    await sendMessageToAgent(message, {
      model: selectedModel,
      openRouterModel: selectedModel === 'openrouter' ? openRouterModel : null,
      useStreaming: selectedModel === 'anthropic'
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Agent Selector */}
      <div className="flex gap-2 mb-4">
        {Object.values(agents).map((agent) => (
          <button
            key={agent.id}
            onClick={() => setActiveAgent(agent.id)}
            className={`flex-1 p-2 rounded-lg text-sm font-semibold transition-all ${activeAgent === agent.id
              ? `bg-gradient-to-r ${agent.color} text-white`
              : 'glass-dark hover:bg-white/10'}`}
          >
            <span className="mr-1">{agent.avatar}</span>
            {agent.name}
          </button>
        ))}
      </div>

      {/* Model Selector */}
      <div className="flex gap-2 mb-4">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="input-glass text-sm"
        >
          <option value="anthropic">Anthropic Direct</option>
          <option value="openrouter">OpenRouter</option>
        </select>
        {selectedModel === 'openrouter' && (
          <select
            value={openRouterModel}
            onChange={(e) => setOpenRouterModel(e.target.value)}
            className="input-glass text-sm flex-1"
          >
            {Object.entries(OPENROUTER_MODELS).map(([key, model]) => (
              <option key={key} value={key}>{model.name} ({model.provider})</option>
            ))}
          </select>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg ${msg.type === 'user'
              ? 'bg-purple-500/20 ml-8'
              : msg.type === 'error'
                ? 'bg-red-500/20'
                : 'bg-blue-500/20 mr-8'}`}
          >
            <div className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-2">
              {msg.avatar && <span>{msg.avatar}</span>}
              {msg.sender}
              <span className="text-gray-600">•</span>
              <span className="text-gray-600">{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
          </div>
        ))}

        {streamingContent && (
          <div className="p-3 rounded-lg bg-blue-500/20 mr-8">
            <div className="text-xs font-bold text-gray-400 mb-1">
              {activeAgentConfig.avatar} {activeAgentConfig.name}
            </div>
            <div className="text-sm whitespace-pre-wrap">{streamingContent}</div>
            <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className="flex items-center gap-2 text-gray-400 p-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full typing-dot" />
              <div className="w-2 h-2 bg-purple-400 rounded-full typing-dot" />
              <div className="w-2 h-2 bg-purple-400 rounded-full typing-dot" />
            </div>
            <span className="text-sm">{activeAgentConfig.name} is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={`Ask ${activeAgentConfig.name}...`}
          className="input-glass flex-1"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="btn-primary px-6 py-3 rounded-lg disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// IMAGE GALLERY PANEL COMPONENT
// ============================================================================

const ImageGalleryPanel = () => {
  const {
    images, filteredImages, stats, isProcessing, progress, activeCategory,
    uploadImage, uploadMultipleImages, batchOptimize, setActiveCategory,
    toggleImageSelection, selectedImages, selectAllImages, clearSelection,
    removeImage
  } = useImageOptimization();

  const fileInputRef = useRef(null);
  const [viewMode, setViewMode] = useState('grid');

  const categories = [
    { id: 'all', label: 'All', icon: Grid },
    { id: 'lifestyle', label: 'Lifestyle', icon: Users },
    { id: 'detail', label: 'Detail', icon: Eye },
    { id: 'product', label: 'Product', icon: ShoppingCart },
    { id: 'bundle', label: 'Bundle', icon: Layers }
  ];

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      await uploadMultipleImages(files, { autoOptimize: true });
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="glass-dark rounded-lg p-2">
          <div className="text-lg font-bold text-purple-400">{stats.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="glass-dark rounded-lg p-2">
          <div className="text-lg font-bold text-green-400">{stats.optimized}</div>
          <div className="text-xs text-gray-500">Optimized</div>
        </div>
        <div className="glass-dark rounded-lg p-2">
          <div className="text-lg font-bold text-yellow-400">{stats.pending}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
        <div className="glass-dark rounded-lg p-2">
          <div className="text-lg font-bold text-cyan-400">{formatBytes(stats.totalSaved)}</div>
          <div className="text-xs text-gray-500">Saved</div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {categories.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveCategory(id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${activeCategory === id
              ? 'bg-purple-500/30 text-purple-300'
              : 'glass-dark hover:bg-white/10 text-gray-400'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Actions Bar */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
        {selectedImages.length > 0 && (
          <>
            <button
              onClick={batchOptimize}
              className="btn-success px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              disabled={isProcessing}
            >
              <Wand2 className="w-4 h-4" />
              Optimize ({selectedImages.length})
            </button>
            <button
              onClick={clearSelection}
              className="glass-dark px-4 py-2 rounded-lg text-sm hover:bg-white/10"
            >
              Clear
            </button>
          </>
        )}
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className="ml-auto glass-dark px-3 py-2 rounded-lg hover:bg-white/10"
        >
          {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
        </button>
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="glass-dark rounded-lg p-3">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Processing images...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Image Grid */}
      <div className={`${viewMode === 'grid' ? 'grid grid-cols-3 gap-2' : 'space-y-2'} max-h-80 overflow-y-auto`}>
        {filteredImages.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-gray-500">
            <Image className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No images yet. Upload some to get started!</p>
          </div>
        ) : (
          filteredImages.map((img) => (
            <div
              key={img.id}
              className={`image-card relative group cursor-pointer ${selectedImages.includes(img.id) ? 'ring-2 ring-purple-500' : ''}`}
              onClick={() => toggleImageSelection(img.id)}
            >
              <img
                src={img.optimizedUrl || img.previewUrl}
                alt={img.altText || img.name}
                className="w-full h-24 object-cover rounded-lg transition-transform duration-300"
              />
              <div className="image-overlay">
                <div className="flex items-center justify-between">
                  <span className="text-xs truncate">{img.name}</span>
                  {img.optimized && <CheckCircle className="w-4 h-4 text-green-400" />}
                </div>
                {img.compressionRatio && (
                  <span className="text-xs text-green-400">
                    -{Math.round(img.compressionRatio * 100)}%
                  </span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                className="absolute top-1 right-1 p-1 bg-red-500/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* AI Tools Info */}
      <div className="glass-dark rounded-lg p-4">
        <h4 className="font-semibold text-purple-400 mb-3">AI Image Tools</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-pink-500/10 rounded-lg border border-pink-500/20">
            <Sparkles className="w-5 h-5 mx-auto mb-1 text-pink-400" />
            <div>Nano Banana</div>
            <div className="text-gray-500">Enhancement</div>
          </div>
          <div className="text-center p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Cpu className="w-5 h-5 mx-auto mb-1 text-blue-400" />
            <div>Gemini API</div>
            <div className="text-gray-500">Alt Text Gen</div>
          </div>
          <div className="text-center p-2 bg-green-500/10 rounded-lg border border-green-500/20">
            <Zap className="w-5 h-5 mx-auto mb-1 text-green-400" />
            <div>WebP Convert</div>
            <div className="text-gray-500">Compression</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SCRIPT GENERATOR PANEL COMPONENT
// ============================================================================

const ScriptPanel = () => {
  const { vault } = useAppStore();
  const { scripts, currentScript, templates, isGenerating, addScript, setCurrentScript, setGenerating } = useScriptStore();
  const [prompt, setPrompt] = useState('');
  const [useCompression, setUseCompression] = useState(true);
  const [compressionStats, setCompressionStats] = useState(null);

  const generateScript = async () => {
    if (!prompt.trim() || !vault.anthropic) return;

    setGenerating(true);

    let processedPrompt = prompt;

    // Apply LLM Lingua compression if enabled
    if (useCompression && prompt.length > 500) {
      const compressed = llmLinguaService.compressPrompt(prompt, {
        compressionRatio: 0.7,
        preserveKeywords: ['script', 'video', 'product', 'scene']
      });
      processedPrompt = compressed.compressed;
      setCompressionStats({
        original: compressed.originalTokens,
        compressed: compressed.compressedTokens,
        saved: Math.round(compressed.compressionAchieved * 100)
      });
    }

    try {
      const systemPrompt = `You are an expert video script writer. Create detailed, engaging scripts with:
- Clear scene descriptions
- Natural dialogue
- Camera directions
- Timing notes
- Emotional beats
Format the script professionally with headers and timestamps.`;

      const response = await anthropicService.sendMessage(
        vault.anthropic,
        [{ role: 'user', content: `Create a detailed video script for: ${processedPrompt}` }],
        { systemPrompt, maxTokens: 4000 }
      );

      if (response.success) {
        const script = {
          title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
          prompt,
          content: response.content,
          compressed: useCompression
        };
        addScript(script);
        setCurrentScript(script);
      }
    } catch (error) {
      console.error('Script generation failed:', error);
    }

    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <div>
        <label className="text-sm font-semibold text-gray-300 mb-2 block">Quick Templates</label>
        <div className="flex gap-2 flex-wrap">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setPrompt(template.prompt)}
              className="glass-dark px-3 py-1.5 rounded-lg text-xs hover:bg-white/10"
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Input */}
      <div>
        <label className="text-sm font-semibold text-gray-300 mb-2 block">Script Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your video idea in detail..."
          className="input-glass w-full h-32 resize-none"
        />
      </div>

      {/* LLM Lingua Toggle */}
      <div className="flex items-center justify-between glass-dark rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <div>
            <div className="text-sm font-semibold">LLM Lingua Compression</div>
            <div className="text-xs text-gray-500">Reduce tokens while preserving meaning</div>
          </div>
        </div>
        <button
          onClick={() => setUseCompression(!useCompression)}
          className={`w-12 h-6 rounded-full transition-colors ${useCompression ? 'bg-green-500' : 'bg-gray-600'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${useCompression ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Compression Stats */}
      {compressionStats && (
        <div className="glass-dark rounded-lg p-3 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Original: {compressionStats.original} tokens</span>
            <span>Compressed: {compressionStats.compressed} tokens</span>
            <span className="text-green-400">Saved: {compressionStats.saved}%</span>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={generateScript}
        disabled={isGenerating || !prompt.trim() || !vault.anthropic}
        className="w-full btn-primary py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="w-5 h-5" />
            Generate Script
          </>
        )}
      </button>

      {/* Generated Script Display */}
      {currentScript && (
        <div className="glass-dark rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-purple-400">{currentScript.title}</h4>
            <button
              onClick={() => navigator.clipboard.writeText(currentScript.content)}
              className="text-gray-400 hover:text-white"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap text-gray-300">{currentScript.content}</pre>
          </div>
        </div>
      )}

      {/* Script History */}
      {scripts.length > 1 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Recent Scripts</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {scripts.slice(0, 5).map((script) => (
              <button
                key={script.id}
                onClick={() => setCurrentScript(script)}
                className={`w-full text-left glass-dark p-2 rounded-lg hover:bg-white/10 ${currentScript?.id === script.id ? 'ring-1 ring-purple-500' : ''}`}
              >
                <div className="text-sm truncate">{script.title}</div>
                <div className="text-xs text-gray-500">{new Date(script.createdAt).toLocaleDateString()}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// VOICE STUDIO PANEL COMPONENT
// ============================================================================

const VoicePanel = () => {
  const { vault } = useAppStore();
  const {
    voices, selectedVoice, isGenerating, audioUrl, voiceSettings, isPlaying,
    selectVoice, updateVoiceSetting, generateSpeech, playAudio, pauseAudio,
    downloadAudio, estimateCharacterUsage, defaultVoices
  } = useVoiceCloning();

  const [text, setText] = useState('');
  const [cloneMode, setCloneMode] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [cloneFiles, setCloneFiles] = useState([]);

  const stats = estimateCharacterUsage(text);

  const handleGenerate = async () => {
    await generateSpeech(text);
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setCloneMode(false)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${!cloneMode ? 'btn-primary' : 'glass-dark'}`}
        >
          <Volume2 className="w-4 h-4 inline mr-2" />
          Text to Speech
        </button>
        <button
          onClick={() => setCloneMode(true)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${cloneMode ? 'btn-primary' : 'glass-dark'}`}
        >
          <Mic className="w-4 h-4 inline mr-2" />
          Clone Voice
        </button>
      </div>

      {!cloneMode ? (
        <>
          {/* Voice Selection */}
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block">Select Voice</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(defaultVoices).map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => selectVoice(voice)}
                  className={`glass-dark p-2 rounded-lg text-sm hover:bg-white/10 ${selectedVoice?.id === voice.id ? 'ring-2 ring-purple-500' : ''}`}
                >
                  <div className="font-semibold">{voice.name}</div>
                  <div className="text-xs text-gray-500">{voice.accent}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Text Input */}
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block">Text to Speak</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              className="input-glass w-full h-32 resize-none"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{stats.characters} characters</span>
              <span>~{stats.estimatedDuration}s duration</span>
              <span>~${stats.estimatedCost} cost</span>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="glass-dark rounded-lg p-3 space-y-3">
            <h4 className="text-sm font-semibold text-gray-300">Voice Settings</h4>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Stability</span>
                <span>{Math.round(voiceSettings.stability * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceSettings.stability}
                onChange={(e) => updateVoiceSetting('stability', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Similarity</span>
                <span>{Math.round(voiceSettings.similarityBoost * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceSettings.similarityBoost}
                onChange={(e) => updateVoiceSetting('similarityBoost', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim() || !vault.elevenlabs}
            className="w-full btn-primary py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Headphones className="w-5 h-5" />
                Generate Voice
              </>
            )}
          </button>

          {/* Audio Player */}
          {audioUrl && (
            <div className="glass-dark rounded-lg p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => isPlaying ? pauseAudio() : playAudio()}
                  className="w-12 h-12 btn-primary rounded-full flex items-center justify-center"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <div className="flex-1">
                  <div className="h-2 bg-black/30 rounded-full">
                    <div className="h-full w-1/2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                  </div>
                </div>
                <button
                  onClick={() => downloadAudio()}
                  className="text-gray-400 hover:text-white"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        // Voice Cloning UI
        <div className="space-y-4">
          <div className="glass-dark rounded-lg p-4 text-center">
            <Mic className="w-12 h-12 mx-auto mb-3 text-purple-400" />
            <h4 className="font-semibold mb-2">Clone Your Voice</h4>
            <p className="text-sm text-gray-400">
              Upload 1-5 audio samples (at least 30 seconds each) to create a custom voice clone.
            </p>
          </div>

          <input
            type="text"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            placeholder="Voice name..."
            className="input-glass w-full"
          />

          <div className="glass-dark rounded-lg p-4 border-2 border-dashed border-white/20 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-400">Drop audio files here or click to upload</p>
            <input type="file" multiple accept="audio/*" className="hidden" />
          </div>

          <button
            disabled={!vault.elevenlabs || !cloneName || cloneFiles.length === 0}
            className="w-full btn-primary py-3 rounded-lg font-bold disabled:opacity-50"
          >
            Create Voice Clone
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ANALYTICS PANEL COMPONENT
// ============================================================================

const AnalyticsPanel = () => {
  const { analytics, isRecording, viewerCount } = useAppStore();
  const [engagement, setEngagement] = useState(0);

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setEngagement(Math.floor(Math.random() * 40) + 60);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const stats = [
    { label: 'Live Viewers', value: viewerCount, icon: Users, color: 'green', suffix: '' },
    { label: 'Engagement', value: engagement, icon: Activity, color: 'blue', suffix: '%' },
    { label: 'Messages Sent', value: analytics.totalMessages, icon: MessageSquare, color: 'purple', suffix: '' },
    { label: 'Tokens Used', value: analytics.tokensUsed, icon: Zap, color: 'yellow', suffix: '' },
    { label: 'Images Processed', value: analytics.imagesProcessed, icon: Image, color: 'pink', suffix: '' },
    { label: 'Voice Generations', value: analytics.voiceGenerations, icon: Headphones, color: 'cyan', suffix: '' }
  ];

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, color, suffix }) => (
          <div key={label} className={`bg-gradient-to-r from-${color}-500/20 to-${color}-600/20 p-4 rounded-xl border border-${color}-500/30`}>
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Icon className={`w-4 h-4 text-${color}-400`} />
              <span className="text-xs">{label}</span>
            </div>
            <div className={`text-3xl font-black text-${color}-400`}>
              {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
            </div>
          </div>
        ))}
      </div>

      {/* OpenRouter Usage */}
      <div className="glass-dark rounded-lg p-4">
        <h4 className="font-semibold text-purple-400 mb-3 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          OpenRouter Models Usage
        </h4>
        <div className="space-y-2">
          {Object.entries(OPENROUTER_MODELS).slice(0, 4).map(([key, model]) => (
            <div key={key} className="flex justify-between items-center text-sm">
              <span className="text-gray-400">{model.name}</span>
              <span className="text-gray-500">{model.provider}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Graph Placeholder */}
      <div className="glass-dark rounded-lg p-4">
        <h4 className="font-semibold text-purple-400 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Performance Trend
        </h4>
        <div className="h-24 flex items-end gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-t"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </div>

      {/* MCP Status */}
      <div className="glass-dark rounded-lg p-4">
        <h4 className="font-semibold text-purple-400 mb-3 flex items-center gap-2">
          <Workflow className="w-5 h-5" />
          MCP / n8n Integration
        </h4>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <span className="text-sm text-gray-400">Ready for connection</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Connect to: techmunity.app.n8n.cloud/mcp-server/http
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// SETTINGS PANEL COMPONENT
// ============================================================================

const SettingsPanel = () => {
  const { settings, updateSetting, projectName, setProjectName } = useAppStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-gray-300 mb-2 block">Project Name</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="My Awesome Project"
          className="input-glass w-full"
        />
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300">Preferences</h4>

        <div className="flex items-center justify-between glass-dark rounded-lg p-3">
          <div>
            <div className="text-sm font-semibold">Voice Notifications</div>
            <div className="text-xs text-gray-500">Audio alerts for events</div>
          </div>
          <button
            onClick={() => updateSetting('voiceNotifications', !settings.voiceNotifications)}
            className={`w-12 h-6 rounded-full transition-colors ${settings.voiceNotifications ? 'bg-green-500' : 'bg-gray-600'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.voiceNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between glass-dark rounded-lg p-3">
          <div>
            <div className="text-sm font-semibold">Auto-Save</div>
            <div className="text-xs text-gray-500">Save work automatically</div>
          </div>
          <button
            onClick={() => updateSetting('autoSave', !settings.autoSave)}
            className={`w-12 h-6 rounded-full transition-colors ${settings.autoSave ? 'bg-green-500' : 'bg-gray-600'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.autoSave ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-300 mb-2 block">Stream Quality</label>
          <select
            value={settings.streamQuality}
            onChange={(e) => updateSetting('streamQuality', e.target.value)}
            className="input-glass w-full"
          >
            <option value="low">Low (720p)</option>
            <option value="medium">Medium (1080p)</option>
            <option value="high">High (1440p)</option>
            <option value="ultra">Ultra (4K)</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-300 mb-2 block">Default AI Model</label>
          <select
            value={settings.defaultModel}
            onChange={(e) => updateSetting('defaultModel', e.target.value)}
            className="input-glass w-full"
          >
            {Object.entries(OPENROUTER_MODELS).map(([key, model]) => (
              <option key={key} value={key}>{model.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-dark rounded-lg p-4">
        <h4 className="font-semibold text-purple-400 mb-2">About SwanyBot Pro</h4>
        <p className="text-sm text-gray-400">
          AI-Powered Creator Platform with multi-model AI, voice cloning, image optimization, and workflow automation.
        </p>
        <div className="mt-3 text-xs text-gray-500">
          Version 2.0.0 • Built with React + Vite
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN SWANYBOT COMPONENT
// ============================================================================

const SwanyBot = () => {
  const {
    vault, activePanel, setActivePanel, notifications, addNotification, removeNotification,
    settings, projectName
  } = useAppStore();

  const {
    isRecording, formattedDuration, startRecording, stopRecording, videoPreviewRef
  } = useMediaRecorder();

  const { viewerCount, setViewerCount } = useAppStore();

  // Simulate viewer count changes when live
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setViewerCount(prev => Math.max(0, prev + Math.floor(Math.random() * 30 - 10)));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isRecording, setViewerCount]);

  // Export project data
  const exportData = () => {
    const data = {
      project: projectName,
      timestamp: new Date().toISOString(),
      settings,
      vault: Object.keys(vault).reduce((acc, key) => {
        acc[key] = vault[key] ? '***configured***' : 'not set';
        return acc;
      }, {})
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swanybot-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addNotification({ message: 'Project exported!', type: 'success' });
  };

  // Feature configuration
  const features = [
    { id: 'vault', label: 'API Vault', icon: Key, color: 'green' },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare, color: 'blue' },
    { id: 'images', label: 'Gallery', icon: Image, color: 'pink' },
    { id: 'script', label: 'Scripts', icon: FileText, color: 'purple' },
    { id: 'voice', label: 'Voice', icon: Headphones, color: 'orange' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'indigo' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'gray' }
  ];

  // Panel renderer
  const renderPanel = () => {
    switch (activePanel) {
      case 'vault': return <VaultPanel />;
      case 'chat': return <ChatPanel />;
      case 'images': return <ImageGalleryPanel />;
      case 'script': return <ScriptPanel />;
      case 'voice': return <VoicePanel />;
      case 'analytics': return <AnalyticsPanel />;
      case 'settings': return <SettingsPanel />;
      default: return null;
    }
  };

  const getPanelTitle = () => {
    const titles = {
      vault: '🔐 API Vault',
      chat: '💬 AI Co-Host',
      images: '📸 Product Gallery',
      script: '📝 Script Generator',
      voice: '🎤 Voice Studio',
      analytics: '📊 Analytics',
      settings: '⚙️ Settings'
    };
    return titles[activePanel] || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-4">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass rounded-2xl p-8 mb-6 glow-border">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-black mb-2 gradient-text">
                🦢 SwanyBot Pro Ultimate
              </h1>
              <p className="text-gray-400">AI-Powered Creator Platform • Multi-Model • Voice Clone • Image AI</p>

              <div className="flex gap-3 mt-3 flex-wrap">
                <div className={`badge ${vault.anthropic ? 'badge-success' : 'badge-error'}`}>
                  <Lock className="w-4 h-4" />
                  Anthropic: {vault.anthropic ? 'Connected' : 'Setup'}
                </div>
                <div className={`badge ${vault.openrouter ? 'badge-success' : 'badge-warning'}`}>
                  <Globe className="w-4 h-4" />
                  OpenRouter: {vault.openrouter ? 'Connected' : 'Optional'}
                </div>
                <div className={`badge ${vault.elevenlabs ? 'badge-success' : 'badge-warning'}`}>
                  <Mic className="w-4 h-4" />
                  ElevenLabs: {vault.elevenlabs ? 'Connected' : 'Optional'}
                </div>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <button
                onClick={() => addNotification({ message: settings.voiceNotifications ? 'Notifications on' : 'Notifications off', type: 'info' })}
                className={`p-2 rounded-lg ${settings.voiceNotifications ? 'bg-green-500/20' : 'bg-red-500/20'}`}
              >
                {settings.voiceNotifications ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {isRecording && (
                <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border-2 border-red-500/40 animate-pulse">
                  <div className="w-2 h-2 bg-red-500 rounded-full live-indicator" />
                  LIVE • {formattedDuration}
                </div>
              )}

              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${isRecording ? 'btn-danger' : 'btn-success'}`}
              >
                {isRecording ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isRecording ? 'Stop' : 'Go Live'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className={`grid gap-5 ${activePanel ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {/* Left Column - Video Preview & Features */}
          <div className={activePanel ? 'lg:col-span-2' : ''}>
            {/* Video Preview */}
            <div className="glass rounded-xl p-6 mb-5 glow-border">
              <div className="w-full h-96 bg-black rounded-lg flex items-center justify-center relative overflow-hidden">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ display: isRecording ? 'block' : 'none' }}
                />
                {!isRecording && (
                  <div className="text-center">
                    <div className="text-6xl opacity-20 mb-4">📹</div>
                    <p className="text-gray-500">Click "Go Live" to start streaming</p>
                  </div>
                )}
                {isRecording && (
                  <div className="absolute top-4 left-4 flex gap-3">
                    <div className="bg-black/80 px-3 py-1 rounded-lg flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      {viewerCount}
                    </div>
                    <div className="bg-black/80 px-3 py-1 rounded-lg">
                      {formattedDuration}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Feature Buttons */}
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mb-5">
              {features.map((feature) => (
                <FeatureButton
                  key={feature.id}
                  {...feature}
                  isActive={activePanel === feature.id}
                  onClick={setActivePanel}
                />
              ))}
            </div>

            {/* Export Bar */}
            <div className="glass rounded-xl p-4 flex gap-3 items-center">
              <input
                type="text"
                value={projectName}
                onChange={(e) => useAppStore.getState().setProjectName(e.target.value)}
                placeholder="Project name..."
                className="input-glass flex-1"
              />
              <button onClick={exportData} className="btn-primary px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export
              </button>
            </div>
          </div>

          {/* Right Column - Active Panel */}
          {activePanel && (
            <div className="glass rounded-xl overflow-hidden flex flex-col max-h-[700px]">
              <div className="panel-header">
                <h3 className="text-lg font-bold text-purple-400">
                  {getPanelTitle()}
                </h3>
                <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {renderPanel()}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>SwanyBot Pro Ultimate v2.0 • Powered by Claude, OpenRouter, ElevenLabs & LLM Lingua</p>
          <p className="mt-1">MCP Integration: techmunity.app.n8n.cloud</p>
        </div>
      </div>
    </div>
  );
};

export default SwanyBot;
