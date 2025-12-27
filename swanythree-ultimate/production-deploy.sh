#!/bin/bash

# SwanyThree Ultimate - Production Deployment Script
# ==================================================

set -e

echo "================================================"
echo "  SwanyThree Ultimate - Production Deployment"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    echo "Checking dependencies..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_status "Docker is installed"

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_status "Docker Compose is installed"

    echo ""
}

# Check environment file
check_env() {
    echo "Checking environment configuration..."

    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env file with your production values!"
        echo ""
        echo "Required environment variables to configure:"
        echo "  - JWT_SECRET (generate a secure random string)"
        echo "  - ANTHROPIC_API_KEY (your Claude API key)"
        echo "  - N8N_API_KEY (your n8n API key)"
        echo "  - N8N_BASE_URL (your n8n instance URL)"
        echo "  - GEMINI_API_KEY (your Google Gemini API key)"
        echo "  - ELEVENLABS_API_KEY (your ElevenLabs API key)"
        echo "  - AWS credentials (for S3 video storage)"
        echo ""
        read -p "Press enter to continue after editing .env file..."
    fi
    print_status "Environment file exists"

    # Check for placeholder values
    if grep -q "placeholder" .env; then
        print_warning "Placeholder values found in .env file. Please replace with real values."
    fi

    echo ""
}

# Build Docker images
build_images() {
    echo "Building Docker images..."
    docker-compose build --no-cache
    print_status "Docker images built successfully"
    echo ""
}

# Pull latest images and start services
start_services() {
    echo "Starting services..."
    docker-compose up -d
    print_status "Services started"
    echo ""
}

# Wait for services to be healthy
wait_for_health() {
    echo "Waiting for services to become healthy..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        echo "  Attempt $attempt/$max_attempts..."

        # Check backend health
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            print_status "Backend is healthy"
            break
        fi

        sleep 5
        attempt=$((attempt + 1))
    done

    if [ $attempt -gt $max_attempts ]; then
        print_error "Services failed to become healthy within timeout"
        echo "Check logs with: docker-compose logs"
        exit 1
    fi

    echo ""
}

# Run database migrations
run_migrations() {
    echo "Running database migrations..."
    docker-compose exec -T backend npx prisma migrate deploy
    print_status "Database migrations completed"
    echo ""
}

# Display service status
show_status() {
    echo "================================================"
    echo "  Deployment Complete!"
    echo "================================================"
    echo ""
    echo "Service URLs:"
    echo "  Frontend:           http://localhost:3000"
    echo "  Backend API:        http://localhost:8000"
    echo "  Stream Processor:   http://localhost:8001"
    echo "  Agent Orchestrator: http://localhost:8002"
    echo "  Video Processor:    http://localhost:8003"
    echo "  NotebookLM Bridge:  http://localhost:8013"
    echo ""
    echo "Database:"
    echo "  PostgreSQL:         localhost:5432"
    echo "  Redis:              localhost:6379"
    echo ""
    echo "Useful commands:"
    echo "  make logs          - View all service logs"
    echo "  make status        - Show service status"
    echo "  make stop          - Stop all services"
    echo "  make restart       - Restart all services"
    echo ""
    docker-compose ps
}

# Main deployment flow
main() {
    check_dependencies
    check_env
    build_images
    start_services
    wait_for_health
    run_migrations
    show_status
}

# Run main function
main
