# Resilient Job-Listing Ingestion Engine

A production-grade job scraping pipeline that demonstrates systems thinking about **adversarial data extraction**: detection surface awareness, tiered fetch strategies, resilience engineering, and ethical boundaries.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Dashboard (React + Vite)        │
│        Listings Table + Pipeline Health Panel    │
│                  polls /status every 5s          │
└──────────────────────┬──────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────┐
│               API Server (Express)               │
│     /health  /status  /listings  /admin/chaos    │
│              pino structured logging             │
├──────────────────────────────────────────────────┤
│              Ingestion Pipeline                   │
│                                                  │
│  ┌─────────┐   ┌──────────┐   ┌──────────────┐  │
│  │ Tier 0  │──▶│ Tier 1   │──▶│   Tier 2     │  │
│  │ API/RSS │   │ Static   │   │  Headless    │  │
│  │         │   │ HTML     │   │  Browser     │  │
│  └─────────┘   └──────────┘   └──────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │         Resilience Engine                │    │
│  │  Circuit Breaker · Schema Validation     │    │
│  │  Selector Fallback · Source Failover     │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ BullMQ   │  │ UA Pool  │  │ Proxy Pool   │   │
│  │ Pacing   │  │ Rotation │  │ Abstraction  │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
├──────────────────────────────────────────────────┤
│  MongoDB (raw + normalized)  │  Redis (BullMQ)   │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│         Sandbox Hostile Source (Express)          │
│   Fake job board with chaos toggle:              │
│   rate-limiting · rotating CSS · malformed HTML  │
└──────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Node.js 20 LTS
- Docker (for Redis + MongoDB)

### 1. Clone & Install

```bash
git clone https://github.com/aaniket21/jobscraper.git
cd jobscraper
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

### 3. Setup Environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### 4. Install Dependencies & Run

```bash
# API Server
cd apps/api && npm install && npm run dev

# Sandbox Source (separate terminal)
cd apps/sandbox-source && npm install && npm run dev

# Dashboard (separate terminal)
cd apps/dashboard && npm install && npm run dev
```

### 5. Open Dashboard
Navigate to `http://localhost:5173`

---

## Testing

```bash
# API tests (69 tests)
cd apps/api && npm test

# Sandbox tests (7 tests)
cd apps/sandbox-source && npm test
```

**Total: 76 tests across 19 test suites.**

---

## Repository Structure

```
jobscraper/
├── apps/
│   ├── api/                    # Express API server
│   │   └── src/
│   │       ├── ingestion/
│   │       │   ├── strategies/ # StaticFetch, BrowserFetch, TierEscalation
│   │       │   ├── sources/    # remoteok, indeed, linkedin, naukri, wellfound
│   │       │   ├── circuitBreaker.js
│   │       │   ├── proxyPool.js
│   │       │   ├── uaPool.js
│   │       │   ├── normalize.js
│   │       │   ├── jobSchema.js
│   │       │   └── selectorFallback.js
│   │       ├── queue/          # BullMQ config
│   │       ├── models/         # Mongoose schemas
│   │       ├── routes/
│   │       └── server.js
│   ├── sandbox-source/         # Self-hosted hostile fake job board
│   └── dashboard/              # React + Vite health dashboard
├── DESIGN.md                   # Detection surface & resilience analysis
├── DECISIONS.md                # 1-page trade-offs & AI disclosure
├── docker-compose.yml          # Redis + Mongo for local dev
├── render.yaml                 # Render deploy blueprint
├── vercel.json                 # Vercel deploy config
└── .env.example
```

---

## Key Design Documents
- **[DESIGN.md](DESIGN.md)** — Detection surface analysis, ingestion strategy, resilience engine, ethics line
- **[DECISIONS.md](DECISIONS.md)** — Strategy trade-offs, time-boxed compromises, AI usage disclosure

---

## License
ISC
