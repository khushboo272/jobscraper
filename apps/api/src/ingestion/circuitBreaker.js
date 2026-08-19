/**
 * Circuit Breaker implementation.
 *
 * Per PRD §5.1:
 * - CLOSED: requests pass through, failures are counted
 * - OPEN: all requests immediately rejected after failure threshold reached
 * - HALF_OPEN: after reset timeout, allow one test request
 *   - Success → CLOSED
 *   - Failure → OPEN
 *
 * Per PRD: operates per (source, identity) pair.
 */

const STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

class CircuitBreaker {
  /**
   * @param {object} config
   * @param {number} config.failureThreshold - Number of failures before opening
   * @param {number} config.resetTimeoutMs - Time in ms before transitioning to HALF_OPEN
   */
  constructor(config) {
    this.failureThreshold = config.failureThreshold;
    this.resetTimeoutMs = config.resetTimeoutMs;
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  /**
   * Get the current state of the circuit breaker.
   * Checks if OPEN → HALF_OPEN transition should happen.
   *
   * @returns {string} 'CLOSED' | 'OPEN' | 'HALF_OPEN'
   */
  getState() {
    if (this.state === STATES.OPEN) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.resetTimeoutMs) {
        this.state = STATES.HALF_OPEN;
      }
    }
    return this.state;
  }

  /**
   * Check if a request is allowed through the circuit breaker.
   *
   * @returns {boolean}
   */
  isAllowed() {
    const currentState = this.getState();
    return currentState !== STATES.OPEN;
  }

  /**
   * Record a successful request.
   * Resets failure count. Transitions HALF_OPEN → CLOSED.
   */
  recordSuccess() {
    this.failureCount = 0;
    this.state = STATES.CLOSED;
  }

  /**
   * Record a failed request.
   * Increments failure count. Transitions CLOSED → OPEN when threshold reached.
   * Transitions HALF_OPEN → OPEN on any failure.
   */
  recordFailure() {
    this.lastFailureTime = Date.now();

    if (this.state === STATES.HALF_OPEN) {
      this.state = STATES.OPEN;
      return;
    }

    this.failureCount++;

    if (this.failureCount >= this.failureThreshold) {
      this.state = STATES.OPEN;
    }
  }
}

module.exports = { CircuitBreaker, STATES };
