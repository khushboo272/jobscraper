const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const indeed = require('./indeed.js');

describe('Indeed Source Adapter', () => {
  describe('metadata', () => {
    it('exports SOURCE_NAME constant', () => {
      assert.equal(indeed.SOURCE_NAME, 'indeed');
    });

    it('exports TIER constant set to 1 (static source)', () => {
      assert.equal(indeed.TIER, 1);
    });
  });

  describe('fetchJobs()', () => {
    it('exports a fetchJobs function', () => {
      assert.equal(typeof indeed.fetchJobs, 'function');
    });

    it('returns an empty array on error', async () => {
      const mockFetchFn = async () => { throw new Error('Network error'); };
      const jobs = await indeed.fetchJobs({ mockFetchFn });
      assert.deepEqual(jobs, []);
    });

    it('parses mock Indeed HTML and normalizes data', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="job_seen_beacon">
              <h2 class="jobTitle"><span>Software Engineer</span></h2>
              <span class="companyName">Tech Corp</span>
              <div class="companyLocation">Remote</div>
              <div class="salary-snippet"><span>$100,000 - $150,000 a year</span></div>
            </div>
            <div class="job_seen_beacon">
              <h2 class="jobTitle"><span>Backend Developer</span></h2>
              <span class="companyName">Another Corp</span>
              <div class="companyLocation">New York, NY</div>
            </div>
          </body>
        </html>
      `;

      const mockFetchFn = async () => mockHtml;
      
      const jobs = await indeed.fetchJobs({ mockFetchFn });
      assert.equal(jobs.length, 2);

      const job1 = jobs[0];
      assert.equal(job1.title, 'Software Engineer');
      assert.equal(job1.company, 'Tech Corp');
      assert.equal(job1.location, 'Remote');
      assert.equal(job1.isRemote, true);
      assert.equal(job1.source, 'indeed');
      assert.equal(job1.tier, 1);
      assert.equal(job1.salaryMin, 100000);
      assert.equal(job1.salaryMax, 150000);

      const job2 = jobs[1];
      assert.equal(job2.title, 'Backend Developer');
      assert.equal(job2.company, 'Another Corp');
      assert.equal(job2.location, 'New York, NY');
      assert.equal(job2.isRemote, false);
      assert.equal(job2.salaryMin, null);
    });
  });
});
