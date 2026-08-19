const axios = require('axios');
const crypto = require('node:crypto');

const SOURCE_NAME = 'remoteok';
const TIER = 0;
const API_URL = 'https://remoteok.com/api';

/**
 * Generate a deterministic ID hash from job fields.
 */
function generateJobId(sourceId, url) {
  const input = `${SOURCE_NAME}::${sourceId}::${url}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/**
 * Normalize a single RemoteOK API job entry into the standard schema.
 */
function normalizeJob(entry) {
  return {
    id: generateJobId(entry.id, entry.url),
    title: entry.position || '',
    company: entry.company || '',
    location: entry.location || 'Remote',
    isRemote: true,
    salaryMin: entry.salary_min || null,
    salaryMax: entry.salary_max || null,
    currency: 'USD',
    description: entry.description || '',
    skills: Array.isArray(entry.tags) ? entry.tags : [],
    url: entry.url || '',
    postedAt: entry.date || null,
    scrapedAt: new Date().toISOString(),
    source: SOURCE_NAME,
    tier: TIER,
    raw: entry,
  };
}

/**
 * Fetch jobs from the RemoteOK public API.
 *
 * Options:
 *   mockData    — provide mock API response data (for testing without network)
 *   mockFetchFn — provide a mock fetch function that throws (for error testing)
 *
 * Returns: Array of normalized job objects, or [] on error.
 */
async function fetchJobs(options = {}) {
  try {
    let data;

    if (options.mockData) {
      data = options.mockData;
    } else if (options.mockFetchFn) {
      data = await options.mockFetchFn();
    } else {
      const response = await axios.get(API_URL, {
        headers: {
          'User-Agent': 'job-ingestion-engine/1.0 (educational project)',
        },
        timeout: 10000,
      });
      data = response.data;
    }

    if (!Array.isArray(data)) {
      return [];
    }

    // Filter out entries without a position field (legal notices, metadata entries)
    const validEntries = data.filter((entry) => entry.position);

    return validEntries.map(normalizeJob);
  } catch (error) {
    // Graceful degradation: return empty array on any error
    return [];
  }
}

module.exports = {
  SOURCE_NAME,
  TIER,
  fetchJobs,
};
