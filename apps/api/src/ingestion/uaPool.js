/**
 * UA/Viewport Identity Pool.
 *
 * Per PRD §4.2: rotate User-Agent + matching sec-ch-ua/viewport combinations
 * from a small pool of *real, currently-in-the-wild* combinations.
 *
 * Session identity = (proxy + UA + cookie jar) bundled as one unit, never mixed.
 */

const IDENTITY_POOL = [
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    secChUa: '"Google Chrome";v="125", "Chromium";v="125", "Not=A?Brand";v="24"',
    viewport: { width: 1920, height: 1080 },
  },
  {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    secChUa: '"Google Chrome";v="124", "Chromium";v="124", "Not=A?Brand";v="24"',
    viewport: { width: 1440, height: 900 },
  },
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
    secChUa: '"Firefox";v="126"',
    viewport: { width: 1366, height: 768 },
  },
  {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    secChUa: '"Safari";v="17"',
    viewport: { width: 1680, height: 1050 },
  },
  {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    secChUa: '"Google Chrome";v="125", "Chromium";v="125", "Not=A?Brand";v="24"',
    viewport: { width: 1920, height: 1080 },
  },
];

/**
 * Get a random identity from the pool.
 *
 * @returns {{ userAgent: string, secChUa: string, viewport: { width: number, height: number } }}
 */
function getRandomIdentity() {
  const index = Math.floor(Math.random() * IDENTITY_POOL.length);
  return IDENTITY_POOL[index];
}

module.exports = { IDENTITY_POOL, getRandomIdentity };
