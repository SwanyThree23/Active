# SwanyThree Ultimate

Enterprise AI-powered streaming, automation, and content creation platform.

```
╔═══════════════════════════════════════════════════════╗
║   ███████╗██╗    ██╗ █████╗ ███╗   ██╗██╗   ██╗      ║
║   ██╔════╝██║    ██║██╔══██╗████╗  ██║╚██╗ ██╔╝      ║
║   ███████╗██║ █╗ ██║███████║██╔██╗ ██║ ╚████╔╝       ║
║   ╚════██║██║███╗██║██╔══██║██║╚██╗██║  ╚██╔╝        ║
║   ███████║╚███╔███╔╝██║  ██║██║ ╚████║   ██║         ║
║   ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝         ║
╚═══════════════════════════════════════════════════════╝
```

## Architecture

```
N8N Workflows → MCP Servers → Claude Desktop → SwanyThree API
     ↓              ↓              ↓              ↓
Automation    Tool Access    AI Brain      Full Stack App
```

## Features

### Hero Dashboard
- 6 animated metric cards with live updates
- 12-service system status monitor
- Real-time workflow tracking
- Platform connection status (Twitch, YouTube, Discord, etc.)
- Cost savings breakdown with LLMLingua optimization

### Streaming Studio
- Live preview with viewer count
- Real-time metrics (chat rate, bitrate, health)
- Multi-platform chat feed
- VDO.NINJA room management
- OBS WebSocket connection

### AI Agents Hub
- 8 specialized agents with unique gradients
  - ARIA (Content Creator)
  - NEXUS (Analyst)
  - ECHO (Moderator)
  - PULSE (Podcast Producer)
  - CIPHER (Developer)
  - NOVA (Researcher)
  - VEGA (Video Creator)
  - ORION (Strategist)
- Real-time task tracking
- Cost monitoring per agent
- ElevenLabs voice profiles

### Visual Design
- Glassmorphism with backdrop blur
- Animated gradients and pulse effects
- Grid pattern overlays
- Smooth transitions
- Fully responsive layouts

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- API Keys: Anthropic, ElevenLabs (optional), HeyGen (optional)

### Deploy with Docker

```bash
# Clone and enter directory
git clone https://github.com/your-repo/swanythree-ultimate.git
cd swanythree-ultimate

# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
1. Create `.env` from template with auto-generated secrets
2. Build all Docker images
3. Start all services
4. Wait for health checks
5. Display access URLs

### Access Points

| Service    | URL                    | Default Credentials     |
|------------|------------------------|-------------------------|
| Frontend   | http://localhost       | Password: swanypro2026  |
| API        | http://localhost:3000  | JWT Auth                |
| N8N        | http://localhost:5678  | admin / swanyn8n2026    |
| PostgreSQL | localhost:5432         | swanythree / (in .env)  |
| Redis      | localhost:6379         | -                       |

## Local Development

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### MCP Server

```bash
cd mcp-server
npm install
npm start
```

## Claude Desktop Integration

Add to your Claude Desktop config (`~/.config/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "swanythree": {
      "command": "npx",
      "args": ["-y", "@swanythree/mcp-server"],
      "env": {
        "SWANYTHREE_API_URL": "http://localhost:3000",
        "SWANYTHREE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `create_stream` | Create and configure a new livestream |
| `start_stream` | Go live with a stream |
| `stop_stream` | End a live stream |
| `generate_voice` | Generate AI voice with ElevenLabs |
| `execute_skill` | Execute AI skills with Claude |
| `assign_agent_task` | Assign tasks to AI agents |
| `create_vdo_room` | Create VDO.Ninja collaboration room |
| `generate_podcast` | Generate full podcast episodes |
| `get_analytics` | Retrieve platform analytics |
| `list_agents` | List all AI agents |
| `list_workflows` | List N8N workflows |
| `execute_workflow` | Trigger workflow execution |
| `get_system_status` | Check service health |

## N8N Workflows

Pre-configured workflows:

1. **AI Content Pipeline** - Claude → LLMLingua → ElevenLabs → Save
2. **Stream Automation** - Monitor streams, auto-restart, Discord alerts
3. **Podcast Generation** - Script → Voice → Music → Distribute
4. **Live Avatar System** - HeyGen → VDO.Ninja → OBS
5. **Agent Orchestration** - Task routing to specialized agents

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get JWT token
- `GET /api/auth/me` - Get current user

### Vault (API Key Management)
- `POST /api/vault/store` - Store encrypted API key
- `GET /api/vault/keys` - List stored services
- `DELETE /api/vault/:service` - Remove API key

### Streams
- `GET /api/streams` - List streams
- `POST /api/streams` - Create stream
- `POST /api/streams/:id/start` - Start streaming
- `POST /api/streams/:id/stop` - Stop streaming

### AI Agents
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `POST /api/agents/:id/task` - Assign task

### Skills
- `POST /api/skills/execute` - Execute AI skill
- `GET /api/skills/history` - Execution history

### VDO.Ninja
- `GET /api/vdoninja/rooms` - List rooms
- `POST /api/vdoninja/rooms` - Create room
- `POST /api/vdoninja/rooms/:id/guest` - Add guest

### Analytics
- `GET /api/stats` - Dashboard stats
- `GET /api/stats/costs` - Cost breakdown
- `GET /api/system/status` - Service health

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Lucide Icons
- **Backend**: Node.js, Express, Socket.io
- **Database**: PostgreSQL 15, Redis 7
- **AI**: Claude API, ElevenLabs, HeyGen
- **Automation**: N8N, MCP Protocol
- **Deployment**: Docker, Docker Compose

## Environment Variables

See `.env.example` for all configuration options.

Required:
- `ANTHROPIC_API_KEY` - For Claude AI
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - Authentication secret
- `ENCRYPTION_KEY` - Vault encryption

Optional:
- `ELEVENLABS_API_KEY` - Voice generation
- `HEYGEN_API_KEY` - Avatar videos
- `TWITCH_*` - Twitch integration
- `YOUTUBE_*` - YouTube integration
- `DISCORD_*` - Discord bot

## License

MIT License - See LICENSE file

## Support

- Issues: https://github.com/your-repo/swanythree-ultimate/issues
