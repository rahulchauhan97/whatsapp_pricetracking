const Database = require('better-sqlite3');
const path = require('path');

class DatabaseManager {
  constructor(dbPath, logger) {
    this.logger = logger;
    this.db = new Database(dbPath, { verbose: logger.debug.bind(logger) });
    this.db.pragma('journal_mode = WAL');
    this.initTables();
  }

  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        name TEXT,
        platform TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        price REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS offers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        offer_text TEXT NOT NULL,
        offer_type TEXT,
        bank_name TEXT,
        discount_amount REAL,
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS stock_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        in_stock BOOLEAN NOT NULL,
        stock_text TEXT,
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
      CREATE INDEX IF NOT EXISTS idx_products_platform ON products(platform);
      CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);
      CREATE INDEX IF NOT EXISTS idx_offers_product_id ON offers(product_id);
      CREATE INDEX IF NOT EXISTS idx_stock_product_id ON stock_status(product_id);
    `);
    
    this.logger.info('Database tables initialized');
  }

  // Product operations
  addProduct(url, platform, userId, name = null) {
    const stmt = this.db.prepare(`
      INSERT INTO products (url, platform, user_id, name) 
      VALUES (?, ?, ?, ?)
    `);
    
    try {
      const result = stmt.run(url, platform, userId, name);
      return { id: result.lastInsertRowid, url, platform, userId, name };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return this.getProductByUrl(url);
      }
      throw error;
    }
  }

  getProduct(id) {
    const stmt = this.db.prepare('SELECT * FROM products WHERE id = ?');
    return stmt.get(id);
  }

  getProductByUrl(url) {
    const stmt = this.db.prepare('SELECT * FROM products WHERE url = ?');
    return stmt.get(url);
  }

  getProductsByUser(userId) {
    const stmt = this.db.prepare('SELECT * FROM products WHERE user_id = ?');
    return stmt.all(userId);
  }

  getAllProducts() {
    const stmt = this.db.prepare('SELECT * FROM products');
    return stmt.all();
  }

  updateProduct(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const stmt = this.db.prepare(`
      UPDATE products SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(...values, id);
    return this.getProduct(id);
  }

  deleteProduct(id) {
    const stmt = this.db.prepare('DELETE FROM products WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Price operations
  addPrice(productId, price, currency = 'INR') {
    const stmt = this.db.prepare(`
      INSERT INTO prices (product_id, price, currency) 
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(productId, price, currency);
    return { id: result.lastInsertRowid, productId, price, currency };
  }

  getLatestPrice(productId) {
    const stmt = this.db.prepare(`
      SELECT * FROM prices 
      WHERE product_id = ? 
      ORDER BY checked_at DESC 
      LIMIT 1
    `);
    return stmt.get(productId);
  }

  getPriceHistory(productId, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT * FROM prices 
      WHERE product_id = ? 
      ORDER BY checked_at DESC 
      LIMIT ?
    `);
    return stmt.all(productId, limit);
  }

  // Offer operations
  addOffer(productId, offerText, offerType = null, bankName = null, discountAmount = null) {
    const stmt = this.db.prepare(`
      INSERT INTO offers (product_id, offer_text, offer_type, bank_name, discount_amount) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(productId, offerText, offerType, bankName, discountAmount);
    return { id: result.lastInsertRowid, productId, offerText };
  }

  getLatestOffers(productId) {
    const stmt = this.db.prepare(`
      SELECT * FROM offers 
      WHERE product_id = ? 
      ORDER BY checked_at DESC 
      LIMIT 5
    `);
    return stmt.all(productId);
  }

  clearOffers(productId) {
    const stmt = this.db.prepare('DELETE FROM offers WHERE product_id = ?');
    const result = stmt.run(productId);
    return result.changes;
  }

  // Stock operations
  addStockStatus(productId, inStock, stockText = null) {
    const stmt = this.db.prepare(`
      INSERT INTO stock_status (product_id, in_stock, stock_text) 
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(productId, inStock ? 1 : 0, stockText);
    return { id: result.lastInsertRowid, productId, inStock, stockText };
  }

  getLatestStockStatus(productId) {
    const stmt = this.db.prepare(`
      SELECT * FROM stock_status 
      WHERE product_id = ? 
      ORDER BY checked_at DESC 
      LIMIT 1
    `);
    return stmt.get(productId);
  }

  close() {
    this.db.close();
    this.logger.info('Database connection closed');
  }
}

module.exports = DatabaseManager;
