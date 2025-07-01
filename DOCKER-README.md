# FIRS MBS Invoice Middleware - Docker Deployment Guide

This guide provides comprehensive instructions for deploying the FIRS MBS invoice middleware application using Docker with industry best practices.

## 🚀 Quick Start

### Prerequisites
- Docker Engine 20.10+ 
- Docker Compose 2.0+
- Make (optional, for convenience commands)

### Development Setup
```bash
# Clone and setup environment
git clone <repository>
cd firs-mbs-middleware
make setup-env

# Edit .env file with your configuration
nano .env

# Start development environment
make dev
```

### Production Setup
```bash
# Setup production environment
make setup-env
# Edit .env for production values

# Start production stack
make prod
```

## 📁 Docker Configuration Files

### Core Files
- `Dockerfile` - Multi-stage production-optimized build
- `docker-compose.yml` - Main orchestration configuration
- `docker-compose.dev.yml` - Development overrides
- `.dockerignore` - Build context optimization
- `nginx.conf` - Reverse proxy configuration

### Environment Files
- `.env.example` - Template with all variables
- `.env` - Your actual configuration (create from example)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   Application   │    │   PostgreSQL    │
│  (Reverse Proxy)│────│     (Node.js)   │────│    Database     │
│   Port: 80/443  │    │    Port: 5000   │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │      Redis      │
                       │  (Sessions)     │
                       │   Port: 6379    │
                       └─────────────────┘
```

## 🔧 Configuration

### Environment Variables

#### Database Configuration
```env
DATABASE_URL=postgresql://user:password@postgres:5432/dbname
POSTGRES_DB=firs_mbs
POSTGRES_USER=firs_admin
POSTGRES_PASSWORD=secure_password_change_me
```

#### Security Configuration
```env
JWT_SECRET=your_jwt_secret_minimum_32_characters
SESSION_SECRET=your_session_secret_minimum_32_characters
```

#### FIRS API Integration
```env
FIRS_API_URL=https://api.firs.gov.ng
FIRS_API_KEY=your_firs_api_key_here
```

### Security Features

#### Multi-stage Docker Build
- Dependencies installed in separate stage
- Production image contains only runtime files
- Non-root user execution
- Minimal Alpine Linux base

#### Container Security
- Non-root user (nodejs:nodejs)
- Read-only root filesystem where possible
- Resource limits and health checks
- Secure secrets management

#### Network Security
- Internal Docker network isolation
- Nginx reverse proxy with rate limiting
- HTTPS termination ready
- Security headers enforcement

## 🚀 Deployment Commands

### Using Make (Recommended)
```bash
# Development
make dev                # Start development environment
make logs              # View application logs
make restart           # Restart all services

# Production  
make prod              # Start production environment
make backup            # Backup database
make health            # Check application health

# Maintenance
make clean             # Remove all containers and volumes
make security-scan     # Scan for vulnerabilities
make update-deps       # Update dependencies
```

### Using Docker Compose Directly
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker-compose --profile production up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## 🔍 Health Monitoring

### Health Checks
All services include comprehensive health checks:

```bash
# Application health
curl http://localhost:5000/api/system/status

# Container health status
docker-compose ps
```

### Monitoring Commands
```bash
# Real-time resource usage
make monitor

# Container logs
make logs

# Database connection test
make db-shell
```

## 🛡️ Security Best Practices

### Container Security
- ✅ Non-root user execution
- ✅ Minimal base images (Alpine Linux)
- ✅ Multi-stage builds
- ✅ No unnecessary packages
- ✅ Regular security scans

### Network Security
- ✅ Internal network isolation
- ✅ Rate limiting on API endpoints
- ✅ Security headers enforcement
- ✅ HTTPS ready configuration

### Data Security
- ✅ Encrypted database connections
- ✅ Secure session management
- ✅ Environment variable secrets
- ✅ Regular automated backups

## 📊 Performance Optimization

### Build Optimization
- Layer caching for faster builds
- .dockerignore for smaller context
- Multi-stage builds reduce image size
- npm ci for faster dependency installation

### Runtime Optimization
- Nginx gzip compression
- Static file serving optimization
- Database connection pooling
- Redis session storage

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and Deploy
        run: |
          make build
          make prod
```

### Automated Testing
```bash
# Run tests in container
make test

# Security scanning
make security-scan
```

## 🗄️ Data Management

### Database Operations
```bash
# Run migrations
make db-migrate

# Create backup
make backup

# Restore from backup
make restore BACKUP_FILE=backups/backup_20240101_120000.sql

# Database shell access
make db-shell
```

### Volume Management
```bash
# List volumes
docker volume ls

# Backup volumes
docker run --rm -v firs_postgres_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

## 🚨 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
sudo lsof -i :5000
sudo lsof -i :5432

# Stop conflicting services
sudo systemctl stop postgresql
```

#### Permission Issues
```bash
# Fix upload directory permissions
sudo chown -R 1001:1001 uploads/
```

#### Database Connection Issues
```bash
# Check database status
make db-shell
\l  # List databases
\q  # Quit
```

### Debugging Commands
```bash
# Container logs
docker-compose logs app
docker-compose logs postgres

# Container shell access
make shell
make db-shell

# Network inspection
docker network ls
docker network inspect firs_firs-network
```

## 🔧 Maintenance

### Regular Tasks
- Monitor disk usage: `make disk-usage`
- Update dependencies: `make update-deps`
- Security scans: `make security-scan`
- Database backups: `make backup`

### Scaling Considerations
- Database read replicas
- Application load balancing
- Redis cluster for sessions
- CDN for static assets

## 📈 Production Checklist

### Before Deployment
- [ ] Update all passwords and secrets
- [ ] Configure HTTPS certificates
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Test backup and restore procedures
- [ ] Run security scans
- [ ] Performance testing

### Post Deployment
- [ ] Verify all services are healthy
- [ ] Test critical application flows
- [ ] Monitor resource usage
- [ ] Set up automated backups
- [ ] Configure log rotation

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review container logs: `make logs`
3. Check application health: `make health`
4. Review environment configuration

## 🔄 Updates

To update the application:
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
make clean
make build
make prod
```