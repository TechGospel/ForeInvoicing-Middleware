#!/bin/bash

# FIRS MBS Invoice Middleware - Local Development Setup Script
# This script automates the local development environment setup

set -e

echo "🚀 FIRS MBS Local Development Setup"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo -e "${BLUE}ℹ${NC} $1"
}

print_step() {
    echo -e "\n${BLUE}Step $1:${NC} $2"
}

# Check prerequisites
print_step "1" "Checking prerequisites"

# Check Node.js
node --version > /dev/null 2>&1
NODE_VERSION=$(node --version)
print_status "Node.js is installed ($NODE_VERSION)"

# Check npm
npm --version > /dev/null 2>&1
NPM_VERSION=$(npm --version)
print_status "npm is installed ($NPM_VERSION)"

# Check if package.json exists
[ -f package.json ]
print_status "package.json found"

# Install dependencies
print_step "2" "Installing dependencies"
npm install
print_status "Dependencies installed"

# Setup environment
print_step "3" "Setting up environment"

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_status ".env file created from .env.example"
        print_warning "Please edit .env file with your actual values"
    else
        print_warning ".env.example not found, creating basic .env"
        cat > .env << 'EOF'
# Database Configuration
DATABASE_URL="your-database-url-here"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# FIRS API Configuration
FIRS_API_URL="https://api.firs.gov.ng/mbs/v1"
FIRS_API_KEY="your-firs-api-key-here"

# Application Configuration
NODE_ENV="development"
PORT=5000
EOF
        print_status "Basic .env file created"
    fi
else
    print_status ".env file already exists"
fi

# Create uploads directory
print_step "4" "Setting up directories"
mkdir -p uploads
print_status "uploads directory created"

# Check database connection
print_step "5" "Database setup"

if grep -q "your-database-url-here" .env 2>/dev/null; then
    print_warning "Database URL not configured in .env"
    print_info "Please update DATABASE_URL in .env file"
    print_info "For Neon: Use the connection string provided by Neon"
    print_info "For local PostgreSQL: postgresql://username:password@localhost:5432/dbname"
else
    print_status "Database URL configured"
    
    # Try to push database schema
    print_info "Pushing database schema..."
    if npm run db:push; then
        print_status "Database schema pushed successfully"
    else
        print_warning "Database schema push failed"
        print_info "Please check your DATABASE_URL and database connectivity"
    fi
fi

# Check JWT secret
print_step "6" "Security configuration"

if grep -q "your-super-secret-jwt-key-change-this-in-production" .env 2>/dev/null; then
    print_warning "Default JWT secret detected"
    print_info "Please update JWT_SECRET in .env file with a secure random string"
else
    print_status "JWT secret configured"
fi

# Final setup
print_step "7" "Final setup"

# Check if TypeScript compiles
print_info "Checking TypeScript compilation..."
if npm run check; then
    print_status "TypeScript compilation successful"
else
    print_warning "TypeScript compilation issues detected"
    print_info "Please check the errors above and fix them"
fi

# Print success message
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your local development environment is ready!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your actual database URL and API keys"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:5000"
echo ""
echo "Default admin credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Important files:"
echo "  - .env                 # Environment configuration"
echo "  - LOCAL-SETUP.md      # Detailed setup guide"
echo "  - uploads/            # Invoice file uploads"
echo ""
echo "Development commands:"
echo "  npm run dev           # Start development server"
echo "  npm run build         # Build for production"
echo "  npm run check         # Type checking"
echo "  npm run db:push       # Push database schema"
echo ""
echo "For detailed instructions, see LOCAL-SETUP.md"

# Check if development server can start
echo ""
print_info "Testing development server startup..."
if timeout 10s npm run dev > /dev/null 2>&1; then
    print_status "Development server starts successfully"
else
    print_warning "Development server startup test failed"
    print_info "Try running 'npm run dev' manually to see detailed error messages"
fi

echo ""
print_info "Setup completed successfully!"
print_info "Run 'npm run dev' to start the development server"