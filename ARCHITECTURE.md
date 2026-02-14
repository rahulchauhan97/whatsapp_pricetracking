# WhatsApp Price Tracker Bot - Architecture

## System Overview

The WhatsApp Price Tracker Bot is a microservices-based application that monitors product prices, offers, and stock availability across e-commerce platforms (Flipkart, Amazon, Vivo) and sends real-time alerts via WhatsApp.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User (WhatsApp)                             │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ QR Auth
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    WhatsApp Service (Port 3001)                      │
│  - whatsapp-web.js client                                            │
│  - Command processing (!track, !list, !price, etc.)                 │
│  - Sends notifications to users                                      │
└────────────┬──────────────────────────────────┬──────────────────────┘
             │                                   │
             │ product:track                     │ notification:send
             ↓                                   ↓
┌────────────────────────────┐     ┌────────────────────────────────┐
│  API Gateway (Port 3000)   │     │ Notification Service (3006)    │
│  - REST API                │     │  - Alert formatting            │
│  - Health dashboard        │     │  - Emoji enrichment            │
│  - Product CRUD            │     │  - Message templates           │
└────────────┬───────────────┘     └───────────┬────────────────────┘
             │                                  ↑
             ↓                                  │ alert:*
┌───────────────────────────────────────────────────────────────────────┐
│                       Redis Pub/Sub (Port 6379)                       │
│  Events: product:track, scrape:request, scrape:result,                │
│          alert:price-change, alert:offer-change, alert:stock-change,  │
│          notification:send, notification:sent                          │
└───────────────────────────────────────────────────────────────────────┘
             ↓                                  ↑
    ┌────────┴────────┬──────────────┬─────────┴──────┬────────────────┐
    │                 │              │                │                │
    ↓                 ↓              ↓                ↓                ↓
┌─────────┐   ┌──────────────┐  ┌─────────┐   ┌─────────┐   ┌─────────┐
│ Scraper │   │Price Tracker │  │  Offer  │   │  Stock  │   │Scheduler│
│Service  │   │   Service    │  │ Monitor │   │ Monitor │   │Service  │
│ (3002)  │   │   (3003)     │  │ (3004)  │   │ (3005)  │   │ (3007)  │
│         │   │              │  │         │   │         │   │         │
│Puppeteer│   │Price change  │  │Bank     │   │Stock    │   │Cron Jobs│
│+Stealth │   │detection     │  │offer    │   │tracking │   │Periodic │
│         │   │              │  │tracking │   │         │   │checks   │
└────┬────┘   └──────┬───────┘  └────┬────┘   └────┬────┘   └────┬────┘
     │               │               │             │             │
     └───────────────┴───────────────┴─────────────┴─────────────┘
                              ↓
                ┌──────────────────────────────────┐
                │  Database Service (Port 3008)    │
                │  - SQLite (better-sqlite3)       │
                │  - REST API for CRUD             │
                │  - Tables: products, prices,     │
                │    offers, stock_status          │
                └──────────────────────────────────┘
```

## Service Details

### 1. WhatsApp Service (Port 3001)
**Technology**: whatsapp-web.js, Express.js  
**APM Service Name**: `whatsapp-bot-core`

**Responsibilities**:
- Authenticate via QR code
- Process user commands
- Send notifications to users
- Manage WhatsApp client lifecycle

**Commands**:
- `!track <url>` - Start tracking a product
- `!untrack <id>` - Stop tracking a product
- `!list` - Show tracked products
- `!price <id>` - Get current price
- `!offers <id>` - Get bank offers
- `!status <id>` - Get complete status
- `!help` - Show help

**Events**:
- Publishes: `product:track`
- Subscribes: `notification:send`

### 2. API Gateway (Port 3000)
**Technology**: Express.js, Axios  
**APM Service Name**: `whatsapp-bot-core`

**Responsibilities**:
- REST API for external access
- Health check aggregation
- Product management
- Price/offer/stock queries

**Endpoints**:
- `GET /api/health` - Health check all services
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/:id/price` - Get latest price
- `GET /api/products/:id/price-history` - Price history
- `GET /api/products/:id/offers` - Get offers
- `GET /api/products/:id/stock` - Get stock

### 3. Database Service (Port 3008)
**Technology**: SQLite, better-sqlite3, Express.js  
**APM Service Name**: `database-service`

**Responsibilities**:
- Centralized data storage
- REST API for CRUD operations
- Data persistence

**Tables**:
- `products` - Tracked products
- `prices` - Price history
- `offers` - Bank offers
- `stock_status` - Stock history

### 4. Scraper Service (Port 3002)
**Technology**: Puppeteer, puppeteer-extra-plugin-stealth  
**APM Service Names**: `scraper-flipkart`, `scraper-amazon`, `scraper-vivo`

**Responsibilities**:
- Web scraping with stealth mode
- Extract price, offers, stock
- Platform-specific scrapers

**Supported Platforms**:
- Flipkart
- Amazon India
- Vivo

**Events**:
- Subscribes: `scrape:request`, `product:track`
- Publishes: `scrape:result`, `scrape:error`

### 5. Price Tracker Service (Port 3003)
**Technology**: Express.js, Axios  
**APM Service Name**: `price-tracker`

**Responsibilities**:
- Monitor price changes
- Calculate percentage change
- Trigger alerts on price drops

**Configuration**:
- `PRICE_THRESHOLD` - Default 1% (alerts when price drops by 1% or more)

**Events**:
- Subscribes: `scrape:result`
- Publishes: `alert:price-change`

### 6. Offer Monitor Service (Port 3004)
**Technology**: Express.js, Axios  
**APM Service Name**: `offer-monitor`

**Responsibilities**:
- Track bank offer changes
- Detect new/removed offers
- Extract bank names

**Events**:
- Subscribes: `scrape:result`
- Publishes: `alert:offer-change`

### 7. Stock Monitor Service (Port 3005)
**Technology**: Express.js, Axios  
**APM Service Name**: `stock-monitor`

**Responsibilities**:
- Monitor stock availability
- Alert when back in stock
- Track out-of-stock status

**Events**:
- Subscribes: `scrape:result`
- Publishes: `alert:stock-change`

### 8. Notification Service (Port 3006)
**Technology**: Express.js  
**APM Service Name**: `notification-service`

**Responsibilities**:
- Format alerts with emojis
- Create message templates
- Enrich notifications

**Alert Types**:
- 🔔 Price Drop Alerts
- 🏦 Bank Offer Updates
- 📦 Stock Availability Alerts

**Events**:
- Subscribes: `alert:price-change`, `alert:offer-change`, `alert:stock-change`
- Publishes: `notification:send`

### 9. Scheduler Service (Port 3007)
**Technology**: node-cron, Express.js, Axios  
**APM Service Name**: `scheduler-service`

**Responsibilities**:
- Periodic price checks
- Job scheduling
- Manual trigger support

**Configuration**:
- `CRON_PATTERN` - Default `*/30 * * * *` (every 30 minutes)
- Timezone: Asia/Kolkata

**Endpoints**:
- `POST /trigger` - Manual trigger
- `GET /stats` - Scheduler statistics

**Events**:
- Publishes: `scrape:request`

## Event Flow

### Tracking a Product

```
1. User sends "!track https://flipkart.com/product"
   ↓
2. WhatsApp Service publishes product:track
   ↓
3. Database Service saves product
   ↓
4. Scraper Service receives scrape:request
   ↓
5. Scraper extracts data and publishes scrape:result
   ↓
6. Price/Offer/Stock Monitors process data
   ↓
7. Monitors save to database and publish alert:* events
   ↓
8. Notification Service formats alert and publishes notification:send
   ↓
9. WhatsApp Service sends message to user
```

### Scheduled Price Check

```
1. Scheduler triggers (every 30 minutes)
   ↓
2. Scheduler fetches all products from Database
   ↓
3. Scheduler publishes scrape:request for each product
   ↓
4. Scraper processes each request
   ↓
5. Results flow through monitors → notifications → users
```

## Data Flow

### Product Tracking
```
User → WhatsApp → Database → Scraper → Database → Monitors → Notification → User
```

### Price Check
```
Scheduler → Database (get products) → Scraper → Database (save) → Monitors → Notification → User
```

## Scaling Considerations

### Horizontal Scaling
- All services are stateless (except WhatsApp Service)
- Can scale scrapers, monitors, and notification services independently
- Use Redis cluster for high availability

### Performance
- Database service uses SQLite with WAL mode
- Scraper uses connection pooling
- Scheduler adds delay between scrape requests

### Reliability
- Health checks on all services
- Automatic restarts via Docker
- Error handling and logging
- Graceful shutdown on SIGTERM/SIGINT

## Monitoring & Observability

### Health Checks
- All services expose `/health` endpoint
- API Gateway aggregates health status
- Use `GET /api/health` for overall system health

### Logging
- Winston logger with structured logging
- Service name in all log entries
- Optional Datadog log aggregation

### APM (Datadog)
- dd-trace instrumentation
- Service-specific names for distributed tracing
- Runtime metrics collection
- Optional, disabled by default

### Metrics
- Scheduler service exposes stats
- Track scrape success/failure rates
- Monitor alert delivery

## Security

### Authentication
- WhatsApp QR code authentication
- No password storage

### Scraping
- Stealth plugin to avoid bot detection
- User agent rotation
- Rate limiting between requests

### Data
- SQLite database with file permissions
- Environment-based configuration
- No hardcoded credentials

### Network
- Internal communication via Docker network
- Only necessary ports exposed
- Redis protected by network isolation

## Deployment

### Development
```bash
make up          # Start all services
make qr          # View WhatsApp QR code
make logs        # View all logs
make health      # Check service health
```

### Production
```bash
make prod-deploy
```

### Environment Variables
See README.md for full list of configuration options.

## Technology Stack

- **Runtime**: Node.js 18
- **Database**: SQLite (better-sqlite3)
- **Message Queue**: Redis Pub/Sub
- **Web Framework**: Express.js
- **Scraping**: Puppeteer + stealth plugin
- **WhatsApp**: whatsapp-web.js
- **Scheduling**: node-cron
- **Logging**: Winston
- **APM**: Datadog dd-trace (optional)
- **Container**: Docker + Docker Compose

## Future Enhancements

1. **Additional Platforms**: Snapdeal, Myntra, etc.
2. **Price Prediction**: ML-based price trend analysis
3. **Price Comparison**: Compare across platforms
4. **User Preferences**: Custom alert thresholds per product
5. **Web Dashboard**: React-based monitoring UI
6. **API Rate Limiting**: Protect public endpoints
7. **Database Migration**: PostgreSQL for production scale
8. **Queue System**: RabbitMQ/Kafka for reliability
9. **Cache Layer**: Redis caching for frequent queries
10. **Multi-user Support**: User authentication and isolation
