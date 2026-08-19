# Resilient Job-Listing Ingestion Engine

A production-grade job scraping pipeline that demonstrates systems thinking about **adversarial data extraction**: detection surface awareness, tiered fetch strategies, resilience engineering, and ethical boundaries.

---

## Live Demo

- **Frontend Dashboard:** [https://jobscraper-six.vercel.app/](https://jobscraper-six.vercel.app/)
- **Backend API:** [https://job-ingestion-api.onrender.com](https://job-ingestion-api.onrender.com)
- **Sandbox Source:** [https://job-ingestion-sandbox.onrender.com](https://job-ingestion-sandbox.onrender.com)

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
git clone https://github.com/khushboo272/jobscraper.git
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

## Frontend Disclaimer
As per the assignment focus (Part 1 - scraper), the frontend (`apps/dashboard`) is provided **purely for testing and visualization purposes**. It exists to prove the ingestion pipeline works end-to-end and to demonstrate the chaos toggle in real-time. It is not a fully polished production UI.

---

## Deployment Process

The project is configured for easy deployment on free-tier hosting:

1. **Database & Redis:** 
   Use a managed service like MongoDB Atlas (free tier) and Redis Labs (free tier). Set `MONGO_URI`, `REDIS_HOST`, and `REDIS_PORT` in your hosting environment.
   
2. **API Backend & Sandbox (Render):**
   The project includes a `render.yaml` blueprint. Connect your GitHub repo to Render and it will automatically deploy `job-ingestion-api` and `job-ingestion-sandbox` as separate web services.
   
3. **Frontend Dashboard (Vercel):**
   The project includes a `vercel.json` config. Connect your repo to Vercel, set the root directory to `apps/dashboard`, and add the `VITE_API_URL` environment variable pointing to your deployed Render API.

---

## Key Design Documents
- **[DESIGN.md](DESIGN.md)** — Detection surface analysis, ingestion strategy, resilience engine, ethics line
- **[DECISIONS.md](DECISIONS.md)** — Strategy trade-offs, time-boxed compromises, AI usage disclosure

---

## License
ISC
