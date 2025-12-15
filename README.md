# SwanyBot Pro Ultimate Edition

**The ultimate streaming automation platform for content creators**

A full-stack web application with cyberpunk-themed UI featuring user authentication, real-time streaming automation, and comprehensive dashboard.

## Tech Stack

| Component | Technologies |
|-----------|-------------|
| **Frontend** | Next.js 14, TypeScript, TailwindCSS, Framer Motion |
| **Backend** | Express.js, TypeScript, Prisma ORM, Socket.io |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Automation** | N8N (optional) |
| **Deployment** | Docker Compose |

## Features

- **Cyberpunk-themed UI** - Stunning neon aesthetics with smooth animations
- **User Authentication** - Secure JWT-based login/signup with session management
- **Real-time Dashboard** - Live stats, quick actions, and activity feed
- **Multi-platform Streaming** - Support for Twitch, YouTube, Kick, and custom RTMP
- **Automation Engine** - Trigger-based workflows for stream events
- **Chat Bot** - Custom commands and auto-moderation
- **Alert System** - Configurable alerts for followers, subs, donations

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Development Setup

```bash
# Clone and install
git clone <repo-url>
cd swanybot-pro

# Backend setup
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev

# Frontend setup (in another terminal)
cd frontend
npm install
npm run dev
```

### Docker Deployment

```bash
# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Launch all services
docker-compose up -d

# Access:
# - Dashboard: http://localhost:3000
# - API: http://localhost:4000
# - N8N Automation: http://localhost:5678 (admin/swanybot123)
```

## Project Structure

```
swanybot-pro/
├── frontend/                 # Next.js 14 frontend
│   ├── src/
│   │   ├── app/             # App router pages
│   │   │   ├── login/       # Login page
│   │   │   ├── signup/      # Signup page
│   │   │   └── dashboard/   # Protected dashboard
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities & API client
│   │   └── styles/          # Global styles
│   └── Dockerfile
├── backend/                  # Express.js API
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth & error handling
│   │   └── index.ts         # Server entry
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── Dockerfile
└── docker-compose.yml        # Full stack deployment
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new account |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/logout` | Logout (requires auth) |
| GET | `/api/auth/me` | Get current user |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get user profile |
| PATCH | `/api/users/profile` | Update profile |
| GET | `/api/users/:id` | Get public profile |

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/swanybot
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=4000
FRONTEND_URL=http://localhost:3000
```

### Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## License

MIT License - See [LICENSE](LICENSE) for details.
