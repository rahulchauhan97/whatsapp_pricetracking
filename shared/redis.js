const Redis = require('ioredis');
const config = require('./config');

class RedisClient {
  constructor(logger) {
    this.logger = logger;
    this.publisher = null;
    this.subscriber = null;
    this.client = null;
    this.handlers = new Map();
  }

  connect() {
    const redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.info(`Reconnecting to Redis, attempt ${times}, delay ${delay}ms`);
        return delay;
      },
      reconnectOnError: (err) => {
        this.logger.error('Redis connection error:', err);
        return true;
      },
    };

    this.client = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);

    this.client.on('connect', () => {
      this.logger.info('Redis client connected');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error:', err);
    });

    this.publisher.on('connect', () => {
      this.logger.info('Redis publisher connected');
    });

    this.subscriber.on('connect', () => {
      this.logger.info('Redis subscriber connected');
    });

    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });

    return this;
  }

  async publish(channel, data) {
    try {
      const message = JSON.stringify(data);
      await this.publisher.publish(channel, message);
      this.logger.debug(`Published to ${channel}:`, data);
    } catch (error) {
      this.logger.error(`Error publishing to ${channel}:`, error);
      throw error;
    }
  }

  subscribe(channel, handler) {
    this.subscriber.subscribe(channel);
    this.handlers.set(channel, handler);
    this.logger.info(`Subscribed to ${channel}`);
  }

  handleMessage(channel, message) {
    try {
      const data = JSON.parse(message);
      const handler = this.handlers.get(channel);
      if (handler) {
        handler(data);
      } else {
        this.logger.warn(`No handler for channel: ${channel}`);
      }
    } catch (error) {
      this.logger.error(`Error handling message from ${channel}:`, error);
    }
  }

  async get(key) {
    return this.client.get(key);
  }

  async set(key, value, ttl = null) {
    if (ttl) {
      return this.client.setex(key, ttl, value);
    }
    return this.client.set(key, value);
  }

  async del(key) {
    return this.client.del(key);
  }

  async hgetall(key) {
    return this.client.hgetall(key);
  }

  async hset(key, field, value) {
    return this.client.hset(key, field, value);
  }

  async disconnect() {
    if (this.client) await this.client.quit();
    if (this.publisher) await this.publisher.quit();
    if (this.subscriber) await this.subscriber.quit();
    this.logger.info('Redis connections closed');
  }
}

module.exports = RedisClient;
