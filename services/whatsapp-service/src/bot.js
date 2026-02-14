const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppBot {
  constructor(redis, logger, commandHandler) {
    this.redis = redis;
    this.logger = logger;
    this.commandHandler = commandHandler;
    this.client = null;
    this.isReady = false;
  }

  async initialize() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth',
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    this.client.on('qr', (qr) => {
      this.logger.info('QR Code received, scan with WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.logger.info('WhatsApp client is ready!');
      this.isReady = true;
    });

    this.client.on('authenticated', () => {
      this.logger.info('WhatsApp authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error('WhatsApp authentication failed:', msg);
    });

    this.client.on('disconnected', (reason) => {
      this.logger.warn('WhatsApp client disconnected:', reason);
      this.isReady = false;
    });

    this.client.on('message', async (message) => {
      await this.handleMessage(message);
    });

    // Subscribe to notification events
    this.redis.subscribe('notification:send', async (data) => {
      await this.sendNotification(data);
    });

    await this.client.initialize();
    this.logger.info('WhatsApp bot initialized');
  }

  async handleMessage(message) {
    const body = message.body.trim();
    
    if (!body.startsWith('!')) return;

    const [command, ...args] = body.split(/\s+/);
    this.logger.info(`Command received: ${command} from ${message.from}`);

    await this.commandHandler.handleCommand(message, command.toLowerCase(), args);
  }

  async sendNotification(data) {
    if (!this.isReady) {
      this.logger.warn('WhatsApp client not ready, cannot send notification');
      return;
    }

    try {
      const { userId, message } = data;
      await this.client.sendMessage(userId, message);
      this.logger.info(`Notification sent to ${userId}`);
      
      await this.redis.publish('notification:sent', {
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error sending notification:', error);
      await this.redis.publish('notification:error', {
        userId: data.userId,
        error: error.message,
      });
    }
  }

  async destroy() {
    if (this.client) {
      await this.client.destroy();
      this.logger.info('WhatsApp client destroyed');
    }
  }
}

module.exports = WhatsAppBot;
