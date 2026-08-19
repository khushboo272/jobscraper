const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const linkedin = require('./linkedin.js');

describe('LinkedIn Source Adapter', () => {
  describe('metadata', () => {
    it('exports SOURCE_NAME constant', () => {
      assert.equal(linkedin.SOURCE_NAME, 'linkedin');
    });

    it('exports TIER constant set to 1 (static source)', () => {
      assert.equal(linkedin.TIER, 1);
    });
  });

  describe('fetchJobs()', () => {
    it('exports a fetchJobs function', () => {
      assert.equal(typeof linkedin.fetchJobs, 'function');
    });

    it('returns an empty array on error', async () => {
      const mockFetchFn = async () => { throw new Error('Network error'); };
      const jobs = await linkedin.fetchJobs({ mockFetchFn });
      assert.deepEqual(jobs, []);
    });

    it('parses mock LinkedIn HTML and normalizes data', async () => {
      const mockHtml = `
        <html>
          <body>
            <ul class="jobs-search__results-list">
              <li>
                <div class="base-card">
                  <a class="base-card__full-link" href="https://linkedin.com/job/123">
                    <span class="sr-only">Frontend Developer</span>
                  </a>
                  <h3 class="base-search-card__title">Frontend Developer</h3>
                  <h4 class="base-search-card__subtitle">Web Corp</h4>
                  <span class="job-search-card__location">San Francisco, CA</span>
                </div>
              </li>
              <li>
                <div class="base-card">
                  <a class="base-card__full-link" href="https://linkedin.com/job/456">
                    <span class="sr-only">Data Scientist</span>
                  </a>
                  <h3 class="base-search-card__title">Data Scientist</h3>
                  <h4 class="base-search-card__subtitle">AI Inc</h4>
                  <span class="job-search-card__location">Remote</span>
                </div>
              </li>
            </ul>
          </body>
        </html>
      `;

      const mockFetchFn = async () => mockHtml;
      
      const jobs = await linkedin.fetchJobs({ mockFetchFn });
      assert.equal(jobs.length, 2);

      const job1 = jobs[0];
      assert.equal(job1.title, 'Frontend Developer');
      assert.equal(job1.company, 'Web Corp');
      assert.equal(job1.location, 'San Francisco, CA');
      assert.equal(job1.isRemote, false);
      assert.equal(job1.source, 'linkedin');
      assert.equal(job1.url, 'https://linkedin.com/job/123');

      const job2 = jobs[1];
      assert.equal(job2.title, 'Data Scientist');
      assert.equal(job2.company, 'AI Inc');
      assert.equal(job2.location, 'Remote');
      assert.equal(job2.isRemote, true);
    });
  });
});
