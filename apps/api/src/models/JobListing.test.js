const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tests for Mongoose Job Listing model.
 *
 * Per PRD §5.2: store both `normalized` fields (title, company, location, url, postedAt)
 * and a `raw` blob + `sourceVersion` tag.
 *
 * These tests validate the schema definition without requiring a running MongoDB instance.
 */
describe('Job Listing Model', () => {
  it('exports a Mongoose model', () => {
    const { JobListing } = require('./JobListing.js');
    assert.ok(JobListing);
    assert.equal(JobListing.modelName, 'JobListing');
  });

  it('schema has all required normalized fields', () => {
    const { JobListing } = require('./JobListing.js');
    const schemaPaths = JobListing.schema.paths;

    assert.ok(schemaPaths.title, 'Must have title');
    assert.ok(schemaPaths.company, 'Must have company');
    assert.ok(schemaPaths.location, 'Must have location');
    assert.ok(schemaPaths.url, 'Must have url');
  });

  it('schema has raw blob and sourceVersion fields', () => {
    const { JobListing } = require('./JobListing.js');
    const schemaPaths = JobListing.schema.paths;

    assert.ok(schemaPaths.raw, 'Must have raw blob');
    assert.ok(schemaPaths.sourceVersion, 'Must have sourceVersion');
  });

  it('schema has optional fields (salary, skills, etc.)', () => {
    const { JobListing } = require('./JobListing.js');
    const schemaPaths = JobListing.schema.paths;

    assert.ok(schemaPaths.salaryMin, 'Must have salaryMin');
    assert.ok(schemaPaths.salaryMax, 'Must have salaryMax');
    assert.ok(schemaPaths.skills, 'Must have skills');
    assert.ok(schemaPaths.description, 'Must have description');
    assert.ok(schemaPaths.source, 'Must have source');
    assert.ok(schemaPaths.postedAt, 'Must have postedAt');
    assert.ok(schemaPaths.scrapedAt, 'Must have scrapedAt');
  });

  it('validates a complete document without errors', () => {
    const { JobListing } = require('./JobListing.js');
    const doc = new JobListing({
      title: 'Node Dev',
      company: 'TestCo',
      location: 'Remote',
      url: 'https://example.com/jobs/1',
      source: 'remoteok',
      sourceVersion: 'v1',
      raw: { original: 'data' },
    });

    const err = doc.validateSync();
    assert.equal(err, undefined, 'Valid document should not have errors');
  });

  it('fails validation when required fields are missing', () => {
    const { JobListing } = require('./JobListing.js');
    const doc = new JobListing({});

    const err = doc.validateSync();
    assert.ok(err, 'Missing required fields should cause validation error');
    assert.ok(err.errors.title);
    assert.ok(err.errors.company);
    assert.ok(err.errors.url);
  });
});

describe('Normalize Pipeline', () => {
  it('exports normalizeJobData() function', () => {
    const { normalizeJobData } = require('../ingestion/normalize.js');
    assert.equal(typeof normalizeJobData, 'function');
  });

  it('normalizes raw scraped data into standard schema', () => {
    const { normalizeJobData } = require('../ingestion/normalize.js');

    const raw = {
      position: 'React Developer',
      company_name: 'UICorp',
      loc: 'NYC',
      link: 'https://example.com/jobs/42',
      posted: '2026-08-01',
      tags: ['react', 'javascript'],
      salary_min: 100000,
      salary_max: 150000,
    };

    const fieldMap = {
      title: 'position',
      company: 'company_name',
      location: 'loc',
      url: 'link',
      postedAt: 'posted',
      skills: 'tags',
      salaryMin: 'salary_min',
      salaryMax: 'salary_max',
    };

    const normalized = normalizeJobData(raw, fieldMap);
    assert.equal(normalized.title, 'React Developer');
    assert.equal(normalized.company, 'UICorp');
    assert.equal(normalized.location, 'NYC');
    assert.equal(normalized.url, 'https://example.com/jobs/42');
    assert.deepEqual(normalized.skills, ['react', 'javascript']);
    assert.ok(normalized.raw, 'Must preserve raw data');
  });

  it('handles missing optional fields gracefully', () => {
    const { normalizeJobData } = require('../ingestion/normalize.js');

    const raw = {
      position: 'Dev',
      company_name: 'Co',
      loc: 'Remote',
      link: 'https://example.com/1',
    };

    const fieldMap = {
      title: 'position',
      company: 'company_name',
      location: 'loc',
      url: 'link',
    };

    const normalized = normalizeJobData(raw, fieldMap);
    assert.equal(normalized.title, 'Dev');
    assert.equal(normalized.salaryMin, null);
    assert.deepEqual(normalized.skills, []);
  });
});
