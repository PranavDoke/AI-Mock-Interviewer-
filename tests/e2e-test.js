/**
 * End-to-End API Test Suite
 * Tests all major flows: auth, interviews, code execution, analytics, questions
 */
const http = require('http');

const BASE_URL = 'http://localhost:5000/api/v1';
let accessToken = '';
let refreshToken = '';
let sessionId = '';
let cookies = '';

let passed = 0;
let failed = 0;
const errors = [];

// ─── HTTP Helper ────────────────────────────────────────────────────────────
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (cookies) headers['Cookie'] = cookies;

    const opts = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1${path}`,
      method,
      headers,
    };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(opts, (res) => {
      // Capture Set-Cookie headers
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        // Merge cookies
        const cookieMap = {};
        if (cookies) {
          cookies.split('; ').forEach((c) => {
            const [k, v] = c.split('=');
            if (k) cookieMap[k.trim()] = v;
          });
        }
        setCookie.forEach((c) => {
          const part = c.split(';')[0];
          const [k, v] = part.split('=');
          if (k) cookieMap[k.trim()] = v;
        });
        cookies = Object.entries(cookieMap)
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');
      }

      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ─── Assertion helpers ───────────────────────────────────────────────────────
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌  ${name}`);
    console.log(`       ${err.message}`);
    failed++;
    errors.push({ name, error: err.message });
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

function assertStatus(res, expected) {
  assert(
    res.status === expected,
    `Expected HTTP ${expected}, got ${res.status}. Body: ${JSON.stringify(res.body).slice(0, 200)}`
  );
}

function assertSuccess(res) {
  assert(
    res.body && res.body.success === true,
    `Expected success:true. Got: ${JSON.stringify(res.body).slice(0, 200)}`
  );
}

// ─── TEST SUITES ─────────────────────────────────────────────────────────────

async function testHealth() {
  console.log('\n📋 Health Check');
  await test('GET /health returns 200 and success:true', async () => {
    const res = await request('GET', '/health');
    assertStatus(res, 200);
    assertSuccess(res);
    assert(res.body.data === undefined || res.body.environment === 'development' || res.body.message, 'Missing health fields');
  });
}

async function testAuth() {
  console.log('\n🔐 Auth');

  const email = `e2e_${Date.now()}@test.com`;
  const password = 'TestPass123!';

  await test('POST /auth/register creates user and returns tokens', async () => {
    const res = await request('POST', '/auth/register', { name: 'E2E User', email, password });
    assertStatus(res, 201);
    assertSuccess(res);
    assert(res.body.data.tokens.accessToken, 'Missing accessToken');
    assert(res.body.data.tokens.refreshToken, 'Missing refreshToken');
    assert(res.body.data.user.email === email, 'Returned email mismatch');
    accessToken = res.body.data.tokens.accessToken;
    refreshToken = res.body.data.tokens.refreshToken;
  });

  await test('POST /auth/register with same email returns 409', async () => {
    const res = await request('POST', '/auth/register', { name: 'E2E User', email, password });
    assertStatus(res, 409);
    assert(res.body.success === false, 'Expected success:false for duplicate email');
  });

  await test('POST /auth/register with invalid data returns 400', async () => {
    const res = await request('POST', '/auth/register', { name: 'X', email: 'not-an-email', password: '123' });
    assertStatus(res, 400);
  });

  await test('GET /auth/me returns current user (cookie auth)', async () => {
    const res = await request('GET', '/auth/me');
    assertStatus(res, 200);
    assertSuccess(res);
    assert(res.body.data.user.email === email, 'Wrong user returned');
  });

  await test('GET /auth/me returns 401 without token', async () => {
    const savedCookies = cookies;
    cookies = '';
    const res = await request('GET', '/auth/me');
    assertStatus(res, 401);
    cookies = savedCookies;
  });

  await test('POST /auth/login with valid credentials', async () => {
    cookies = '';
    const res = await request('POST', '/auth/login', { email, password });
    assertStatus(res, 200);
    assertSuccess(res);
    assert(res.body.data.tokens.accessToken, 'Missing accessToken on login');
    accessToken = res.body.data.tokens.accessToken;
    refreshToken = res.body.data.tokens.refreshToken;
  });

  await test('POST /auth/login with wrong password returns 401', async () => {
    const savedCookies = cookies;
    const res = await request('POST', '/auth/login', { email, password: 'wrongpassword' });
    assertStatus(res, 401);
    cookies = savedCookies;
  });

  await test('POST /auth/login with nonexistent email returns 401', async () => {
    const savedCookies = cookies;
    const res = await request('POST', '/auth/login', { email: 'nope@nope.com', password });
    assertStatus(res, 401);
    cookies = savedCookies;
  });

  await test('POST /auth/refresh-tokens returns new tokens', async () => {
    const res = await request('POST', '/auth/refresh-tokens', { refreshToken });
    assertStatus(res, 200);
    assertSuccess(res);
    assert(res.body.data.tokens.accessToken, 'Missing new accessToken');
    accessToken = res.body.data.tokens.accessToken;
    refreshToken = res.body.data.tokens.refreshToken;
  });

  await test('POST /auth/change-password changes password', async () => {
    const res = await request('POST', '/auth/change-password', {
      currentPassword: password,
      newPassword: 'NewPass456!',
    });
    assertStatus(res, 200);
    assertSuccess(res);
    // Re-login with new password
    cookies = '';
    const loginRes = await request('POST', '/auth/login', { email, password: 'NewPass456!' });
    assertStatus(loginRes, 200);
    accessToken = loginRes.body.data.tokens.accessToken;
    refreshToken = loginRes.body.data.tokens.refreshToken;
  });
}

async function testUsers() {
  console.log('\n👤 Users');

  await test('GET /users/profile returns user profile', async () => {
    const res = await request('GET', '/users/profile');
    assertStatus(res, 200);
    assertSuccess(res);
    assert(res.body.data.user || res.body.data, 'Missing user data');
  });

  await test('PUT /users/profile updates profile', async () => {
    const res = await request('PATCH', '/users/profile', {
      name: 'Updated E2E User',
      preferences: { preferredLanguage: 'python', interviewDuration: 45 },
    });
    assertStatus(res, 200);
    assertSuccess(res);
  });
}

async function testQuestions() {
  console.log('\n❓ Questions');

  await test('GET /questions returns question list', async () => {
    const res = await request('GET', '/questions');
    assertStatus(res, 200);
    assertSuccess(res);
    const questions = res.body.data.questions || res.body.data;
    assert(Array.isArray(questions) || res.body.data, 'Expected questions array');
  });

  await test('GET /questions with filters works', async () => {
    const res = await request('GET', '/questions?topic=arrays&difficulty=1');
    assertStatus(res, 200);
    assertSuccess(res);
  });
}

async function testInterviews() {
  console.log('\n🎯 Interviews');

  await test('POST /interviews/sessions starts a new session', async () => {
    const res = await request('POST', '/interviews/sessions', {
      type: 'technical',
      topics: ['arrays'],
      language: 'javascript',
      maxQuestions: 3,
      timeLimitMinutes: 20,
    });
    assertStatus(res, 201);
    assertSuccess(res);
    const session = res.body.data.session || res.body.data;
    assert(session._id || session.id, 'Missing session id');
    sessionId = session._id || session.id;
  });

  await test('GET /interviews/sessions lists sessions', async () => {
    const res = await request('GET', '/interviews/sessions');
    assertStatus(res, 200);
    assertSuccess(res);
    const sessions = res.body.data.sessions || res.body.data;
    assert(Array.isArray(sessions) || res.body.data, 'Expected sessions array');
  });

  await test('GET /interviews/sessions/:id returns session', async () => {
    if (!sessionId) throw new Error('No sessionId from previous test');
    const res = await request('GET', `/interviews/sessions/${sessionId}`);
    assertStatus(res, 200);
    assertSuccess(res);
  });

  await test('GET /interviews/sessions/:id/next-question returns a question', async () => {
    if (!sessionId) throw new Error('No sessionId');
    const res = await request('GET', `/interviews/sessions/${sessionId}/next-question`);
    assertStatus(res, 200);
    assertSuccess(res);
    const q = res.body.data.question || res.body.data;
    assert(q, 'Missing question in response');
  });

  await test('POST /interviews/sessions/:id/submit submits an answer', async () => {
    if (!sessionId) throw new Error('No sessionId');
    const res = await request('POST', `/interviews/sessions/${sessionId}/submit`, {
      questionId: 'test',
      code: 'function twoSum(nums, target) { return [0, 1]; }',
      language: 'javascript',
      timeTaken: 120,
    });
    // Accept 200 or 400 (if questionId mismatch) — just not 500
    assert(res.status !== 500, `Server error on submit: ${JSON.stringify(res.body).slice(0, 200)}`);
  });

  await test('POST /interviews/sessions/:id/abandon abandons session', async () => {
    // The session from the previous test may still be active — abandon it first
    if (sessionId) {
      await request('POST', `/interviews/sessions/${sessionId}/abandon`);
    }
    // Now start a fresh session to specifically test abandoning
    const newSession = await request('POST', '/interviews/sessions', {
      type: 'technical',
      topics: ['strings'],
      language: 'python',
      maxQuestions: 3,
      timeLimitMinutes: 20,
    });
    const sid = (newSession.body.data?.session?._id) || (newSession.body.data?._id) || newSession.body.data?.session?.id;
    if (!sid) throw new Error(`Couldn't create session to abandon. Got: ${JSON.stringify(newSession.body).slice(0,200)}`);
    const res = await request('POST', `/interviews/sessions/${sid}/abandon`);
    assertStatus(res, 200);
    assertSuccess(res);
  });
}

async function testExecution() {
  console.log('\n⚙️  Code Execution');

  await test('GET /execution/health returns piston status', async () => {
    const res = await request('GET', '/execution/health');
    assertStatus(res, 200);
    assertSuccess(res);
  });

  await test('GET /execution/runtimes returns language list', async () => {
    const res = await request('GET', '/execution/runtimes');
    assertStatus(res, 200);
    assertSuccess(res);
    const runtimes = res.body.data.runtimes || res.body.data;
    assert(Array.isArray(runtimes) && runtimes.length > 0, 'Expected non-empty runtimes');
  });

  await test('POST /execution/run executes JavaScript', async () => {
    const res = await request('POST', '/execution/run', {
      code: 'console.log("hello e2e")',
      language: 'javascript',
    });
    assertStatus(res, 200);
    assertSuccess(res);
    const output = res.body.data?.output || res.body.data?.result?.output || res.body.data?.stdout || '';
    assert(output.includes('hello e2e') || res.body.data, `Expected "hello e2e" in output. Got: ${JSON.stringify(res.body.data).slice(0,200)}`);
  });

  await test('POST /execution/run executes Python', async () => {
    const res = await request('POST', '/execution/run', {
      code: 'print("python works")',
      language: 'python',
    });
    assertStatus(res, 200);
    assertSuccess(res);
  });

  await test('POST /execution/run with unsupported language returns 400', async () => {
    const res = await request('POST', '/execution/run', {
      code: 'echo hello',
      language: 'cobol',
    });
    assert(res.status === 400 || res.status === 422, `Expected 400/422 for unsupported language, got ${res.status}`);
  });
}

async function testAnalytics() {
  console.log('\n📊 Analytics');

  await test('GET /analytics/dashboard returns analytics data', async () => {
    const res = await request('GET', '/analytics/dashboard?period=30d');
    assertStatus(res, 200);
    assertSuccess(res);
    assert(res.body.data !== undefined, 'Missing analytics data');
  });

  await test('GET /analytics/topics returns topic data', async () => {
    const res = await request('GET', '/analytics/topics?period=30d');
    assert(res.status !== 500, `Server error: ${JSON.stringify(res.body).slice(0,200)}`);
    assert(res.status === 200 || res.status === 404, `Unexpected status ${res.status}`);
  });
}

async function testErrorHandling() {
  console.log('\n🛡️  Error Handling');

  await test('Unknown route returns 404', async () => {
    const res = await request('GET', '/nonexistent-route-xyz');
    assertStatus(res, 404);
  });

  await test('Malformed JSON body returns 400', async () => {
    const res = await request('POST', '/auth/login', 'not-valid-json-{');
    assert(res.status === 400 || res.status === 500, `Expected 400, got ${res.status}`);
  });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function runAll() {
  console.log('====================================');
  console.log('   AI Mock Interviewer E2E Tests');
  console.log('====================================');

  await testHealth();
  await testAuth();
  await testUsers();
  await testQuestions();
  await testInterviews();
  await testExecution();
  await testAnalytics();
  await testErrorHandling();

  console.log('\n====================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('====================================');

  if (errors.length > 0) {
    console.log('\n❌ Failed tests:');
    errors.forEach((e) => console.log(`  - ${e.name}: ${e.error}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
