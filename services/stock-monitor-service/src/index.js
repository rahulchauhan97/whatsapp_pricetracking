const initTracer = require('../../shared/tracer');
const tracer = initTracer('stock-monitor');

const express = require('express');
const axios = require('axios');
const config = require('../../shared/config');
const createLogger = require('../../shared/logger');
const RedisClient = require('../../shared/redis');

const logger = createLogger('stock-monitor-service');
const redis = new RedisClient(logger).connect();

const app = express();
app.use(express.json());

const dbUrl = `http://${config.services.database.host}:${config.services.database.port}`;

// Subscribe to scrape results
redis.subscribe('scrape:result', async (data) => {
  logger.info('Scrape result received for stock monitoring:', data);
  const { productId, data: scrapedData } = data;

  if (!scrapedData.stock) {
    logger.warn(`No stock data found for product ${productId}`);
    return;
  }

  try {
    // Get previous stock status
    const prevStockRes = await axios.get(`${dbUrl}/stock/${productId}`);
    const prevStock = prevStockRes.data;

    const currentStock = scrapedData.stock.inStock;
    const stockText = scrapedData.stock.text || (currentStock ? 'In Stock' : 'Out of Stock');

    // Save new stock status
    await axios.post(`${dbUrl}/stock`, {
      productId,
      inStock: currentStock,
      stockText,
    });

    // Check for stock status change
    if (prevStock) {
      const prevInStock = prevStock.in_stock === 1 || prevStock.in_stock === true;
      
      // Alert only when stock becomes available (out of stock -> in stock)
      if (!prevInStock && currentStock) {
        const product = await axios.get(`${dbUrl}/products/${productId}`);
        
        await redis.publish('alert:stock-change', {
          productId,
          userId: product.data.user_id,
          platform: product.data.platform,
          productName: scrapedData.name || product.data.name,
          url: product.data.url,
          wasInStock: prevInStock,
          isInStock: currentStock,
          stockText,
          alertType: 'back_in_stock',
        });

        logger.info(`Stock alert triggered for product ${productId}: Back in stock!`);
      } else if (prevInStock && !currentStock) {
        logger.info(`Product ${productId} went out of stock`);
        
        // Optionally alert for out of stock as well
        const product = await axios.get(`${dbUrl}/products/${productId}`);
        
        await redis.publish('alert:stock-change', {
          productId,
          userId: product.data.user_id,
          platform: product.data.platform,
          productName: scrapedData.name || product.data.name,
          url: product.data.url,
          wasInStock: prevInStock,
          isInStock: currentStock,
          stockText,
          alertType: 'out_of_stock',
        });
      }
    } else {
      logger.info(`Initial stock status recorded for product ${productId}: ${currentStock ? 'In Stock' : 'Out of Stock'}`);
    }
  } catch (error) {
    logger.error(`Error processing stock for product ${productId}:`, error);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'stock-monitor-service' });
});

const PORT = config.services.stockMonitor.port;
const server = app.listen(PORT, () => {
  logger.info(`Stock monitor service listening on port ${PORT}`);
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
