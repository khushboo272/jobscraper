const express = require('express');

// ----- Fake job data -----

const FAKE_JOBS = [
  { title: 'Senior Frontend Developer', company: 'TechCorp', location: 'Remote', salary: '$120k-$150k', skills: ['React', 'TypeScript', 'CSS'] },
  { title: 'Backend Engineer', company: 'DataFlow Inc', location: 'Bangalore, India', salary: '₹18L-₹25L', skills: ['Node.js', 'MongoDB', 'Redis'] },
  { title: 'Full Stack Developer', company: 'StartupXYZ', location: 'San Francisco, CA', salary: '$130k-$170k', skills: ['React', 'Express', 'PostgreSQL'] },
  { title: 'DevOps Engineer', company: 'CloudNine', location: 'Remote', salary: '$110k-$140k', skills: ['Docker', 'Kubernetes', 'AWS'] },
  { title: 'ML Engineer', company: 'AI Labs', location: 'London, UK', salary: '£70k-£95k', skills: ['Python', 'TensorFlow', 'PyTorch'] },
  { title: 'Mobile Developer', company: 'AppWorks', location: 'Remote', salary: '$100k-$130k', skills: ['React Native', 'Swift', 'Kotlin'] },
  { title: 'QA Automation Engineer', company: 'TestPro', location: 'New York, NY', salary: '$90k-$115k', skills: ['Selenium', 'Playwright', 'Jest'] },
  { title: 'Data Engineer', company: 'BigData Co', location: 'Berlin, Germany', salary: '€65k-€85k', skills: ['Spark', 'Airflow', 'SQL'] },
];

// ----- CSS class name pools for rotation -----

const CLASS_NAME_POOLS = [
  { card: 'job-card', title: 'job-title', company: 'job-company', location: 'job-location', salary: 'job-salary', skills: 'job-skills' },
  { card: 'listing-item', title: 'listing-heading', company: 'listing-org', location: 'listing-loc', salary: 'listing-pay', skills: 'listing-tags' },
  { card: 'post-entry', title: 'post-name', company: 'post-employer', location: 'post-place', salary: 'post-compensation', skills: 'post-requirements' },
];

// ----- CAPTCHA HTML -----

const CAPTCHA_HTML = `<!DOCTYPE html>
<html>
<head><title>Rate Limited</title></head>
<body>
<h1>Too Many Requests</h1>
<p>Please complete the CAPTCHA below to continue.</p>
<form id="captcha-form">
  <div class="captcha-challenge">
    <img src="/captcha-image.png" alt="CAPTCHA" />
    <input type="text" name="captcha" placeholder="Enter CAPTCHA" />
    <button type="submit">Verify</button>
  </div>
</form>
</body>
</html>`;

// ----- Malformed responses -----

const MALFORMED_RESPONSES = [
  '',
  '<html><head><title>MALFORMED</title></head><body>',
  '{"error": "MALFORMED unexpected JSON instead of HTML"}',
  '<html><body><div>MALFORMED truncated content',
];

/**
 * Build the HTML for the /jobs page using the given CSS class names.
 */
function buildJobsHtml(classNames, jobs) {
  const jobCards = jobs.map((job) => {
    const skillTags = job.skills.map((s) => `<span>${s}</span>`).join(' ');
    return `
      <div class="${classNames.card}">
        <h2 class="${classNames.title}">${job.title}</h2>
        <p class="${classNames.company}">${job.company}</p>
        <p class="${classNames.location}">${job.location}</p>
        <p class="${classNames.salary}">${job.salary}</p>
        <div class="${classNames.skills}">${skillTags}</div>
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head><title>Job Board</title></head>
<body>
<h1>Job Listings</h1>
${jobCards}
</body>
</html>`;
}

/**
 * Derive an identity key from the request for rate-limiting purposes.
 * Identity = IP + User-Agent combined.
 */
function getIdentityKey(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  return `${ip}::${ua}`;
}

/**
 * Create and return the Express app (does NOT call .listen).
 * This allows tests to bind to port 0 and avoids port conflicts.
 */
function createApp() {
  const app = express();
  app.use(express.json());

  // ----- Chaos state -----
  const chaosState = {
    enabled: false,
    rateLimiting: true,
    rotateCssClasses: true,
    malformedResponses: true,
    rateLimitThreshold: 10,
    rateLimitWindowMs: 60000,
    malformedRate: 0.05,
  };

  // Current CSS class name pool index
  let currentClassPoolIndex = 0;

  // Rate-limit tracking: Map<identityKey, { count, windowStart }>
  const rateLimitMap = new Map();

  // ----- GET /admin/chaos -----
  app.get('/admin/chaos', (req, res) => {
    res.json({ ...chaosState });
  });

  // ----- POST /admin/chaos -----
  app.post('/admin/chaos', (req, res) => {
    const body = req.body;

    if ('enabled' in body) {
      chaosState.enabled = Boolean(body.enabled);
    }
    if ('rateLimiting' in body) {
      chaosState.rateLimiting = Boolean(body.rateLimiting);
    }
    if ('rotateCssClasses' in body) {
      chaosState.rotateCssClasses = Boolean(body.rotateCssClasses);
    }
    if ('malformedResponses' in body) {
      chaosState.malformedResponses = Boolean(body.malformedResponses);
    }
    if ('rateLimitThreshold' in body) {
      chaosState.rateLimitThreshold = Number(body.rateLimitThreshold);
    }
    if ('rateLimitWindowMs' in body) {
      chaosState.rateLimitWindowMs = Number(body.rateLimitWindowMs);
    }
    if ('malformedRate' in body) {
      chaosState.malformedRate = Number(body.malformedRate);
    }

    // Force CSS class rotation if requested
    if (body.forceRotation) {
      currentClassPoolIndex = (currentClassPoolIndex + 1) % CLASS_NAME_POOLS.length;
    }

    // Clear rate-limit state when chaos is disabled
    if (!chaosState.enabled) {
      rateLimitMap.clear();
    }

    res.json({ ...chaosState });
  });

  // ----- GET /jobs -----
  app.get('/jobs', (req, res) => {
    // --- Rate limiting (when chaos enabled) ---
    if (chaosState.enabled && chaosState.rateLimiting) {
      const identity = getIdentityKey(req);
      const now = Date.now();
      let entry = rateLimitMap.get(identity);

      if (!entry || (now - entry.windowStart) > chaosState.rateLimitWindowMs) {
        // New window
        entry = { count: 0, windowStart: now };
        rateLimitMap.set(identity, entry);
      }

      entry.count++;

      if (entry.count > chaosState.rateLimitThreshold) {
        res.status(429).set('Content-Type', 'text/html').send(CAPTCHA_HTML);
        return;
      }
    }

    // --- Malformed responses (when chaos enabled) ---
    if (chaosState.enabled && chaosState.malformedResponses) {
      if (Math.random() < chaosState.malformedRate) {
        const malformed = MALFORMED_RESPONSES[Math.floor(Math.random() * MALFORMED_RESPONSES.length)];
        res.status(200).set('Content-Type', 'text/html').send(malformed);
        return;
      }
    }

    // --- Pick CSS class names ---
    const classNames = CLASS_NAME_POOLS[currentClassPoolIndex];

    // --- Build and send HTML ---
    const html = buildJobsHtml(classNames, FAKE_JOBS);
    res.status(200).set('Content-Type', 'text/html').send(html);
  });

  return app;
}

module.exports = { createApp };

// ----- Start server if run directly -----
if (require.main === module) {
  const port = process.env.SANDBOX_PORT || 3001;
  const app = createApp();
  app.listen(port, () => {
    console.log(`Sandbox hostile source running on http://localhost:${port}`);
    console.log('Chaos toggle: POST /admin/chaos { "enabled": true }');
  });
}
