/**
 * BrowserFetchStrategy — Tier 2 ingestion strategy.
 *
 * Uses Playwright (+ stealth patches) for targets that require JS execution
 * or gate content behind interaction.
 *
 * Per PRD §4.1: headless browser, only escalated to when Tier 1 gets blocked/empty.
 *
 * Note: In unit tests, a mockBrowserFn is injected to avoid needing a real
 * Playwright install. Integration tests will use the real browser.
 */
class BrowserFetchStrategy {
  /**
   * Fetch page content using a headless browser.
   *
   * @param {string} url - The URL to navigate to
   * @param {object} options - Optional overrides
   * @param {Function} options.browserFn - Mock browser function for testing
   * @returns {string} Rendered HTML content
   */
  async fetch(url, options = {}) {
    if (options.browserFn) {
      return options.browserFn(url);
    }

    // Real Playwright path — lazy-loaded to avoid requiring it when not needed
    let playwright;
    try {
      playwright = require('playwright');
    } catch (err) {
      throw new Error(
        'Playwright is not installed. Install with: npm install playwright'
      );
    }

    const browser = await playwright.chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });
      const page = await context.newPage();

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const html = await page.content();
      return html;
    } finally {
      await browser.close();
    }
  }
}

module.exports = { BrowserFetchStrategy };
