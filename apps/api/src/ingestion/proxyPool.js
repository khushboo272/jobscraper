/**
 * Proxy Pool Abstraction.
 *
 * Per PRD §4.2: getProxyForDomain(domain) returns a sticky session proxy
 * for the duration of a "visit", rotates on failure.
 *
 * Stub with 2-3 free proxies or a mock for the demo;
 * document that production would use a residential/mobile pool.
 */

// Configurable proxy list
let proxyList = [];

// Sticky session map: domain → { proxy, index }
const stickyMap = new Map();

/**
 * Configure the proxy pool with a list of proxy URLs.
 *
 * @param {string[]} proxies - Array of proxy URLs
 */
function configure(proxies) {
  proxyList = [...proxies];
  stickyMap.clear();
}

/**
 * Get a sticky proxy for the given domain.
 * Returns the same proxy for repeated calls with the same domain.
 * Returns null if no proxies are configured.
 *
 * @param {string} domain
 * @returns {string|null} Proxy URL or null
 */
function getProxyForDomain(domain) {
  if (proxyList.length === 0) {
    return null;
  }

  if (stickyMap.has(domain)) {
    const entry = stickyMap.get(domain);
    return proxyList[entry.index];
  }

  // Assign a proxy based on domain hash for deterministic distribution
  const index = simpleHash(domain) % proxyList.length;
  stickyMap.set(domain, { index });
  return proxyList[index];
}

/**
 * Rotate the proxy for a given domain to a different one.
 * Per PRD §4.2: rotate on failure.
 *
 * @param {string} domain
 */
function rotateProxy(domain) {
  if (proxyList.length <= 1) {
    return;
  }

  const entry = stickyMap.get(domain);
  const currentIndex = entry ? entry.index : 0;
  const newIndex = (currentIndex + 1) % proxyList.length;
  stickyMap.set(domain, { index: newIndex });
}

/**
 * Simple deterministic hash for distributing domains across proxies.
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

module.exports = { configure, getProxyForDomain, rotateProxy };
