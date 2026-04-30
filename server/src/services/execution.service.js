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
  default: {
    timeout: 3000,
    memoryLimit: 256000,
    compileTimeout: 10000,
  },
  java: {
    timeout: 8000,
    memoryLimit: -1,
    compileTimeout: 10000,
  },
  maxOutputSize: 65536, // 64 KB max output
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
  const limits = getExecutionLimits(language);
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
        run_timeout: limits.timeout,
        compile_timeout: limits.compileTimeout,
        compile_memory_limit: limits.memoryLimit,
        run_memory_limit: limits.memoryLimit,
      },
      {
        timeout: limits.timeout + 5000, // HTTP timeout slightly longer than execution timeout
      }
    );

    const result = response.data;
    const executionTimeMs = Date.now() - startTime;

    return {
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
        stdout: '',
        stderr: 'Execution timed out.',
        exitCode: -1,
        executionTimeMs: limits.timeout,
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

  for (const testCase of testCases) {
    try {
      const execResult = await executeCode(code, language, testCase.input);

      const actualOutput = execResult.stdout.trim();
      const expectedOutput = testCase.expectedOutput.trim();

      results.push({
        input: testCase.input,
        expectedOutput,
        actualOutput,
        passed: actualOutput === expectedOutput,
        executionTimeMs: execResult.executionTimeMs,
        stderr: execResult.stderr,
        timedOut: execResult.timedOut,
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: '',
        passed: false,
        error: error.message,
      });
    }
  }

  return results;
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

function getExecutionLimits(language) {
  if (language === 'java') {
    return LIMITS.java;
  }
  return LIMITS.default;
}

module.exports = {
  executeCode,
  runTestCases,
  getRuntimes,
  healthCheck,
  LANGUAGE_MAP,
};
