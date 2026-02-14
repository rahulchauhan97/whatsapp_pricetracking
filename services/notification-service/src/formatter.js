class MessageFormatter {
  formatPriceDropAlert(data) {
    const { productName, oldPrice, newPrice, difference, percentChange, platform, url } = data;
    
    const message = `
🔔 *PRICE DROP ALERT!*

📦 *Product:* ${productName || 'Product'}
📱 *Platform:* ${platform.toUpperCase()}

💰 *Price Update:*
   Old: ₹${oldPrice.toFixed(2)}
   New: ₹${newPrice.toFixed(2)}
   
💸 *You Save:* ₹${difference.toFixed(2)} (${percentChange}% OFF)

🔗 *Link:* ${url.substring(0, 80)}...

⚡ Hurry! Grab this deal now!
    `.trim();

    return message;
  }

  formatOfferChangeAlert(data) {
    const { productName, newOffers, removedOffers, totalOffers, platform, url } = data;
    
    let message = `🏦 *BANK OFFERS UPDATE!*\n\n`;
    message += `📦 *Product:* ${productName || 'Product'}\n`;
    message += `📱 *Platform:* ${platform.toUpperCase()}\n\n`;

    if (newOffers && newOffers.length > 0) {
      message += `✨ *NEW OFFERS (${newOffers.length}):*\n`;
      newOffers.forEach((offer, i) => {
        message += `${i + 1}. ${offer.text}\n`;
      });
      message += '\n';
    }

    if (removedOffers && removedOffers.length > 0) {
      message += `❌ *EXPIRED OFFERS (${removedOffers.length}):*\n`;
      removedOffers.forEach((offer, i) => {
        message += `${i + 1}. ${offer.offer_text}\n`;
      });
      message += '\n';
    }

    message += `📊 *Total Active Offers:* ${totalOffers}\n\n`;
    message += `🔗 *Link:* ${url.substring(0, 80)}...`;

    return message.trim();
  }

  formatStockAlert(data) {
    const { productName, isInStock, stockText, alertType, platform, url } = data;
    
    if (alertType === 'back_in_stock') {
      const message = `
📦 *BACK IN STOCK!*

🎉 *Great News!*
${productName || 'Product'} is now available!

📱 *Platform:* ${platform.toUpperCase()}
✅ *Status:* ${stockText}

🔗 *Link:* ${url.substring(0, 80)}...

⚡ Order now before it goes out of stock again!
      `.trim();
      
      return message;
    } else {
      const message = `
📦 *STOCK UPDATE*

${productName || 'Product'}

📱 *Platform:* ${platform.toUpperCase()}
❌ *Status:* Out of Stock

Don't worry, we'll notify you when it's back! 🔔
      `.trim();
      
      return message;
    }
  }

  formatGenericNotification(title, message) {
    return `
🤖 *${title}*

${message}
    `.trim();
  }
}

module.exports = MessageFormatter;
