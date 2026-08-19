# DESIGN.md — Resilient Job-Listing Ingestion Engine

## 1. Detection Surface Analysis

When scraping job platforms that actively resist automation, six categories of detection signals must be addressed:

### 1.1 TLS/Network Fingerprint
- **Signal:** JA3/JA4 fingerprint of the HTTP client, TCP/TLS handshake ordering
- **Mitigation:** Partially mitigated by using real browser engines (Playwright/Chromium). Not fully addressable at the JS layer alone.
- **Honest gap:** TLS fingerprint rotation requires binary-level patches or specialized proxies. Out of scope for this demo — called out explicitly.

### 1.2 Browser Fingerprint
- **Signal:** `navigator.webdriver === true`, missing `chrome.runtime`, headless UA strings, canvas/WebGL entropy mismatches
- **Mitigation:** `playwright-extra` with stealth evasion patches closes most of these signals at the CDP level. Viewport and UA are matched from a pool of real, in-the-wild combinations (see `uaPool.js`).

### 1.3 Request-Level Signals
- **Signal:** Missing/incorrect header ordering, absent `Accept-Language`/`sec-ch-ua` client hints, no `Referer` chain, identical headers across sessions
- **Mitigation:** `StaticFetchStrategy` sends a full set of realistic headers including `sec-ch-ua`, `Accept-Language`, and proper `Accept-Encoding`. Each session identity bundles a unique (UA + sec-ch-ua + viewport) combination.

### 1.4 Timing/Behavioral Signals
- **Signal:** Inhuman request cadence (perfectly periodic), zero mouse/scroll events, page-load-to-action latency too fast
- **Mitigation:** BullMQ queue with randomized 3–9s jittered delays per request (never a fixed interval). Concurrency capped at 1–2 per domain. The `getJitteredDelay()` function ensures no two requests have the same spacing.

### 1.5 Volume/IP Signals
- **Signal:** Many requests from one IP/ASN in a short window, datacenter IP ranges
- **Mitigation:** `proxyPool.js` abstracts proxy rotation with sticky sessions per domain. Stubbed with mock proxies for demo; production would use a residential/mobile pool. Proxy rotates on failure.

### 1.6 Session/Identity Signals
- **Signal:** Cookie/session reuse patterns, login velocity, impossible request volume from one account
- **Mitigation:** Session identity = (proxy + UA + cookie jar) bundled as one unit, never mixed. Each identity is tracked independently by the circuit breaker.

---

## 2. Ingestion Strategy

### Tiered Fetch Strategy
Cost escalation only when needed — cheapest method first:

| Tier | Method | When Used | Cost |
|------|--------|-----------|------|
| 0 | Public API/RSS (RemoteOK) | Always first for API-first sources | Lowest |
| 1 | Static HTML fetch (axios + cheerio) | When API unavailable, source serves static HTML (Indeed, LinkedIn, Naukri, Wellfound public pages) | Low |
| 2 | Headless browser (Playwright + stealth) | When Tier 1 gets blocked or content requires JS | High |
| 3 | Headful/human-paced session | Hardest targets — documented as escalation path, not run in demo | Highest |

### Pacing & Rotation
- BullMQ job concurrency capped per-domain (1–2 concurrent)
- Randomized 3–9s delay between requests, jittered — never a fixed interval
- UA/viewport pool rotates from 5 real browser combinations
- Proxy pool with sticky sessions per domain, rotation on failure

### Plan B (Degradation Strategy)
- Config flag flips target from Tier 1 → Tier 2 without code changes (strategy pattern)
- Circuit breaker auto-demotes source to "degraded" and falls back to cached data
- Secondary source failover: if RemoteOK fails, pipeline tries Arbeitnow/Remotive

---

## 3. Resilience Engine

### Failure Taxonomy

| Failure | Detection | Response |
|---------|-----------|----------|
| Empty/malformed response | Zod schema validation on parsed output | Retry with exponential backoff (3x), then mark source degraded |
| Markup drift | Selector returns 0 matches where >0 expected | Fall back to secondary selector set; if both fail, quarantine job |
| Rate-limited / CAPTCHA | HTTP 429/403, or CAPTCHA marker in body | Circuit breaker opens for that (source, identity) pair; rotate identity |
| Full block | Repeated failures past threshold | Circuit breaker fully opens, source marked "down", dashboard shows last-good cache |

### Circuit Breaker States
- **CLOSED:** Normal operation. Failures counted. Resets on success.
- **OPEN:** All requests rejected. Source marked "down". Entered when failure count reaches threshold.
- **HALF_OPEN:** After reset timeout, one test request allowed. Success → CLOSED. Failure → OPEN.

### Schema-Flexible Storage
MongoDB documents store both `normalized` fields and a `raw` blob + `sourceVersion` tag, so markup changes don't corrupt historical data and allow replay/re-normalization.

---

## 4. Ethics Line

- We do not scrape sources that require authentication we don't own, or that explicitly disallow automated access in their ToS/robots.txt.
- The live demo only touches sources that are either explicitly public/API-first or entirely self-hosted sandboxes.
- Stealth/evasion techniques are demonstrated against our own sandbox to prove the pattern works — not deployed against LinkedIn/Naukri/Indeed accounts.
- Technical line: no credential stuffing, no CAPTCHA-solving services against real platforms, no bypassing paywalls.
