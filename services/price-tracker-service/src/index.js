const initTracer = require('../../shared/tracer');
const tracer = initTracer('price-tracker');

const express = require('express');
const axios = require('axios');
const config = require('../../shared/config');
const createLogger = require('../../shared/logger');
const RedisClient = require('../../shared/redis');

const logger = createLogger('price-tracker-service');
const redis = new RedisClient(logger).connect();

const app = express();
app.use(express.json());

const dbUrl = `http://${config.services.database.host}:${config.services.database.port}`;
const priceThreshold = config.services.priceTracker.threshold;

// Subscribe to scrape results
redis.subscribe('scrape:result', async (data) => {
  logger.info('Scrape result received:', data);
  const { productId, data: scrapedData } = data;

  if (!scrapedData.price) {
    logger.warn(`No price found for product ${productId}`);
    return;
  }

  try {
    // Get previous price
    const prevPriceRes = await axios.get(`${dbUrl}/prices/${productId}/latest`);
    const prevPrice = prevPriceRes.data;

    // Save new price
    await axios.post(`${dbUrl}/prices`, {
      productId,
      price: scrapedData.price,
      currency: 'INR',
    });

    // Update product name if available
    if (scrapedData.name) {
      await axios.put(`${dbUrl}/products/${productId}`, {
        name: scrapedData.name,
      });
    }

    // Check for price change
    if (prevPrice && prevPrice.price) {
      const priceDiff = prevPrice.price - scrapedData.price;
      const percentChange = (priceDiff / prevPrice.price) * 100;

      logger.info(`Price change for product ${productId}: ${percentChange.toFixed(2)}%`);

      // Alert if price dropped more than threshold
      if (percentChange >= priceThreshold) {
        const product = await axios.get(`${dbUrl}/products/${productId}`);
        
        await redis.publish('alert:price-change', {
          productId,
          userId: product.data.user_id,
          platform: product.data.platform,
          oldPrice: prevPrice.price,
          newPrice: scrapedData.price,
          difference: priceDiff,
          percentChange: percentChange.toFixed(2),
          productName: scrapedData.name || product.data.name,
          url: product.data.url,
        });

        logger.info(`Price drop alert triggered for product ${productId}`);
      }
    } else {
      logger.info(`Initial price recorded for product ${productId}: ₹${scrapedData.price}`);
    }
  } catch (error) {
    logger.error(`Error processing price for product ${productId}:`, error);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'price-tracker-service' });
});

const PORT = config.services.priceTracker.port;
const server = app.listen(PORT, () => {
  logger.info(`Price tracker service listening on port ${PORT}`);
  logger.info(`Price drop threshold: ${priceThreshold}%`);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received');
  await redis.disconnect();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received');
  await redis.disconnect();
  server.close(() => {
    process.exit(0);
  });
});
