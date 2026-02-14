const initTracer = require('../shared/tracer');
const tracer = initTracer('scraper-service');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('../shared/config');
const createLogger = require('../shared/logger');
const RedisClient = require('../shared/redis');
const FlipkartScraper = require('./scrapers/flipkart');
const AmazonScraper = require('./scrapers/amazon');
const VivoScraper = require('./scrapers/vivo');

puppeteer.use(StealthPlugin());

const logger = createLogger('scraper-service');
const redis = new RedisClient(logger).connect();

const app = express();
app.use(express.json());

// Initialize scrapers
const scrapers = {
  flipkart: new FlipkartScraper(logger),
  amazon: new AmazonScraper(logger),
  vivo: new VivoScraper(logger),
};

let browser = null;

// Initialize browser
async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });
    logger.info('Browser initialized');
  }
  return browser;
}

// Scrape function
async function scrapeProduct(url, platform) {
  const scraper = scrapers[platform];
  if (!scraper) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const browser = await initBrowser();
  const page = await browser.newPage();
  
  try {
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const data = await scraper.scrape(page, url);
    return data;
  } catch (error) {
    logger.error(`Scraping error for ${platform}:`, error);
    throw error;
  } finally {
    await page.close();
  }
}

// Subscribe to scrape requests
redis.subscribe('scrape:request', async (data) => {
  logger.info('Scrape request received:', data);
  const { productId, url, platform, requestId } = data;

  try {
    const result = await scrapeProduct(url, platform);
    
    // Publish scrape result
    await redis.publish('scrape:result', {
      productId,
      url,
      platform,
      requestId,
      data: result,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Scrape completed for product ${productId}`);
  } catch (error) {
    logger.error(`Scrape failed for product ${productId}:`, error);
    
    await redis.publish('scrape:error', {
      productId,
      url,
      platform,
      requestId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Subscribe to product track events
redis.subscribe('product:track', async (data) => {
  logger.info('Product track event received:', data);
  const { productId, url, platform } = data;

  // Trigger initial scrape
  await redis.publish('scrape:request', {
    productId,
    url,
    platform,
    requestId: `track-${productId}-${Date.now()}`,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'scraper-service',
    browser: browser ? 'running' : 'not initialized',
  });
});

// Manual scrape endpoint
app.post('/scrape', async (req, res) => {
  try {
    const { url, platform } = req.body;
    
    if (!url || !platform) {
      return res.status(400).json({ error: 'url and platform are required' });
    }

    const result = await scrapeProduct(url, platform);
    res.json(result);
  } catch (error) {
    logger.error('Manual scrape error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = config.services.scraper.port;
const server = app.listen(PORT, () => {
  logger.info(`Scraper service listening on port ${PORT}`);
  initBrowser();
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received');
  if (browser) await browser.close();
  await redis.disconnect();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received');
  if (browser) await browser.close();
  await redis.disconnect();
  server.close(() => {
    process.exit(0);
  });
});
