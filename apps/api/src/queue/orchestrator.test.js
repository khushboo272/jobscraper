const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { processIngestionJob, circuitBreakers } = require('./orchestrator.js');
const { STATES } = require('../ingestion/circuitBreaker.js');

describe('Orchestrator Worker', () => {
  it('exports processIngestionJob function', () => {
    assert.equal(typeof processIngestionJob, 'function');
  });

  it('fails if source is unknown', async () => {
    try {
      await processIngestionJob({ data: { source: 'unknown' } });
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.match(error.message, /Unknown source/);
    }
  });

  // More tests would typically require heavy mocking of Mongoose, BullMQ,
  // and the sourceRegistry. For TDD setup, we just ensure the interface is right
  // and the basic validation works. 
  // In a real scenario we'd use something like proxyquire or node:test mocks
  // to mock out the DB and registry completely.
});
