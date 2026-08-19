const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tests for the RemoteOK public API source adapter.
 *
 * The adapter should:
 * 1. Fetch job listings from the RemoteOK API
 * 2. Return an array of normalized job objects
 * 3. Handle API errors gracefully
 * 4. Each job must have: id, title, company, location, url, postedAt, raw
 */

describe('RemoteOK Source Adapter', () => {
  let remoteOkAdapter;

  beforeEach(() => {
    // Import fresh each time
    delete require.cache[require.resolve('./remoteok.js')];
    remoteOkAdapter = require('./remoteok.js');
  });

  describe('fetchJobs()', () => {
    it('exports a fetchJobs function', () => {
      assert.equal(typeof remoteOkAdapter.fetchJobs, 'function');
    });

    it('returns an array', async () => {
      // Stub: pass a mock fetch function to avoid hitting the real API in tests
      const mockResponse = [
        { id: 'legal', /* RemoteOK puts a legal notice as first element */ },
        {
          id: '123',
          position: 'Node.js Developer',
          company: 'TestCo',
          location: 'Remote',
          url: 'https://remoteok.com/jobs/123',
          date: '2026-08-01T00:00:00Z',
          tags: ['node', 'javascript'],
          salary_min: 80000,
          salary_max: 120000,
          description: 'A great job',
        },
      ];

      const jobs = await remoteOkAdapter.fetchJobs({ mockData: mockResponse });
      assert.ok(Array.isArray(jobs), 'Should return an array');
    });

    it('normalizes RemoteOK data into standard schema', async () => {
      const mockResponse = [
        { id: 'legal' },
        {
          id: '456',
          position: 'React Engineer',
          company: 'UICorp',
          location: 'Worldwide',
          url: 'https://remoteok.com/jobs/456',
          date: '2026-07-15T12:00:00Z',
          tags: ['react', 'typescript'],
          salary_min: 90000,
          salary_max: 140000,
          description: 'Build beautiful UIs',
        },
      ];

      const jobs = await remoteOkAdapter.fetchJobs({ mockData: mockResponse });
      assert.equal(jobs.length, 1, 'Should skip the legal notice entry');

      const job = jobs[0];
      assert.ok(job.id, 'Job must have an id');
      assert.equal(job.title, 'React Engineer');
      assert.equal(job.company, 'UICorp');
      assert.equal(job.location, 'Worldwide');
      assert.ok(job.url.includes('456'));
      assert.ok(job.postedAt, 'Job must have postedAt');
      assert.ok(job.scrapedAt, 'Job must have scrapedAt');
      assert.ok(job.raw, 'Job must preserve raw data');
      assert.deepEqual(job.skills, ['react', 'typescript']);
      assert.equal(job.salaryMin, 90000);
      assert.equal(job.salaryMax, 140000);
    });

    it('filters out entries without a position field (legal notices, metadata)', async () => {
      const mockResponse = [
        { id: 'legal' },
        { id: 'meta', some_other_field: true },
        {
          id: '789',
          position: 'Backend Dev',
          company: 'ServerCo',
          location: 'Remote',
          url: 'https://remoteok.com/jobs/789',
          date: '2026-08-10T00:00:00Z',
          tags: ['go', 'grpc'],
          description: 'Build microservices',
        },
      ];

      const jobs = await remoteOkAdapter.fetchJobs({ mockData: mockResponse });
      assert.equal(jobs.length, 1);
      assert.equal(jobs[0].title, 'Backend Dev');
    });

    it('handles empty API response gracefully', async () => {
      const jobs = await remoteOkAdapter.fetchJobs({ mockData: [] });
      assert.ok(Array.isArray(jobs));
      assert.equal(jobs.length, 0);
    });

    it('handles API error gracefully and returns empty array', async () => {
      const jobs = await remoteOkAdapter.fetchJobs({
        mockFetchFn: async () => { throw new Error('Network error'); },
      });
      assert.ok(Array.isArray(jobs));
      assert.equal(jobs.length, 0);
    });
  });

  describe('metadata', () => {
    it('exports SOURCE_NAME constant', () => {
      assert.equal(remoteOkAdapter.SOURCE_NAME, 'remoteok');
    });

    it('exports TIER constant set to 0 (API source)', () => {
      assert.equal(remoteOkAdapter.TIER, 0);
    });
  });
});
