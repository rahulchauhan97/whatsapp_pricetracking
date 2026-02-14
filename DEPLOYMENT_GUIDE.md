# WhatsApp Price Tracker Bot - Deployment Guide

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- 4GB+ RAM available
- 10GB+ disk space
- Internet connection for scraping

## Quick Start (5 Minutes)

### 1. Clone Repository

```bash
git clone <repository-url>
cd whatsapp_pricetracking
```

### 2. Start Services

```bash
# Using Makefile (recommended)
make up

# Or using Docker Compose directly
docker-compose up -d
```

### 3. Authenticate WhatsApp

```bash
# View QR code
make qr

# Or
docker-compose logs -f whatsapp-service
```

Scan the QR code with your WhatsApp mobile app:
1. Open WhatsApp
2. Go to Settings → Linked Devices
3. Tap "Link a Device"
4. Scan the QR code displayed in terminal

### 4. Verify Services

```bash
# Check health of all services
make health

# Or
curl http://localhost:3000/api/health | jq '.'
```

### 5. Test with a Product

Send a WhatsApp message to the authenticated number:

```
!track https://www.flipkart.com/product-url
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| API Gateway | 3000 | http://localhost:3000 |
| WhatsApp Service | 3001 | http://localhost:3001/health |
| Scraper Service | 3002 | http://localhost:3002/health |
| Price Tracker | 3003 | http://localhost:3003/health |
| Offer Monitor | 3004 | http://localhost:3004/health |
| Stock Monitor | 3005 | http://localhost:3005/health |
| Notification Service | 3006 | http://localhost:3006/health |
| Scheduler Service | 3007 | http://localhost:3007/health |
| Database Service | 3008 | http://localhost:3008/health |
| Redis | 6379 | N/A |

## Configuration

### Environment Variables

Create a `.env` file (optional):

```bash
# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Price Threshold (percentage)
PRICE_THRESHOLD=1.0

# Scheduler (cron pattern)
CRON_PATTERN=*/30 * * * *

# Datadog APM (optional)
DD_ENABLED=false
DD_AGENT_HOST=datadog-agent
DD_API_KEY=your-api-key
DD_ENV=production
DD_VERSION=1.0.0

# Log Level
LOG_LEVEL=info
```

### Price Threshold

Adjust price drop sensitivity:

```bash
# Alert on 1% or more price drop (default)
PRICE_THRESHOLD=1.0

# Alert on 5% or more price drop
PRICE_THRESHOLD=5.0

# Alert on any price drop
PRICE_THRESHOLD=0
```

### Check Frequency

Modify scheduler pattern in `docker-compose.yml`:

```yaml
scheduler-service:
  environment:
    - CRON_PATTERN=*/30 * * * *  # Every 30 minutes (default)
    # - CRON_PATTERN=0 */2 * * *   # Every 2 hours
    # - CRON_PATTERN=0 9,21 * * *  # At 9 AM and 9 PM daily
```

## Management Commands

### Using Makefile

```bash
# Start all services
make up

# Stop all services
make down

# View all logs
make logs

# View specific service logs
make logs-service SERVICE=whatsapp-service

# Restart all services
make restart

# Restart specific service
make restart-service SERVICE=scraper-service

# Check health
make health

# View scheduler stats
make stats

# Trigger manual price check
make trigger

# View WhatsApp QR code
make qr

# Backup database
make backup-db

# Show service URLs
make monitoring

# Clean everything (including volumes)
make clean
```

### Using Docker Compose

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f whatsapp-service

# Restart service
docker-compose restart whatsapp-service

# View running services
docker-compose ps

# Stop and remove everything
docker-compose down -v
```

## Monitoring

### Health Checks

```bash
# All services
curl http://localhost:3000/api/health | jq '.'

# Individual service
curl http://localhost:3008/health | jq '.'
```

### Scheduler Statistics

```bash
curl http://localhost:3007/stats | jq '.'
```

Sample output:
```json
{
  "totalRuns": 48,
  "lastRun": "2024-02-14T12:30:00.000Z",
  "nextRun": "2024-02-14T13:00:00.000Z",
  "productsChecked": 150,
  "errors": 2,
  "cronPattern": "*/30 * * * *"
}
```

### Manual Price Check

```bash
curl -X POST http://localhost:3007/trigger
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f scraper-service

# Last 100 lines
docker-compose logs --tail=100 price-tracker-service
```

## Database Management

### SQLite Shell

```bash
make shell-db

# Or
docker-compose exec database-service sqlite3 /app/data/tracker.db
```

Useful queries:
```sql
-- View all products
SELECT * FROM products;

-- View price history for product
SELECT * FROM prices WHERE product_id = 1 ORDER BY checked_at DESC;

-- View offers
SELECT * FROM offers WHERE product_id = 1;

-- Count tracked products
SELECT COUNT(*) FROM products;

-- Exit
.exit
```

### Backup & Restore

```bash
# Backup
make backup-db

# Restore
make restore-db FILE=backups/tracker_backup_20240214_120000.db
```

## Troubleshooting

### WhatsApp Not Connecting

1. Check logs:
```bash
docker-compose logs whatsapp-service
```

2. Remove auth and restart:
```bash
docker-compose down
docker volume rm whatsapp_pricetracking_whatsapp-auth
docker-compose up -d
make qr
```

### Scraper Errors

Common issues:
- Website structure changed → Update selectors in scraper
- Bot detected → Stealth plugin should handle this
- Timeout → Increase timeout in scraper code

Check logs:
```bash
docker-compose logs scraper-service
```

### Database Locked

SQLite in use by multiple processes:

```bash
docker-compose restart database-service
```

### Redis Connection Issues

```bash
# Check Redis
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### Service Not Responding

```bash
# Check if running
docker-compose ps

# Check logs
docker-compose logs <service-name>

# Restart service
docker-compose restart <service-name>

# Full restart
docker-compose down && docker-compose up -d
```

## Performance Tuning

### Resource Limits

Add to `docker-compose.yml`:

```yaml
services:
  scraper-service:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          memory: 1G
```

### Scraper Optimization

- Reduce delay between requests
- Scale scraper service
- Use headless mode (already enabled)

### Database Optimization

SQLite is optimized with:
- WAL mode enabled
- Indexes on foreign keys
- Efficient queries

For high scale, consider PostgreSQL.

## Production Deployment

### Security Checklist

- [ ] Change default Redis password
- [ ] Use HTTPS for API Gateway
- [ ] Implement rate limiting
- [ ] Set up firewall rules
- [ ] Use secrets management
- [ ] Enable APM monitoring
- [ ] Set up log aggregation
- [ ] Configure backups
- [ ] Use Docker secrets

### Recommended Setup

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  redis:
    command: redis-server --requirepass your-secure-password
    
  api-gateway:
    environment:
      - NODE_ENV=production
      - REDIS_PASSWORD=your-secure-password
    deploy:
      replicas: 2
      
  # Add nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
```

### Monitoring with Datadog

Enable APM:

```yaml
services:
  datadog-agent:
    image: datadog/agent:latest
    environment:
      - DD_API_KEY=${DD_API_KEY}
      - DD_APM_ENABLED=true
      - DD_APM_NON_LOCAL_TRAFFIC=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      
  price-tracker-service:
    environment:
      - DD_ENABLED=true
      - DD_AGENT_HOST=datadog-agent
      - DD_ENV=production
```

## Backup Strategy

### Automated Backups

Create cron job:

```bash
# /etc/cron.daily/backup-price-tracker
#!/bin/bash
cd /path/to/whatsapp_pricetracking
make backup-db
find backups/ -name "*.db" -mtime +30 -delete
```

### Backup Locations

1. **Database**: `/backups/` directory
2. **WhatsApp Auth**: Volume `whatsapp-auth`
3. **Docker Images**: Regular image backups

## Scaling

### Horizontal Scaling

Scale specific services:

```bash
docker-compose up -d --scale scraper-service=3
docker-compose up -d --scale price-tracker-service=2
```

### Load Balancing

Add nginx for load balancing:

```nginx
upstream scrapers {
    server scraper-service-1:3002;
    server scraper-service-2:3002;
    server scraper-service-3:3002;
}
```

## Support & Maintenance

### Regular Maintenance

Weekly:
- Check logs for errors
- Review scheduler stats
- Verify scraper success rate
- Test WhatsApp connectivity

Monthly:
- Update dependencies
- Backup database
- Review and optimize queries
- Check disk space

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

## FAQ

**Q: How many products can I track?**  
A: SQLite can handle thousands. For 10K+, consider PostgreSQL.

**Q: Can I track multiple users?**  
A: Yes, each WhatsApp number is tracked separately.

**Q: How often are prices checked?**  
A: Default every 30 minutes. Configurable via CRON_PATTERN.

**Q: What if scraper fails?**  
A: It will retry on next scheduled run. Check logs for issues.

**Q: Can I add more platforms?**  
A: Yes! Add scraper in `services/scraper-service/src/scrapers/`.

**Q: Is this production-ready?**  
A: Yes, with proper security hardening and monitoring.

## Getting Help

1. Check logs: `make logs`
2. Check health: `make health`
3. Review ARCHITECTURE.md
4. Check service-specific logs

## License

MIT
