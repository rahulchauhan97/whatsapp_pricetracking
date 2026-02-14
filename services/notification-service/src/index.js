const initTracer = require('../../shared/tracer');
const tracer = initTracer('notification-service');

const express = require('express');
const config = require('../../shared/config');
const createLogger = require('../../shared/logger');
const RedisClient = require('../../shared/redis');
const MessageFormatter = require('./formatter');

const logger = createLogger('notification-service');
const redis = new RedisClient(logger).connect();
const formatter = new MessageFormatter();

const app = express();
app.use(express.json());

// Subscribe to price change alerts
redis.subscribe('alert:price-change', async (data) => {
  logger.info('Price change alert received:', data);
  
  try {
    const message = formatter.formatPriceDropAlert(data);
    
    await redis.publish('notification:send', {
      userId: data.userId,
      message,
      alertType: 'price-drop',
    });

    logger.info(`Price drop notification sent for product ${data.productId}`);
  } catch (error) {
    logger.error('Error formatting price drop notification:', error);
  }
});

// Subscribe to offer change alerts
redis.subscribe('alert:offer-change', async (data) => {
  logger.info('Offer change alert received:', data);
  
  try {
    const message = formatter.formatOfferChangeAlert(data);
    
    await redis.publish('notification:send', {
      userId: data.userId,
      message,
      alertType: 'offer-change',
    });

    logger.info(`Offer change notification sent for product ${data.productId}`);
  } catch (error) {
    logger.error('Error formatting offer change notification:', error);
  }
});

// Subscribe to stock change alerts
redis.subscribe('alert:stock-change', async (data) => {
  logger.info('Stock change alert received:', data);
  
  try {
    const message = formatter.formatStockAlert(data);
    
    await redis.publish('notification:send', {
      userId: data.userId,
      message,
      alertType: 'stock-change',
    });

    logger.info(`Stock change notification sent for product ${data.productId}`);
  } catch (error) {
    logger.error('Error formatting stock change notification:', error);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notification-service' });
});

// Manual notification endpoint
app.post('/notify', async (req, res) => {
  try {
    const { userId, title, message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const formattedMessage = title 
      ? formatter.formatGenericNotification(title, message)
      : message;

    await redis.publish('notification:send', {
      userId,
      message: formattedMessage,
      alertType: 'manual',
    });

    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    logger.error('Error sending manual notification:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = config.services.notification.port;
const server = app.listen(PORT, () => {
  logger.info(`Notification service listening on port ${PORT}`);
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
