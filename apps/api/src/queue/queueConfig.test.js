const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tests for the BullMQ queue configuration module.
 *
 * Per PRD §4.2: BullMQ job concurrency capped per-domain,
 * randomized 3–9s delay, jittered — never a fixed interval.
 *
 * Note: These tests verify the config/factory functions, not the actual
 * Redis connection (which requires a running Redis instance).
 */
describe('Queue Config', () => {
  it('exports createQueueConfig() function', () => {
    const { createQueueConfig } = require('./queueConfig.js');
    assert.equal(typeof createQueueConfig, 'function');
  });

  it('returns config with concurrency, delay range, and backoff settings', () => {
    const { createQueueConfig } = require('./queueConfig.js');
    const config = createQueueConfig('example.com');

    assert.ok(config.concurrency >= 1);
    assert.ok(config.concurrency <= 3);
    assert.ok(config.delayMinMs >= 1000);
    assert.ok(config.delayMaxMs <= 15000);
    assert.ok(config.delayMinMs < config.delayMaxMs);
    assert.ok(config.backoff, 'Should have backoff config');
    assert.equal(config.backoff.type, 'exponential');
  });

  it('exports getJitteredDelay() that returns a random delay in the configured range', () => {
    const { getJitteredDelay } = require('./queueConfig.js');
    assert.equal(typeof getJitteredDelay, 'function');

    const delays = new Set();
    for (let i = 0; i < 20; i++) {
      const delay = getJitteredDelay(3000, 9000);
      assert.ok(delay >= 3000, `Delay ${delay} should be >= 3000`);
      assert.ok(delay <= 9000, `Delay ${delay} should be <= 9000`);
      delays.add(delay);
    }

    // Jitter should produce at least some variation
    assert.ok(delays.size >= 2, 'Jittered delays should vary');
  });
});
