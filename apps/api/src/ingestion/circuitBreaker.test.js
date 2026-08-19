const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tests for the Circuit Breaker.
 *
 * Per PRD §5.1:
 * - Closed: requests pass through normally
 * - Open: all requests immediately fail (circuit "tripped")
 * - Half-Open: allow one test request to check if source recovered
 *
 * Per PRD: circuit breaker operates per (source, identity) pair.
 */
describe('Circuit Breaker', () => {
  let CircuitBreaker;

  beforeEach(() => {
    delete require.cache[require.resolve('./circuitBreaker.js')];
    CircuitBreaker = require('./circuitBreaker.js').CircuitBreaker;
  });

  it('exports CircuitBreaker class', () => {
    assert.equal(typeof CircuitBreaker, 'function');
  });

  it('starts in CLOSED state', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
    assert.equal(cb.getState(), 'CLOSED');
  });

  it('stays CLOSED when failures are below threshold', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();
    assert.equal(cb.getState(), 'CLOSED');
  });

  it('transitions to OPEN when failures reach threshold', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    assert.equal(cb.getState(), 'OPEN');
  });

  it('rejects requests when OPEN (isAllowed returns false)', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 5000 });
    cb.recordFailure();
    cb.recordFailure();
    assert.equal(cb.isAllowed(), false);
  });

  it('transitions to HALF_OPEN after reset timeout', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 50 });
    cb.recordFailure();
    cb.recordFailure();
    assert.equal(cb.getState(), 'OPEN');

    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(cb.getState(), 'HALF_OPEN');
    assert.equal(cb.isAllowed(), true);
  });

  it('transitions back to CLOSED on success in HALF_OPEN state', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 50 });
    cb.recordFailure();
    cb.recordFailure();

    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(cb.getState(), 'HALF_OPEN');

    cb.recordSuccess();
    assert.equal(cb.getState(), 'CLOSED');
  });

  it('transitions back to OPEN on failure in HALF_OPEN state', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 50 });
    cb.recordFailure();
    cb.recordFailure();

    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(cb.getState(), 'HALF_OPEN');

    cb.recordFailure();
    assert.equal(cb.getState(), 'OPEN');
  });

  it('resets failure count on success', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    assert.equal(cb.getState(), 'CLOSED');
    // Should need 3 more failures to trip
    cb.recordFailure();
    cb.recordFailure();
    assert.equal(cb.getState(), 'CLOSED');
  });
});
