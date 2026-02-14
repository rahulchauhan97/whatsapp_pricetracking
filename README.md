# WhatsApp Price Tracker Bot

A comprehensive microservices-based price tracking system that monitors product prices, offers, and stock availability across Flipkart, Amazon, and Vivo, with real-time WhatsApp notifications.

## 🏗️ Architecture

The system consists of 9 microservices communicating via Redis Pub/Sub:

### Core Services

1. **API Gateway** (Port 3000)
   - REST API gateway with health dashboard
   - Product management endpoints
   - Service health aggregation

2. **WhatsApp Service** (Port 3001)
   - WhatsApp bot using whatsapp-web.js
   - QR code authentication
   - Commands: `!track`, `!untrack`, `!list`, `!price`, `!offers`, `!status`, `!help`

3. **Database Service** (Port 3008)
   - Centralized SQLite database
   - REST API for CRUD operations
   - Tables: products, prices, offers, stock_status

### Scraping & Monitoring

4. **Scraper Service** (Port 3002)
   - Puppeteer with stealth plugin
   - Platform-specific scrapers: Flipkart, Amazon, Vivo
   - Extracts: price, offers, stock status

5. **Price Tracker Service** (Port 3003)
   - Monitors price changes
   - Configurable threshold (default: 1%)
   - Triggers alerts on price drops

6. **Offer Monitor Service** (Port 3004)
   - Detects bank offer changes
   - Tracks new, removed, and modified offers
   - Extracts bank names from offers

7. **Stock Monitor Service** (Port 3005)
   - Monitors stock availability
   - Alerts when products come back in stock
   - Tracks out-of-stock status

### Notification & Scheduling

8. **Notification Service** (Port 3006)
   - Formats alerts with emojis
   - Types: Price drops 🔔, Bank offers 🏦, Stock alerts 📦
   - Sends via WhatsApp

9. **Scheduler Service** (Port 3007)
   - Periodic price checks using node-cron
   - Default: Every 30 minutes
   - Manual trigger endpoint

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

### Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scan WhatsApp QR code
docker-compose logs whatsapp-service

# Stop all services
docker-compose down
```

### Local Development

```bash
# Install dependencies for all services
for dir in services/*/; do
  cd "$dir" && npm install && cd ../..
done

# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Start each service in separate terminals
cd services/database-service && npm start
cd services/api-gateway && npm start
cd services/whatsapp-service && npm start
cd services/scraper-service && npm start
cd services/price-tracker-service && npm start
cd services/offer-monitor-service && npm start
cd services/stock-monitor-service && npm start
cd services/notification-service && npm start
cd services/scheduler-service && npm start
```

## 📱 WhatsApp Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!track <url>` | Track a new product | `!track https://flipkart.com/...` |
| `!untrack <id>` | Stop tracking a product | `!untrack 1` |
| `!list` | Show all tracked products | `!list` |
| `!price <id>` | Get current price | `!price 1` |
| `!offers <id>` | Get bank offers | `!offers 1` |
| `!status <id>` | Get complete status | `!status 1` |
| `!help` | Show help message | `!help` |

## 🔄 Event Flow

```
User sends !track <url>
    ↓
WhatsApp Service publishes product:track
    ↓
Database Service saves product
    ↓
Scraper Service receives scrape:request
    ↓
Scraper extracts data and publishes scrape:result
    ↓
Price/Offer/Stock Monitors process data
    ↓
Monitors publish alert:* events
    ↓
Notification Service formats alerts
    ↓
WhatsApp Service sends notification to user
```

## 🔧 Configuration

### Environment Variables

```bash
# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Price Tracker
PRICE_THRESHOLD=1.0  # Alert when price drops by 1% or more

# Scheduler
CRON_PATTERN="*/30 * * * *"  # Run every 30 minutes

# Datadog APM (optional)
DD_ENABLED=true
DD_AGENT_HOST=datadog-agent
DD_API_KEY=your-api-key
DD_ENV=production
```

### Service Ports

- 3000: API Gateway
- 3001: WhatsApp Service
- 3002: Scraper Service
- 3003: Price Tracker
- 3004: Offer Monitor
- 3005: Stock Monitor
- 3006: Notification Service
- 3007: Scheduler Service
- 3008: Database Service

## 🗄️ Database Schema

### Products
- id, url, name, platform, user_id, created_at, updated_at

### Prices
- id, product_id, price, currency, checked_at

### Offers
- id, product_id, offer_text, offer_type, bank_name, discount_amount, checked_at

### Stock Status
- id, product_id, in_stock, stock_text, checked_at

## 📊 Monitoring

### Health Checks

```bash
# Check all services
curl http://localhost:3000/api/health

# Individual services
curl http://localhost:3008/health  # Database
curl http://localhost:3001/health  # WhatsApp
curl http://localhost:3002/health  # Scraper
# ... etc
```

### Scheduler Stats

```bash
curl http://localhost:3007/stats
```

### Manual Trigger

```bash
# Trigger immediate price check
curl -X POST http://localhost:3007/trigger
```

## 🛠️ Technology Stack

- **Runtime**: Node.js 18
- **Database**: SQLite with better-sqlite3
- **Cache/Queue**: Redis (Pub/Sub)
- **Web Framework**: Express.js
- **Scraping**: Puppeteer + puppeteer-extra-plugin-stealth
- **WhatsApp**: whatsapp-web.js
- **Scheduling**: node-cron
- **Logging**: Winston
- **APM**: Datadog dd-trace (optional)
- **Containerization**: Docker

## 📝 API Endpoints

### API Gateway (Port 3000)

```
GET  /api/health                    # Health check all services
GET  /api/products                  # List products
GET  /api/products/:id              # Get product by ID
POST /api/products                  # Create product
DELETE /api/products/:id            # Delete product
GET  /api/products/:id/price        # Get latest price
GET  /api/products/:id/price-history # Get price history
GET  /api/products/:id/offers       # Get offers
GET  /api/products/:id/stock        # Get stock status
```

### Scraper Service (Port 3002)

```
POST /scrape                        # Manual scrape
     Body: { url, platform }
```

### Scheduler Service (Port 3007)

```
POST /trigger                       # Trigger manual check
GET  /stats                         # Get scheduler stats
```

## 🔐 Security Features

- Stealth mode scraping to avoid bot detection
- Rate limiting between scrape requests
- Secure database access via REST API
- Environment-based configuration
- No hardcoded credentials

## 🚧 Development

### Shared Modules

Located in `/shared`:
- `config.js` - Configuration management
- `events.js` - Event names
- `logger.js` - Winston logger factory
- `redis.js` - Redis client wrapper
- `tracer.js` - Datadog tracer initialization

### Adding a New Platform

1. Create scraper in `services/scraper-service/src/scrapers/`
2. Add platform detection logic
3. Update configuration
4. Test scraping

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please follow the existing code structure and conventions.