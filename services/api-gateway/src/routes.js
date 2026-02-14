const axios = require('axios');
const config = require('../shared/config');

const dbUrl = `http://${config.services.database.host}:${config.services.database.port}`;

module.exports = (logger) => {
  const router = require('express').Router();

  // Health check for all services
  router.get('/health', async (req, res) => {
    const services = [
      { name: 'api-gateway', url: null, status: 'healthy' },
      { name: 'database-service', url: `${dbUrl}/health` },
      { name: 'whatsapp-service', url: `http://${config.services.whatsapp.host}:${config.services.whatsapp.port}/health` },
      { name: 'scraper-service', url: `http://${config.services.scraper.host}:${config.services.scraper.port}/health` },
      { name: 'price-tracker', url: `http://${config.services.priceTracker.host}:${config.services.priceTracker.port}/health` },
      { name: 'offer-monitor', url: `http://${config.services.offerMonitor.host}:${config.services.offerMonitor.port}/health` },
      { name: 'stock-monitor', url: `http://${config.services.stockMonitor.host}:${config.services.stockMonitor.port}/health` },
      { name: 'notification-service', url: `http://${config.services.notification.host}:${config.services.notification.port}/health` },
      { name: 'scheduler-service', url: `http://${config.services.scheduler.host}:${config.services.scheduler.port}/health` },
    ];

    const results = await Promise.all(
      services.map(async (service) => {
        if (!service.url) return service;
        
        try {
          const response = await axios.get(service.url, { timeout: 3000 });
          return { ...service, status: response.data.status || 'healthy' };
        } catch (error) {
          return { ...service, status: 'unhealthy', error: error.message };
        }
      })
    );

    const allHealthy = results.every(s => s.status === 'healthy');
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      services: results,
      timestamp: new Date().toISOString(),
    });
  });

  // Product endpoints
  router.get('/products', async (req, res) => {
    try {
      const { userId } = req.query;
      const url = userId ? `${dbUrl}/products?userId=${userId}` : `${dbUrl}/products`;
      const response = await axios.get(url);
      res.json(response.data);
    } catch (error) {
      logger.error('Error fetching products:', error);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  router.get('/products/:id', async (req, res) => {
    try {
      const response = await axios.get(`${dbUrl}/products/${req.params.id}`);
      res.json(response.data);
    } catch (error) {
      logger.error('Error fetching product:', error);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  router.post('/products', async (req, res) => {
    try {
      const response = await axios.post(`${dbUrl}/products`, req.body);
      res.json(response.data);
    } catch (error) {
      logger.error('Error creating product:', error);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  router.delete('/products/:id', async (req, res) => {
    try {
      const response = await axios.delete(`${dbUrl}/products/${req.params.id}`);
      res.json(response.data);
    } catch (error) {
      logger.error('Error deleting product:', error);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  // Price endpoints
  router.get('/products/:id/price', async (req, res) => {
    try {
      const response = await axios.get(`${dbUrl}/prices/${req.params.id}/latest`);
      res.json(response.data);
    } catch (error) {
      logger.error('Error fetching price:', error);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  router.get('/products/:id/price-history', async (req, res) => {
    try {
      const limit = req.query.limit || 10;
      const response = await axios.get(`${dbUrl}/prices/${req.params.id}/history?limit=${limit}`);
      res.json(response.data);
    } catch (error) {
      logger.error('Error fetching price history:', error);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  // Offer endpoints
  router.get('/products/:id/offers', async (req, res) => {
    try {
      const response = await axios.get(`${dbUrl}/offers/${req.params.id}`);
      res.json(response.data);
    } catch (error) {
      logger.error('Error fetching offers:', error);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  // Stock endpoints
  router.get('/products/:id/stock', async (req, res) => {
    try {
      const response = await axios.get(`${dbUrl}/stock/${req.params.id}`);
      res.json(response.data);
    } catch (error) {
      logger.error('Error fetching stock:', error);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  return router;
};
