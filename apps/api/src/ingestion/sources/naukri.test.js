const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const naukri = require('./naukri.js');

describe('Naukri Source Adapter', () => {
  describe('metadata', () => {
    it('exports SOURCE_NAME constant', () => {
      assert.equal(naukri.SOURCE_NAME, 'naukri');
    });

    it('exports TIER constant set to 1 (static source)', () => {
      assert.equal(naukri.TIER, 1);
    });
  });

  describe('fetchJobs()', () => {
    it('exports a fetchJobs function', () => {
      assert.equal(typeof naukri.fetchJobs, 'function');
    });

    it('returns an empty array on error', async () => {
      const mockFetchFn = async () => { throw new Error('Network error'); };
      const jobs = await naukri.fetchJobs({ mockFetchFn });
      assert.deepEqual(jobs, []);
    });

    it('parses mock Naukri HTML and normalizes data', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="srp-jobtuple-wrapper">
              <a class="title" href="https://naukri.com/job/1">Full Stack Developer</a>
              <a class="comp-name">Tech Mahindra</a>
              <span class="loc-wrap">
                <span class="loc">Pune, Maharashtra</span>
              </span>
              <ul class="tags-gt">
                <li class="tag-li">React</li>
                <li class="tag-li">Node.js</li>
              </ul>
            </div>
            <div class="srp-jobtuple-wrapper">
              <a class="title" href="https://naukri.com/job/2">DevOps Engineer</a>
              <a class="comp-name">TCS</a>
              <span class="loc-wrap">
                <span class="loc">Remote</span>
              </span>
              <ul class="tags-gt">
                <li class="tag-li">AWS</li>
              </ul>
            </div>
          </body>
        </html>
      `;

      const mockFetchFn = async () => mockHtml;
      
      const jobs = await naukri.fetchJobs({ mockFetchFn });
      assert.equal(jobs.length, 2);

      const job1 = jobs[0];
      assert.equal(job1.title, 'Full Stack Developer');
      assert.equal(job1.company, 'Tech Mahindra');
      assert.equal(job1.location, 'Pune, Maharashtra');
      assert.equal(job1.isRemote, false);
      assert.equal(job1.source, 'naukri');
      assert.deepEqual(job1.skills, ['React', 'Node.js']);
      assert.equal(job1.url, 'https://naukri.com/job/1');

      const job2 = jobs[1];
      assert.equal(job2.title, 'DevOps Engineer');
      assert.equal(job2.company, 'TCS');
      assert.equal(job2.location, 'Remote');
      assert.equal(job2.isRemote, true);
      assert.deepEqual(job2.skills, ['AWS']);
    });
  });
});
