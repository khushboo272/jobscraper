const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const sourceRegistry = require('./sourceRegistry.js');

describe('Source Registry', () => {
  it('exports getAllSources function', () => {
    assert.equal(typeof sourceRegistry.getAllSources, 'function');
  });

  it('exports getSource function', () => {
    assert.equal(typeof sourceRegistry.getSource, 'function');
  });

  it('getAllSources returns an array of adapters', () => {
    const sources = sourceRegistry.getAllSources();
    assert.ok(Array.isArray(sources));
    assert.ok(sources.length >= 5); // remoteok + indeed + linkedin + naukri + wellfound
    
    // Check if it has expected structure
    sources.forEach(source => {
      assert.ok(source.SOURCE_NAME);
      assert.ok(typeof source.TIER === 'number');
      assert.ok(typeof source.fetchJobs === 'function');
    });
  });

  it('getSource returns a specific adapter', () => {
    const adapter = sourceRegistry.getSource('linkedin');
    assert.ok(adapter);
    assert.equal(adapter.SOURCE_NAME, 'linkedin');
  });

  it('getSource returns null for unknown source', () => {
    const adapter = sourceRegistry.getSource('unknown_source');
    assert.equal(adapter, null);
  });
});
