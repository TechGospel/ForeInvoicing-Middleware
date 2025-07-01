#!/bin/bash

# FIRS MBS Invoice Middleware - Docker Test Script
# This script tests the Docker deployment configuration

set -e

echo "🐳 FIRS MBS Docker Configuration Test"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${GREEN}ℹ${NC} $1"
}

# Check prerequisites
echo ""
echo "Checking prerequisites..."

# Check Docker
docker --version > /dev/null 2>&1
print_status "Docker is installed"

# Check Docker Compose
docker-compose --version > /dev/null 2>&1
print_status "Docker Compose is installed"

# Check Make (optional)
if command -v make &> /dev/null; then
    print_status "Make is available"
    USE_MAKE=true
else
    print_warning "Make not found - using docker-compose directly"
    USE_MAKE=false
fi

# Check environment file
if [ ! -f .env ]; then
    print_warning ".env file not found"
    if [ -f .env.example ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        print_info "Please edit .env file with your actual values before running in production"
    else
        echo -e "${RED}✗${NC} .env.example file not found"
        exit 1
    fi
else
    print_status ".env file exists"
fi

# Test Docker configuration files
echo ""
echo "Validating Docker configuration..."

# Check Dockerfile
[ -f Dockerfile ]
print_status "Dockerfile exists"

# Check docker-compose.yml
[ -f docker-compose.yml ]
print_status "docker-compose.yml exists"

# Check docker-compose.dev.yml
[ -f docker-compose.dev.yml ]
print_status "docker-compose.dev.yml exists"

# Check .dockerignore
[ -f .dockerignore ]
print_status ".dockerignore exists"

# Validate docker-compose configuration
echo ""
echo "Validating Docker Compose configuration..."

docker-compose config > /dev/null 2>&1
print_status "docker-compose.yml is valid"

docker-compose -f docker-compose.yml -f docker-compose.dev.yml config > /dev/null 2>&1
print_status "Development configuration is valid"

# Test Docker build
echo ""
echo "Testing Docker build..."

docker build -t firs-mbs-test . > /dev/null 2>&1
print_status "Docker image builds successfully"

# Clean up test image
docker rmi firs-mbs-test > /dev/null 2>&1
print_status "Test image cleaned up"

# Check network configuration
echo ""
echo "Checking network configuration..."

# Test if port 5000 is available
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port 5000 is already in use"
    echo "Please stop the service using port 5000 before starting Docker containers"
else
    print_status "Port 5000 is available"
fi

# Test if port 5432 is available (PostgreSQL)
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port 5432 is already in use (PostgreSQL)"
    echo "Consider stopping local PostgreSQL or changing the port mapping"
else
    print_status "Port 5432 is available"
fi

# Security checks
echo ""
echo "Running security checks..."

# Check if .env contains default passwords
if grep -q "change_me\|password_change_me\|not_for_production" .env 2>/dev/null; then
    print_warning "Default passwords detected in .env file"
    echo "Please update passwords before production deployment"
else
    print_status "No default passwords detected"
fi

# Check Dockerfile security
if grep -q "USER.*nodejs" Dockerfile; then
    print_status "Non-root user configured in Dockerfile"
else
    print_warning "Root user detected in Dockerfile"
fi

# Performance checks
echo ""
echo "Performance configuration checks..."

# Check for multi-stage build
if grep -q "FROM.*AS.*" Dockerfile; then
    print_status "Multi-stage build configured"
else
    print_warning "Single-stage build detected"
fi

# Check for .dockerignore optimization
if grep -q "node_modules\|\.git\|dist" .dockerignore; then
    print_status ".dockerignore properly configured"
else
    print_warning ".dockerignore may need optimization"
fi

# Print deployment instructions
echo ""
echo "🚀 Deployment Instructions"
echo "========================="

if [ "$USE_MAKE" = true ]; then
    echo ""
    echo "For Development:"
    echo "  make dev"
    echo ""
    echo "For Production:"
    echo "  make prod"
    echo ""
    echo "Other commands:"
    echo "  make logs      # View logs"
    echo "  make restart   # Restart services"
    echo "  make clean     # Clean up"
    echo "  make health    # Check health"
else
    echo ""
    echo "For Development:"
    echo "  docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d"
    echo ""
    echo "For Production:"
    echo "  docker-compose --profile production up -d"
    echo ""
    echo "Other commands:"
    echo "  docker-compose logs -f     # View logs"
    echo "  docker-compose restart     # Restart services"
    echo "  docker-compose down -v     # Clean up"
fi

echo ""
echo "Health check URL:"
echo "  http://localhost:5000/api/system/status"

echo ""
print_info "All Docker configuration tests passed!"
print_info "Ready for deployment"

echo ""
echo "📚 Documentation:"
echo "  - See DOCKER-README.md for detailed deployment guide"
echo "  - See security.yml for security configuration"
echo "  - See .env.example for all environment variables"