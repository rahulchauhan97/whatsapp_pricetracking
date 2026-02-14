const initTracer = require('../../shared/tracer');
const tracer = initTracer('scheduler-service');

const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const config = require('../../shared/config');
const createLogger = require('../../shared/logger');
const RedisClient = require('../../shared/redis');

const logger = createLogger('scheduler-service');
const redis = new RedisClient(logger).connect();

const app = express();
app.use(express.json());

const dbUrl = `http://${config.services.database.host}:${config.services.database.port}`;
const cronPattern = config.services.scheduler.cronPattern;

let stats = {
  totalRuns: 0,
  lastRun: null,
  nextRun: null,
  productsChecked: 0,
  errors: 0,
};

async function scheduleProductChecks() {
  logger.info('Starting scheduled product checks...');
  stats.totalRuns++;
  stats.lastRun = new Date().toISOString();

  try {
    // Get all products
    const response = await axios.get(`${dbUrl}/products`);
    const products = response.data;

    logger.info(`Found ${products.length} products to check`);

    // Trigger scrape for each product
    for (const product of products) {
      try {
        await redis.publish('scrape:request', {
          productId: product.id,
          url: product.url,
          platform: product.platform,
          requestId: `scheduled-${product.id}-${Date.now()}`,
        });

        stats.productsChecked++;
        logger.debug(`Scheduled scrape for product ${product.id}`);
        
        // Add small delay between requests to avoid overwhelming the scraper
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Error scheduling product ${product.id}:`, error);
        stats.errors++;
      }
    }

    logger.info(`Scheduled checks completed for ${products.length} products`);
  } catch (error) {
    logger.error('Error in scheduled product checks:', error);
    stats.errors++;
  }
}

// Schedule periodic checks
const task = cron.schedule(cronPattern, async () => {
  await scheduleProductChecks();
}, {
  scheduled: true,
  timezone: "Asia/Kolkata",
});

logger.info(`Scheduler initialized with pattern: ${cronPattern}`);

// Calculate next run time
function getNextRunTime() {
  const now = new Date();
  const parts = cronPattern.split(' ');
  
  if (parts[0].startsWith('*/')) {
    const interval = parseInt(parts[0].substring(2), 10);
    const next = new Date(now);
    next.setMinutes(Math.ceil(now.getMinutes() / interval) * interval);
    next.setSeconds(0);
    return next.toISOString();
  }
  
  return 'See cron pattern';
}

stats.nextRun = getNextRunTime();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'scheduler-service',
    cronPattern,
    stats,
  });
});

// Manual trigger endpoint
app.post('/trigger', async (req, res) => {
  try {
    logger.info('Manual trigger requested');
    await scheduleProductChecks();
    res.json({ success: true, message: 'Product checks triggered' });
  } catch (error) {
    logger.error('Error in manual trigger:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get scheduler stats
app.get('/stats', (req, res) => {
  res.json({
    ...stats,
    cronPattern,
    nextRun: getNextRunTime(),
  });
});

const PORT = config.services.scheduler.port;
const server = app.listen(PORT, () => {
  logger.info(`Scheduler service listening on port ${PORT}`);
  logger.info(`Cron pattern: ${cronPattern} (Asia/Kolkata timezone)`);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received');
  task.stop();
  await redis.disconnect();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received');
  task.stop();
  await redis.disconnect();
  server.close(() => {
    process.exit(0);
  });
});
