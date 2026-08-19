const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const wellfound = require('./wellfound.js');

describe('Wellfound Source Adapter', () => {
  describe('metadata', () => {
    it('exports SOURCE_NAME constant', () => {
      assert.equal(wellfound.SOURCE_NAME, 'wellfound');
    });

    it('exports TIER constant set to 1 (static source)', () => {
      assert.equal(wellfound.TIER, 1);
    });
  });

  describe('fetchJobs()', () => {
    it('exports a fetchJobs function', () => {
      assert.equal(typeof wellfound.fetchJobs, 'function');
    });

    it('returns an empty array on error', async () => {
      const mockFetchFn = async () => { throw new Error('Network error'); };
      const jobs = await wellfound.fetchJobs({ mockFetchFn });
      assert.deepEqual(jobs, []);
    });

    it('parses mock Wellfound HTML and normalizes data', async () => {
      const mockHtml = `
        <html>
          <body>
            <div data-test="StartupResult">
              <a data-test="StartupName" href="https://wellfound.com/company/tech-startup">Tech Startup</a>
              <div class="styles_job__container">
                <a class="styles_job__title" href="https://wellfound.com/job/111">Senior Engineer</a>
                <span class="styles_location">Remote</span>
              </div>
            </div>
            <div data-test="StartupResult">
              <a data-test="StartupName" href="https://wellfound.com/company/ai-innovators">AI Innovators</a>
              <div class="styles_job__container">
                <a class="styles_job__title" href="https://wellfound.com/job/222">ML Scientist</a>
                <span class="styles_location">San Francisco, CA</span>
              </div>
            </div>
          </body>
        </html>
      `;

      const mockFetchFn = async () => mockHtml;
      
      const jobs = await wellfound.fetchJobs({ mockFetchFn });
      assert.equal(jobs.length, 2);

      const job1 = jobs[0];
      assert.equal(job1.title, 'Senior Engineer');
      assert.equal(job1.company, 'Tech Startup');
      assert.equal(job1.location, 'Remote');
      assert.equal(job1.isRemote, true);
      assert.equal(job1.source, 'wellfound');
      assert.equal(job1.url, 'https://wellfound.com/job/111');

      const job2 = jobs[1];
      assert.equal(job2.title, 'ML Scientist');
      assert.equal(job2.company, 'AI Innovators');
      assert.equal(job2.location, 'San Francisco, CA');
      assert.equal(job2.isRemote, false);
    });
  });
});
