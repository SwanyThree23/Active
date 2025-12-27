# SwanyThree Ultimate

A production-ready full-stack streaming platform with AI-powered features, real-time chat, and advanced analytics.

## Features

- **Live Streaming**: RTMP ingest with HLS playback
- **Real-time Chat**: Socket.IO powered live chat with sentiment analysis
- **AI Agents**: Claude Sonnet 4 for moderation, highlights, and analytics
- **NotebookLM**: Multi-source synthesis and AI podcast generation
- **Analytics Dashboard**: Real-time viewer metrics and engagement tracking
- **n8n Integration**: Workflow automation via MCP
- **Video Processing**: FFmpeg transcoding, thumbnail generation, S3 storage

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite for blazing fast builds
- Tailwind CSS with glassmorphic design
- HLS.js for video playback
- Socket.IO client for real-time features

### Backend
- Node.js + Express + TypeScript
- Prisma ORM with PostgreSQL
- Socket.IO for WebSocket connections
- Redis for caching and rate limiting
- JWT authentication

### Microservices
- **Stream Processor**: FastAPI WebSocket streaming
- **Agent Orchestrator**: Claude Sonnet 4 AI task routing
- **Video Processor**: FFmpeg HLS transcoding, S3 upload
- **NotebookLM Bridge**: Gemini synthesis, ElevenLabs TTS

### Infrastructure
- Docker Compose orchestration
- PostgreSQL 15 database
- Redis 7 cache
- Nginx reverse proxy

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for microservices development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/swanythree-ultimate.git
cd swanythree-ultimate
```

2. Copy environment file and configure:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Start all services:
```bash
make start
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) |
| `ANTHROPIC_API_KEY` | Claude API key for AI agents |
| `GEMINI_API_KEY` | Google Gemini API key for synthesis |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for TTS |
| `N8N_API_KEY` | n8n API key for workflows |
| `N8N_BASE_URL` | n8n instance URL |
| `AWS_ACCESS_KEY_ID` | AWS access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for S3 |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Streams
- `GET /api/streams` - List all live streams
- `GET /api/streams/:id` - Get stream details
- `POST /api/streams/create` - Create new stream
- `POST /api/streams/:id/start` - Start streaming
- `POST /api/streams/:id/end` - End streaming

### Chat
- `GET /api/chat/stream/:streamId` - Get chat messages
- `POST /api/chat/stream/:streamId` - Send message
- `DELETE /api/chat/:messageId` - Delete message

### Analytics
- `GET /api/analytics/stream/:streamId` - Get stream analytics
- `POST /api/analytics/stream/:streamId` - Record analytics
- `GET /api/analytics/stream/:streamId/summary` - Get summary

### AI Agents
- `POST /api/agents/task` - Create AI task
- `GET /api/agents/tasks` - List tasks
- `GET /api/agents/task/:taskId` - Get task status

### NotebookLM
- `POST /api/notebooklm/notebook/create` - Create notebook
- `POST /api/notebooklm/notebook/:id/podcast` - Generate podcast
- `POST /api/notebooklm/notebook/:id/chat` - Chat with notebook

### n8n Workflows
- `GET /api/n8n/workflows` - List workflows
- `POST /api/n8n/execute/:workflowId` - Execute workflow
- `GET /api/n8n/executions` - List executions

## Development

### Local Development

```bash
# Install dependencies
make install

# Start in development mode
make dev

# Run tests
make test
```

### Database Management

```bash
# Run migrations
make migrate

# Open database shell
make db-shell

# Seed database
make seed
```

### Logging

```bash
# View all logs
make logs

# Follow logs
make logs-f

# View specific service logs
make logs-backend
make logs-frontend
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Nginx       │
│  React + Vite   │     │  (Reverse Proxy)│
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
          ┌─────────────────┐       ┌─────────────────┐
          │     Backend     │       │   Socket.IO     │
          │ Express + Prisma│◀─────▶│   (Real-time)   │
          └────────┬────────┘       └─────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────────────┐
│PostgreSQL│  │  Redis  │  │  Microservices  │
│    DB    │  │  Cache  │  │ (Python/FastAPI)│
└─────────┘  └─────────┘  └─────────────────┘
```

## Deployment

### Production Deployment

```bash
./production-deploy.sh
```

### Docker Commands

```bash
# Build images
make build

# Start services
make start

# Stop services
make stop

# Clean up
make clean
```

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please open a GitHub issue.
