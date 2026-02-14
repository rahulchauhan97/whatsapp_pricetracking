module.exports = {
  // Product tracking events
  PRODUCT_TRACK: 'product:track',
  PRODUCT_UNTRACK: 'product:untrack',
  PRODUCT_LIST: 'product:list',
  PRODUCT_PRICE: 'product:price',
  PRODUCT_OFFERS: 'product:offers',
  PRODUCT_STATUS: 'product:status',
  
  // Scraper events
  SCRAPE_REQUEST: 'scrape:request',
  SCRAPE_RESULT: 'scrape:result',
  SCRAPE_ERROR: 'scrape:error',
  
  // Alert events
  ALERT_PRICE_CHANGE: 'alert:price-change',
  ALERT_OFFER_CHANGE: 'alert:offer-change',
  ALERT_STOCK_CHANGE: 'alert:stock-change',
  
  // Notification events
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_SENT: 'notification:sent',
  NOTIFICATION_ERROR: 'notification:error',
  
  // Scheduler events
  SCHEDULE_SCRAPE: 'schedule:scrape',
  SCHEDULE_CHECK: 'schedule:check',
};
