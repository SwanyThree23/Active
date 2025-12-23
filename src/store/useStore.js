/**
 * SwanyBot Pro Global State Store
 * Using Zustand for lightweight state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// MAIN APPLICATION STORE
// ============================================================================

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ========== API KEYS / VAULT ==========
      vault: {
        anthropic: '',
        openrouter: '',
        elevenlabs: '',
        gemini: ''
      },
      setVaultKey: (provider, key) => set((state) => ({
        vault: { ...state.vault, [provider]: key }
      })),
      clearVault: () => set({ vault: { anthropic: '', openrouter: '', elevenlabs: '', gemini: '' } }),

      // ========== UI STATE ==========
      activePanel: null,
      setActivePanel: (panel) => set({ activePanel: panel === get().activePanel ? null : panel }),

      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // ========== STREAMING STATE ==========
      isRecording: false,
      recordingStartTime: null,
      viewerCount: 0,
      streamHealth: 'good',

      startRecording: () => set({ isRecording: true, recordingStartTime: Date.now() }),
      stopRecording: () => set({ isRecording: false, recordingStartTime: null }),
      setViewerCount: (count) => set({ viewerCount: Math.max(0, count) }),
      setStreamHealth: (health) => set({ streamHealth: health }),

      // ========== NOTIFICATIONS ==========
      notifications: [],
      addNotification: (notification) => set((state) => ({
        notifications: [...state.notifications, { id: Date.now(), ...notification }]
      })),
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      clearNotifications: () => set({ notifications: [] }),

      // ========== PROJECT STATE ==========
      projectName: '',
      setProjectName: (name) => set({ projectName: name }),

      // ========== SETTINGS ==========
      settings: {
        voiceNotifications: true,
        autoSave: true,
        streamQuality: 'high',
        defaultModel: 'claude-3.5-sonnet',
        defaultVoice: 'rachel'
      },
      updateSetting: (key, value) => set((state) => ({
        settings: { ...state.settings, [key]: value }
      })),

      // ========== ANALYTICS ==========
      analytics: {
        totalMessages: 0,
        tokensUsed: 0,
        imagesProcessed: 0,
        voiceGenerations: 0,
        apiCosts: 0
      },
      incrementAnalytics: (key, amount = 1) => set((state) => ({
        analytics: { ...state.analytics, [key]: state.analytics[key] + amount }
      })),
      resetAnalytics: () => set({
        analytics: { totalMessages: 0, tokensUsed: 0, imagesProcessed: 0, voiceGenerations: 0, apiCosts: 0 }
      })
    }),
    {
      name: 'swanybot-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        vault: state.vault,
        settings: state.settings,
        projectName: state.projectName,
        analytics: state.analytics
      })
    }
  )
);

// ============================================================================
// CHAT / AI AGENTS STORE
// ============================================================================

export const useChatStore = create((set, get) => ({
  // ========== MESSAGES ==========
  messages: [],
  isLoading: false,
  streamingContent: '',

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, { id: Date.now(), timestamp: new Date().toISOString(), ...message }]
  })),
  clearMessages: () => set({ messages: [] }),
  setLoading: (loading) => set({ isLoading: loading }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (chunk) => set((state) => ({
    streamingContent: state.streamingContent + chunk
  })),

  // ========== ACTIVE AGENT ==========
  activeAgent: 'kai',
  setActiveAgent: (agent) => set({ activeAgent: agent }),

  // ========== CONVERSATION HISTORY ==========
  conversationHistory: [],
  addToHistory: (userMessage, assistantMessage) => set((state) => ({
    conversationHistory: [
      ...state.conversationHistory,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantMessage }
    ].slice(-20) // Keep last 20 messages for context
  })),
  clearHistory: () => set({ conversationHistory: [] })
}));

// ============================================================================
// IMAGE GALLERY STORE
// ============================================================================

export const useImageStore = create((set, get) => ({
  // ========== IMAGES ==========
  images: [],
  selectedImage: null,
  isProcessing: false,

  addImage: (image) => set((state) => ({
    images: [...state.images, { id: Date.now(), uploadedAt: new Date().toISOString(), ...image }]
  })),
  removeImage: (id) => set((state) => ({
    images: state.images.filter(img => img.id !== id)
  })),
  updateImage: (id, updates) => set((state) => ({
    images: state.images.map(img => img.id === id ? { ...img, ...updates } : img)
  })),
  selectImage: (image) => set({ selectedImage: image }),
  clearImages: () => set({ images: [], selectedImage: null }),
  setProcessing: (processing) => set({ isProcessing: processing }),

  // ========== CATEGORIES ==========
  categories: ['lifestyle', 'detail', 'product', 'bundle'],
  activeCategory: 'all',
  setActiveCategory: (category) => set({ activeCategory: category }),

  // ========== FILTERS ==========
  filters: {
    optimized: false,
    hasAltText: false
  },
  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),

  // ========== BULK OPERATIONS ==========
  selectedImages: [],
  toggleImageSelection: (id) => set((state) => ({
    selectedImages: state.selectedImages.includes(id)
      ? state.selectedImages.filter(i => i !== id)
      : [...state.selectedImages, id]
  })),
  selectAllImages: () => set((state) => ({
    selectedImages: state.images.map(img => img.id)
  })),
  clearSelection: () => set({ selectedImages: [] })
}));

// ============================================================================
// VOICE STUDIO STORE
// ============================================================================

export const useVoiceStore = create((set, get) => ({
  // ========== VOICES ==========
  voices: [],
  selectedVoice: null,
  customVoices: [],

  setVoices: (voices) => set({ voices }),
  selectVoice: (voice) => set({ selectedVoice: voice }),
  addCustomVoice: (voice) => set((state) => ({
    customVoices: [...state.customVoices, voice]
  })),

  // ========== TTS STATE ==========
  isGenerating: false,
  audioUrl: null,
  audioHistory: [],

  setGenerating: (generating) => set({ isGenerating: generating }),
  setAudioUrl: (url) => set({ audioUrl: url }),
  addToAudioHistory: (entry) => set((state) => ({
    audioHistory: [{ id: Date.now(), createdAt: new Date().toISOString(), ...entry }, ...state.audioHistory].slice(0, 50)
  })),

  // ========== VOICE SETTINGS ==========
  voiceSettings: {
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0,
    useSpeakerBoost: true
  },
  updateVoiceSetting: (key, value) => set((state) => ({
    voiceSettings: { ...state.voiceSettings, [key]: value }
  }))
}));

// ============================================================================
// SCRIPT GENERATOR STORE
// ============================================================================

export const useScriptStore = create((set, get) => ({
  // ========== SCRIPTS ==========
  scripts: [],
  currentScript: null,
  isGenerating: false,

  addScript: (script) => set((state) => ({
    scripts: [{ id: Date.now(), createdAt: new Date().toISOString(), ...script }, ...state.scripts]
  })),
  setCurrentScript: (script) => set({ currentScript: script }),
  updateScript: (id, updates) => set((state) => ({
    scripts: state.scripts.map(s => s.id === id ? { ...s, ...updates } : s)
  })),
  deleteScript: (id) => set((state) => ({
    scripts: state.scripts.filter(s => s.id !== id),
    currentScript: state.currentScript?.id === id ? null : state.currentScript
  })),
  setGenerating: (generating) => set({ isGenerating: generating }),

  // ========== TEMPLATES ==========
  templates: [
    { id: 'product-demo', name: 'Product Demo', prompt: 'Create a compelling product demonstration script for...' },
    { id: 'tutorial', name: 'Tutorial', prompt: 'Write an educational tutorial script that teaches...' },
    { id: 'unboxing', name: 'Unboxing', prompt: 'Generate an exciting unboxing video script for...' },
    { id: 'review', name: 'Review', prompt: 'Create an honest and detailed review script for...' },
    { id: 'vlog', name: 'Vlog Style', prompt: 'Write a casual, engaging vlog-style script about...' }
  ],
  selectedTemplate: null,
  selectTemplate: (template) => set({ selectedTemplate: template })
}));

// ============================================================================
// WORKFLOW / MCP STORE
// ============================================================================

export const useWorkflowStore = create((set, get) => ({
  // ========== WORKFLOWS ==========
  workflows: [],
  activeWorkflow: null,
  isExecuting: false,

  setWorkflows: (workflows) => set({ workflows }),
  setActiveWorkflow: (workflow) => set({ activeWorkflow: workflow }),
  setExecuting: (executing) => set({ isExecuting: executing }),

  // ========== EXECUTION HISTORY ==========
  executionHistory: [],
  addExecution: (execution) => set((state) => ({
    executionHistory: [{ id: Date.now(), executedAt: new Date().toISOString(), ...execution }, ...state.executionHistory].slice(0, 100)
  })),

  // ========== MCP TOOLS ==========
  mcpTools: [],
  setMcpTools: (tools) => set({ mcpTools: tools }),

  // ========== CONNECTION STATUS ==========
  mcpConnected: false,
  setMcpConnected: (connected) => set({ mcpConnected: connected })
}));

export default {
  useAppStore,
  useChatStore,
  useImageStore,
  useVoiceStore,
  useScriptStore,
  useWorkflowStore
};
