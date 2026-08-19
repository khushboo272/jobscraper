const crypto = require('node:crypto');
const { StaticFetchStrategy } = require('../strategies/staticFetchStrategy.js');

const SOURCE_NAME = 'naukri';
const TIER = 1;
const SEARCH_URL = 'https://www.naukri.com/';

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
    currency: 'INR',
    description: '',
    skills: rawJob.skills || [],
    url: rawJob.url || '',
    postedAt: null,
    scrapedAt: new Date().toISOString(),
    source: SOURCE_NAME,
    tier: TIER,
    raw: rawJob,
  };
}

/**
 * Fetch jobs from Naukri public search.
 */
async function fetchJobs(options = {}) {
  try {
    const strategy = new StaticFetchStrategy();
    
    // Default query parameters
    const query = options.query || 'software-developer';
    const url = `${SEARCH_URL}${encodeURIComponent(query)}-jobs`;
    
    // Fetch HTML
    const html = await strategy.fetch(url, { httpFn: options.mockFetchFn });
    
    // Parse job cards manually because of URL and skills array
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    const enrichedRawJobs = [];

    $('.srp-jobtuple-wrapper').each((index, element) => {
      const card = $(element);
      const title = card.find('.title').text().trim();
      const company = card.find('.comp-name').text().trim();
      const location = card.find('.loc-wrap .loc').text().trim();
      const jobUrl = card.find('.title').attr('href') || '';
      
      const skills = [];
      card.find('.tags-gt .tag-li').each((i, el) => {
        const skill = $(el).text().trim();
        if (skill) {
          skills.push(skill);
        }
      });
      
      enrichedRawJobs.push({
        title,
        company,
        location,
        url: jobUrl,
        skills
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
