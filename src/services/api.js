const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('swanybot_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Auth
  async login(password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('swanybot_token', data.token);
    }
    return data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('swanybot_token');
  }

  // Health
  async getHealth() {
    return this.request('/health');
  }

  // Workflows
  async getWorkflows() {
    return this.request('/workflows');
  }

  async getWorkflow(id) {
    return this.request(`/workflows/${id}`);
  }

  async createWorkflow(data) {
    return this.request('/workflows', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateWorkflow(id, data) {
    return this.request(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteWorkflow(id) {
    return this.request(`/workflows/${id}`, { method: 'DELETE' });
  }

  async executeWorkflow(id, data = {}) {
    return this.request(`/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async syncWorkflows() {
    return this.request('/workflows/sync', { method: 'POST' });
  }

  async getWorkflowExecutions(id) {
    return this.request(`/workflows/${id}/executions`);
  }

  // Agents
  async getAgents() {
    return this.request('/agents');
  }

  async getAgentStats() {
    return this.request('/agents/stats');
  }

  async getAgent(id) {
    return this.request(`/agents/${id}`);
  }

  async createAgent(data) {
    return this.request('/agents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateAgent(id, data) {
    return this.request(`/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteAgent(id) {
    return this.request(`/agents/${id}`, { method: 'DELETE' });
  }

  async runAgent(id) {
    return this.request(`/agents/${id}/run`, { method: 'POST' });
  }

  // OpenRouter
  async getOpenRouterConfig() {
    return this.request('/openrouter/config');
  }

  async getOpenRouterModels() {
    return this.request('/openrouter/models');
  }

  async chatCompletion(model, messages, maxTokens = 1000) {
    return this.request('/openrouter/chat', {
      method: 'POST',
      body: JSON.stringify({ model, messages, max_tokens: maxTokens })
    });
  }

  // LLMLingua
  async getLLMLinguaStats() {
    return this.request('/llmlingua/stats');
  }

  async compressText(text, ratio = 0.5) {
    return this.request('/llmlingua/compress', {
      method: 'POST',
      body: JSON.stringify({ text, ratio })
    });
  }

  // Voice Cloning
  async getVoiceClones() {
    return this.request('/voice');
  }

  async getVoiceStats() {
    return this.request('/voice/stats');
  }

  async getVoiceClone(id) {
    return this.request(`/voice/${id}`);
  }

  async createVoiceClone(data) {
    return this.request('/voice', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async synthesizeSpeech(voiceId, text) {
    return this.request(`/voice/${voiceId}/synthesize`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  }

  // Bloom Evaluations
  async getBloomEvaluations() {
    return this.request('/bloom');
  }

  async getBloomStats() {
    return this.request('/bloom/stats');
  }

  async getBloomEvaluation(id) {
    return this.request(`/bloom/${id}`);
  }

  async createBloomEvaluation(data) {
    return this.request('/bloom', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async runBloomEvaluation(id) {
    return this.request(`/bloom/${id}/run`, { method: 'POST' });
  }

  async getBloomBehaviors() {
    return this.request('/bloom/behaviors/list');
  }

  // MCP
  async getMCPConfig() {
    return this.request('/mcp/config');
  }

  async getMCPConnections() {
    return this.request('/mcp/connections');
  }

  async registerMCPConnection(clientName) {
    return this.request('/mcp/connections', {
      method: 'POST',
      body: JSON.stringify({ clientName })
    });
  }

  async sendMCPRequest(clientId, method, params) {
    return this.request('/mcp/request', {
      method: 'POST',
      body: JSON.stringify({ clientId, method, params })
    });
  }

  // Products
  async getProducts(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/products${params ? `?${params}` : ''}`);
  }

  async getProductStats() {
    return this.request('/products/stats');
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  async createProduct(data) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateProduct(id, data) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteProduct(id) {
    return this.request(`/products/${id}`, { method: 'DELETE' });
  }

  async optimizeProductImages(id) {
    return this.request(`/products/${id}/optimize`, { method: 'POST' });
  }

  async getProductCategories() {
    return this.request('/products/categories/list');
  }

  // Analytics
  async getDashboardStats() {
    return this.request('/analytics/dashboard');
  }

  async getPerformanceMetrics() {
    return this.request('/analytics/performance');
  }

  async getRevenueMetrics() {
    return this.request('/analytics/revenue');
  }

  async getCostBreakdown() {
    return this.request('/analytics/costs');
  }

  async getSystemHealth() {
    return this.request('/analytics/health');
  }
}

export const api = new ApiService();
export default api;
