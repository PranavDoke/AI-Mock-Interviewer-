const axios = require('axios');
const config = require('../config/config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

/**
 * Code Execution Service — integrates with Piston API.
 *
 * Piston provides sandboxed execution with:
 * - CPU & memory limits
 * - Timeout protection
 * - Multi-language support
 * - Network isolation
 */

// Language to Piston runtime mapping
const LANGUAGE_MAP = {
  javascript: { language: 'javascript', version: '18.15.0', aliases: ['js', 'node'] },
  python: { language: 'python', version: '3.12.0', aliases: ['py', 'python3'] },
  cpp: { language: 'c++', version: '10.2.0', aliases: ['cpp', 'g++'] },
  java: { language: 'java', version: '15.0.2', aliases: ['java'] },
  c: { language: 'c', version: '10.2.0', aliases: ['c', 'gcc'] },
};

// Execution limits
const LIMITS = {
  timeout: 3000,        // 3 seconds max execution time (Piston run_timeout limit)
  memoryLimit: 256 * 1024 * 1024,  // 256 MB memory limit (bytes)
  maxOutputSize: 65536, // 64 KB max output
  compileTimeout: 10000, // 10 seconds for compilation (Piston hard limit)
};

/**
 * Get available runtimes from Piston.
 */
const getRuntimes = async () => {
  try {
    const response = await axios.get(`${config.piston.url}/api/v2/runtimes`);
    return response.data;
  } catch (error) {
    logger.error(`Piston runtimes fetch failed: ${error.message}`);
    throw new ApiError(503, 'Code execution service unavailable.');
  }
};

/**
 * Execute code in Piston sandbox.
 *
 * @param {string} code - Source code to execute
 * @param {string} language - Programming language ('javascript', 'python', etc.)
 * @param {string} input - Standard input for the program
 * @returns {Object} Execution result with stdout, stderr, exitCode, etc.
 */
const executeCode = async (code, language, input = '') => {
  const langConfig = LANGUAGE_MAP[language];
  if (!langConfig) {
    throw new ApiError(400, `Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_MAP).join(', ')}`);
  }

  // Validate code length
  if (code.length > 50000) {
    throw new ApiError(400, 'Code exceeds maximum size limit (50KB).');
  }

  try {
    const startTime = Date.now();

    const response = await axios.post(
      `${config.piston.url}/api/v2/execute`,
      {
        language: langConfig.language,
        version: langConfig.version,
        files: [
          {
            name: getFileName(language),
            content: code,
          },
        ],
        stdin: input,
        run_timeout: LIMITS.timeout,
        compile_timeout: LIMITS.compileTimeout,
        compile_memory_limit: LIMITS.memoryLimit,
        run_memory_limit: LIMITS.memoryLimit,
      },
      {
        timeout: LIMITS.timeout + 5000, // HTTP timeout slightly longer than execution timeout
      }
    );

    const result = response.data;
    const executionTimeMs = Date.now() - startTime;

    return {
      mode: 'stdin',
      stdout: truncateOutput(result.run?.stdout || ''),
      stderr: truncateOutput(result.run?.stderr || ''),
      exitCode: result.run?.code ?? -1,
      executionTimeMs,
      memoryUsedKb: null, // Piston doesn't report memory usage directly
      timedOut: result.run?.signal === 'SIGKILL',
      compileOutput: result.compile?.stderr || result.compile?.stdout || '',
      language,
      version: result.language_version || langConfig.version,
    };
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        mode: 'stdin',
        stdout: '',
        stderr: 'Execution timed out.',
        exitCode: -1,
        executionTimeMs: LIMITS.timeout,
        timedOut: true,
        language,
      };
    }

    if (error.response?.status === 400) {
      throw new ApiError(400, `Execution error: ${error.response.data?.message || 'Invalid request'}`);
    }

    logger.error(`Piston execution error: ${error.message}`);
    throw new ApiError(503, 'Code execution service unavailable. Please try again later.');
  }
};

/**
 * Run code against test cases.
 *
 * @param {string} code - Source code
 * @param {string} language - Language
 * @param {Object[]} testCases - Array of { input, expectedOutput }
 * @returns {Object[]} Test results
 */
const runTestCases = async (code, language, testCases) => {
  const results = [];

  for (let i = 0; i < testCases.length; i += 1) {
    const testCase = testCases[i];
    try {
      const execResult = await executeCode(code, language, testCase.input);

      const actualOutput = execResult.stdout.trim();
      const expectedOutput = testCase.expectedOutput.trim();

      results.push({
        index: i,
        input: testCase.input,
        expectedOutput,
        actualOutput,
        passed: actualOutput === expectedOutput,
        executionTimeMs: execResult.executionTimeMs,
        stderr: execResult.stderr,
        timedOut: execResult.timedOut,
        isHidden: Boolean(testCase.isHidden),
      });
    } catch (error) {
      results.push({
        index: i,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: '',
        passed: false,
        error: error.message,
        isHidden: Boolean(testCase.isHidden),
      });
    }
  }

  return results;
};

const runTestCasesWithSummary = async (code, language, testCases) => {
  if (!testCases || testCases.length === 0) {
    throw new ApiError(400, 'No test cases provided.');
  }

  const testCaseResults = await runTestCases(code, language, testCases);
  const totalTests = testCaseResults.length;
  const passedTests = testCaseResults.filter((result) => result.passed).length;
  const failedTests = totalTests - passedTests;
  const hiddenTests = testCaseResults.filter((result) => result.isHidden).length;
  const executionTimeMs = testCaseResults.reduce(
    (sum, result) => sum + (result.executionTimeMs || 0),
    0
  );

  return {
    mode: 'testCases',
    language,
    testCaseResults,
    summary: {
      totalTests,
      passedTests,
      failedTests,
      hiddenTests,
      passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
    },
    executionTimeMs,
  };
};

/**
 * Health check for Piston service.
 */
const healthCheck = async () => {
  try {
    const response = await axios.get(`${config.piston.url}/api/v2/runtimes`, { timeout: 5000 });
    return {
      status: 'healthy',
      runtimes: response.data.length,
    };
  } catch {
    return {
      status: 'unhealthy',
      runtimes: 0,
    };
  }
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function getFileName(language) {
  const extensions = {
    javascript: 'solution.js',
    python: 'solution.py',
    cpp: 'solution.cpp',
    java: 'Solution.java',
    c: 'solution.c',
  };
  return extensions[language] || 'solution.txt';
}

function truncateOutput(output) {
  if (output.length > LIMITS.maxOutputSize) {
    return output.substring(0, LIMITS.maxOutputSize) + '\n... [output truncated]';
  }
  return output;
}

module.exports = {
  executeCode,
  runTestCases,
  runTestCasesWithSummary,
  getRuntimes,
  healthCheck,
  LANGUAGE_MAP,
};
