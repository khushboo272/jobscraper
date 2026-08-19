const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');
const { CircuitBreaker, STATES } = require('../ingestion/circuitBreaker.js');
const { getAllSources, getSource } = require('../ingestion/sources/sourceRegistry.js');
const { validateJob } = require('../ingestion/jobSchema.js');
const { JobListing } = require('../models/JobListing.js');
const { updateSourceHealth, setListingsCache, logger } = require('../server.js');
const { createQueueConfig, getJitteredDelay } = require('./queueConfig.js');

// Redis Connection
const connection = process.env.NODE_ENV === 'test' ? null : new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

if (connection) {
  connection.on('error', (err) => {
    logger.error({ err: err.message }, 'Redis connection error (Ensure Docker container for Redis is running)');
  });
}

// Circuit Breakers map
const circuitBreakers = {};

// Initialize circuit breakers for all sources
getAllSources().forEach((source) => {
  circuitBreakers[source.SOURCE_NAME] = new CircuitBreaker({
    failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
    resetTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS || '30000', 10),
  });
});

/**
 * Process an individual ingestion job.
 * @param {import('bullmq').Job} job
 */
async function processIngestionJob(job) {
  const { source: sourceName, query, location } = job.data;
  
  const sourceAdapter = getSource(sourceName);
  if (!sourceAdapter) {
    throw new Error(`Unknown source: ${sourceName}`);
  }

  const cb = circuitBreakers[sourceName];
  if (!cb.isAllowed()) {
    logger.warn({ source: sourceName }, 'Circuit breaker OPEN. Skipping job.');
    throw new Error(`Circuit breaker is OPEN for source: ${sourceName}`);
  }

  // Jittered delay per PRD §4.2
  const delayMin = parseInt(process.env.REQUEST_DELAY_MIN_MS || '3000', 10);
  const delayMax = parseInt(process.env.REQUEST_DELAY_MAX_MS || '9000', 10);
  const delay = getJitteredDelay(delayMin, delayMax);
  await new Promise(resolve => setTimeout(resolve, delay));

  try {
    // Fetch jobs
    const jobs = await sourceAdapter.fetchJobs({ query, location });
    
    if (!jobs || jobs.length === 0) {
      throw new Error(`No jobs returned or blocked by source: ${sourceName}`);
    }

    // Success path
    cb.recordSuccess();
    updateSourceHealth(sourceName, true);

    let validCount = 0;
    for (const rawJob of jobs) {
      const { success, data, errors } = validateJob(rawJob);
      if (success) {
        // Persist to MongoDB
        // Use jobHash and source as unique identifiers (per JobListing schema)
        await JobListing.findOneAndUpdate(
          { jobHash: data.id, source: data.source },
          { $set: data },
          { upsert: true, new: true }
        ).catch(err => {
          // Ignore duplicate key errors if jobHash is missing and (url, source) index triggers
          if (err.code !== 11000) logger.error(err, 'DB Upsert Error');
        });
        validCount++;
      } else {
        logger.debug({ source: sourceName, errors }, 'Job schema validation failed');
      }
    }

    logger.info({ source: sourceName, fetched: jobs.length, valid: validCount }, 'Ingestion successful');
    return { fetched: jobs.length, valid: validCount };

  } catch (error) {
    // Failure path
    cb.recordFailure();
    updateSourceHealth(sourceName, false);
    logger.error({ source: sourceName, error: error.message }, 'Ingestion failed');
    throw error; // Let BullMQ handle retry/backoff
  }
}

let worker;
const queues = {};

/**
 * Initialize the Orchestrator Worker and scheduling.
 */
function initOrchestrator() {
  // Create queues
  const QUEUE_NAME = 'job-ingestion';
  const queue = new Queue(QUEUE_NAME, { connection });
  queues[QUEUE_NAME] = queue;

  // Create Worker
  worker = new Worker(QUEUE_NAME, processIngestionJob, { 
    connection,
    concurrency: parseInt(process.env.MAX_CONCURRENCY_PER_DOMAIN || '2', 10),
  });

  worker.on('completed', async (job) => {
    logger.debug(`Job ${job.id} completed`);
    // Update cache for dashboard after successful ingestions
    try {
      const topListings = await JobListing.find().sort({ scrapedAt: -1 }).limit(100).lean();
      setListingsCache(topListings);
    } catch (err) {
      logger.error('Failed to update listings cache');
    }
  });

  worker.on('failed', (job, err) => {
    logger.debug(`Job ${job.id} failed: ${err.message}`);
  });

  // Schedule recurring jobs for each source
  // In production, we might use BullMQ repeatable jobs, but for the demo 
  // we'll just add standard jobs and have a separate loop if needed, 
  // or use `repeat` option.
  getAllSources().forEach((source) => {
    queue.add(
      `scrape-${source.SOURCE_NAME}`,
      { source: source.SOURCE_NAME, query: 'developer', location: 'remote' },
      {
        repeat: {
          pattern: '*/5 * * * *', // Every 5 minutes
        },
      }
    ).catch(err => logger.error(`Failed to schedule ${source.SOURCE_NAME}`));
  });

  logger.info('Orchestrator Worker initialized.');
}

/**
 * Manually trigger an immediate ingestion sync for one or all sources with optional custom query and location.
 */
async function triggerManualSync(sourceName, options = {}) {
  const { query = 'developer', location = 'remote' } = options;
  const queue = queues['job-ingestion'];
  const sourcesToSync = sourceName && sourceName !== 'all' 
    ? [sourceName] 
    : getAllSources().map(s => s.SOURCE_NAME);

  const results = [];
  for (const src of sourcesToSync) {
    try {
      // Direct execution for immediate feedback
      const syncResult = await processIngestionJob({
        data: { source: src, query, location }
      });
      results.push({
        source: src,
        status: 'success',
        fetched: syncResult.fetched || 0,
        valid: syncResult.valid || 0,
      });
    } catch (err) {
      results.push({
        source: src,
        status: 'failed',
        error: err.message,
      });

      // Also try adding to queue if available
      if (queue) {
        await queue.add(
          `manual-sync-${src}-${Date.now()}`,
          { source: src, query, location }
        ).catch(() => {});
      }
    }
  }

  const overallSuccess = results.some(r => r.status === 'success');
  const overallStatus = overallSuccess ? 'success' : (results.length > 0 ? 'failed' : 'queued');

  return {
    status: overallStatus,
    source: sourceName || 'all',
    query,
    location,
    results,
    fetched: results.reduce((acc, r) => acc + (r.fetched || 0), 0),
    valid: results.reduce((acc, r) => acc + (r.valid || 0), 0),
  };
}

module.exports = {
  processIngestionJob,
  initOrchestrator,
  triggerManualSync,
  circuitBreakers,
  connection
};
