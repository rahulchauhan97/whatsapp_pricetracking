const winston = require('winston');
const config = require('./config');

const createLogger = (serviceName) => {
  const transports = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${serviceName}] ${level}: ${message} ${metaStr}`;
        })
      ),
    }),
  ];

  // Add Datadog transport if enabled
  if (config.datadog.enabled) {
    try {
      const DatadogWinston = require('datadog-winston');
      transports.push(
        new DatadogWinston({
          apiKey: process.env.DD_API_KEY,
          hostname: serviceName,
          service: serviceName,
          ddsource: 'nodejs',
          ddtags: `env:${config.datadog.env},version:${config.datadog.version}`,
        })
      );
    } catch (error) {
      console.warn('Datadog winston transport not available:', error.message);
    }
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports,
  });
};

module.exports = createLogger;
