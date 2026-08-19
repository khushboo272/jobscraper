const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

/**
 * Helper: make an HTTP GET request and return { statusCode, headers, body }
 */
function get(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname: '127.0.0.1', port, path },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, headers: res.headers, body });
        });
      }
    );
    req.on('error', reject);
  });
}

/**
 * Tests for Express API routes.
 *
 * Per PRD §5.3 & §7:
 * - /status — per-source health (healthy/degraded/down), last successful run, error rate
 * - /listings — normalized job listings
 * - /health — basic health check
 */
describe('API Routes', () => {
  let server;
  let assignedPort;

  before(async () => {
    const { createApp } = require('../server.js');
    const app = createApp();
    server = app.listen(0);
    assignedPort = server.address().port;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await get(assignedPort, '/health');
      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.equal(data.status, 'ok');
    });
  });

  describe('GET /status', () => {
    it('returns 200 with per-source health data and CORS headers', async () => {
      const res = await get(assignedPort, '/status');
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['access-control-allow-origin'], '*');
      const data = JSON.parse(res.body);
      assert.ok(data.sources, 'Should have sources object');
      assert.ok(typeof data.sources === 'object');
    });

    it('each source has health, lastSuccess, and errorRate fields', async () => {
      const res = await get(assignedPort, '/status');
      const data = JSON.parse(res.body);

      for (const [name, source] of Object.entries(data.sources)) {
        assert.ok(['healthy', 'degraded', 'down'].includes(source.health),
          `Source ${name} health should be healthy/degraded/down`);
        assert.ok('lastSuccess' in source, `Source ${name} should have lastSuccess`);
        assert.ok('errorRate' in source, `Source ${name} should have errorRate`);
      }
    });
  });

  describe('GET /listings', () => {
    it('returns 200 with an array of listings', async () => {
      const res = await get(assignedPort, '/listings');
      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.ok(Array.isArray(data.listings), 'Should have listings array');
    });

    it('returns metadata (total count, page info)', async () => {
      const res = await get(assignedPort, '/listings');
      const data = JSON.parse(res.body);
      assert.ok('total' in data, 'Should have total count');
    });
  });
});
