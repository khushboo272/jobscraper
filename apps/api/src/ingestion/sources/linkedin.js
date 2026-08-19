const crypto = require('node:crypto');
const { StaticFetchStrategy } = require('../strategies/staticFetchStrategy.js');

const SOURCE_NAME = 'linkedin';
const TIER = 1;
const SEARCH_URL = 'https://www.linkedin.com/jobs/search/';

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
 * Fetch jobs from LinkedIn public search.
 */
async function fetchJobs(options = {}) {
  try {
    const strategy = new StaticFetchStrategy();
    
    // Default query parameters
    const query = options.query || 'developer';
    const location = options.location || 'remote';
    const url = `${SEARCH_URL}?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
    
    // Fetch HTML
    const html = await strategy.fetch(url, { httpFn: options.mockFetchFn });
    
    // Parse job cards
    const rawJobs = strategy.parseHtml(html, {
      card: '.base-card',
      title: '.base-search-card__title',
      company: '.base-search-card__subtitle',
      location: '.job-search-card__location',
      salary: '.salary-mock', // Public pages rarely show salary on the search list
      skills: '.skill-mock' 
    });
    
    // Some selectors might be slightly different or missing in our simple parser,
    // like the URL inside the `a` tag. Our strategy.parseHtml only grabs text content currently.
    // For URL we need to extract from href if not supported by parseHtml,
    // Let's manually parse URL for LinkedIn here since StaticFetchStrategy
    // doesn't support attribute extraction in its generic parseHtml method yet.
    
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    const enrichedRawJobs = [];

    $('.base-card').each((index, element) => {
      const card = $(element);
      const title = card.find('.base-search-card__title').text().trim();
      const company = card.find('.base-search-card__subtitle').text().trim();
      const jobLocation = card.find('.job-search-card__location').text().trim();
      const jobUrl = card.find('.base-card__full-link').attr('href') || '';
      
      enrichedRawJobs.push({
        title,
        company,
        location: jobLocation,
        url: jobUrl
      });
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
