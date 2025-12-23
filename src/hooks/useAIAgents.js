/**
 * AI Agents Hook
 * Manages the three AI co-host agents: Kai, Nova, and Sage
 */

import { useState, useCallback } from 'react';
import { anthropicService, openRouterService, OPENROUTER_MODELS } from '../services/apiService';
import { useAppStore, useChatStore } from '../store/useStore';

// ============================================================================
// AI AGENT DEFINITIONS
// ============================================================================

export const AI_AGENTS = {
  kai: {
    id: 'kai',
    name: 'Kai',
    avatar: '🤖',
    role: 'Creative Director',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-300',
    specialty: 'Creative content, storytelling, and engagement strategies',
    systemPrompt: `You are Kai, the Creative Director AI co-host for SwanyBot Pro.
Your personality: Enthusiastic, innovative, and inspiring.
Your expertise: Creative content strategy, storytelling, viral content creation, and audience engagement.
Communication style: Energetic, uses creative metaphors, encourages experimentation.
Always provide actionable creative suggestions and think outside the box.`
  },
  nova: {
    id: 'nova',
    name: 'Nova',
    avatar: '✍️',
    role: 'Content Writer',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-300',
    specialty: 'Scripts, copy, SEO, and written content optimization',
    systemPrompt: `You are Nova, the Content Writer AI co-host for SwanyBot Pro.
Your personality: Articulate, detail-oriented, and persuasive.
Your expertise: Script writing, copywriting, SEO optimization, product descriptions, and newsletters.
Communication style: Clear, structured, uses power words, focuses on conversion.
Always provide well-structured content with clear calls to action.`
  },
  sage: {
    id: 'sage',
    name: 'Sage',
    avatar: '📊',
    role: 'Analytics Expert',
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-300',
    specialty: 'Data analysis, trends, metrics, and strategic insights',
    systemPrompt: `You are Sage, the Analytics Expert AI co-host for SwanyBot Pro.
Your personality: Analytical, strategic, and data-driven.
Your expertise: Performance metrics, trend analysis, audience insights, and ROI optimization.
Communication style: Precise, uses data references, provides strategic recommendations.
Always back up suggestions with data-driven reasoning and measurable outcomes.`
  }
};

// ============================================================================
// USE AI AGENTS HOOK
// ============================================================================

export function useAIAgents() {
  const { vault, incrementAnalytics } = useAppStore();
  const {
    activeAgent,
    setActiveAgent,
    addMessage,
    setLoading,
    setStreamingContent,
    appendStreamingContent,
    conversationHistory,
    addToHistory
  } = useChatStore();

  const [error, setError] = useState(null);

  /**
   * Get the current active agent configuration
   */
  const getActiveAgentConfig = useCallback(() => {
    return AI_AGENTS[activeAgent] || AI_AGENTS.kai;
  }, [activeAgent]);

  /**
   * Send a message to the active agent
   */
  const sendMessageToAgent = useCallback(async (userMessage, options = {}) => {
    const {
      useStreaming = false,
      model = 'anthropic',
      openRouterModel = null
    } = options;

    const agent = getActiveAgentConfig();
    const apiKey = model === 'openrouter' ? vault.openrouter : vault.anthropic;

    if (!apiKey) {
      setError(`No API key configured for ${model}`);
      return null;
    }

    setLoading(true);
    setError(null);
    setStreamingContent('');

    // Add user message to chat
    addMessage({
      sender: 'You',
      text: userMessage,
      type: 'user'
    });

    try {
      // Prepare messages with conversation history
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ];

      let response;

      if (model === 'openrouter' && openRouterModel) {
        response = await openRouterService.sendMessage(
          apiKey,
          OPENROUTER_MODELS[openRouterModel]?.id || openRouterModel,
          messages,
          { maxTokens: 2048 }
        );
      } else if (useStreaming) {
        let fullContent = '';
        response = await anthropicService.streamMessage(
          apiKey,
          messages,
          (chunk, accumulated) => {
            appendStreamingContent(chunk);
            fullContent = accumulated;
          },
          { systemPrompt: agent.systemPrompt }
        );
        response.content = fullContent;
      } else {
        response = await anthropicService.sendMessage(
          apiKey,
          messages,
          { systemPrompt: agent.systemPrompt, maxTokens: 2048 }
        );
      }

      if (!response.success) {
        throw new Error(response.error);
      }

      // Add agent response to chat
      addMessage({
        sender: agent.name,
        text: response.content,
        type: 'agent',
        agent: agent.id,
        avatar: agent.avatar
      });

      // Update conversation history
      addToHistory(userMessage, response.content);

      // Update analytics
      incrementAnalytics('totalMessages');
      if (response.usage) {
        incrementAnalytics('tokensUsed', response.usage.input_tokens + response.usage.output_tokens);
      }

      setLoading(false);
      setStreamingContent('');
      return response.content;

    } catch (err) {
      setError(err.message);
      addMessage({
        sender: 'System',
        text: `Error: ${err.message}`,
        type: 'error'
      });
      setLoading(false);
      return null;
    }
  }, [vault, activeAgent, conversationHistory, addMessage, setLoading, setStreamingContent, appendStreamingContent, addToHistory, incrementAnalytics, getActiveAgentConfig]);

  /**
   * Generate specialized content based on agent role
   */
  const generateSpecializedContent = useCallback(async (contentType, params = {}) => {
    const agent = getActiveAgentConfig();
    const prompts = {
      kai: {
        'hook': `Create 5 attention-grabbing video hooks for: ${params.topic}`,
        'story': `Develop a compelling story arc for content about: ${params.topic}`,
        'engagement': `Suggest 10 engagement tactics to increase interaction for: ${params.topic}`
      },
      nova: {
        'script': `Write a detailed ${params.duration || '5-minute'} video script about: ${params.topic}`,
        'description': `Create an SEO-optimized product description for: ${params.topic}`,
        'newsletter': `Write a compelling newsletter about: ${params.topic}`
      },
      sage: {
        'analysis': `Analyze the potential performance metrics for content about: ${params.topic}`,
        'trends': `Identify current trends related to: ${params.topic}`,
        'strategy': `Develop a data-driven content strategy for: ${params.topic}`
      }
    };

    const prompt = prompts[agent.id]?.[contentType] || `Help me with ${contentType} for: ${params.topic}`;
    return sendMessageToAgent(prompt);
  }, [getActiveAgentConfig, sendMessageToAgent]);

  /**
   * Collaborate - get input from all agents
   */
  const collaborateWithAllAgents = useCallback(async (topic) => {
    const results = {};

    for (const agentId of Object.keys(AI_AGENTS)) {
      setActiveAgent(agentId);
      const agent = AI_AGENTS[agentId];
      const prompt = `As ${agent.name} (${agent.role}), provide your perspective and recommendations for: ${topic}`;

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      results[agentId] = await sendMessageToAgent(prompt);
    }

    return results;
  }, [setActiveAgent, sendMessageToAgent]);

  return {
    agents: AI_AGENTS,
    activeAgent,
    activeAgentConfig: getActiveAgentConfig(),
    setActiveAgent,
    sendMessageToAgent,
    generateSpecializedContent,
    collaborateWithAllAgents,
    error
  };
}

export default useAIAgents;
