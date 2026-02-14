class FlipkartScraper {
  constructor(logger) {
    this.logger = logger;
  }

  async scrape(page, url) {
    this.logger.info(`Scraping Flipkart: ${url}`);
    
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
        'span.B_NuCI',
        'h1.yhB1nd',
        'h1 span',
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
        'div._30jeq3._16Jk6d',
        'div._30jeq3',
        'div._16Jk6d',
      ];
      for (const selector of priceSelectors) {
        const priceEl = document.querySelector(selector);
        if (priceEl) {
          const priceText = priceEl.innerText.replace(/[₹,]/g, '').trim();
          result.price = parseFloat(priceText);
          break;
        }
      }

      // Extract original price
      const origPriceEl = document.querySelector('div._3I9_wc._2p6lqe');
      if (origPriceEl) {
        const origText = origPriceEl.innerText.replace(/[₹,]/g, '').trim();
        result.originalPrice = parseFloat(origText);
      }

      // Extract discount
      const discountEl = document.querySelector('div._3Ay6sb._31Dcoz');
      if (discountEl) {
        result.discount = discountEl.innerText.trim();
      }

      // Check stock status
      const outOfStockTexts = ['out of stock', 'currently unavailable', 'sold out'];
      const bodyText = document.body.innerText.toLowerCase();
      if (outOfStockTexts.some(text => bodyText.includes(text))) {
        result.stock.inStock = false;
        result.stock.text = 'Out of Stock';
      }

      // Extract offers
      const offerElements = document.querySelectorAll('li._3j4Zjq, div._2ZdXDB');
      offerElements.forEach(el => {
        const offerText = el.innerText.trim();
        if (offerText) {
          result.offers.push({
            text: offerText,
            type: offerText.toLowerCase().includes('bank') ? 'bank' : 'general',
          });
        }
      });

      return result;
    });

    this.logger.info('Flipkart scrape result:', data);
    return data;
  }
}

module.exports = FlipkartScraper;
