#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   ███████╗██╗    ██╗ █████╗ ███╗   ██╗██╗   ██╗      ║"
echo "║   ██╔════╝██║    ██║██╔══██╗████╗  ██║╚██╗ ██╔╝      ║"
echo "║   ███████╗██║ █╗ ██║███████║██╔██╗ ██║ ╚████╔╝       ║"
echo "║   ╚════██║██║███╗██║██╔══██║██║╚██╗██║  ╚██╔╝        ║"
echo "║   ███████║╚███╔███╔╝██║  ██║██║ ╚████║   ██║         ║"
echo "║   ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝         ║"
echo "║                                                       ║"
echo "║         SwanyThree Ultimate Deployment                ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cp .env.example .env

    # Generate encryption key
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    sed -i "s/your_32_byte_hex_encryption_key_here/$ENCRYPTION_KEY/" .env

    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/your_jwt_secret_key_here_minimum_32_chars/$JWT_SECRET/" .env

    # Generate database password
    DB_PASSWORD=$(openssl rand -base64 24)
    sed -i "s/your_secure_database_password_here/$DB_PASSWORD/" .env

    echo -e "${GREEN}✅ Generated secure keys in .env file${NC}"
    echo -e "${YELLOW}⚠️  Please add your API keys to .env before continuing${NC}"
    echo ""
    echo "Required API keys:"
    echo "  - ANTHROPIC_API_KEY (Claude)"
    echo "  - ELEVENLABS_API_KEY (Voice)"
    echo "  - HEYGEN_API_KEY (Avatars)"
    echo ""
    read -p "Press Enter to continue after adding API keys..."
fi

# Source the .env file
export $(grep -v '^#' .env | xargs)

# Check required keys
if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "sk-ant-your-key-here" ]; then
    echo -e "${YELLOW}⚠️  Warning: ANTHROPIC_API_KEY not configured. AI features will be limited.${NC}"
fi

echo -e "\n${CYAN}📦 Step 1: Building Docker images...${NC}"
docker-compose build --no-cache

echo -e "\n${CYAN}🚀 Step 2: Starting services...${NC}"
docker-compose up -d

echo -e "\n${CYAN}⏳ Step 3: Waiting for services to be ready...${NC}"

# Wait for PostgreSQL
echo -n "  Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U swanythree > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}Ready!${NC}"

# Wait for Redis
echo -n "  Waiting for Redis..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}Ready!${NC}"

# Wait for API
echo -n "  Waiting for API..."
until curl -s http://localhost:3000/health > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}Ready!${NC}"

# Wait for Frontend
echo -n "  Waiting for Frontend..."
until curl -s http://localhost/health > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}Ready!${NC}"

echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SwanyThree Ultimate is now running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Frontend:${NC}     http://localhost"
echo -e "  ${CYAN}API:${NC}          http://localhost:3000"
echo -e "  ${CYAN}N8N:${NC}          http://localhost:5678"
echo -e "  ${CYAN}PostgreSQL:${NC}   localhost:5432"
echo -e "  ${CYAN}Redis:${NC}        localhost:6379"
echo ""
echo -e "  ${YELLOW}Default Login:${NC}"
echo -e "    Email: any email address"
echo -e "    Password: swanypro2026"
echo ""
echo -e "  ${YELLOW}N8N Login:${NC}"
echo -e "    User: ${N8N_USER:-admin}"
echo -e "    Password: ${N8N_PASSWORD:-swanyn8n2026}"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Commands:"
echo -e "  ${CYAN}docker-compose logs -f${NC}     - View logs"
echo -e "  ${CYAN}docker-compose stop${NC}        - Stop services"
echo -e "  ${CYAN}docker-compose restart${NC}     - Restart services"
echo -e "  ${CYAN}docker-compose down${NC}        - Stop and remove"
echo ""
