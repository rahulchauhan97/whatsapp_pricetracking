const initTracer = require('../../shared/tracer');
const tracer = initTracer('offer-monitor');

const express = require('express');
const axios = require('axios');
const config = require('../../shared/config');
const createLogger = require('../../shared/logger');
const RedisClient = require('../../shared/redis');

const logger = createLogger('offer-monitor-service');
const redis = new RedisClient(logger).connect();

const app = express();
app.use(express.json());

const dbUrl = `http://${config.services.database.host}:${config.services.database.port}`;

function normalizeOffer(offerText) {
  return offerText.toLowerCase().trim().replace(/\s+/g, ' ');
}

function extractBankName(offerText) {
  const bankKeywords = ['hdfc', 'icici', 'sbi', 'axis', 'kotak', 'citibank', 'hsbc', 'standard chartered', 'yes bank', 'indusind'];
  const lowerText = offerText.toLowerCase();
  
  for (const bank of bankKeywords) {
    if (lowerText.includes(bank)) {
      return bank.toUpperCase();
    }
  }
  return null;
}

// Subscribe to scrape results
redis.subscribe('scrape:result', async (data) => {
  logger.info('Scrape result received for offer monitoring:', data);
  const { productId, data: scrapedData } = data;

  if (!scrapedData.offers || scrapedData.offers.length === 0) {
    logger.info(`No offers found for product ${productId}`);
    return;
  }

  try {
    // Get previous offers
    const prevOffersRes = await axios.get(`${dbUrl}/offers/${productId}`);
    const prevOffers = prevOffersRes.data;

    // Create a map of previous offers
    const prevOfferMap = new Map();
    prevOffers.forEach(offer => {
      const normalized = normalizeOffer(offer.offer_text);
      prevOfferMap.set(normalized, offer);
    });

    // Create a map of new offers
    const newOfferMap = new Map();
    scrapedData.offers.forEach(offer => {
      const normalized = normalizeOffer(offer.text);
      newOfferMap.set(normalized, offer);
    });

    // Detect new offers
    const newOffers = [];
    for (const [normalized, offer] of newOfferMap) {
      if (!prevOfferMap.has(normalized)) {
        newOffers.push(offer);
      }
    }

    // Detect removed offers
    const removedOffers = [];
    for (const [normalized, offer] of prevOfferMap) {
      if (!newOfferMap.has(normalized)) {
        removedOffers.push(offer);
      }
    }

    // Clear old offers and add new ones
    if (newOffers.length > 0 || removedOffers.length > 0) {
      await axios.delete(`${dbUrl}/offers/${productId}`);
      
      for (const offer of scrapedData.offers) {
        const bankName = extractBankName(offer.text);
        await axios.post(`${dbUrl}/offers`, {
          productId,
          offerText: offer.text,
          offerType: offer.type,
          bankName,
        });
      }

      // Send alert if there are changes
      const product = await axios.get(`${dbUrl}/products/${productId}`);
      
      await redis.publish('alert:offer-change', {
        productId,
        userId: product.data.user_id,
        platform: product.data.platform,
        productName: scrapedData.name || product.data.name,
        url: product.data.url,
        newOffers,
        removedOffers,
        totalOffers: scrapedData.offers.length,
      });

      logger.info(`Offer change alert triggered for product ${productId}: ${newOffers.length} new, ${removedOffers.length} removed`);
    } else {
      logger.info(`No offer changes for product ${productId}`);
    }
  } catch (error) {
    logger.error(`Error processing offers for product ${productId}:`, error);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'offer-monitor-service' });
});

const PORT = config.services.offerMonitor.port;
const server = app.listen(PORT, () => {
  logger.info(`Offer monitor service listening on port ${PORT}`);
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
