const initTracer = require('../shared/tracer');
const tracer = initTracer('api-gateway');

const express = require('express');
const bodyParser = require('body-parser');
const config = require('../shared/config');
const createLogger = require('../shared/logger');
const createRoutes = require('./routes');

const logger = createLogger('api-gateway');
const app = express();

app.use(bodyParser.json());

// Routes
app.use('/api', createRoutes(logger));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'WhatsApp Price Tracker API Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      productById: '/api/products/:id',
      productPrice: '/api/products/:id/price',
      productPriceHistory: '/api/products/:id/price-history',
      productOffers: '/api/products/:id/offers',
      productStock: '/api/products/:id/stock',
    },
  });
});

const PORT = config.services.apiGateway.port;
const server = app.listen(PORT, () => {
  logger.info(`API Gateway listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received');
  server.close(() => {
    process.exit(0);
  });
});
