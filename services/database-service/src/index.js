const initTracer = require('../../shared/tracer');
const tracer = initTracer('database-service');

const express = require('express');
const bodyParser = require('body-parser');
const config = require('../../shared/config');
const createLogger = require('../../shared/logger');
const DatabaseManager = require('./database');

const logger = createLogger('database-service');
const app = express();

app.use(bodyParser.json());

const dbPath = config.services.database.dbPath;
const db = new DatabaseManager(dbPath, logger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'database-service' });
});

// Product endpoints
app.post('/products', (req, res) => {
  try {
    const { url, platform, userId, name } = req.body;
    const product = db.addProduct(url, platform, userId, name);
    res.json(product);
  } catch (error) {
    logger.error('Error adding product:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/products/:id', (req, res) => {
  try {
    const product = db.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    logger.error('Error getting product:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/products', (req, res) => {
  try {
    const { userId } = req.query;
    const products = userId ? db.getProductsByUser(userId) : db.getAllProducts();
    res.json(products);
  } catch (error) {
    logger.error('Error getting products:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/products/:id', (req, res) => {
  try {
    const product = db.updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/products/:id', (req, res) => {
  try {
    const deleted = db.deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Price endpoints
app.post('/prices', (req, res) => {
  try {
    const { productId, price, currency } = req.body;
    const result = db.addPrice(productId, price, currency);
    res.json(result);
  } catch (error) {
    logger.error('Error adding price:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/prices/:productId/latest', (req, res) => {
  try {
    const price = db.getLatestPrice(req.params.productId);
    res.json(price || null);
  } catch (error) {
    logger.error('Error getting latest price:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/prices/:productId/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const history = db.getPriceHistory(req.params.productId, limit);
    res.json(history);
  } catch (error) {
    logger.error('Error getting price history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Offer endpoints
app.post('/offers', (req, res) => {
  try {
    const { productId, offerText, offerType, bankName, discountAmount } = req.body;
    const result = db.addOffer(productId, offerText, offerType, bankName, discountAmount);
    res.json(result);
  } catch (error) {
    logger.error('Error adding offer:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/offers/:productId', (req, res) => {
  try {
    const offers = db.getLatestOffers(req.params.productId);
    res.json(offers);
  } catch (error) {
    logger.error('Error getting offers:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/offers/:productId', (req, res) => {
  try {
    const count = db.clearOffers(req.params.productId);
    res.json({ deleted: count });
  } catch (error) {
    logger.error('Error clearing offers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stock endpoints
app.post('/stock', (req, res) => {
  try {
    const { productId, inStock, stockText } = req.body;
    const result = db.addStockStatus(productId, inStock, stockText);
    res.json(result);
  } catch (error) {
    logger.error('Error adding stock status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/stock/:productId', (req, res) => {
  try {
    const status = db.getLatestStockStatus(req.params.productId);
    res.json(status || null);
  } catch (error) {
    logger.error('Error getting stock status:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = config.services.database.port;
const server = app.listen(PORT, () => {
  logger.info(`Database service listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
