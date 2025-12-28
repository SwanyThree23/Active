# Multi-stage build for SwanyBot Ultimate

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine AS production
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy server code
COPY server/ ./

# Copy built frontend
COPY --from=frontend-builder /app/dist ../frontend/dist

# Create data directory
RUN mkdir -p /app/data

# Environment
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/app/data/swanybot.db

# Expose port
EXPOSE 3001

# Run migrations and start server
CMD ["sh", "-c", "node db/migrate.js && node db/seed.js && node index.js"]
