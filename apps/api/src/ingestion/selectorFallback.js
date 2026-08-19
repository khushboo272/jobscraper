const cheerio = require('cheerio');

/**
 * Fallback Selector Sets and Source Failover.
 *
 * Per PRD §5.1:
 * - Markup drift: selector returns 0 matches where >0 expected
 *   → fall back to secondary selector set
 * - If both fail: alert + quarantine job, don't silently drop
 * - Secondary source failover: if source A fails, pipeline fails over to source B
 */

/**
 * Try multiple selector sets against HTML.
 * Returns the first set that produces results.
 * If all fail, returns a quarantine result.
 *
 * @param {string} html - Raw HTML to parse
 * @param {Array<object>} selectorSets - Ordered list of selector objects ({ card, title, ... })
 * @returns {{ matched: boolean, selectorSetIndex: number, jobs: Array, quarantined: boolean }}
 */
function trySelectorSets(html, selectorSets) {
  const $ = cheerio.load(html);

  for (let i = 0; i < selectorSets.length; i++) {
    const selectors = selectorSets[i];
    const cards = $(selectors.card);

    if (cards.length > 0) {
      const jobs = [];
      cards.each((index, element) => {
        const card = $(element);
        const title = card.find(selectors.title).text().trim();
        jobs.push({ title });
      });

      return {
        matched: true,
        selectorSetIndex: i,
        jobs,
        quarantined: false,
      };
    }
  }

  // All selector sets failed — quarantine
  return {
    matched: false,
    selectorSetIndex: -1,
    jobs: [],
    quarantined: true,
  };
}

/**
 * Try multiple data sources in order.
 * Returns jobs from the first source that succeeds (returns non-empty array).
 *
 * Per PRD §4.3: if source A fails, pipeline fails over to source B
 * so the dashboard never goes empty.
 *
 * @param {Array<{name: string, fn: Function}>} sources - Ordered list of sources
 * @returns {{ source: string, jobs: Array }}
 */
async function failoverSources(sources) {
  for (const source of sources) {
    try {
      const jobs = await source.fn();
      if (Array.isArray(jobs) && jobs.length > 0) {
        return { source: source.name, jobs };
      }
    } catch (error) {
      // Source failed — try next
    }
  }

  // All sources exhausted
  const lastSourceName = sources.length > 0 ? sources[sources.length - 1].name : 'none';
  return { source: lastSourceName, jobs: [] };
}

module.exports = { trySelectorSets, failoverSources };
