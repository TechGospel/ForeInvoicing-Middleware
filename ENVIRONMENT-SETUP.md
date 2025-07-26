# Environment Setup Guide

This guide explains how to configure environment variables for the FIRS Invoice Middleware application on your local machine.

## Quick Setup

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file with your actual values:**
   ```bash
   nano .env  # or use your preferred editor
   ```

3. **Set required environment variables** (see sections below)

## Required Environment Variables

### Database Configuration
```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Connection pool settings
DB_POOL_SIZE=10
DB_CONNECTION_TIMEOUT=5000
```

### Security Configuration
```bash
# JWT secret for token signing (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Session secret for session management (minimum 32 characters)
SESSION_SECRET=your-session-secret-key-minimum-32-characters-long
```

### FIRS API Configuration
```bash
# Official FIRS API endpoint
FIRS_API_URL=https://einvoice.firs.gov.ng/api/v1

# Your FIRS API key (obtain from FIRS registration)
FIRS_API_KEY=your-actual-firs-api-key-here

# API timeout and retry settings
FIRS_TIMEOUT=30000
FIRS_RETRY_ATTEMPTS=3

# Enable/disable actual FIRS submission (set to false for testing)
ENABLE_FIRS_SUBMISSION=false
```

## Optional Environment Variables

### Application Settings
```bash
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# CORS settings
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:3000

# File upload settings
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### Validation Settings
```bash
# Enable strict validation rules
STRICT_VALIDATION=true

# Enable Nigerian TIN format validation
ENABLE_TIN_VALIDATION=true

# Show detailed error messages
ENABLE_DETAILED_ERRORS=true
```

### Email Configuration (for notifications)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

### Audit and Logging
```bash
# Enable audit logging
ENABLE_AUDIT_LOGGING=true

# Log retention (days)
AUDIT_LOG_RETENTION_DAYS=365

# Logging level
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
```

### Rate Limiting
```bash
# Rate limit window (milliseconds)
RATE_LIMIT_WINDOW_MS=900000

# Max requests per window
RATE_LIMIT_MAX_REQUESTS=100
```

### Multi-tenant Settings
```bash
# Default tenant for operations
DEFAULT_TENANT_ID=1

# Enable tenant isolation
ENABLE_TENANT_ISOLATION=true
```

## Development vs Production

### Development Environment
```bash
NODE_ENV=development
ENABLE_FIRS_SUBMISSION=false
ENABLE_DEBUG_MODE=true
ENABLE_DETAILED_ERRORS=true
LOG_LEVEL=debug
```

### Production Environment
```bash
NODE_ENV=production
ENABLE_FIRS_SUBMISSION=true
ENABLE_DEBUG_MODE=false
ENABLE_DETAILED_ERRORS=false
LOG_LEVEL=info
```

## Security Best Practices

### Generate Strong Secrets
```bash
# Generate JWT secret (Linux/Mac)
openssl rand -base64 48

# Generate session secret
openssl rand -hex 32

# Alternative using Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### FIRS API Key
1. Register your organization with FIRS e-invoicing system
2. Obtain your API key from the FIRS portal
3. Never commit API keys to version control
4. Use different keys for development and production

## Database Setup

### Local PostgreSQL
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib  # Ubuntu/Debian
brew install postgresql                          # macOS

# Create database
sudo -u postgres createdb firs_invoices

# Create user
sudo -u postgres createuser --interactive firs_admin

# Set password
sudo -u postgres psql -c "ALTER USER firs_admin PASSWORD 'your_password';"

# Grant permissions
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE firs_invoices TO firs_admin;"
```

### Connection String Format
```bash
# Standard format
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]

# With SSL (recommended for production)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Local development
DATABASE_URL=postgresql://firs_admin:your_password@localhost:5432/firs_invoices
```

## Environment Validation

The application automatically validates environment variables on startup:

### Required for Production
- `DATABASE_URL`
- `JWT_SECRET` (minimum 32 characters)
- `SESSION_SECRET` (minimum 32 characters)

### Development Defaults
If not provided in development, the application will use secure defaults:
- JWT_SECRET: Generated random string
- SESSION_SECRET: Generated random string
- DATABASE_URL: Points to local PostgreSQL

### Validation Errors
```bash
# If you see this error:
Error: Missing required environment variables for production: JWT_SECRET, SESSION_SECRET

# Solution: Set the missing variables in your .env file
JWT_SECRET=your-actual-jwt-secret-here
SESSION_SECRET=your-actual-session-secret-here
```

## Testing Configuration

### Verify Environment Setup
```bash
# Start the application
npm run dev

# Check for validation warnings
# Look for these log messages:
# ✅ Environment variables loaded successfully
# ⚠️  Using development defaults for security keys
# 📋 Application Configuration: (if debug mode enabled)
```

### Test Database Connection
```bash
# Run database migration
npm run db:push

# Should complete without errors
```

### Test FIRS API (if configured)
```bash
# Check system status endpoint
curl http://localhost:5000/api/system/status

# Should return FIRS API status
```

## Common Issues

### Port Already in Use
```bash
# Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
# Solution: Change port or kill existing process
PORT=5001 npm run dev
```

### Database Connection Errors
```bash
# Error: database "firs_invoices" does not exist
# Solution: Create the database
sudo -u postgres createdb firs_invoices
```

### JWT Secret Too Short
```bash
# Warning: JWT_SECRET should be at least 32 characters long
# Solution: Generate a longer secret
JWT_SECRET=$(openssl rand -base64 48)
```

### FIRS API Connectivity
```bash
# If FIRS submission fails:
# 1. Check FIRS_API_KEY is correct
# 2. Verify FIRS_API_URL is accessible
# 3. Set ENABLE_FIRS_SUBMISSION=false for testing
```

## Environment File Template

Create a `.env` file with this template:

```bash
# Required - Database
DATABASE_URL=postgresql://firs_admin:your_password@localhost:5432/firs_invoices

# Required - Security
JWT_SECRET=your-jwt-secret-minimum-32-characters-long-change-this
SESSION_SECRET=your-session-secret-minimum-32-characters-long-change-this

# Optional - FIRS API
FIRS_API_KEY=your-firs-api-key-here
ENABLE_FIRS_SUBMISSION=false

# Optional - Application
NODE_ENV=development
LOG_LEVEL=info
ENABLE_DEBUG_MODE=true
```

## Next Steps

1. **Set up environment variables** following this guide
2. **Test the configuration** by starting the application
3. **Run database migrations** with `npm run db:push`
4. **Upload test invoices** using the sample documents
5. **Configure FIRS API** when ready for production

For more details, see:
- `LOCAL-SETUP.md` - Complete local development setup
- `FIRS-COMPLIANCE.md` - FIRS API integration details
- `sample-data/testing-instructions.md` - Invoice testing guide