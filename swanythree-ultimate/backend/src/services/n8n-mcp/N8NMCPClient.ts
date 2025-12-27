import axios, { AxiosInstance } from 'axios';

interface N8NClientConfig {
  baseUrl: string;
  apiKey: string;
}

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes?: unknown[];
  connections?: unknown;
  settings?: unknown;
}

interface WorkflowExecution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  data?: unknown;
}

export class N8NMCPClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config: N8NClientConfig) {
    this.baseUrl = config.baseUrl;
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/v1`,
      headers: {
        'X-N8N-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  // List all workflows
  async listWorkflows(): Promise<Workflow[]> {
    const response = await this.client.get<{ data: Workflow[] }>('/workflows');
    return response.data.data || [];
  }

  // Get workflow by ID
  async getWorkflow(workflowId: string): Promise<Workflow> {
    const response = await this.client.get<Workflow>(`/workflows/${workflowId}`);
    return response.data;
  }

  // Execute a workflow
  async executeWorkflow(workflowId: string, data?: Record<string, unknown>): Promise<unknown> {
    const response = await this.client.post(`/workflows/${workflowId}/execute`, {
      data,
    });
    return response.data;
  }

  // Trigger webhook for a workflow
  async triggerWebhook(workflowId: string, payload: unknown): Promise<unknown> {
    // Webhooks typically have a different URL structure
    const webhookUrl = `${this.baseUrl}/webhook/${workflowId}`;
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  }

  // Get workflow executions
  async getExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    const params = workflowId ? { workflowId } : {};
    const response = await this.client.get<{ data: WorkflowExecution[] }>('/executions', {
      params,
    });
    return response.data.data || [];
  }

  // Get specific execution
  async getExecution(executionId: string): Promise<WorkflowExecution> {
    const response = await this.client.get<WorkflowExecution>(`/executions/${executionId}`);
    return response.data;
  }

  // Activate workflow
  async activateWorkflow(workflowId: string): Promise<Workflow> {
    const response = await this.client.post<Workflow>(`/workflows/${workflowId}/activate`);
    return response.data;
  }

  // Deactivate workflow
  async deactivateWorkflow(workflowId: string): Promise<Workflow> {
    const response = await this.client.post<Workflow>(`/workflows/${workflowId}/deactivate`);
    return response.data;
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.listWorkflows();
      return true;
    } catch (error) {
      console.error('n8n connection test failed:', error);
      return false;
    }
  }

  // MCP-style tool definitions for AI agents
  getToolDefinitions(): object[] {
    return [
      {
        name: 'n8n_list_workflows',
        description: 'List all available n8n workflows',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'n8n_execute_workflow',
        description: 'Execute an n8n workflow with optional input data',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: {
              type: 'string',
              description: 'The ID of the workflow to execute',
            },
            data: {
              type: 'object',
              description: 'Input data for the workflow',
            },
          },
          required: ['workflowId'],
        },
      },
      {
        name: 'n8n_get_workflow',
        description: 'Get details about a specific n8n workflow',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: {
              type: 'string',
              description: 'The ID of the workflow',
            },
          },
          required: ['workflowId'],
        },
      },
    ];
  }

  // Execute MCP tool
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case 'n8n_list_workflows':
        return this.listWorkflows();
      case 'n8n_execute_workflow':
        return this.executeWorkflow(
          args.workflowId as string,
          args.data as Record<string, unknown>
        );
      case 'n8n_get_workflow':
        return this.getWorkflow(args.workflowId as string);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
