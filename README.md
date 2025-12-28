# AI Content Studio

A comprehensive full-stack AI Content Studio platform for creating AI-powered content with multi-modal generation capabilities.

## Features

### Core Capabilities
- **AI Script Generation** - Generate professional scripts using Claude AI
- **Voice Synthesis** - Text-to-speech with ElevenLabs voices
- **Avatar Videos** - Create AI avatar videos with HeyGen
- **Newsletter Automation** - Manage newsletters via Beehiiv integration
- **Product Hunt Launch Tools** - Track and optimize launches
- **Workflow Orchestration** - Automate with N8N integration

### AI Integrations (9 Services)
- **Claude API** - Script generation, compression
- **Whisperflow** - Speech-to-text, speaker diarization
- **LLMLingua** - Prompt compression, token optimization
- **ElevenLabs** - Text-to-speech, voice cloning
- **HeyGen** - AI avatar video generation
- **Descript** - Video editing, overdub, captions
- **Beehiiv** - Newsletter management, campaigns
- **Product Hunt** - Launch tracking, analytics
- **N8N** - Workflow orchestration

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Databases**: PostgreSQL, MongoDB, Redis
- **Auth**: OAuth 2.0 (Google, GitHub), JWT, 2FA
- **Deployment**: Docker, Vercel, CloudFlare CDN
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+
- MongoDB 7+
- Redis 7+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/ai-content-studio.git
cd ai-content-studio
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Start development databases:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

5. Run database migrations:
```bash
npm run db:push
```

6. Start the development servers:
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server:dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."
MONGODB_URI="mongodb://..."
REDIS_URL="redis://..."

# Authentication
JWT_SECRET="your-secret"
NEXTAUTH_SECRET="your-secret"

# AI Services
CLAUDE_API_KEY=""
ELEVENLABS_API_KEY=""
HEYGEN_API_KEY=""
# ... see .env.example for full list
```

## Project Structure

```
├── app/                 # Next.js pages and layouts
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard page
│   ├── studio/         # AI Studio page
│   ├── templates/      # Templates page
│   ├── newsletter/     # Newsletter page
│   └── launch/         # Launch tools page
├── components/          # React components
│   ├── ui/             # UI primitives
│   └── shared/         # Shared components
├── lib/                 # Utilities and clients
│   ├── api/            # API client
│   ├── db/             # Database connections
│   ├── integrations/   # AI service clients
│   └── utils/          # Helper functions
├── prisma/              # Database schema
├── server/              # Express backend
│   ├── routes/         # API routes
│   ├── middleware/     # Express middleware
│   └── services/       # Business logic
└── types/               # TypeScript definitions
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### Content
- `GET /api/v1/content` - List content
- `POST /api/v1/content` - Create content
- `POST /api/v1/content/generate` - Generate with AI
- `POST /api/v1/content/:id/process` - Process content

### AI Services
- `POST /api/v1/claude/complete` - Text completion
- `POST /api/v1/claude/script` - Script generation
- `POST /api/v1/elevenlabs/tts` - Text-to-speech
- `POST /api/v1/heygen/avatar` - Avatar video generation

### Templates
- `GET /api/v1/templates` - List templates
- `POST /api/v1/templates/:id/use` - Use template

### Newsletter
- `GET /api/v1/newsletter` - List newsletters
- `POST /api/v1/newsletter/generate` - Generate with AI
- `POST /api/v1/newsletter/:id/send` - Send newsletter

### Analytics
- `GET /api/v1/analytics/metrics` - Dashboard metrics

## Deployment

### Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Vercel

The frontend is automatically deployed to Vercel on push to main branch.

```bash
# Manual deploy
vercel --prod
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Code Quality

```bash
# Lint
npm run lint

# Type check
npx tsc --noEmit
```

### Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

## Design System

### Colors
- **Primary**: Amber-600 (#d97706)
- **Accent**: Orange-600 (#ea580c)
- **Surface**: Stone-900 (#1c1917)
- **Success**: Emerald-500 (#22c55e)

### Effects
- Glassmorphism with backdrop-blur
- Glow shadows on hover
- Smooth transitions and animations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: [docs.aicontentstudio.com](https://docs.aicontentstudio.com)
- Issues: [GitHub Issues](https://github.com/your-org/ai-content-studio/issues)
