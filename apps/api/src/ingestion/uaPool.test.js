const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tests for the UA/Viewport rotation pool.
 *
 * Per PRD §4.2: rotate User-Agent + matching sec-ch-ua/viewport combos
 * from a pool of real, currently-in-the-wild combinations.
 */
describe('UA Pool', () => {
  it('exports getRandomIdentity() function', () => {
    const { getRandomIdentity } = require('./uaPool.js');
    assert.equal(typeof getRandomIdentity, 'function');
  });

  it('returns an identity object with userAgent, secChUa, and viewport', () => {
    const { getRandomIdentity } = require('./uaPool.js');
    const identity = getRandomIdentity();

    assert.ok(identity.userAgent, 'Must have userAgent');
    assert.ok(identity.secChUa, 'Must have sec-ch-ua');
    assert.ok(identity.viewport, 'Must have viewport');
    assert.ok(identity.viewport.width, 'viewport must have width');
    assert.ok(identity.viewport.height, 'viewport must have height');
  });

  it('returns different identities over multiple calls (not always the same)', () => {
    const { getRandomIdentity } = require('./uaPool.js');
    const identities = new Set();

    for (let i = 0; i < 20; i++) {
      identities.add(getRandomIdentity().userAgent);
    }

    // Pool should have at least 3 entries per PRD
    assert.ok(identities.size >= 2, 'Should return at least 2 different UAs over 20 calls');
  });

  it('exports IDENTITY_POOL array with at least 3 entries', () => {
    const { IDENTITY_POOL } = require('./uaPool.js');
    assert.ok(Array.isArray(IDENTITY_POOL));
    assert.ok(IDENTITY_POOL.length >= 3, 'Pool must have at least 3 real identity combos');
  });
});
