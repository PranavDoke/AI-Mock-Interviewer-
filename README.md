# AI-Powered Adaptive Technical Interview Simulation Platform

## Overview
A full-stack MERN application that simulates real-time technical interviews with **adaptive difficulty**, **AI-based evaluation**, **secure sandboxed code execution**, and **ML-powered scoring**. Features 22+ LeetCode-style coding problems across multiple topics (Arrays, Strings, Graphs, Dynamic Programming, etc.).

## Tech Stack
- **Frontend:** React 18 + Vite 5.4+ + Redux Toolkit + Tailwind CSS + Monaco Editor
- **Backend:** Node.js 18+ + Express + MongoDB (Mongoose) + JWT Auth
- **AI Evaluation:** Groq API (OpenAI-compatible) with abstract provider interface; Mock provider for local dev
- **Code Execution:** Piston API (self-hosted Docker sandbox)
- **ML Scoring:** scikit-learn ML model trained on interview performance data
- **Caching:** Redis (optional, via Upstash)
- **Testing:** Jest + Supertest (backend), Vitest + React Testing Library (frontend)

## Features
✅ **Adaptive Interview Sessions** - AI selects next question based on user performance & skill level  
✅ **Real-Time Code Execution** - Sandboxed code evaluation in JavaScript, Python, Java, C++, C  
✅ **Session Persistence** - Resume interrupted interviews or continue in new sessions  
✅ **Question Repeat Prevention** - Questions excluded within a single session but available across sessions  
✅ **ML-Powered Difficulty Scaling** - Adaptive engine adjusts difficulty (Level 1-5) based on performance  
✅ **Comprehensive Scoring** - Time efficiency, code quality, test case pass rate  
✅ **Analytics & History** - Track interview performance over time  

## Quick Start

### Prerequisites
- Node.js >= 18.15.0
- Docker & Docker Compose (for MongoDB, Redis, Piston)
- npm 9+

### Development Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp server/.env.example server/.env

# Start all services (MongoDB, Redis, Piston) - **REQUIRED for code execution**
docker-compose -f docker-compose.dev.yml up -d

# Start dev servers with coordinated ports (backend 5001, frontend 5173)
npm run dev

# Dev console will show:
# ✓ Server running on http://localhost:5001/api/v1/health
# ✓ Frontend available at http://localhost:5173
```

### First Time Setup - Database Seeding
```bash
# Seed database with 22 LeetCode-style questions
node server/scripts/seed-leetcode-questions.js

# Verify seeding
# Expected: 22 questions across 9 topics (arrays, strings, searching, stack, dp, graph, heap, matrix, hashing)
```

### Environment Variables
```bash
# server/.env
PORT=5001
AI_PROVIDER=mock              # Use 'mock' for local dev (no API calls); 'groq' for production
GROQ_API_KEY=<excluded>       # Not needed for dev with AI_PROVIDER=mock
MONGODB_URI=mongodb://localhost:27017/ai-mock-interviewer
REDIS_URL=redis://localhost:6379 (optional)
JWT_SECRET=<your-secret-key>
```

## Project Structure
```
├── client/                              # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CodeEditor.jsx          # Monaco-based code editor
│   │   │   ├── FeedbackPanel.jsx       # AI evaluation feedback display
│   │   │   ├── Timer.jsx               # Interview countdown timer
│   │   │   ├── LoadingSpinner.jsx      # Loading state UI
│   │   │   ├── ProtectedRoute.jsx      # Auth-gated route wrapper
│   │   │   └── Navbar.jsx              # Navigation bar
│   │   ├── pages/
│   │   │   ├── InterviewSetupPage.jsx  # Session config & start
│   │   │   ├── InterviewPage.jsx       # Main interview editor & execution
│   │   │   ├── SessionResultPage.jsx   # Post-interview summary
│   │   │   ├── HistoryPage.jsx         # Past interviews & scores
│   │   │   ├── AnalyticsPage.jsx       # Performance metrics
│   │   │   ├── LoginPage.jsx           # User authentication
│   │   │   ├── RegisterPage.jsx        # User signup
│   │   │   ├── ProfilePage.jsx         # User settings & preferences
│   │   │   └── DashboardPage.jsx       # Home/dashboard
│   │   ├── services/
│   │   │   ├── api.js                  # Axios instance with JWT interceptor
│   │   │   └── endpoints.js            # API endpoint wrappers
│   │   ├── store/
│   │   │   ├── interviewSlice.js       # Redux: interview session state + hydration
│   │   │   ├── authSlice.js            # Redux: auth state & token refresh
│   │   │   ├── analyticsSlice.js       # Redux: performance metrics
│   │   │   └── store.js                # Redux store configuration
│   │   ├── test/                       # Vitest unit tests
│   │   └── vite.config.js              # Vite config with /api proxy to :5001
│   ├── Dockerfile                      # Multi-stage production build
│   ├── nginx.conf                      # Nginx reverse proxy config
│   └── package.json
├── server/                              # Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js             # MongoDB connection
│   │   │   ├── logger.js               # Winston logger
│   │   │   ├── morgan.js               # HTTP request logging
│   │   │   └── config.js               # App configuration
│   │   ├── controllers/
│   │   │   ├── auth.controller.js      # Login, register, token refresh
│   │   │   ├── interview.controller.js # Session CRUD operations
│   │   │   ├── question.controller.js  # Question retrieval, filtering
│   │   │   ├── execution.controller.js # Code execution requests
│   │   │   ├── analytics.controller.js # Performance data aggregation
│   │   │   └── user.controller.js      # User profile & preferences
│   │   ├── services/
│   │   │   ├── interview.service.js    # Session lifecycle (create, next-Q, submit, complete)
│   │   │   ├── adaptive.service.js     # ML engine: difficulty calculation & Q selection
│   │   │   ├── ai.service.js           # AI evaluation & feedback (provider-agnostic)
│   │   │   ├── execution.service.js    # Piston API integration
│   │   │   ├── auth.service.js         # JWT & password hashing
│   │   │   ├── analytics.service.js    # Score aggregation & trends
│   │   │   └── question.service.js     # Question repository & filtering
│   │   ├── models/
│   │   │   ├── User.js                 # User schema (profile, skill history)
│   │   │   ├── InterviewSession.js     # Session schema (submissions, currentQuestionId)
│   │   │   ├── Question.js             # Question schema (problem, constraints, examples)
│   │   │   └── Token.js                # Refresh token blacklist
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── interview.routes.js
│   │   │   ├── question.routes.js
│   │   │   ├── execution.routes.js
│   │   │   ├── analytics.routes.js
│   │   │   └── user.routes.js
│   │   ├── middlewares/
│   │   │   ├── auth.js                 # JWT verification & refresh
│   │   │   ├── error.js                # Error handler with logging
│   │   │   ├── rateLimiter.js          # Rate limiting (code execution)
│   │   │   └── validate.js             # Request validation (Joi)
│   │   ├── validations/
│   │   │   ├── auth.validation.js
│   │   │   ├── interview.validation.js
│   │   │   └── question.validation.js
│   │   ├── eval/
│   │   │   ├── adaptiveDifficulty.js   # ML model scoring logic
│   │   │   ├── featureExtractor.js     # Extract features from submissions
│   │   │   ├── feedbackEngine.js       # Generate AI feedback
│   │   │   ├── scoring.js              # Calculate final scores
│   │   │   └── mlClient.js             # ML service API calls
│   │   ├── utils/
│   │   │   ├── ApiError.js             # Custom error class
│   │   │   ├── catchAsync.js           # Async error wrapper
│   │   │   ├── helpers.js              # Utility functions
│   │   │   └── response.js             # Standardized response formats
│   │   ├── index.js                    # Express app bootstrap
│   │   └── app.js                      # Route setup
│   ├── scripts/
│   │   ├── seed-leetcode-questions.js  # Database seeding (22 questions)
│   │   ├── import-dsa-questions.js
│   │   └── migrate-questions.js
│   ├── tests/
│   │   ├── integration/                # End-to-end API tests
│   │   └── unit/                       # Controller & service tests
│   ├── Dockerfile                      # Multi-stage production build
│   ├── jest.config.js                  # Jest test runner config
│   └── package.json
├── ml_service/                         # ML Model Service (Python)
│   ├── app.py                          # Flask API for scoring & difficulty
│   ├── train_model.py                  # Model training script (scikit-learn)
│   ├── model.joblib                    # Trained ML model (Binary: NOT in git)
│   ├── requirements.txt                # Python dependencies
│   ├── Dockerfile                      # Python service container
│   └── README.md                       # ML service documentation
├── tests/
│   ├── e2e-api-test.js                 # End-to-end API test suite
│   └── e2e-test.js                     # Browser/Playwright E2E tests
├── logs/                               # Application logs directory
├── docker-compose.yml                  # Production orchestration
├── docker-compose.dev.yml              # Development orchestration (MongoDB, Redis, Piston)
└── package.json                        # Root monorepo config
```

## Key Features & Recent Updates

### Session Management
- **Resume Sessions:** Start/abandon/continue interview sessions with automatic state recovery
- **Question Exclusion:** Questions excluded **within a single session** but available for **future sessions** (fixed in v2.0)
- **Session Persistence:** Current question ID saved to database; hydrated on page refresh or direct URL navigation
- **Auth Recovery:** Session state properly validated after token refresh

### Adaptive Interview Flow
1. User starts interview with config: {language, topics, numQuestions, duration, difficulty}
2. Backend creates session → ML engine selects **first question** based on difficulty + topics
3. User writes code → Backend validates + executes (Piston sandbox)
4. Evaluation: AI provides feedback; ML model scores (time, code quality, test pass rate)
5. Next question auto-selected based on performance → Difficulty scales up/down
6. Session complete → Analytics saved + results displayed

### ML Model Scoring
- **Model:** scikit-learn RandomForest trained on interview performance data
- **Input Features:** Time taken, code length, test pass rate, submission attempts, topic, difficulty
- **Output:** Next difficulty recommendation (Level 1-5) + performance score (0-100)
- **Training:** Automated via CI workflow; artifact stored; deployed in `ml_service/model.joblib`
- **Excluding:** API keys and model binary not in git repo

### Code Execution
```javascript
// Supported languages
const SUPPORTED_LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'c'];

// Example execution request
POST /api/v1/execution/execute
{
  "code": "function add(a,b) { return a+b; }",
  "language": "javascript",
  "input": "1\n2"
}

// Response includes stdout, stderr, exit code
```

## API Endpoints Summary

### Authentication
```
POST   /api/v1/auth/register             # Create account
POST   /api/v1/auth/login                # Authenticate
POST   /api/v1/auth/refresh-tokens       # Refresh JWT
POST   /api/v1/auth/logout               # Invalidate tokens
GET    /api/v1/auth/me                   # Current user profile
```

### Interview Sessions
```
POST   /api/v1/interviews/sessions                     # Start session
GET    /api/v1/interviews/sessions                     # List sessions
GET    /api/v1/interviews/sessions/:sessionId          # Get session details
POST   /api/v1/interviews/sessions/:sessionId/next     # Get next question
POST   /api/v1/interviews/sessions/:sessionId/submit   # Submit answer
POST   /api/v1/interviews/sessions/:sessionId/abandon  # Abandon session
```

### Questions
```
GET    /api/v1/questions                 # List questions (with filters)
GET    /api/v1/questions/:questionId     # Get question details
GET    /api/v1/questions/topics/availability  # Available question count by topic
```

### Code Execution
```
POST   /api/v1/execution/execute         # Execute code in sandbox
POST   /api/v1/execution/validate        # Validate code syntax
```

### Analytics
```
GET    /api/v1/analytics/performance     # User performance metrics
GET    /api/v1/analytics/trends          # Historical performance trends
```

## Testing

### Run Tests
```bash
# Backend unit + integration tests
cd server && npm test

# Frontend component tests
cd client && npm test

# E2E API tests
node tests/e2e-api-test.js

# Browser E2E tests (Playwright)
npm run test:e2e
```

### Test Coverage
- **Backend:** 70%+ (controllers, services, models)
- **Frontend:** 55%+ (components, hooks, Redux slices)
- **Integration:** Auth flow, session CRUD, code execution

## Production Deployment

### Docker Build & Run
```bash
# Build all images
docker-compose build

# Start production environment
docker-compose up -d

# Logs
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f ml_service
```

### Environment for Production
```bash
# server/.env
NODE_ENV=production
PORT=5001
AI_PROVIDER=groq              # Use real Groq API
GROQ_API_KEY=<your-key>       # Stored securely (not in git)
MONGODB_URI=<production-uri>
REDIS_URL=<upstash-or-local>
JWT_SECRET=<secure-random-key>
```

### Database Backup & Migration
```bash
# Backup MongoDB
docker exec mongodb mongodump --uri="mongodb://localhost:27017/ai-mock-interviewer" --archive=backup.archive

# Restore
docker exec mongodb mongorestore --archive=backup.archive
```

## Known Limitations & Future Improvements
- ⏳ Real-time collaboration (multiple users same session) - Planned
- ⏳ Video interview recording & playback - Planned
- ⏳ Problem difficulty auto-calibration - In progress
- 🔧 Piston timeout for Java execution (set to 10s; may increase if needed)
- 🔧 ML model retraining frequency (weekly via CI/CD)

## Troubleshooting

### "Start Interview" Not Loading
**Issue:** Session creation works but page doesn't navigate to interview editor.  
**Fix:** Ensure auth is complete before clicking; check browser console for Redux errors.  
**Status:** ✅ Fixed in v2.0 - auth checks added to useEffect dependencies.

### 401 Unauthorized on API Calls
**Issue:** Tokens rejected after browser refresh.  
**Fix:** JWT interceptor auto-refreshes tokens; check token expiry (default 30m).  
**Verify:** GET /api/v1/auth/me should return 200 with user profile.

### Code Execution Timeout or SIGKILL
**Issue:** Java or long-running code terminated abruptly.  
**Fix:** Piston timeout set to 10s; increase in `execution.service.js` if needed.  
**Note:** Memory caps not enforced to avoid SIGKILL for malloc-heavy code.

### MongoDB Connection Failed
**Issue:** Cannot connect to localhost:27017.  
**Fix:** Ensure Docker container is running: `docker-compose -f docker-compose.dev.yml ps`  
**Restart:** `docker-compose -f docker-compose.dev.yml restart mongodb`

## Contributing
1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes with clear messages
3. Submit PR with test coverage
4. Ensure all tests pass before merge

## License
MIT
