const config = require('./config');

const initTracer = (serviceName) => {
  if (!config.datadog.enabled) {
    console.log(`Datadog tracing disabled for ${serviceName}`);
    return null;
  }

  try {
    const tracer = require('dd-trace').init({
      service: serviceName,
      env: config.datadog.env,
      version: config.datadog.version,
      hostname: config.datadog.agentHost,
      logInjection: config.datadog.logInjection,
      runtimeMetrics: config.datadog.runtimeMetrics,
      analytics: true,
    });

    console.log(`Datadog tracing initialized for ${serviceName}`);
    return tracer;
  } catch (error) {
    console.warn(`Failed to initialize Datadog tracer for ${serviceName}:`, error.message);
    return null;
  }
};

module.exports = initTracer;
