#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

const API_URL = process.env.SWANYTHREE_API_URL || 'http://localhost:3000';
const API_KEY = process.env.SWANYTHREE_API_KEY;

class SwanyThreeMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'swanythree',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_stream',
          description: 'Create and configure a new livestream session. Supports Twitch, YouTube, Discord, and custom RTMP.',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Stream title displayed to viewers'
              },
              platform: {
                type: 'string',
                enum: ['twitch', 'youtube', 'discord', 'custom'],
                description: 'Target streaming platform'
              },
              obs_config: {
                type: 'object',
                description: 'Optional OBS configuration settings',
                properties: {
                  scene: { type: 'string' },
                  bitrate: { type: 'number' },
                  resolution: { type: 'string' }
                }
              }
            },
            required: ['title', 'platform']
          }
        },
        {
          name: 'start_stream',
          description: 'Start an existing stream session and go live',
          inputSchema: {
            type: 'object',
            properties: {
              stream_id: {
                type: 'string',
                description: 'UUID of the stream to start'
              }
            },
            required: ['stream_id']
          }
        },
        {
          name: 'stop_stream',
          description: 'Stop a live stream session',
          inputSchema: {
            type: 'object',
            properties: {
              stream_id: {
                type: 'string',
                description: 'UUID of the stream to stop'
              }
            },
            required: ['stream_id']
          }
        },
        {
          name: 'generate_voice',
          description: 'Generate AI voice audio using ElevenLabs. Supports multiple voice profiles.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Text to convert to speech'
              },
              voice_id: {
                type: 'string',
                description: 'ElevenLabs voice ID (e.g., "EXAVITQu4vr4xnSDxMaL" for Bella)'
              },
              agent_id: {
                type: 'string',
                description: 'Optional: AI agent ID to use their configured voice'
              },
              voice_settings: {
                type: 'object',
                description: 'Voice generation settings',
                properties: {
                  stability: { type: 'number', minimum: 0, maximum: 1 },
                  similarity_boost: { type: 'number', minimum: 0, maximum: 1 },
                  style: { type: 'number', minimum: 0, maximum: 1 }
                }
              }
            },
            required: ['text']
          }
        },
        {
          name: 'execute_skill',
          description: 'Execute an AI skill with Claude. Skills include content generation, data analysis, code generation, and more.',
          inputSchema: {
            type: 'object',
            properties: {
              skill_name: {
                type: 'string',
                description: 'Name of the skill to execute (e.g., "write_blog", "analyze_data", "generate_code")'
              },
              input: {
                type: 'object',
                description: 'Input parameters for the skill'
              }
            },
            required: ['skill_name', 'input']
          }
        },
        {
          name: 'assign_agent_task',
          description: 'Assign a task to a specific AI agent. Each agent has specialties and a unique voice profile.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: {
                type: 'string',
                description: 'UUID of the AI agent'
              },
              task: {
                type: 'string',
                description: 'Task description for the agent'
              },
              input: {
                type: 'object',
                description: 'Additional input data for the task'
              }
            },
            required: ['agent_id', 'task']
          }
        },
        {
          name: 'create_vdo_room',
          description: 'Create a VDO.Ninja room for multi-guest video streaming and collaboration.',
          inputSchema: {
            type: 'object',
            properties: {
              room_name: {
                type: 'string',
                description: 'Friendly name for the room'
              },
              settings: {
                type: 'object',
                description: 'Room settings',
                properties: {
                  password: { type: 'string' },
                  max_guests: { type: 'number' },
                  quality: { type: 'string', enum: ['low', 'medium', 'high', 'ultra'] }
                }
              }
            },
            required: ['room_name']
          }
        },
        {
          name: 'add_vdo_guest',
          description: 'Add a guest to an existing VDO.Ninja room and get their join URL.',
          inputSchema: {
            type: 'object',
            properties: {
              room_id: {
                type: 'string',
                description: 'UUID of the VDO.Ninja room'
              },
              guest_name: {
                type: 'string',
                description: 'Name of the guest to add'
              }
            },
            required: ['room_id', 'guest_name']
          }
        },
        {
          name: 'generate_podcast',
          description: 'Generate a full podcast episode with AI-generated script, voice, and optional music.',
          inputSchema: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'Main topic or theme for the podcast'
              },
              duration_minutes: {
                type: 'number',
                description: 'Target duration in minutes (default: 10)'
              },
              voices: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of voice IDs for multiple speakers'
              },
              include_music: {
                type: 'boolean',
                description: 'Whether to generate background music'
              },
              languages: {
                type: 'array',
                items: { type: 'string' },
                description: 'Languages for translation (e.g., ["es", "fr", "de"])'
              }
            },
            required: ['topic']
          }
        },
        {
          name: 'get_analytics',
          description: 'Retrieve analytics and metrics from the platform.',
          inputSchema: {
            type: 'object',
            properties: {
              metric_type: {
                type: 'string',
                enum: ['costs', 'tokens', 'streams', 'agents', 'overview'],
                description: 'Type of metrics to retrieve'
              },
              period: {
                type: 'string',
                description: 'Time period (e.g., "7d", "30d", "90d")'
              }
            },
            required: ['metric_type']
          }
        },
        {
          name: 'list_agents',
          description: 'List all AI agents with their specialties, stats, and current status.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'list_workflows',
          description: 'List all N8N workflows with execution stats.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'execute_workflow',
          description: 'Trigger execution of an N8N workflow.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: {
                type: 'string',
                description: 'UUID of the workflow to execute'
              },
              input: {
                type: 'object',
                description: 'Input data for the workflow'
              }
            },
            required: ['workflow_id']
          }
        },
        {
          name: 'get_system_status',
          description: 'Get health status of all integrated services (API, Database, Claude, ElevenLabs, etc.).',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }));

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'swanythree://agents',
          name: 'AI Agents',
          description: 'List of all configured AI agents',
          mimeType: 'application/json'
        },
        {
          uri: 'swanythree://streams',
          name: 'Streams',
          description: 'Active and past stream sessions',
          mimeType: 'application/json'
        },
        {
          uri: 'swanythree://workflows',
          name: 'Workflows',
          description: 'N8N workflow configurations',
          mimeType: 'application/json'
        },
        {
          uri: 'swanythree://status',
          name: 'System Status',
          description: 'Current system health and service status',
          mimeType: 'application/json'
        }
      ]
    }));

    // Read resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        let endpoint;
        switch (uri) {
          case 'swanythree://agents':
            endpoint = '/api/agents';
            break;
          case 'swanythree://streams':
            endpoint = '/api/streams';
            break;
          case 'swanythree://workflows':
            endpoint = '/api/workflows';
            break;
          case 'swanythree://status':
            endpoint = '/api/system/status';
            break;
          default:
            throw new Error(`Unknown resource: ${uri}`);
        }

        const response = await this.apiCall('GET', endpoint);

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: `Error reading resource: ${error.message}`
            }
          ]
        };
      }
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.executeTool(name, args);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async apiCall(method, endpoint, data = null) {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (API_KEY) {
      config.headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }

  async executeTool(name, args) {
    switch (name) {
      case 'create_stream':
        return await this.apiCall('POST', '/api/streams', {
          title: args.title,
          platform: args.platform,
          obs_config: args.obs_config
        });

      case 'start_stream':
        return await this.apiCall('POST', `/api/streams/${args.stream_id}/start`);

      case 'stop_stream':
        return await this.apiCall('POST', `/api/streams/${args.stream_id}/stop`);

      case 'generate_voice':
        return await this.apiCall('POST', '/api/mcp/generate_voice', {
          text: args.text,
          voice_id: args.voice_id,
          agent_id: args.agent_id,
          voice_settings: args.voice_settings
        });

      case 'execute_skill':
        return await this.apiCall('POST', '/api/skills/execute', {
          skillName: args.skill_name,
          input: args.input
        });

      case 'assign_agent_task':
        return await this.apiCall('POST', `/api/agents/${args.agent_id}/task`, {
          task: args.task,
          input: args.input || {}
        });

      case 'create_vdo_room':
        return await this.apiCall('POST', '/api/vdoninja/rooms', {
          room_name: args.room_name,
          settings: args.settings
        });

      case 'add_vdo_guest':
        return await this.apiCall('POST', `/api/vdoninja/rooms/${args.room_id}/guest`, {
          guest_name: args.guest_name
        });

      case 'generate_podcast':
        return await this.apiCall('POST', '/api/skills/execute', {
          skillName: 'generate_podcast',
          input: {
            topic: args.topic,
            duration_minutes: args.duration_minutes || 10,
            voices: args.voices,
            include_music: args.include_music,
            languages: args.languages
          }
        });

      case 'get_analytics':
        if (args.metric_type === 'overview') {
          return await this.apiCall('GET', '/api/stats');
        }
        return await this.apiCall('POST', '/api/mcp/get_analytics', {
          metric_type: args.metric_type
        });

      case 'list_agents':
        return await this.apiCall('GET', '/api/agents');

      case 'list_workflows':
        return await this.apiCall('GET', '/api/workflows');

      case 'execute_workflow':
        return await this.apiCall('POST', `/api/workflows/${args.workflow_id}/execute`, {
          input: args.input
        });

      case 'get_system_status':
        return await this.apiCall('GET', '/api/system/status');

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SwanyThree MCP Server running on stdio');
  }
}

const server = new SwanyThreeMCPServer();
server.run().catch(console.error);
