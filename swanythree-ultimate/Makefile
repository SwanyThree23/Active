.PHONY: install build start stop logs migrate clean dev test help

# Default target
help:
	@echo "SwanyThree Ultimate - Available Commands"
	@echo "========================================"
	@echo "make install    - Install all dependencies"
	@echo "make build      - Build Docker images"
	@echo "make start      - Start all services"
	@echo "make stop       - Stop all services"
	@echo "make restart    - Restart all services"
	@echo "make logs       - View logs (all services)"
	@echo "make logs-f     - Follow logs (all services)"
	@echo "make migrate    - Run Prisma migrations"
	@echo "make clean      - Remove containers and volumes"
	@echo "make dev        - Start in development mode"
	@echo "make test       - Run tests"
	@echo "make status     - Show service status"
	@echo "make shell-be   - Open shell in backend container"
	@echo "make shell-fe   - Open shell in frontend container"

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && npm install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing Python dependencies..."
	cd services/stream-processor && pip install -r requirements.txt
	cd services/agent-orchestrator && pip install -r requirements.txt
	cd services/video-processor && pip install -r requirements.txt
	cd services/notebooklm-bridge && pip install -r requirements.txt
	@echo "All dependencies installed!"

# Build Docker images
build:
	@echo "Building Docker images..."
	docker-compose build --no-cache
	@echo "Build complete!"

# Start all services
start:
	@echo "Starting all services..."
	cp -n .env.example .env 2>/dev/null || true
	docker-compose up -d
	@echo "Waiting for services to be healthy..."
	sleep 10
	@make status

# Stop all services
stop:
	@echo "Stopping all services..."
	docker-compose down
	@echo "All services stopped!"

# Restart all services
restart: stop start

# View logs
logs:
	docker-compose logs

# Follow logs
logs-f:
	docker-compose logs -f

# View logs for specific service
logs-%:
	docker-compose logs -f $*

# Run Prisma migrations
migrate:
	@echo "Running Prisma migrations..."
	docker-compose exec backend npx prisma migrate deploy
	@echo "Migrations complete!"

# Generate Prisma client
prisma-generate:
	@echo "Generating Prisma client..."
	docker-compose exec backend npx prisma generate
	@echo "Prisma client generated!"

# Clean up containers and volumes
clean:
	@echo "Cleaning up containers and volumes..."
	docker-compose down -v --rmi local
	docker system prune -f
	@echo "Cleanup complete!"

# Development mode (with hot reload)
dev:
	@echo "Starting in development mode..."
	docker-compose up --build

# Run tests
test:
	@echo "Running backend tests..."
	docker-compose exec backend npm test
	@echo "Running frontend tests..."
	docker-compose exec frontend npm test

# Show service status
status:
	@echo "Service Status:"
	@echo "==============="
	@docker-compose ps

# Health check
health:
	@echo "Checking service health..."
	@curl -s http://localhost:8000/health | jq . || echo "Backend: Not responding"
	@curl -s http://localhost:8001/health | jq . || echo "Stream Processor: Not responding"
	@curl -s http://localhost:8002/health | jq . || echo "Agent Orchestrator: Not responding"
	@curl -s http://localhost:8003/health | jq . || echo "Video Processor: Not responding"
	@curl -s http://localhost:8013/health | jq . || echo "NotebookLM Bridge: Not responding"

# Open shell in backend container
shell-be:
	docker-compose exec backend sh

# Open shell in frontend container
shell-fe:
	docker-compose exec frontend sh

# Database shell
db-shell:
	docker-compose exec postgres psql -U postgres -d swanythree

# Redis CLI
redis-cli:
	docker-compose exec redis redis-cli

# Seed database with sample data
seed:
	docker-compose exec backend npx ts-node src/seed.ts

# Production deployment
deploy-prod:
	@echo "Deploying to production..."
	./production-deploy.sh
