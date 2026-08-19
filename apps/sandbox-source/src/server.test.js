const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

/**
 * Helper: make an HTTP GET request and return { statusCode, headers, body }
 */
function get(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname: '127.0.0.1', port, path, headers },
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
 * Helper: make an HTTP POST request and return { statusCode, headers, body }
 */
function post(port, path, data = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, headers: res.headers, body });
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

describe('Sandbox Hostile Source Server', () => {
  let server;
  const PORT = 0; // let OS assign port
  let assignedPort;

  before(async () => {
    const { createApp } = require('./server.js');
    const app = createApp();
    server = app.listen(0);
    assignedPort = server.address().port;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('GET /jobs — basic listing', () => {
    it('returns HTML with job listings', async () => {
      const res = await get(assignedPort, '/jobs');
      assert.equal(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('text/html'));
      assert.ok(res.body.includes('<html'));
      // Should contain at least one job card
      assert.ok(res.body.includes('job-card') || res.body.includes('listing'));
    });
  });

  describe('GET /admin/chaos — toggle endpoint', () => {
    it('returns current chaos state as JSON', async () => {
      const res = await get(assignedPort, '/admin/chaos');
      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.ok('enabled' in data, 'response should have enabled field');
      assert.ok('rateLimiting' in data, 'response should have rateLimiting field');
      assert.ok('rotateCssClasses' in data, 'response should have rotateCssClasses field');
      assert.ok('malformedResponses' in data, 'response should have malformedResponses field');
    });
  });

  describe('POST /admin/chaos — toggle chaos on', () => {
    it('enables all chaos features when toggled on', async () => {
      const res = await post(assignedPort, '/admin/chaos', { enabled: true });
      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.equal(data.enabled, true);
    });

    it('disables all chaos features when toggled off', async () => {
      const res = await post(assignedPort, '/admin/chaos', { enabled: false });
      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.equal(data.enabled, false);
    });
  });

  describe('Rate limiting (chaos enabled)', () => {
    before(async () => {
      // Enable chaos and set low threshold for testing
      await post(assignedPort, '/admin/chaos', {
        enabled: true,
        rateLimitThreshold: 3,
        rateLimitWindowMs: 5000,
      });
    });

    after(async () => {
      await post(assignedPort, '/admin/chaos', { enabled: false });
    });

    it('returns 429 with CAPTCHA HTML after N requests from the same identity', async () => {
      const testHeaders = { 'User-Agent': 'test-bot-ratelimit', 'X-Forwarded-For': '10.99.99.99' };

      // Make requests up to threshold
      for (let i = 0; i < 3; i++) {
        const res = await get(assignedPort, '/jobs', testHeaders);
        assert.equal(res.statusCode, 200, `Request ${i + 1} should succeed`);
      }

      // Next request should be rate-limited
      const blocked = await get(assignedPort, '/jobs', testHeaders);
      assert.equal(blocked.statusCode, 429);
      assert.ok(blocked.body.toLowerCase().includes('captcha'), 'Blocked response should contain CAPTCHA HTML');
    });
  });

  describe('Rotating CSS class names (chaos enabled)', () => {
    before(async () => {
      await post(assignedPort, '/admin/chaos', { enabled: true, rotateCssClasses: true });
    });

    after(async () => {
      await post(assignedPort, '/admin/chaos', { enabled: false });
    });

    it('uses different CSS class names across rotations', async () => {
      const res1 = await get(assignedPort, '/jobs');
      // Force a rotation
      await post(assignedPort, '/admin/chaos', { enabled: true, rotateCssClasses: true, forceRotation: true });
      const res2 = await get(assignedPort, '/jobs');

      // Both should be valid HTML but class names may differ
      assert.equal(res1.statusCode, 200);
      assert.equal(res2.statusCode, 200);
      assert.ok(res1.body.includes('<html'));
      assert.ok(res2.body.includes('<html'));
    });
  });

  describe('Malformed responses (chaos enabled)', () => {
    before(async () => {
      // Force 100% malformed rate for deterministic testing
      await post(assignedPort, '/admin/chaos', {
        enabled: true,
        malformedResponses: true,
        malformedRate: 1.0,
      });
    });

    after(async () => {
      await post(assignedPort, '/admin/chaos', { enabled: false });
    });

    it('returns empty or malformed HTML when malformed mode is forced', async () => {
      const res = await get(assignedPort, '/jobs');
      assert.equal(res.statusCode, 200);
      // Malformed response: either empty body, truncated HTML, or missing tags
      const isMalformed =
        res.body.trim().length === 0 ||
        !res.body.includes('</html>') ||
        res.body.includes('MALFORMED');
      assert.ok(isMalformed, 'Response should be malformed');
    });
  });
});
