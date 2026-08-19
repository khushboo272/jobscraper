/**
 * BullMQ Queue Configuration.
 *
 * Per PRD §4.2: BullMQ job concurrency capped per-domain
 * (e.g. 1–2 concurrent, randomized 3–9s delay, jittered — never a fixed interval).
 *
 * This module provides configuration factories and utilities.
 * Actual BullMQ Queue/Worker creation requires a running Redis instance
 * and is done in the queue setup module (not here).
 */

/**
 * Generate a random delay between min and max (inclusive), in milliseconds.
 * Per PRD §4.2: jittered — never a fixed interval.
 *
 * @param {number} minMs - Minimum delay in ms
 * @param {number} maxMs - Maximum delay in ms
 * @returns {number} Random delay in ms
 */
function getJitteredDelay(minMs, maxMs) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Create a queue configuration for a specific domain.
 *
 * @param {string} domain - Target domain
 * @param {object} overrides - Optional config overrides
 * @returns {object} Queue configuration object
 */
function createQueueConfig(domain, overrides = {}) {
  return {
    domain,
    concurrency: overrides.concurrency || 2,
    delayMinMs: overrides.delayMinMs || 3000,
    delayMaxMs: overrides.delayMaxMs || 9000,
    backoff: {
      type: 'exponential',
      delay: overrides.backoffDelay || 2000,
    },
    attempts: overrides.attempts || 3,
  };
}

module.exports = { createQueueConfig, getJitteredDelay };
