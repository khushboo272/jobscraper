const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tests for fallback selector sets and source failover.
 *
 * Per PRD §5.1:
 * - Markup drift: selector returns 0 matches where >0 expected → fall back to secondary selector set
 * - If both fail, alert + quarantine job, don't silently drop
 * - Secondary source failover: if source A fails, pipeline fails over to source B
 */
describe('Selector Fallback', () => {
  it('exports trySelectorSets() function', () => {
    const { trySelectorSets } = require('./selectorFallback.js');
    assert.equal(typeof trySelectorSets, 'function');
  });

  it('returns results from primary selectors when they match', () => {
    const { trySelectorSets } = require('./selectorFallback.js');
    const html = '<div class="job-card"><h2 class="title">Dev</h2></div>';
    const selectorSets = [
      { card: '.job-card', title: '.title' },
      { card: '.listing', title: '.heading' },
    ];

    const result = trySelectorSets(html, selectorSets);
    assert.equal(result.matched, true);
    assert.equal(result.selectorSetIndex, 0);
    assert.ok(result.jobs.length > 0);
  });

  it('falls back to secondary selectors when primary returns 0 matches', () => {
    const { trySelectorSets } = require('./selectorFallback.js');
    const html = '<div class="listing"><h2 class="heading">Dev</h2></div>';
    const selectorSets = [
      { card: '.job-card', title: '.title' },
      { card: '.listing', title: '.heading' },
    ];

    const result = trySelectorSets(html, selectorSets);
    assert.equal(result.matched, true);
    assert.equal(result.selectorSetIndex, 1);
    assert.ok(result.jobs.length > 0);
  });

  it('returns quarantine status when all selector sets fail', () => {
    const { trySelectorSets } = require('./selectorFallback.js');
    const html = '<div class="unknown"><p>Nothing here</p></div>';
    const selectorSets = [
      { card: '.job-card', title: '.title' },
      { card: '.listing', title: '.heading' },
    ];

    const result = trySelectorSets(html, selectorSets);
    assert.equal(result.matched, false);
    assert.equal(result.quarantined, true);
    assert.equal(result.jobs.length, 0);
  });
});

describe('Source Failover', () => {
  it('exports failoverSources() function', () => {
    const { failoverSources } = require('./selectorFallback.js');
    assert.equal(typeof failoverSources, 'function');
  });

  it('returns jobs from primary source when available', async () => {
    const { failoverSources } = require('./selectorFallback.js');
    const sources = [
      { name: 'primary', fn: async () => [{ title: 'From primary' }] },
      { name: 'secondary', fn: async () => [{ title: 'From secondary' }] },
    ];

    const result = await failoverSources(sources);
    assert.equal(result.source, 'primary');
    assert.equal(result.jobs[0].title, 'From primary');
  });

  it('fails over to secondary source when primary fails', async () => {
    const { failoverSources } = require('./selectorFallback.js');
    const sources = [
      { name: 'primary', fn: async () => { throw new Error('down'); } },
      { name: 'secondary', fn: async () => [{ title: 'From secondary' }] },
    ];

    const result = await failoverSources(sources);
    assert.equal(result.source, 'secondary');
    assert.equal(result.jobs[0].title, 'From secondary');
  });

  it('fails over when primary returns empty', async () => {
    const { failoverSources } = require('./selectorFallback.js');
    const sources = [
      { name: 'primary', fn: async () => [] },
      { name: 'secondary', fn: async () => [{ title: 'Backup' }] },
    ];

    const result = await failoverSources(sources);
    assert.equal(result.source, 'secondary');
  });

  it('returns empty when all sources fail', async () => {
    const { failoverSources } = require('./selectorFallback.js');
    const sources = [
      { name: 'primary', fn: async () => { throw new Error('fail'); } },
      { name: 'secondary', fn: async () => [] },
    ];

    const result = await failoverSources(sources);
    assert.equal(result.jobs.length, 0);
  });
});
