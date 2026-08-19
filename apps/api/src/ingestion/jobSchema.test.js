const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tests for Zod schema validation on parsed job data.
 * Per PRD §5.1: Schema validation on parsed output.
 */
describe('Job Schema Validation', () => {
  it('exports validateJob() function', () => {
    const { validateJob } = require('./jobSchema.js');
    assert.equal(typeof validateJob, 'function');
  });

  it('accepts a valid job object', () => {
    const { validateJob } = require('./jobSchema.js');
    const result = validateJob({
      title: 'Node Developer',
      company: 'TestCo',
      location: 'Remote',
      url: 'https://example.com/jobs/1',
    });
    assert.equal(result.success, true);
    assert.ok(result.data);
  });

  it('rejects a job missing required fields', () => {
    const { validateJob } = require('./jobSchema.js');
    const result = validateJob({ title: 'Missing fields' });
    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
  });

  it('allows optional fields (salary, skills, description)', () => {
    const { validateJob } = require('./jobSchema.js');
    const result = validateJob({
      title: 'Dev',
      company: 'Co',
      location: 'NYC',
      url: 'https://example.com/jobs/2',
      salaryMin: 100000,
      salaryMax: 150000,
      skills: ['React', 'Node.js'],
      description: 'A great role',
    });
    assert.equal(result.success, true);
    assert.equal(result.data.salaryMin, 100000);
    assert.deepEqual(result.data.skills, ['React', 'Node.js']);
  });

  it('rejects invalid types (salary as string)', () => {
    const { validateJob } = require('./jobSchema.js');
    const result = validateJob({
      title: 'Dev',
      company: 'Co',
      location: 'NYC',
      url: 'https://example.com/jobs/3',
      salaryMin: 'not a number',
    });
    assert.equal(result.success, false);
  });
});
