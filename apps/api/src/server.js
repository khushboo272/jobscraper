const express = require('express');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
});

/**
 * In-memory source health registry.
 *
 * Per PRD §5.3: /status endpoint shows per-source health
 * (healthy / degraded / down), last successful run, error rate over last N runs.
 *
 * In production this would be backed by Redis or the database.
 */
const sourceRegistry = {
  remoteok: {
    health: 'healthy',
    lastSuccess: new Date().toISOString(),
    errorRate: 0,
    totalRuns: 0,
    failedRuns: 0,
  },
  sandbox: {
    health: 'healthy',
    lastSuccess: new Date().toISOString(),
    errorRate: 0,
    totalRuns: 0,
    failedRuns: 0,
  },
};

/**
 * In-memory listings cache.
 * In production, this reads from MongoDB via Mongoose.
 */
let listingsCache = [];

/**
 * Create and return the Express app (does NOT call .listen).
 */
function createApp() {
  const app = express();
  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info({
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        latencyMs: Date.now() - start,
      }, `${req.method} ${req.url} ${res.statusCode}`);
    });
    next();
  });

  // --- GET /health ---
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // --- GET /status ---
  // Per PRD §5.3: per-source health, last successful run, error rate
  app.get('/status', (req, res) => {
    const sources = {};
    for (const [name, data] of Object.entries(sourceRegistry)) {
      sources[name] = {
        health: data.health,
        lastSuccess: data.lastSuccess,
        errorRate: data.totalRuns > 0
          ? Number((data.failedRuns / data.totalRuns).toFixed(3))
          : 0,
      };
    }
    res.json({ sources, timestamp: new Date().toISOString() });
  });

  // --- GET /listings ---
  // Per PRD §7: table of normalized listings
  app.get('/listings', (req, res) => {
    res.json({
      listings: listingsCache,
      total: listingsCache.length,
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

/**
 * Update source health in the registry.
 * Called by the ingestion pipeline after each run.
 */
function updateSourceHealth(sourceName, success) {
  const source = sourceRegistry[sourceName];
  if (!source) return;

  source.totalRuns++;
  if (success) {
    source.lastSuccess = new Date().toISOString();
    source.failedRuns = Math.max(0, source.failedRuns - 1);
  } else {
    source.failedRuns++;
  }

  const errorRate = source.totalRuns > 0 ? source.failedRuns / source.totalRuns : 0;
  if (errorRate >= 0.5) {
    source.health = 'down';
  } else if (errorRate >= 0.2) {
    source.health = 'degraded';
  } else {
    source.health = 'healthy';
  }
  source.errorRate = errorRate;
}

/**
 * Update the listings cache.
 */
function setListingsCache(listings) {
  listingsCache = listings;
}

module.exports = { createApp, updateSourceHealth, setListingsCache, logger };

// --- Start server if run directly ---
if (require.main === module) {
  require('dotenv').config({ path: '../../.env' });
  const port = process.env.API_PORT || 3000;
  const app = createApp();
  app.listen(port, () => {
    logger.info(`API server running on http://localhost:${port}`);
  });
}
