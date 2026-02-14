const axios = require('axios');
const config = require('../../shared/config');

const dbUrl = `http://${config.services.database.host}:${config.services.database.port}`;

class CommandHandler {
  constructor(client, redis, logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async handleCommand(message, command, args) {
    const userId = message.from;

    try {
      switch (command) {
        case '!track':
          return await this.handleTrack(userId, args, message);
        case '!untrack':
          return await this.handleUntrack(userId, args, message);
        case '!list':
          return await this.handleList(userId, message);
        case '!price':
          return await this.handlePrice(userId, args, message);
        case '!offers':
          return await this.handleOffers(userId, args, message);
        case '!status':
          return await this.handleStatus(userId, args, message);
        case '!help':
          return await this.handleHelp(message);
        default:
          await message.reply('Unknown command. Type !help for available commands.');
      }
    } catch (error) {
      this.logger.error(`Error handling command ${command}:`, error);
      await message.reply('❌ An error occurred. Please try again later.');
    }
  }

  async handleTrack(userId, args, message) {
    if (args.length === 0) {
      return await message.reply('❌ Please provide a product URL.\nUsage: !track <url>');
    }

    const url = args[0];
    const platform = this.detectPlatform(url);

    if (!platform) {
      return await message.reply('❌ Unsupported URL. Only Flipkart, Amazon, and Vivo are supported.');
    }

    await message.reply('⏳ Adding product to tracking...');

    try {
      // Add product to database
      const response = await axios.post(`${dbUrl}/products`, {
        url,
        platform,
        userId,
      });

      // Publish event to trigger scraping
      await this.redis.publish('product:track', {
        productId: response.data.id,
        url,
        platform,
        userId,
      });

      await message.reply(`✅ Product tracked successfully!\n📦 Platform: ${platform}\n🆔 Product ID: ${response.data.id}`);
    } catch (error) {
      this.logger.error('Error tracking product:', error);
      await message.reply('❌ Failed to track product. It may already be tracked.');
    }
  }

  async handleUntrack(userId, args, message) {
    if (args.length === 0) {
      return await message.reply('❌ Please provide a product ID.\nUsage: !untrack <id>');
    }

    const productId = args[0];

    try {
      const response = await axios.get(`${dbUrl}/products/${productId}`);
      const product = response.data;

      if (product.user_id !== userId) {
        return await message.reply('❌ You can only untrack your own products.');
      }

      await axios.delete(`${dbUrl}/products/${productId}`);
      await message.reply(`✅ Product ${productId} removed from tracking.`);
    } catch (error) {
      this.logger.error('Error untracking product:', error);
      await message.reply('❌ Failed to untrack product. Product may not exist.');
    }
  }

  async handleList(userId, message) {
    try {
      const response = await axios.get(`${dbUrl}/products?userId=${userId}`);
      const products = response.data;

      if (products.length === 0) {
        return await message.reply('📭 You have no tracked products.\nUse !track <url> to start tracking.');
      }

      let text = `📦 *Your Tracked Products* (${products.length}):\n\n`;
      for (const product of products) {
        text += `🆔 *ID:* ${product.id}\n`;
        text += `📱 *Platform:* ${product.platform}\n`;
        text += `🔗 *URL:* ${product.url.substring(0, 50)}...\n`;
        text += `📅 *Added:* ${new Date(product.created_at).toLocaleDateString()}\n\n`;
      }

      await message.reply(text);
    } catch (error) {
      this.logger.error('Error listing products:', error);
      await message.reply('❌ Failed to fetch products.');
    }
  }

  async handlePrice(userId, args, message) {
    if (args.length === 0) {
      return await message.reply('❌ Please provide a product ID.\nUsage: !price <id>');
    }

    const productId = args[0];

    try {
      const [productRes, priceRes] = await Promise.all([
        axios.get(`${dbUrl}/products/${productId}`),
        axios.get(`${dbUrl}/prices/${productId}/latest`),
      ]);

      const product = productRes.data;
      if (product.user_id !== userId) {
        return await message.reply('❌ Product not found in your tracking list.');
      }

      if (!priceRes.data) {
        return await message.reply('💰 No price data available yet. Price check will run soon.');
      }

      const price = priceRes.data;
      const text = `💰 *Current Price*\n\n` +
        `🆔 Product ID: ${productId}\n` +
        `💵 Price: ₹${price.price}\n` +
        `🕐 Last checked: ${new Date(price.checked_at).toLocaleString()}`;

      await message.reply(text);
    } catch (error) {
      this.logger.error('Error fetching price:', error);
      await message.reply('❌ Failed to fetch price information.');
    }
  }

  async handleOffers(userId, args, message) {
    if (args.length === 0) {
      return await message.reply('❌ Please provide a product ID.\nUsage: !offers <id>');
    }

    const productId = args[0];

    try {
      const [productRes, offersRes] = await Promise.all([
        axios.get(`${dbUrl}/products/${productId}`),
        axios.get(`${dbUrl}/offers/${productId}`),
      ]);

      const product = productRes.data;
      if (product.user_id !== userId) {
        return await message.reply('❌ Product not found in your tracking list.');
      }

      const offers = offersRes.data;
      if (offers.length === 0) {
        return await message.reply('🏦 No offers available for this product.');
      }

      let text = `🏦 *Bank Offers* (${offers.length}):\n\n`;
      offers.forEach((offer, i) => {
        text += `${i + 1}. ${offer.offer_text}\n`;
        if (offer.bank_name) text += `   Bank: ${offer.bank_name}\n`;
        text += '\n';
      });

      await message.reply(text);
    } catch (error) {
      this.logger.error('Error fetching offers:', error);
      await message.reply('❌ Failed to fetch offers.');
    }
  }

  async handleStatus(userId, args, message) {
    if (args.length === 0) {
      return await message.reply('❌ Please provide a product ID.\nUsage: !status <id>');
    }

    const productId = args[0];

    try {
      const [productRes, priceRes, stockRes, offersRes] = await Promise.all([
        axios.get(`${dbUrl}/products/${productId}`),
        axios.get(`${dbUrl}/prices/${productId}/latest`),
        axios.get(`${dbUrl}/stock/${productId}`),
        axios.get(`${dbUrl}/offers/${productId}`),
      ]);

      const product = productRes.data;
      if (product.user_id !== userId) {
        return await message.reply('❌ Product not found in your tracking list.');
      }

      let text = `📊 *Product Status*\n\n`;
      text += `🆔 ID: ${productId}\n`;
      text += `📱 Platform: ${product.platform}\n\n`;

      if (priceRes.data) {
        text += `💰 *Price:* ₹${priceRes.data.price}\n`;
        text += `🕐 Last checked: ${new Date(priceRes.data.checked_at).toLocaleString()}\n\n`;
      }

      if (stockRes.data) {
        const inStock = stockRes.data.in_stock;
        text += `📦 *Stock:* ${inStock ? '✅ In Stock' : '❌ Out of Stock'}\n\n`;
      }

      text += `🏦 *Offers:* ${offersRes.data.length} available\n`;

      await message.reply(text);
    } catch (error) {
      this.logger.error('Error fetching status:', error);
      await message.reply('❌ Failed to fetch product status.');
    }
  }

  async handleHelp(message) {
    const helpText = `
🤖 *WhatsApp Price Tracker Bot*

📝 *Available Commands:*

!track <url>
   Track a new product from Flipkart, Amazon, or Vivo

!untrack <id>
   Stop tracking a product

!list
   Show all your tracked products

!price <id>
   Get current price of a product

!offers <id>
   Get bank offers for a product

!status <id>
   Get complete status of a product

!help
   Show this help message

💡 *Tip:* You'll receive automatic alerts for price drops, new offers, and stock changes!
    `.trim();

    await message.reply(helpText);
  }

  detectPlatform(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check for exact match or subdomain match with leading dot
      if (hostname === 'flipkart.com' || hostname === 'www.flipkart.com') return 'flipkart';
      if (hostname === 'amazon.in' || hostname === 'www.amazon.in' ||
          hostname === 'amazon.com' || hostname === 'www.amazon.com') return 'amazon';
      if (hostname === 'vivo.com' || hostname === 'www.vivo.com') return 'vivo';
      
      return null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = CommandHandler;
