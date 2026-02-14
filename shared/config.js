module.exports = {
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  datadog: {
    enabled: process.env.DD_ENABLED === 'true',
    agentHost: process.env.DD_AGENT_HOST || 'datadog-agent',
    logInjection: true,
    runtimeMetrics: true,
    env: process.env.DD_ENV || 'development',
    version: process.env.DD_VERSION || '1.0.0',
  },
  services: {
    apiGateway: {
      port: parseInt(process.env.API_GATEWAY_PORT || '3000', 10),
      host: process.env.API_GATEWAY_HOST || 'api-gateway',
    },
    whatsapp: {
      port: parseInt(process.env.WHATSAPP_PORT || '3001', 10),
      host: process.env.WHATSAPP_HOST || 'whatsapp-service',
    },
    scraper: {
      port: parseInt(process.env.SCRAPER_PORT || '3002', 10),
      host: process.env.SCRAPER_HOST || 'scraper-service',
    },
    priceTracker: {
      port: parseInt(process.env.PRICE_TRACKER_PORT || '3003', 10),
      host: process.env.PRICE_TRACKER_HOST || 'price-tracker-service',
      threshold: parseFloat(process.env.PRICE_THRESHOLD || '1.0'),
    },
    offerMonitor: {
      port: parseInt(process.env.OFFER_MONITOR_PORT || '3004', 10),
      host: process.env.OFFER_MONITOR_HOST || 'offer-monitor-service',
    },
    stockMonitor: {
      port: parseInt(process.env.STOCK_MONITOR_PORT || '3005', 10),
      host: process.env.STOCK_MONITOR_HOST || 'stock-monitor-service',
    },
    notification: {
      port: parseInt(process.env.NOTIFICATION_PORT || '3006', 10),
      host: process.env.NOTIFICATION_HOST || 'notification-service',
    },
    scheduler: {
      port: parseInt(process.env.SCHEDULER_PORT || '3007', 10),
      host: process.env.SCHEDULER_HOST || 'scheduler-service',
      cronPattern: process.env.CRON_PATTERN || '*/30 * * * *', // Every 30 minutes
    },
    database: {
      port: parseInt(process.env.DATABASE_PORT || '3008', 10),
      host: process.env.DATABASE_HOST || 'database-service',
      dbPath: process.env.DB_PATH || '/app/data/tracker.db',
    },
  },
};
