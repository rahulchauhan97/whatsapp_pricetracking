const initTracer = require('../shared/tracer');
const tracer = initTracer('whatsapp-service');

const express = require('express');
const config = require('../shared/config');
const createLogger = require('../shared/logger');
const RedisClient = require('../shared/redis');
const WhatsAppBot = require('./bot');
const CommandHandler = require('./commands');

const logger = createLogger('whatsapp-service');
const redis = new RedisClient(logger).connect();

const app = express();

let bot = null;

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: bot && bot.isReady ? 'healthy' : 'initializing',
    service: 'whatsapp-service',
  });
});

const PORT = config.services.whatsapp.port;
const server = app.listen(PORT, async () => {
  logger.info(`WhatsApp service listening on port ${PORT}`);
  
  // Initialize bot
  const commandHandler = new CommandHandler(null, redis, logger);
  bot = new WhatsAppBot(redis, logger, commandHandler);
  commandHandler.client = bot.client;
  
  await bot.initialize();
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received');
  if (bot) await bot.destroy();
  await redis.disconnect();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received');
  if (bot) await bot.destroy();
  await redis.disconnect();
  server.close(() => {
    process.exit(0);
  });
});
