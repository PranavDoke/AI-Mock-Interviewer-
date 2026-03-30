const axios = require('axios');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
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
  memoryLimit: 256000,  // 256 MB memory limit
  maxOutputSize: 65536, // 64 KB max output
  compileTimeout: 10000, // 10 seconds for compilation (Piston hard limit)
};

const PISTON_BASE_URLS = Array.from(
  new Set(
    [
      config.piston.url,
      'http://localhost:2000',
      'http://127.0.0.1:2000',
      'http://piston:2000',
    ].filter(Boolean)
  )
);

const createPistonClient = (baseURL) =>
  axios.create({
    baseURL,
    timeout: LIMITS.timeout + 5000,
  });

const isConnectivityError = (error) => {
  if (!error) return false;
  return (
    !error.response &&
    ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code)
  );
};

const withPistonFallback = async (operation) => {
  let lastError;

  for (const baseURL of PISTON_BASE_URLS) {
    const client = createPistonClient(baseURL);
    try {
      const result = await operation(client, baseURL);
      return result;
    } catch (error) {
      lastError = error;
      if (!isConnectivityError(error)) {
        throw error;
      }
      logger.warn(`Piston unavailable at ${baseURL}: ${error.message}`);
    }
  }

  throw lastError;
};

/**
 * Get available runtimes from Piston.
 */
const getRuntimes = async () => {
  try {
    const response = await withPistonFallback((client) => client.get('/api/v2/runtimes'));
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

    const response = await withPistonFallback((client) =>
      client.post('/api/v2/execute', {
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
      })
    );

    const result = response.data;
    const executionTimeMs = Date.now() - startTime;
    const stdout = truncateOutput(result.run?.stdout || '');
    const stderr = truncateOutput(result.run?.stderr || '');
    const compileOutput = result.compile?.stderr || result.compile?.stdout || '';
    const exitCode = result.run?.code ?? -1;
    const signal = result.run?.signal || null;

    const synthesizedError =
      exitCode !== 0 && !stdout.trim() && !stderr.trim() && !compileOutput.trim()
        ? buildNoOutputFailureMessage({ exitCode, signal, language })
        : '';

    if (shouldUseLocalFallback({ signal, stdout, stderr, compileOutput, language })) {
      const localResult = await executeLocallyInDev(code, language, input);
      if (localResult) {
        return applyNoOutputSuccessHint(localResult, { language, code });
      }
    }

    const hintedStderr = addExecutionHintIfNeeded({
      language,
      stderr,
      compileOutput,
    });

    const apiResult = {
      stdout,
      stderr: hintedStderr || synthesizedError,
      exitCode,
      executionTimeMs,
      memoryUsedKb: null, // Piston doesn't report memory usage directly
      timedOut: signal === 'SIGKILL',
      signal,
      compileOutput,
      language,
      version: result.language_version || langConfig.version,
    };

    return applyNoOutputSuccessHint(apiResult, { language, code });
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
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
    const response = await withPistonFallback((client) => client.get('/api/v2/runtimes'));
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

function buildNoOutputFailureMessage({ exitCode, signal, language }) {
  const base = `Execution failed (exit code: ${exitCode}${signal ? `, signal: ${signal}` : ''}) with no runtime error output.`;

  if (signal === 'SIGKILL') {
    const inputHint = language === 'javascript' || language === 'python'
      ? 'If your solution reads stdin, provide input in "Custom Input" (for array problems, try space/newline separated numbers instead of JSON brackets).'
      : 'If your solution reads stdin, provide the expected input format in "Custom Input".';

    return `${base} The process was killed due to time/resource limits. This usually means an infinite loop or waiting for missing input. ${inputHint}`;
  }

  return base;
}

function shouldUseLocalFallback({ signal, stdout, stderr, compileOutput, language }) {
  if (config.env === 'production') return false;
  if (!['javascript', 'python', 'java'].includes(language)) return false;

  const noOutput = !`${stdout || ''}`.trim() && !`${stderr || ''}`.trim() && !`${compileOutput || ''}`.trim();
  return signal === 'SIGKILL' && noOutput;
}

async function executeLocallyInDev(code, language, input) {
  try {
    logger.warn(`Piston returned fatal SIGKILL without output for ${language}; trying local dev fallback.`);

    if (language === 'javascript') {
      return await runJavaScriptLocally(code, input);
    }
    if (language === 'python') {
      return await runPythonLocally(code, input);
    }
    if (language === 'java') {
      return await runJavaLocally(code, input);
    }

    return null;
  } catch (error) {
    logger.warn(`Local fallback failed for ${language}: ${error.message}`);
    return null;
  }
}

async function runJavaScriptLocally(code, input) {
  return withTempDir(async (dir) => {
    const file = path.join(dir, 'solution.js');
    await fs.writeFile(file, code, 'utf8');

    const result = await runWithCandidates([
      { command: 'node', args: [file] },
    ], input);

    return normalizeLocalResult(result, 'javascript', 'local-node');
  });
}

async function runPythonLocally(code, input) {
  return withTempDir(async (dir) => {
    const file = path.join(dir, 'solution.py');
    await fs.writeFile(file, code, 'utf8');

    const result = await runWithCandidates([
      { command: 'python', args: [file] },
      { command: 'py', args: ['-3', file] },
    ], input);

    return normalizeLocalResult(result, 'python', 'local-python');
  });
}

async function runJavaLocally(code, input) {
  return withTempDir(async (dir) => {
    const sourceFile = path.join(dir, 'Solution.java');
    await fs.writeFile(sourceFile, code, 'utf8');

    const compile = await runWithCandidates([
      { command: 'javac', args: [sourceFile] },
    ], '');

    if ((compile.code ?? -1) !== 0) {
      const rawCompileOutput = (compile.stderr || compile.stdout || '').trim();
      const cleanedCompileOutput = sanitizeLocalStderr(rawCompileOutput, 'java');
      const hintedCompileOutput = addExecutionHintIfNeeded({
        language: 'java',
        stderr: cleanedCompileOutput,
        compileOutput: cleanedCompileOutput,
      });

      return {
        stdout: '',
        stderr: truncateOutput(hintedCompileOutput || 'Compilation failed.'),
        exitCode: compile.code ?? -1,
        executionTimeMs: compile.executionTimeMs,
        memoryUsedKb: null,
        timedOut: !!compile.timedOut,
        signal: compile.signal || null,
        compileOutput: truncateOutput(hintedCompileOutput || ''),
        language: 'java',
        version: 'local-java',
      };
    }

    const run = await runWithCandidates([
      { command: 'java', args: ['-cp', dir, 'Solution'] },
    ], input);

    return normalizeLocalResult(run, 'java', 'local-java', compile.stdout || '');
  });
}

async function withTempDir(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aimi-exec-'));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function runWithCandidates(candidates, input) {
  let lastError;

  for (const candidate of candidates) {
    try {
      return await runProcess(candidate.command, candidate.args, input);
    } catch (error) {
      lastError = error;
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  throw lastError || new Error('No executable candidate found.');
}

function runProcess(command, args, input) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, LIMITS.timeout);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        code,
        signal,
        stdout,
        stderr,
        timedOut,
        executionTimeMs: Date.now() - startedAt,
      });
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

function normalizeLocalResult(result, language, version, compileOutput = '') {
  const stdout = truncateOutput(stripAnsi(result.stdout || ''));
  const cleanedStderr = sanitizeLocalStderr(result.stderr || '', language);
  const stderr = truncateOutput(cleanedStderr);
  const exitCode = result.code ?? -1;

  return {
    stdout,
    stderr,
    exitCode,
    executionTimeMs: result.executionTimeMs,
    memoryUsedKb: null,
    timedOut: !!result.timedOut,
    signal: result.signal || null,
    compileOutput: truncateOutput(compileOutput || ''),
    language,
    version,
  };
}

function sanitizeLocalStderr(stderr, language) {
  if (!stderr) return '';

  if (language === 'java') {
    return stderr
      .split('\n')
      .filter((line) => !line.startsWith('Picked up JAVA_TOOL_OPTIONS:'))
      .join('\n')
      .trim();
  }

  return stderr;
}

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function applyNoOutputSuccessHint(execResult, { language, code }) {
  const stdoutText = `${execResult.stdout || ''}`.trim();
  const stderrText = `${execResult.stderr || ''}`.trim();
  const successWithNoOutput = (execResult.exitCode ?? -1) === 0 && !stdoutText && !stderrText;

  if (!successWithNoOutput) {
    return execResult;
  }

  const hint = buildNoOutputSuccessHint({ language, code });
  if (!hint) {
    return execResult;
  }

  return {
    ...execResult,
    stdout: hint,
  };
}

function buildNoOutputSuccessHint({ language, code }) {
  const source = `${code || ''}`;

  if (language === 'javascript') {
    const hasFunctionLike = /(function\s+\w+\s*\(|\bconst\s+\w+\s*=\s*\([^)]*\)\s*=>|\blet\s+\w+\s*=\s*\([^)]*\)\s*=>|\bvar\s+\w+\s*=\s*\([^)]*\)\s*=>)/.test(source);
    const hasOutput = /console\.log\s*\(|process\.stdout\.write\s*\(/.test(source);
    if (hasFunctionLike && !hasOutput) {
      return 'Program ran successfully but produced no output. Add console.log(...) or call your function and print the result.';
    }
  }

  if (language === 'python') {
    const hasDef = /^\s*def\s+\w+\s*\(/m.test(source);
    const hasOutput = /\bprint\s*\(/.test(source);
    if (hasDef && !hasOutput) {
      return 'Program ran successfully but produced no output. Add print(...) or call your function and print the result.';
    }
  }

  if (language === 'java') {
    const hasOutput = /System\.out\.(print|println)\s*\(/.test(source);
    if (!hasOutput) {
      return 'Program ran successfully but produced no output. Add System.out.println(...) in main (or print the return value of your method).';
    }
  }

  return '';
}

function addExecutionHintIfNeeded({ language, stderr, compileOutput }) {
  const stderrText = `${stderr || ''}`.trim();
  const compileText = `${compileOutput || ''}`.trim();

  if (language !== 'java') {
    return stderrText;
  }

  const mainMethodMissing = /main method not found/i.test(stderrText)
    || /main method not found/i.test(compileText)
    || /could not find or load main class/i.test(stderrText)
    || /unnamed classes are a preview feature/i.test(stderrText)
    || /unnamed classes are a preview feature/i.test(compileText);

  if (!mainMethodMissing) {
    return stderrText;
  }

  const hint = 'Java runner expects a full executable program. Add: public class Solution { public static void main(String[] args) { ... } }';
  return stderrText ? `${stderrText}\nHint: ${hint}` : `Hint: ${hint}`;
}

module.exports = {
  executeCode,
  runTestCases,
  getRuntimes,
  healthCheck,
  LANGUAGE_MAP,
};
