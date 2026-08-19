const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tests for ingestion strategies:
 * - StaticFetchStrategy (Tier 1): axios + cheerio HTML parsing
 * - BrowserFetchStrategy (Tier 2): Playwright-based (stubbed for unit tests)
 * - TierEscalation: auto-escalate from Tier 0 → 1 → 2 on failure
 */

describe('StaticFetchStrategy', () => {
  it('exports a class with a fetch() method', () => {
    const { StaticFetchStrategy } = require('./staticFetchStrategy.js');
    const strategy = new StaticFetchStrategy();
    assert.equal(typeof strategy.fetch, 'function');
  });

  it('parses HTML and extracts job cards using provided selectors', async () => {
    const { StaticFetchStrategy } = require('./staticFetchStrategy.js');
    const strategy = new StaticFetchStrategy();

    const mockHtml = `
      <html><body>
        <div class="job-card">
          <h2 class="job-title">Node Dev</h2>
          <p class="job-company">TestCo</p>
          <p class="job-location">Remote</p>
          <p class="job-salary">$100k</p>
          <div class="job-skills"><span>Node.js</span><span>Express</span></div>
        </div>
        <div class="job-card">
          <h2 class="job-title">React Dev</h2>
          <p class="job-company">UICo</p>
          <p class="job-location">NYC</p>
          <p class="job-salary">$120k</p>
          <div class="job-skills"><span>React</span></div>
        </div>
      </body></html>
    `;

    const selectors = {
      card: '.job-card',
      title: '.job-title',
      company: '.job-company',
      location: '.job-location',
      salary: '.job-salary',
      skills: '.job-skills span',
    };

    const jobs = strategy.parseHtml(mockHtml, selectors);
    assert.equal(jobs.length, 2);
    assert.equal(jobs[0].title, 'Node Dev');
    assert.equal(jobs[0].company, 'TestCo');
    assert.equal(jobs[0].location, 'Remote');
    assert.equal(jobs[0].salary, '$100k');
    assert.deepEqual(jobs[0].skills, ['Node.js', 'Express']);
    assert.equal(jobs[1].title, 'React Dev');
  });

  it('returns empty array when no cards match selectors', () => {
    const { StaticFetchStrategy } = require('./staticFetchStrategy.js');
    const strategy = new StaticFetchStrategy();

    const html = '<html><body><p>No jobs here</p></body></html>';
    const selectors = { card: '.job-card', title: '.title', company: '.co', location: '.loc', salary: '.sal', skills: '.sk span' };
    const jobs = strategy.parseHtml(html, selectors);
    assert.equal(jobs.length, 0);
  });

  it('fetch() makes an HTTP request with realistic headers', async () => {
    const { StaticFetchStrategy } = require('./staticFetchStrategy.js');
    const strategy = new StaticFetchStrategy();

    // Provide a mock HTTP function to verify headers
    let capturedHeaders = null;
    const mockHttpFn = async (url, options) => {
      capturedHeaders = options.headers;
      return '<html><body></body></html>';
    };

    await strategy.fetch('http://example.com/jobs', { httpFn: mockHttpFn });
    assert.ok(capturedHeaders, 'Should have made a request');
    assert.ok(capturedHeaders['User-Agent'], 'Should include User-Agent');
    assert.ok(capturedHeaders['Accept-Language'], 'Should include Accept-Language');
  });
});

describe('BrowserFetchStrategy', () => {
  it('exports a class with a fetch() method', () => {
    const { BrowserFetchStrategy } = require('./browserFetchStrategy.js');
    const strategy = new BrowserFetchStrategy();
    assert.equal(typeof strategy.fetch, 'function');
  });

  it('fetch() accepts a URL and returns HTML string', async () => {
    const { BrowserFetchStrategy } = require('./browserFetchStrategy.js');
    const strategy = new BrowserFetchStrategy();

    // Stub: provide a mock browser function to avoid needing real Playwright in unit tests
    const mockBrowserFn = async (url) => {
      return '<html><body><div class="job-card">Mocked</div></body></html>';
    };

    const html = await strategy.fetch('http://example.com/jobs', { browserFn: mockBrowserFn });
    assert.ok(html.includes('<html'));
    assert.ok(html.includes('job-card'));
  });
});

describe('TierEscalation', () => {
  it('exports a function that tries tiers in order', () => {
    const { escalateTiers } = require('./tierEscalation.js');
    assert.equal(typeof escalateTiers, 'function');
  });

  it('returns result from Tier 0 if it succeeds', async () => {
    const { escalateTiers } = require('./tierEscalation.js');

    const tiers = [
      { name: 'tier0', fn: async () => [{ title: 'From Tier 0' }] },
      { name: 'tier1', fn: async () => [{ title: 'From Tier 1' }] },
    ];

    const result = await escalateTiers(tiers);
    assert.equal(result.tier, 'tier0');
    assert.equal(result.jobs[0].title, 'From Tier 0');
  });

  it('escalates to next tier when current tier returns empty', async () => {
    const { escalateTiers } = require('./tierEscalation.js');

    const tiers = [
      { name: 'tier0', fn: async () => [] },
      { name: 'tier1', fn: async () => [{ title: 'From Tier 1' }] },
    ];

    const result = await escalateTiers(tiers);
    assert.equal(result.tier, 'tier1');
    assert.equal(result.jobs[0].title, 'From Tier 1');
  });

  it('escalates to next tier when current tier throws an error', async () => {
    const { escalateTiers } = require('./tierEscalation.js');

    const tiers = [
      { name: 'tier0', fn: async () => { throw new Error('API down'); } },
      { name: 'tier1', fn: async () => [{ title: 'Fallback' }] },
    ];

    const result = await escalateTiers(tiers);
    assert.equal(result.tier, 'tier1');
    assert.equal(result.jobs[0].title, 'Fallback');
  });

  it('returns empty result with last tier name if all tiers fail', async () => {
    const { escalateTiers } = require('./tierEscalation.js');

    const tiers = [
      { name: 'tier0', fn: async () => { throw new Error('fail'); } },
      { name: 'tier1', fn: async () => [] },
    ];

    const result = await escalateTiers(tiers);
    assert.equal(result.tier, 'tier1');
    assert.equal(result.jobs.length, 0);
  });
});
