/**
 * Tier Escalation — tries ingestion tiers in order (cheapest first).
 *
 * Per PRD §4.1: escalate cost only when needed.
 * Tier 0 (API) → Tier 1 (static HTML) → Tier 2 (headless browser).
 *
 * A tier "fails" if it throws an error or returns an empty array.
 * On failure, the next tier is attempted. If all tiers fail, returns empty.
 *
 * Per PRD §4.3: config flag can flip tier without code changes (strategy pattern).
 */

/**
 * Try each tier in order. Return the first successful result.
 *
 * @param {Array<{name: string, fn: Function}>} tiers - Ordered list of tier objects
 *   Each tier has:
 *     name: string identifier (e.g. 'tier0', 'tier1')
 *     fn: async function that returns an array of jobs
 * @returns {{ tier: string, jobs: Array }} The result from the first successful tier
 */
async function escalateTiers(tiers) {
  for (const tier of tiers) {
    try {
      const jobs = await tier.fn();
      if (Array.isArray(jobs) && jobs.length > 0) {
        return { tier: tier.name, jobs };
      }
    } catch (error) {
      // Tier failed — continue to next
    }
  }

  // All tiers exhausted — return empty with last tier name
  const lastTierName = tiers.length > 0 ? tiers[tiers.length - 1].name : 'none';
  return { tier: lastTierName, jobs: [] };
}

module.exports = { escalateTiers };
