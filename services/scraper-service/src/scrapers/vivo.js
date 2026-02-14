class VivoScraper {
  constructor(logger) {
    this.logger = logger;
  }

  async scrape(page, url) {
    this.logger.info(`Scraping Vivo: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for main content
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Wait a bit for dynamic content
    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      const result = {
        name: null,
        price: null,
        originalPrice: null,
        discount: null,
        stock: { inStock: true, text: 'In Stock' },
        offers: [],
      };

      // Extract product name
      const nameSelectors = [
        'h1.product-name',
        'h1.title',
        'div.product-title',
        'h1',
      ];
      for (const selector of nameSelectors) {
        const nameEl = document.querySelector(selector);
        if (nameEl && nameEl.innerText.trim().length > 0) {
          result.name = nameEl.innerText.trim();
          break;
        }
      }

      // Extract price
      const priceSelectors = [
        'span.price-value',
        'div.price span',
        'span.current-price',
        'div.product-price',
      ];
      for (const selector of priceSelectors) {
        const priceEl = document.querySelector(selector);
        if (priceEl) {
          let priceText = priceEl.innerText || priceEl.textContent;
          priceText = priceText.replace(/[₹,]/g, '').trim();
          const price = parseFloat(priceText);
          if (!isNaN(price)) {
            result.price = price;
            break;
          }
        }
      }

      // Extract original price
      const origPriceSelectors = [
        'span.original-price',
        'span.mrp',
        'del.price',
      ];
      for (const selector of origPriceSelectors) {
        const origEl = document.querySelector(selector);
        if (origEl) {
          let origText = origEl.innerText || origEl.textContent;
          origText = origText.replace(/[₹,]/g, '').trim();
          const origPrice = parseFloat(origText);
          if (!isNaN(origPrice) && origPrice !== result.price) {
            result.originalPrice = origPrice;
            break;
          }
        }
      }

      // Calculate discount if not explicitly shown
      if (result.price && result.originalPrice) {
        const discountPercent = Math.round(((result.originalPrice - result.price) / result.originalPrice) * 100);
        result.discount = `${discountPercent}% off`;
      }

      // Check stock status
      const outOfStockSelectors = [
        'button.out-of-stock',
        'div.stock-status',
        'span.availability',
      ];
      for (const selector of outOfStockSelectors) {
        const stockEl = document.querySelector(selector);
        if (stockEl) {
          const stockText = stockEl.innerText.toLowerCase();
          if (stockText.includes('out of stock') || stockText.includes('not available')) {
            result.stock.inStock = false;
            result.stock.text = stockEl.innerText.trim();
            break;
          }
        }
      }

      // Extract offers
      const offerSelectors = [
        'div.offer-item',
        'li.bank-offer',
        'div.promotion',
      ];
      offerSelectors.forEach(selector => {
        const offerElements = document.querySelectorAll(selector);
        offerElements.forEach(el => {
          const offerText = el.innerText.trim();
          if (offerText && offerText.length > 10) {
            result.offers.push({
              text: offerText,
              type: offerText.toLowerCase().includes('bank') ? 'bank' : 'general',
            });
          }
        });
      });

      return result;
    });

    this.logger.info('Vivo scrape result:', data);
    return data;
  }
}

module.exports = VivoScraper;
