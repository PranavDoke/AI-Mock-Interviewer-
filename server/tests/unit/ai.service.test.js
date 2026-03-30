describe('AI Service scoring', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      MONGODB_URI: originalEnv.MONGODB_URI || 'mongodb://localhost:27017/ai-mock-interviewer-test',
      JWT_ACCESS_SECRET: originalEnv.JWT_ACCESS_SECRET || 'test-access-secret',
      JWT_REFRESH_SECRET: originalEnv.JWT_REFRESH_SECRET || 'test-refresh-secret',
      AI_PROVIDER: 'mock',
      AI_API_KEY: '',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('caps overall score when test pass rate is below 50%', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const aiService = require('../../src/services/ai.service');

    const result = await aiService.evaluateAnswer({
      question: {
        title: 'Two Sum',
        description: 'Find two numbers.',
      },
      code: 'function twoSum(){ return []; }',
      language: 'javascript',
      explanation: '',
      testResults: [
        { passed: false },
        { passed: false },
        { passed: true },
      ],
    });

    expect(result.testPassRate).toBe(33);
    expect(result.overallScore).toBeLessThanOrEqual(40);
    expect(result.codeCorrectness).toBe(65);
    randomSpy.mockRestore();
  });

  it('gives high score when all tests pass and code quality is solid', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const aiService = require('../../src/services/ai.service');

    const result = await aiService.evaluateAnswer({
      question: {
        title: 'Valid Parentheses',
        description: 'Validate brackets.',
      },
      code: 'function isValid(){ return true; }',
      language: 'javascript',
      explanation: 'I use a stack.',
      testResults: [
        { passed: true },
        { passed: true },
        { passed: true },
      ],
    });

    expect(result.testPassRate).toBe(100);
    expect(result.overallScore).toBeGreaterThan(70);
    randomSpy.mockRestore();
  });
});
