# FIRS MBS Invoice Middleware - Docker Management
.PHONY: help build up down logs restart clean dev prod test backup restore

# Default environment
ENV ?= dev

help: ## Show this help message
	@echo 'Usage: make [target] [ENV=dev|prod]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the Docker images
	@echo "Building Docker images..."
	docker-compose build --no-cache

up: ## Start the application stack
	@echo "Starting $(ENV) environment..."
ifeq ($(ENV),prod)
	docker-compose --profile production up -d
else
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
endif

down: ## Stop and remove containers
	@echo "Stopping containers..."
	docker-compose down

logs: ## View container logs
	docker-compose logs -f

restart: ## Restart the application
	@echo "Restarting application..."
	$(MAKE) down
	$(MAKE) up ENV=$(ENV)

clean: ## Remove containers, networks, and volumes
	@echo "Cleaning up Docker resources..."
	docker-compose down -v --remove-orphans
	docker system prune -f

dev: ## Start development environment
	@echo "Starting development environment..."
	$(MAKE) up ENV=dev

prod: ## Start production environment
	@echo "Starting production environment..."
	$(MAKE) up ENV=prod

test: ## Run application tests
	@echo "Running tests..."
	docker-compose exec app npm test

db-migrate: ## Run database migrations
	@echo "Running database migrations..."
	docker-compose exec app npm run db:push

db-seed: ## Seed the database with initial data
	@echo "Seeding database..."
	docker-compose exec app npm run db:seed

backup: ## Backup the database
	@echo "Creating database backup..."
	mkdir -p backups
	docker-compose exec postgres pg_dump -U $${POSTGRES_USER:-firs_admin} $${POSTGRES_DB:-firs_mbs} > backups/backup_$$(date +%Y%m%d_%H%M%S).sql

restore: ## Restore database from backup (requires BACKUP_FILE variable)
	@echo "Restoring database from $(BACKUP_FILE)..."
ifndef BACKUP_FILE
	$(error BACKUP_FILE is not set. Usage: make restore BACKUP_FILE=backups/backup_20240101_120000.sql)
endif
	docker-compose exec -T postgres psql -U $${POSTGRES_USER:-firs_admin} -d $${POSTGRES_DB:-firs_mbs} < $(BACKUP_FILE)

health: ## Check application health
	@echo "Checking application health..."
	curl -f http://localhost:5000/api/system/status || echo "Application is not healthy"

status: ## Show container status
	docker-compose ps

shell: ## Open shell in app container
	docker-compose exec app sh

db-shell: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U $${POSTGRES_USER:-firs_admin} -d $${POSTGRES_DB:-firs_mbs}

redis-shell: ## Open Redis shell
	docker-compose exec redis redis-cli -a $${REDIS_PASSWORD:-redis_password_change_me}

# Security commands
security-scan: ## Run security scan on Docker images
	@echo "Running security scan..."
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy image firs-mbs-app:latest

update-deps: ## Update dependencies and rebuild
	@echo "Updating dependencies..."
	docker-compose exec app npm update
	$(MAKE) build

# Monitoring commands
monitor: ## Show real-time resource usage
	docker stats

disk-usage: ## Show Docker disk usage
	docker system df

# Environment setup
setup-env: ## Setup environment file from example
	@if [ ! -f .env ]; then \
		echo "Creating .env file from .env.example..."; \
		cp .env.example .env; \
		echo "Please edit .env file with your actual values"; \
	else \
		echo ".env file already exists"; \
	fi