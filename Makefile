.PHONY: help build up down logs restart clean install-deps health test-scraper

help: ## Show this help message
	@echo "WhatsApp Price Tracker Bot - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d
	@echo ""
	@echo "Services are starting up..."
	@echo "To view WhatsApp QR code, run: make qr"
	@echo "To view logs, run: make logs"

down: ## Stop all services
	docker-compose down

logs: ## View logs from all services
	docker-compose logs -f

logs-service: ## View logs from specific service (usage: make logs-service SERVICE=whatsapp-service)
	docker-compose logs -f $(SERVICE)

qr: ## View WhatsApp QR code
	docker-compose logs whatsapp-service | grep -A 50 "QR Code received"

restart: ## Restart all services
	docker-compose restart

restart-service: ## Restart specific service (usage: make restart-service SERVICE=whatsapp-service)
	docker-compose restart $(SERVICE)

clean: ## Stop and remove all containers, volumes, and images
	docker-compose down -v
	docker-compose rm -f

ps: ## Show running services
	docker-compose ps

health: ## Check health of all services
	@echo "Checking service health..."
	@curl -s http://localhost:3000/api/health | jq '.' || echo "API Gateway not responding"

stats: ## Show scheduler statistics
	@curl -s http://localhost:3007/stats | jq '.' || echo "Scheduler not responding"

trigger: ## Manually trigger price check
	@curl -X POST http://localhost:3007/trigger
	@echo ""
	@echo "Price check triggered!"

install-deps: ## Install dependencies for all services (local development)
	@for dir in services/*/; do \
		echo "Installing dependencies in $$dir..."; \
		cd $$dir && npm install && cd ../..; \
	done

test-scraper: ## Test scraper with a URL (usage: make test-scraper URL=https://...)
	@curl -X POST http://localhost:3002/scrape \
		-H "Content-Type: application/json" \
		-d '{"url":"$(URL)", "platform":"$(PLATFORM)"}' | jq '.'

shell-db: ## Open SQLite shell for database
	docker-compose exec database-service sqlite3 /app/data/tracker.db

redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli

backup-db: ## Backup SQLite database
	mkdir -p backups
	docker cp $$(docker-compose ps -q database-service):/app/data/tracker.db backups/tracker_backup_$$(date +%Y%m%d_%H%M%S).db
	@echo "Database backed up to backups/"

restore-db: ## Restore SQLite database (usage: make restore-db FILE=backups/tracker_backup_*.db)
	docker cp $(FILE) $$(docker-compose ps -q database-service):/app/data/tracker.db
	docker-compose restart database-service
	@echo "Database restored and service restarted"

dev-api: ## Start API Gateway in development mode
	cd services/api-gateway && npm run dev

dev-whatsapp: ## Start WhatsApp service in development mode
	cd services/whatsapp-service && npm run dev

dev-scraper: ## Start Scraper service in development mode
	cd services/scraper-service && npm run dev

prod-deploy: ## Deploy to production (build and start)
	docker-compose -f docker-compose.yml build
	docker-compose -f docker-compose.yml up -d
	@echo "Production deployment complete!"

monitoring: ## Show service URLs and monitoring endpoints
	@echo "Service URLs:"
	@echo "  API Gateway:        http://localhost:3000"
	@echo "  Health Dashboard:   http://localhost:3000/api/health"
	@echo "  WhatsApp Service:   http://localhost:3001/health"
	@echo "  Scraper Service:    http://localhost:3002/health"
	@echo "  Database Service:   http://localhost:3008/health"
	@echo "  Scheduler Stats:    http://localhost:3007/stats"
	@echo ""
	@echo "Redis: localhost:6379"
