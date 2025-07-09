# Overview

This is a production-grade FIRS MBS (Federal Inland Revenue Service - Micro Business Solutions) invoice middleware API service built for B2B invoice integration in Nigeria. The application provides a secure, scalable REST API that validates, normalizes, and submits invoices to the FIRS e-invoicing system while supporting multi-tenancy and comprehensive audit logging.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: JWT-based authentication with context providers

## Backend Architecture
- **Runtime**: Node.js with TypeScript and ESM modules
- **Framework**: Express.js for REST API endpoints
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: JWT tokens with bcrypt password hashing
- **File Handling**: Multer for invoice file uploads
- **Validation**: Zod schemas for request/response validation

## Database Design
The system uses a multi-tenant PostgreSQL database with the following core entities:
- **Tenants**: Organization-level isolation with API keys and custom configurations
- **Users**: Role-based access control tied to specific tenants
- **Invoices**: Complete invoice lifecycle tracking with status management
- **Audit Logs**: Comprehensive activity logging for compliance and debugging

# Key Components

## Invoice Processing Pipeline
1. **File Upload & Validation**: Accepts XML (UBL 3.0) and JSON invoice formats (single or bulk)
2. **Format Normalization**: Converts all inputs to standardized UBL 3.0 XML internally
3. **Business Rules Validation**: Validates TIN formats, tax calculations, and required fields
4. **FIRS Integration**: Submits validated invoices to FIRS MBS API with retry logic
5. **Status Tracking**: Maintains invoice state throughout the processing lifecycle
6. **Bulk Processing**: Processes multiple invoices individually from a single upload with batch tracking

## Authentication & Authorization
- **Multi-tenant Architecture**: Tenant isolation with API key-based access
- **Role-based Access Control**: Admin and user roles with different permissions
- **JWT Token Management**: Secure token-based authentication with 24-hour expiration

## Validation Engine
- **Field Validation**: Nigerian TIN format validation, tax calculation verification
- **Schema Compliance**: BIS UBL 3.0 XML schema validation
- **Custom Rules**: Tenant-specific validation rules stored in database configuration

## External Service Integration
- **FIRS MBS API**: Primary integration point for invoice submission
- **Retry Mechanism**: Exponential backoff for failed submissions
- **Response Handling**: IRN (Invoice Reference Number) and QR code processing

# Data Flow

1. **Invoice Submission**: Client uploads invoice via REST API with authentication
2. **Tenant Validation**: System validates API key and tenant permissions
3. **Format Detection**: Automatically detects XML or JSON input format
4. **Normalization**: Converts input to standardized UBL 3.0 XML format
5. **Business Validation**: Applies FIRS compliance rules and tenant-specific validations
6. **FIRS Submission**: Sends validated invoice to FIRS MBS endpoint
7. **Response Processing**: Stores IRN, QR code, and submission status
8. **Audit Logging**: Records all actions for compliance and debugging

# External Dependencies

## Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection pooling
- **drizzle-orm**: Type-safe ORM with PostgreSQL support
- **bcrypt**: Secure password hashing
- **jsonwebtoken**: JWT token generation and validation
- **multer**: File upload handling for invoice documents
- **zod**: Schema validation for API requests

## Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI component primitives
- **wouter**: Lightweight React router
- **tailwindcss**: Utility-first CSS framework

## Development Dependencies
- **vite**: Fast build tool and development server
- **typescript**: Type safety and developer experience
- **tsx**: TypeScript execution for development

# Deployment Strategy

## Development Environment
- **Local Development**: Vite dev server with HMR for frontend, tsx for backend
- **Database**: Neon serverless PostgreSQL for development
- **Environment Variables**: DATABASE_URL, JWT_SECRET, FIRS_API_URL, FIRS_API_KEY

## Docker Containerization
- **Multi-stage Dockerfile**: Optimized production build with Alpine Linux base
- **Container Security**: Non-root user execution with minimal privileges
- **Service Orchestration**: Docker Compose with PostgreSQL, Redis, and Nginx
- **Development Setup**: Separate dev override with hot reloading
- **Production Configuration**: Health checks, resource limits, and security hardening

## Production Build
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: esbuild compiles TypeScript server to `dist/index.js`
- **Database Migrations**: Drizzle Kit handles schema migrations
- **Static Serving**: Express serves built frontend assets in production
- **Reverse Proxy**: Nginx with rate limiting, gzip compression, and security headers

## Scalability Considerations
- **Stateless Design**: JWT-based authentication enables horizontal scaling
- **Database Connection Pooling**: Neon serverless handles connection management
- **Multi-tenant Architecture**: Tenant isolation supports scaling to multiple organizations
- **Async Processing**: Built-in support for background invoice processing

# Local Development Setup

## Quick Start Guide
1. **Prerequisites**: Node.js v20+, npm, PostgreSQL (optional - Neon is configured)
2. **Install**: `npm install`
3. **Environment**: Copy `.env.example` to `.env` and configure your database URL
4. **Database**: Run `npm run db:push` to set up the schema
5. **Start**: `npm run dev` - Application runs on http://localhost:5000

## Development Tools
- **Setup Script**: `./setup-local.sh` - Automated local environment setup
- **Environment Check**: `node check-env.js` - Validates configuration
- **Hot Reload**: Both frontend and backend support hot reloading
- **Default Admin**: Username: `admin`, Password: `admin123`

## Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

For detailed setup instructions, see `LOCAL-SETUP.md`

# Changelog

```
Changelog:
- July 01, 2025. Initial setup
- July 01, 2025. Added bulk invoice submission feature with individual processing
- July 01, 2025. Implemented comprehensive Docker containerization with production-grade security
- July 01, 2025. Added comprehensive local development setup with automated scripts
```

# User Preferences

```
Preferred communication style: Simple, everyday language.
```