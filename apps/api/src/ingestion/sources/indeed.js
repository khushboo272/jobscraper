const crypto = require('node:crypto');
const { StaticFetchStrategy } = require('../strategies/staticFetchStrategy.js');

const SOURCE_NAME = 'indeed';
const TIER = 1;
const SEARCH_URL = 'https://www.indeed.com/jobs';

function generateJobId(sourceId, url) {
  const input = `${SOURCE_NAME}::${sourceId}::${url}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function parseSalary(salaryStr) {
  if (!salaryStr) return { min: null, max: null };
  const numbers = salaryStr.replace(/,/g, '').match(/\d+(\.\d+)?/g);
  if (!numbers) return { min: null, max: null };
  if (numbers.length === 1) {
    return { min: parseInt(numbers[0], 10), max: null };
  }
  return { min: parseInt(numbers[0], 10), max: parseInt(numbers[1], 10) };
}

function normalizeJob(rawJob) {
  const { min, max } = parseSalary(rawJob.salary);
  const isRemote = rawJob.location && rawJob.location.toLowerCase().includes('remote');
  
  // Try to generate a stable ID, otherwise random
  const jobIdStr = rawJob.title + rawJob.company + rawJob.location;
  
  return {
    id: generateJobId(jobIdStr, rawJob.url || ''),
    title: rawJob.title || '',
    company: rawJob.company || '',
    location: rawJob.location || '',
    isRemote: !!isRemote,
    salaryMin: min,
    salaryMax: max,
    currency: 'USD',
    description: rawJob.description || '',
    skills: rawJob.skills || [],
    url: rawJob.url || '',
    postedAt: null, // Hard to extract reliably without full job page
    scrapedAt: new Date().toISOString(),
    source: SOURCE_NAME,
    tier: TIER,
    raw: rawJob,
  };
}

/**
 * Fetch jobs from Indeed public search.
 */
async function fetchJobs(options = {}) {
  try {
    const strategy = new StaticFetchStrategy();
    
    // Default query parameters
    const query = options.query || 'software developer';
    const location = options.location || 'remote';
    const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;
    
    // Fetch HTML
    const html = await strategy.fetch(url, { httpFn: options.mockFetchFn });
    
    // Parse job cards
    const rawJobs = strategy.parseHtml(html, {
      card: '.job_seen_beacon',
      title: '.jobTitle span',
      company: '.companyName',
      location: '.companyLocation',
      salary: '.salary-snippet',
      skills: '.skill-tag' // Mock selector, Indeed doesn't show skills consistently on cards
    });
    
    return rawJobs.map(normalizeJob);
  } catch (error) {
    return [];
  }
}

module.exports = {
  SOURCE_NAME,
  TIER,
  fetchJobs,
};
