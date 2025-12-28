# SwanyBot Ultimate

> Complete AI Business Platform with n8n Cloud, OpenRouter, LLMLingua, ElevenLabs, Bloom Evaluation, and MCP Integration

## Features

| Feature | Description |
|---------|-------------|
| **n8n Cloud** | Workflow automation via techmunity.app.n8n.cloud |
| **OpenRouter** | Multi-model AI routing (Claude, GPT, Gemini, DeepSeek) |
| **LLMLingua** | Token compression - 50% reduction, $445+ saved |
| **ElevenLabs** | Voice cloning and synthesis |
| **Bloom Evaluation** | AI behavioral alignment testing |
| **MCP Integration** | Claude Desktop, Lovable, Cursor connection |
| **E-Commerce** | Jewelry product management with AI optimization |

## Quick Start

```bash
# Full setup (frontend + backend + database)
npm run setup

# Start development servers
npm run dev:full
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- **Password:** `swanypro2026`

## Docker Deployment

```bash
npm run docker:up      # Build and start
npm run docker:logs    # View logs
npm run docker:down    # Stop containers
```

## Project Structure

```
├── src/                          # React Frontend (Vite + Tailwind)
│   ├── components/SwanyBotUltimate.jsx
│   └── services/api.js
├── server/                       # Express Backend (SQLite)
│   ├── db/                       # Database migrations & seed
│   └── routes/                   # API routes (10 modules)
├── Dockerfile                    # Multi-stage build
└── docker-compose.yml            # Container orchestration
```

## API Endpoints

| Route | Description |
|-------|-------------|
| `/api/workflows` | n8n workflow management |
| `/api/agents` | AI agent orchestration |
| `/api/openrouter` | Multi-model chat completion |
| `/api/llmlingua` | Text compression |
| `/api/voice` | Voice synthesis |
| `/api/bloom` | Behavioral testing |
| `/api/mcp` | MCP server bridge |
| `/api/products` | E-commerce CRUD |
| `/api/analytics` | Dashboard metrics |

## Environment Variables

Copy `.env.example` files and configure:
- `OPENROUTER_API_KEY` - AI model routing
- `ELEVENLABS_API_KEY` - Voice cloning
- `N8N_WEBHOOK_URL` - n8n integration
- `MCP_ACCESS_TOKEN` - MCP bridge

## Tech Stack

- **Frontend:** React 18, Vite 6, Tailwind CSS
- **Backend:** Express, SQLite, Node.js 20
- **DevOps:** Docker, Nginx

## License

MIT
