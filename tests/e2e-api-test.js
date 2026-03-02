/**
 * E2E API Test Script
 * Tests the full interview flow: register → login → start session → submit → complete
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000/api/v1';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(data && { 'Content-Length': Buffer.byteLength(data) }),
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseData) });
        } catch {
          resolve({ status: res.statusCode, body: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting E2E API Tests...\n');
  const testEmail = `e2etest_${Date.now()}@test.com`;
  let token;
  let sessionId;
  let questionId;

  // 1. Health Check
  console.log('1️⃣  Testing health endpoint...');
  const health = await request('GET', '/health');
  console.assert(health.status === 200, 'Health check failed');
  console.assert(health.body.success === true, 'Health should return success');
  console.log('   ✅ Health check passed\n');

  // 2. Register
  console.log('2️⃣  Testing user registration...');
  const reg = await request('POST', '/auth/register', {
    name: 'E2E Test User',
    email: testEmail,
    password: 'TestPass123',
  });
  console.assert(reg.status === 201, `Register failed: ${reg.body.message}`);
  console.assert(reg.body.data.tokens.accessToken, 'Should return access token');
  token = reg.body.data.tokens.accessToken;
  console.log(`   ✅ Registration passed - User: ${reg.body.data.user.email}\n`);

  // 3. Login
  console.log('3️⃣  Testing login...');
  const login = await request('POST', '/auth/login', {
    email: testEmail,
    password: 'TestPass123',
  });
  console.assert(login.status === 200, `Login failed: ${login.body.message}`);
  token = login.body.data.tokens.accessToken;
  console.log(`   ✅ Login passed - Token received\n`);

  // 4. Get Me
  console.log('4️⃣  Testing /auth/me endpoint...');
  const me = await request('GET', '/auth/me', null, token);
  console.assert(me.status === 200, `GetMe failed: ${me.body.message}`);
  console.assert(me.body.data.user.email === testEmail, 'Email should match');
  console.log(`   ✅ GetMe passed - User: ${me.body.data.user.name}\n`);

  // 5. List Questions
  console.log('5️⃣  Testing question listing...');
  const questions = await request('GET', '/questions?limit=5', null, token);
  console.assert(questions.status === 200, `List questions failed: ${questions.body.message}`);
  // paginatedResponse returns data as array directly
  console.assert(Array.isArray(questions.body.data), 'Should return data array');
  console.log(`   ✅ Questions listed - Count: ${questions.body.data.length}\n`);

  // 6. Start Interview Session
  console.log('6️⃣  Testing interview session creation...');
  const sess = await request('POST', '/interviews/sessions', {
    topics: ['arrays'],
    language: 'javascript',
    maxQuestions: 2,
    timeLimitMinutes: 15,
  }, token);
  console.assert(sess.status === 201, `Start session failed: ${sess.body.message}`);
  console.assert(sess.body.data.session._id, 'Should have session ID');
  console.assert(sess.body.data.currentQuestion, 'Should have first question');
  sessionId = sess.body.data.session._id;
  questionId = sess.body.data.currentQuestion._id;
  console.log(`   ✅ Session created - ID: ${sessionId}`);
  console.log(`   📝 First question: ${sess.body.data.currentQuestion.title}\n`);

  // 7. Submit Answer
  console.log('7️⃣  Testing answer submission...');
  const submit = await request('POST', `/interviews/sessions/${sessionId}/submit`, {
    questionId,
    code: 'function twoSum(nums, target) { const map = {}; for(let i=0;i<nums.length;i++){if(map[target-nums[i]]!==undefined)return[map[target-nums[i]],i];map[nums[i]]=i;} return []; }',
    language: 'javascript',
    explanation: 'Used a hashmap to store seen numbers. O(n) time complexity.',
  }, token);
  console.assert(submit.status === 200, `Submit failed: ${submit.body.message}`);
  console.assert(submit.body.data.evaluation, 'Should return evaluation');
  console.assert(submit.body.data.evaluation.overallScore >= 0, 'Should have a score');
  console.log(`   ✅ Answer submitted - Score: ${submit.body.data.evaluation.overallScore}%`);
  console.log(`   📊 Questions remaining: ${submit.body.data.questionsRemaining}\n`);

  // 8. Get Next Question
  console.log('8️⃣  Testing next question fetch...');
  const next = await request('GET', `/interviews/sessions/${sessionId}/next-question`, null, token);
  console.assert(next.status === 200, `Next question failed: ${next.body.message}`);
  console.assert(next.body.data.question || next.body.data.completed, 'Should have question or be complete');
  if (next.body.data.question) {
    questionId = next.body.data.question._id;
    console.log(`   ✅ Next question: ${next.body.data.question.title}\n`);

    // 9. Submit second answer and complete session
    console.log('9️⃣  Submitting final answer to complete session...');
    const submit2 = await request('POST', `/interviews/sessions/${sessionId}/submit`, {
      questionId,
      code: '// My solution here',
      language: 'javascript',
    }, token);
    console.assert(submit2.status === 200, `Submit 2 failed: ${submit2.body.message}`);
    console.log(`   ✅ Final answer submitted - isComplete: ${submit2.body.data.isComplete}\n`);
  } else {
    console.log('   ✅ Session already complete after first question\n');
  }

  // 10. Get Session (for result page)
  console.log('🔟  Testing session result fetch...');
  const result = await request('GET', `/interviews/sessions/${sessionId}`, null, token);
  console.assert(result.status === 200, `Get session failed: ${result.body.message}`);
  console.log(`   ✅ Session fetched - Status: ${result.body.data.session.status}`);
  if (result.body.data.session.scores) {
    console.log(`   📊 Overall score: ${result.body.data.session.scores.overall}%\n`);
  }

  // 11. Analytics Dashboard
  console.log('1️⃣1️⃣  Testing analytics dashboard...');
  const analytics = await request('GET', '/analytics/dashboard?period=30d', null, token);
  console.assert(analytics.status === 200, `Analytics failed: ${analytics.body.message}`);
  console.log(`   ✅ Analytics fetched - Sessions: ${analytics.body.data.overall?.totalSessions ?? 0}\n`);

  // 12. Session history
  console.log('1️⃣2️⃣  Testing session history...');
  const history = await request('GET', '/interviews/sessions', null, token);
  console.assert(history.status === 200, `History failed: ${history.body.message}`);
  console.log(`   ✅ History fetched - Total: ${history.body.pagination?.total ?? 0} sessions\n`);

  console.log('═══════════════════════════════════════');
  console.log('✅ ALL E2E API TESTS PASSED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
