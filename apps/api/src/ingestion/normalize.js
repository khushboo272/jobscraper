/**
 * Normalization Pipeline.
 *
 * Per PRD §5.2: transform raw scraped data into the standard normalized schema.
 * Each source may use different field names; the fieldMap bridges them.
 *
 * Also preserves the raw data for replay/re-normalization.
 */

/**
 * Normalize raw scraped data into the standard job listing schema.
 *
 * @param {object} raw - The raw data object from a scraper
 * @param {object} fieldMap - Maps standard field names to raw field names
 *   e.g. { title: 'position', company: 'company_name', ... }
 * @returns {object} Normalized job object with raw data preserved
 */
function normalizeJobData(raw, fieldMap) {
  return {
    title: raw[fieldMap.title] || '',
    company: raw[fieldMap.company] || '',
    location: raw[fieldMap.location] || '',
    url: raw[fieldMap.url] || '',
    isRemote: raw[fieldMap.isRemote] || false,
    salaryMin: raw[fieldMap.salaryMin] || null,
    salaryMax: raw[fieldMap.salaryMax] || null,
    currency: raw[fieldMap.currency] || null,
    description: raw[fieldMap.description] || '',
    skills: raw[fieldMap.skills] || [],
    postedAt: raw[fieldMap.postedAt] || null,
    scrapedAt: new Date().toISOString(),
    source: raw[fieldMap.source] || '',
    raw,
  };
}

module.exports = { normalizeJobData };
