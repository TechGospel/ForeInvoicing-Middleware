# Local Development Setup Guide

This guide will help you set up the FIRS MBS Invoice Middleware application for local development.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v20 or later) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)
- **PostgreSQL** (v15 or later) - [Download here](https://www.postgresql.org/download/)

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd firs-mbs-invoice-middleware

# Install dependencies
npm install
```

### 2. Database Setup

You have two options for the database:

#### Option A: Use Neon (Recommended - Already configured)
The application is already configured to use Neon serverless PostgreSQL. The `DATABASE_URL` environment variable is set up for you.

#### Option B: Local PostgreSQL Setup
If you prefer to use a local PostgreSQL instance:

```bash
# Create a new database
createdb firs_mbs_dev

# Update your .env file with local database URL
DATABASE_URL="postgresql://username:password@localhost:5432/firs_mbs_dev"
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Copy the example environment file
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration
DATABASE_URL="your-neon-database-url-here"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# FIRS API Configuration (for testing)
FIRS_API_URL="https://api.firs.gov.ng/mbs/v1"
FIRS_API_KEY="your-firs-api-key-here"

# Application Configuration
NODE_ENV="development"
PORT=5000
```

### 4. Database Migration

Push the database schema to your database:

```bash
npm run db:push
```

### 5. Start the Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api

## Development Workflow

### File Structure

```
├── client/src/          # React frontend
├── server/             # Express backend
├── shared/             # Shared types and schemas
├── uploads/            # File uploads (created automatically)
└── ...
```

### Key Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run check

# Database operations
npm run db:push          # Push schema changes
```

### Default Admin User

The application creates a default admin user for development:

```
Username: admin
Password: admin123
```

**Important**: Change this password immediately after first login!

## Testing the Application

### 1. Login
- Navigate to http://localhost:5000
- Use the default admin credentials
- You'll be redirected to the dashboard

### 2. Test Invoice Submission
- Go to "Submit Invoice" in the sidebar
- Upload a test invoice file (XML or JSON)
- Check the processing status

### 3. Test Tenant Management
- Navigate to "Tenant Management"
- Create a new tenant
- Generate API keys for the tenant

## API Testing

You can test the API endpoints using curl or a tool like Postman:

### Authentication
```bash
# Login to get JWT token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Submit Invoice
```bash
# Submit an invoice (replace YOUR_JWT_TOKEN)
curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "invoice=@path/to/your/invoice.xml"
```

### Get Dashboard Metrics
```bash
# Get dashboard metrics
curl -X GET http://localhost:5000/api/dashboard/metrics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common Issues and Solutions

### Database Connection Issues

**Problem**: `Connection refused` or database connection errors
**Solution**: 
- Check your `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running (if using local setup)
- For Neon, verify your connection string is correct

### Port Already in Use

**Problem**: `EADDRINUSE: address already in use :::5000`
**Solution**:
```bash
# Find and kill the process using port 5000
lsof -ti:5000 | xargs kill -9

# Or use a different port
PORT=3000 npm run dev
```

### Missing Dependencies

**Problem**: Module not found errors
**Solution**:
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### JWT Token Issues

**Problem**: "Invalid or expired token" errors
**Solution**:
- Check that `JWT_SECRET` is set in your `.env`
- Try logging in again to get a fresh token
- Ensure the token is included in the Authorization header

## Development Tips

### 1. Hot Reload
The development server supports hot reload for both frontend and backend changes.

### 2. Database Schema Changes
After modifying `shared/schema.ts`, run:
```bash
npm run db:push
```

### 3. Environment Variables
- Frontend variables must be prefixed with `VITE_`
- Backend variables are accessed via `process.env`

### 4. File Uploads
- Upload directory is created automatically in `uploads/`
- Supports XML and JSON invoice formats

### 5. Logging
- Server logs are displayed in the console
- Check browser console for frontend issues

## Production Considerations

When moving to production:

1. **Environment Variables**: Update all secrets and API keys
2. **Database**: Use a production PostgreSQL instance
3. **SSL**: Configure HTTPS certificates
4. **Security**: Review and update security configurations
5. **Monitoring**: Set up application monitoring

## Next Steps

1. **Configure FIRS API**: Update `FIRS_API_KEY` with your actual API key
2. **Customize**: Modify the application to meet your specific needs
3. **Security**: Review and update security configurations
4. **Testing**: Add comprehensive tests for your use cases

## Support

For issues or questions:
1. Check the logs in the terminal
2. Review the browser console for frontend issues
3. Ensure all environment variables are set correctly
4. Verify database connectivity

---

**Note**: This setup guide assumes you're using the current Replit environment. For deployment to other environments, see the Docker deployment guide in `DOCKER-README.md`.