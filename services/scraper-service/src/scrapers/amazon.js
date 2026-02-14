class AmazonScraper {
  constructor(logger) {
    this.logger = logger;
  }

  async scrape(page, url) {
    this.logger.info(`Scraping Amazon: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for main content
    await page.waitForSelector('body', { timeout: 10000 });

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
        '#productTitle',
        'h1#title',
        'span#productTitle',
      ];
      for (const selector of nameSelectors) {
        const nameEl = document.querySelector(selector);
        if (nameEl) {
          result.name = nameEl.innerText.trim();
          break;
        }
      }

      // Extract price
      const priceSelectors = [
        'span.a-price-whole',
        'span#priceblock_ourprice',
        'span#priceblock_dealprice',
        'span.a-price span.a-offscreen',
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

      // Extract original price (MRP)
      const origPriceSelectors = [
        'span.a-price.a-text-price span.a-offscreen',
        'span.priceBlockStrikePriceString',
        'span#priceblock_saleprice',
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

      // Extract discount
      const discountEl = document.querySelector('span.savingsPercentage');
      if (discountEl) {
        result.discount = discountEl.innerText.trim();
      }

      // Check stock status
      const availabilityEl = document.querySelector('#availability span');
      if (availabilityEl) {
        const availText = availabilityEl.innerText.toLowerCase();
        if (availText.includes('out of stock') || 
            availText.includes('currently unavailable') ||
            availText.includes('not available')) {
          result.stock.inStock = false;
          result.stock.text = availabilityEl.innerText.trim();
        } else {
          result.stock.text = availabilityEl.innerText.trim();
        }
      }

      // Extract bank offers
      const offerElements = document.querySelectorAll('#sopp-bankOffers li, #promotions li');
      offerElements.forEach(el => {
        const offerText = el.innerText.trim();
        if (offerText && offerText.length > 10) {
          result.offers.push({
            text: offerText,
            type: offerText.toLowerCase().includes('bank') ? 'bank' : 'general',
          });
        }
      });

      return result;
    });

    this.logger.info('Amazon scrape result:', data);
    return data;
  }
}

module.exports = AmazonScraper;
