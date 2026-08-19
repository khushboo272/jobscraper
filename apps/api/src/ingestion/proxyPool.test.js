const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tests for the Proxy Pool abstraction.
 *
 * Per PRD §4.2: getProxyForDomain(domain) returns a sticky session proxy,
 * rotates on failure. Stub with 2-3 free proxies or a mock for the demo.
 */
describe('Proxy Pool', () => {
  it('exports getProxyForDomain() function', () => {
    const { getProxyForDomain } = require('./proxyPool.js');
    assert.equal(typeof getProxyForDomain, 'function');
  });

  it('returns a proxy URL string for a given domain', () => {
    const { getProxyForDomain } = require('./proxyPool.js');
    const proxy = getProxyForDomain('example.com');

    // Can return null if no proxies configured (stub mode)
    // But must always return a string or null
    assert.ok(proxy === null || typeof proxy === 'string');
  });

  it('returns the same proxy for the same domain (sticky session)', () => {
    const { getProxyForDomain } = require('./proxyPool.js');
    const proxy1 = getProxyForDomain('test.com');
    const proxy2 = getProxyForDomain('test.com');

    assert.equal(proxy1, proxy2, 'Same domain should get sticky proxy');
  });

  it('exports rotateProxy() to force a new proxy for a domain', () => {
    const { rotateProxy } = require('./proxyPool.js');
    assert.equal(typeof rotateProxy, 'function');
  });

  it('rotateProxy() changes the proxy for the given domain', () => {
    const { getProxyForDomain, rotateProxy, configure } = require('./proxyPool.js');

    // Configure with at least 2 proxies so rotation is testable
    configure(['http://proxy1:8080', 'http://proxy2:8080']);

    const before = getProxyForDomain('rotate-test.com');
    rotateProxy('rotate-test.com');
    const after = getProxyForDomain('rotate-test.com');

    assert.notEqual(before, after, 'Proxy should change after rotation');
  });

  it('returns null when no proxies are configured', () => {
    const { getProxyForDomain, configure } = require('./proxyPool.js');
    configure([]);
    const proxy = getProxyForDomain('empty.com');
    assert.equal(proxy, null);
  });
});
