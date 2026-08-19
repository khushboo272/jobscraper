const crypto = require('node:crypto');
const { StaticFetchStrategy } = require('../strategies/staticFetchStrategy.js');

const SOURCE_NAME = 'wellfound';
const TIER = 1;
const SEARCH_URL = 'https://wellfound.com/role/';

function generateJobId(sourceId, url) {
  const input = `${SOURCE_NAME}::${sourceId}::${url}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function normalizeJob(rawJob) {
  const isRemote = rawJob.location && rawJob.location.toLowerCase().includes('remote');
  
  const jobIdStr = rawJob.title + rawJob.company + rawJob.location;
  
  return {
    id: generateJobId(jobIdStr, rawJob.url || ''),
    title: rawJob.title || '',
    company: rawJob.company || '',
    location: rawJob.location || '',
    isRemote: !!isRemote,
    salaryMin: null,
    salaryMax: null,
    currency: 'USD',
    description: '',
    skills: [],
    url: rawJob.url || '',
    postedAt: null,
    scrapedAt: new Date().toISOString(),
    source: SOURCE_NAME,
    tier: TIER,
    raw: rawJob,
  };
}

/**
 * Fetch jobs from Wellfound public search.
 */
async function fetchJobs(options = {}) {
  try {
    const strategy = new StaticFetchStrategy();
    
    // Default query parameters
    const role = options.query || 'software-engineer';
    const url = `${SEARCH_URL}${encodeURIComponent(role)}`;
    
    // Fetch HTML
    const html = await strategy.fetch(url, { httpFn: options.mockFetchFn });
    
    // Parse job cards
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    const enrichedRawJobs = [];

    $('[data-test="StartupResult"]').each((index, element) => {
      const card = $(element);
      const company = card.find('[data-test="StartupName"]').text().trim();
      
      // Wellfound groups jobs under the startup, we extract the first one for simplicity here
      const jobContainer = card.find('.styles_job__container').first();
      const title = jobContainer.find('.styles_job__title').text().trim();
      const location = jobContainer.find('.styles_location').text().trim();
      const jobUrl = jobContainer.find('.styles_job__title').attr('href') || '';
      
      if (title) {
        enrichedRawJobs.push({
          title,
          company,
          location,
          url: jobUrl
        });
      }
    });

    return enrichedRawJobs.map(normalizeJob);
  } catch (error) {
    return [];
  }
}

module.exports = {
  SOURCE_NAME,
  TIER,
  fetchJobs,
};
