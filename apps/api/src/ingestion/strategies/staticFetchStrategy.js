const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Default realistic headers to mimic a real browser request.
 * Per PRD §4.2: use real, currently-in-the-wild UA + header combos.
 */
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125", "Not=A?Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Cache-Control': 'no-cache',
};

/**
 * StaticFetchStrategy — Tier 1 ingestion strategy.
 *
 * Uses axios for HTTP requests and cheerio for HTML parsing.
 * Per PRD §4.1: cheapest, fastest path for sources that don't need JS execution.
 */
class StaticFetchStrategy {
  /**
   * Fetch HTML from a URL using static HTTP request.
   *
   * @param {string} url - The URL to fetch
   * @param {object} options - Optional overrides
   * @param {Function} options.httpFn - Mock HTTP function for testing
   * @param {object} options.headers - Additional/override headers
   * @returns {string} HTML content
   */
  async fetch(url, options = {}) {
    if (options.httpFn) {
      const headers = { ...DEFAULT_HEADERS, ...options.headers };
      return options.httpFn(url, { headers });
    }

    const response = await axios.get(url, {
      headers: { ...DEFAULT_HEADERS, ...options.headers },
      timeout: 10000,
    });

    return response.data;
  }

  /**
   * Parse HTML string and extract job data using CSS selectors.
   *
   * @param {string} html - Raw HTML string
   * @param {object} selectors - CSS selectors for extracting job fields
   * @param {string} selectors.card - Selector for each job card container
   * @param {string} selectors.title - Selector for job title within card
   * @param {string} selectors.company - Selector for company name within card
   * @param {string} selectors.location - Selector for location within card
   * @param {string} selectors.salary - Selector for salary within card
   * @param {string} selectors.skills - Selector for skill tags within card
   * @returns {Array<object>} Array of parsed job objects
   */
  parseHtml(html, selectors) {
    const $ = cheerio.load(html);
    const jobs = [];

    $(selectors.card).each((index, element) => {
      const card = $(element);
      const title = card.find(selectors.title).text().trim();
      const company = card.find(selectors.company).text().trim();
      const location = card.find(selectors.location).text().trim();
      const salary = card.find(selectors.salary).text().trim();

      const skills = [];
      card.find(selectors.skills).each((i, el) => {
        const skill = $(el).text().trim();
        if (skill) {
          skills.push(skill);
        }
      });

      jobs.push({ title, company, location, salary, skills });
    });

    return jobs;
  }
}

module.exports = { StaticFetchStrategy };
