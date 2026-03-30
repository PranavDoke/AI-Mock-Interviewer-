# AI-Powered Adaptive Technical Interview Simulation Platform

## Overview
A full-stack MERN application that simulates real-time technical interviews with adaptive difficulty, AI-based evaluation, and secure sandboxed code execution.

## Tech Stack
- **Frontend:** React 18 + Vite + Redux Toolkit + Tailwind CSS + Monaco Editor
- **Backend:** Node.js + Express + MongoDB (Mongoose) + JWT Auth
- **AI:** Groq API (OpenAI-compatible) with abstract provider interface
- **Code Execution:** Piston (self-hosted Docker sandbox)
- **Caching:** Redis (optional, via Upstash or local)
- **Testing:** Jest + Supertest (backend), Vitest + RTL (frontend)

## Quick Start

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose
- MongoDB (local or Atlas)

### Development
```bash
# Install dependencies
npm install

# Copy environment files
cp server/.env.example server/.env

# Start all services (MongoDB, Redis, Piston)
docker-compose up -d

# Start dev servers (backend + frontend)
npm run dev
```

### Environment Variables
See `server/.env.example` for required configuration.

## Project Structure
```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client layer
│   │   ├── store/          # Redux Toolkit store
│   │   └── utils/          # Helpers & constants
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/         # App & DB configuration
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic layer
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # Express routes
│   │   ├── middlewares/     # Auth, error handling, rate limit
│   │   ├── validations/    # Request validation schemas
│   │   └── utils/          # Shared utilities
├── docker/                 # Docker configurations
├── tests/                  # Test suites
├── docker-compose.yml      # Dev environment orchestration
└── package.json            # Monorepo root
```

## API Documentation
See `server/src/routes/` for all available endpoints.

## Evaluation Pipeline (How Scoring Works)

When a candidate submits an answer:

1. The backend enforces **session time limit** server-side.
2. For coding questions, the backend runs code against question test cases through Piston.
3. The evaluation combines:
	- **Test pass rate** (strongly weighted)
	- AI code assessment (correctness + quality)
	- AI explanation assessment (clarity + reasoning + structure)
4. If test pass rate is below 50%, overall score is capped to avoid over-scoring failing solutions.
5. Submission stores execution artifacts (`executionResult`, `testResults`) and evaluation details.

If code execution service is temporarily unavailable, submission still completes with AI-only evaluation fallback.

## Verification Commands

```bash
# Backend tests
npm run test:server

# Frontend tests
npm run test:client

# Frontend production build
npm run build --workspace=client

# E2E API workflow checks (server must be running)
node tests/e2e-api-test.js
node tests/e2e-test.js
```

## License
MIT
