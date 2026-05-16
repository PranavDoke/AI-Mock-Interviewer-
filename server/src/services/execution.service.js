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
  javascript: {
    timeout: 5000,
    memoryLimit: -1,
    compileTimeout: 10000,
  },
  python: {
    timeout: 5000,
    memoryLimit: -1,
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
    const runMessage = result.run?.message || '';
    const runStderr = result.run?.stderr || '';
    const effectiveStderr = runStderr || (result.run?.code === null ? runMessage : '');
    const timedOut = /timed\s*out/i.test(runMessage) || executionTimeMs >= limits.timeout;

    return {
      stdout: truncateOutput(result.run?.stdout || ''),
      stderr: truncateOutput(effectiveStderr),
      exitCode: result.run?.code ?? -1,
      executionTimeMs,
      memoryUsedKb: result.run?.memory ?? null,
      timedOut,
      compileOutput: result.compile?.stderr || result.compile?.stdout || '',
      runtimeMessage: runMessage,
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

    // Piston not available - return error
    logger.warn(`Piston execution error: ${error.message} - Piston service may be unavailable`);
    return {
      stdout: '',
      stderr: `Piston API unavailable. Please ensure Piston is running at ${config.piston.url}`,
      exitCode: -1,
      executionTimeMs: 0,
      timedOut: false,
      language,
      pistonUnavailable: true,
    };
  }
};

/**
 * Normalize output before comparison.
 * Keeps comparison deterministic across whitespace and JSON formatting differences.
 */
function normalizeOutput(output) {
  try {
    return JSON.stringify(JSON.parse(String(output)));
  } catch {
    return String(output).trim();
  }
}

function parseJsonLoose(value) {
  const text = String(value ?? '').trim();
  if (!text) return { parsed: false, value: '' };

  try {
    return { parsed: true, value: JSON.parse(text) };
  } catch {
    // Continue with lightweight primitives and JSON-like substrings.
  }

  // Accept outputs such as "Merged Intervals: [[1, 6], [8, 10]]".
  const firstArray = text.indexOf('[');
  const firstObject = text.indexOf('{');
  const starts = [firstArray, firstObject].filter((idx) => idx >= 0);
  if (starts.length) {
    const start = Math.min(...starts);
    const endArray = text.lastIndexOf(']');
    const endObject = text.lastIndexOf('}');
    const end = Math.max(endArray, endObject);
    if (end > start) {
      try {
        return { parsed: true, value: JSON.parse(text.slice(start, end + 1)) };
      } catch {
        // Keep falling through to primitive/string matching.
      }
    }
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return { parsed: true, value: Number(text) };
  }
  if (/^(true|false)$/i.test(text)) {
    return { parsed: true, value: /^true$/i.test(text) };
  }

  const quoted = text.match(/^(["'])(.*)\1$/s);
  if (quoted) {
    return { parsed: true, value: quoted[2] };
  }

  return { parsed: false, value: text };
}

function deepEqual(a, b) {
  if (a === b) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (!deepEqual(aKeys, bKeys)) return false;
    return aKeys.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

function canonicalizeForUnordered(value) {
  if (Array.isArray(value)) {
    return value
      .map(canonicalizeForUnordered)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalizeForUnordered(value[key]);
        return acc;
      }, {});
  }

  return value;
}

function normalizeTreeArray(value) {
  if (!Array.isArray(value)) return value;
  const copy = [...value];
  while (copy.length && copy[copy.length - 1] === null) {
    copy.pop();
  }
  return copy;
}

function normalizeNQueensBoard(value) {
  if (!Array.isArray(value)) return value;

  return value.map((solution) => {
    if (!Array.isArray(solution)) return solution;
    return solution.map((row) => (Array.isArray(row) ? row.join('') : String(row)));
  });
}

function compareLongestPalindrome(actual, expected, input) {
  const actualText = typeof actual === 'string' ? actual : String(actual ?? '');
  const expectedText = typeof expected === 'string' ? expected : String(expected ?? '');
  const parsedInput = parseJsonLoose(splitTopLevelComma(String(input || ''))[0] || input);
  const source = parsedInput.parsed && typeof parsedInput.value === 'string'
    ? parsedInput.value
    : String(input || '').replace(/^["']|["']$/g, '');

  if (actualText.length !== expectedText.length) return false;
  if (!source.includes(actualText)) return false;
  return actualText === actualText.split('').reverse().join('');
}

function compareOutputs(actualOutput, expectedOutput, comparisonMode = 'exact', input = '') {
  const parsedActual = parseJsonLoose(actualOutput);
  const parsedExpected = parseJsonLoose(expectedOutput);
  const normalizedActual = normalizeOutput(actualOutput);
  const normalizedExpected = normalizeOutput(expectedOutput);

  let passed;

  if (parsedActual.parsed && parsedExpected.parsed) {
    if (comparisonMode === 'unorderedDeep') {
      passed = deepEqual(
        canonicalizeForUnordered(parsedActual.value),
        canonicalizeForUnordered(parsedExpected.value)
      );
    } else if (comparisonMode === 'treeArray') {
      passed = deepEqual(
        normalizeTreeArray(parsedActual.value),
        normalizeTreeArray(parsedExpected.value)
      );
    } else if (comparisonMode === 'nQueens') {
      passed = deepEqual(
        canonicalizeForUnordered(normalizeNQueensBoard(parsedActual.value)),
        canonicalizeForUnordered(normalizeNQueensBoard(parsedExpected.value))
      );
    } else if (comparisonMode === 'longestPalindrome') {
      passed = compareLongestPalindrome(parsedActual.value, parsedExpected.value, input);
    } else {
      passed = deepEqual(parsedActual.value, parsedExpected.value);
    }
  } else if (comparisonMode === 'longestPalindrome') {
    passed = compareLongestPalindrome(parsedActual.value, parsedExpected.value, input);
  } else {
    passed = normalizedActual === normalizedExpected;
  }

  return {
    passed,
    parsedActual,
    parsedExpected,
    normalizedActual,
    normalizedExpected,
  };
}

function splitTopLevelComma(input) {
  const out = [];
  let cur = '';
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let inString = false;
  let quote = '';

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const prev = input[i - 1];

    if (inString) {
      cur += ch;
      if (ch === quote && prev !== '\\') {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      cur += ch;
      continue;
    }

    if (ch === '(') depthParen += 1;
    else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
    else if (ch === '[') depthBracket += 1;
    else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);
    else if (ch === '{') depthBrace += 1;
    else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);

    if (ch === ',' && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      continue;
    }

    cur += ch;
  }

  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseJavaMethodSignature(code) {
  const re = /public\s+(static\s+)?([\w<>\[\], ?]+?)\s+(\w+)\s*\(([^)]*)\)/g;
  let match;
  do {
    match = re.exec(code);
  } while (match && match[3] === 'main');

  if (!match) return null;

  const paramsRaw = match[4].trim();
  const params = paramsRaw
    ? splitTopLevelComma(paramsRaw).map((segment) => {
        const cleaned = segment.trim().replace(/\s+/g, ' ');
        const parts = cleaned.split(' ');
        const name = parts.pop();
        const type = parts.join(' ');
        return { type, name };
      })
    : [];

  return {
    isStatic: Boolean(match[1]),
    returnType: match[2].trim(),
    funcName: match[3],
    params,
  };
}

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let inString = false;
  let quote = '';

  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    const prev = text[i - 1];

    if (inString) {
      if (ch === quote && prev !== '\\') {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function extractJavaImports(code) {
  return (String(code).match(/^\s*import\s+[^;]+;\s*$/gm) || []).join('\n');
}

function stripJavaImports(code) {
  return String(code).replace(/^\s*import\s+[^;]+;\s*$/gm, '').trim();
}

function removeJavaMainMethod(code) {
  const mainRe = /public\s+static\s+void\s+main\s*\(\s*String\s*(?:\[\]\s*\w+|\w+\s*\[\])\s*\)\s*\{/m;
  const match = mainRe.exec(code);
  if (!match) return code;

  const openIndex = match.index + match[0].lastIndexOf('{');
  const closeIndex = findMatchingBrace(code, openIndex);
  if (closeIndex === -1) return code;

  return `${code.slice(0, match.index)}\n${code.slice(closeIndex + 1)}`.trim();
}

function extractJavaUserBody(code) {
  const withoutImports = stripJavaImports(code);
  const classMatch = /(?:public\s+)?class\s+\w+[^{]*\{/m.exec(withoutImports);
  if (!classMatch) return withoutImports;

  const openIndex = classMatch.index + classMatch[0].lastIndexOf('{');
  const closeIndex = findMatchingBrace(withoutImports, openIndex);
  if (closeIndex === -1) return withoutImports;

  const classBody = withoutImports.slice(openIndex + 1, closeIndex);
  return removeJavaMainMethod(classBody);
}

function toJavaValue(type, rawValue) {
  const value = String(rawValue ?? '').trim();
  const normalizedType = String(type || '').replace(/\s+/g, '');

  if (normalizedType === 'int[]' || normalizedType === 'Integer[]') {
    const content = value.replace(/^\[/, '').replace(/\]$/, '');
    return normalizedType === 'Integer[]' ? `new Integer[]{${content}}` : `new int[]{${content}}`;
  }

  if (normalizedType === 'int[][]' || normalizedType === 'Integer[][]') {
    const inner = value
      .trim()
      .replace(/^\[\[/, '')
      .replace(/\]\]$/, '')
      .replace(/\]\s*,\s*\[/g, '},{');
    return normalizedType === 'Integer[][]' ? `new Integer[][]{{${inner}}}` : `new int[][]{{${inner}}}`;
  }

  if (normalizedType === 'String[]') {
    const parsed = parseJsonLoose(value);
    if (parsed.parsed && Array.isArray(parsed.value)) {
      return `new String[]{${parsed.value.map((item) => JSON.stringify(String(item))).join(',')}}`;
    }
  }

  if (normalizedType === 'char[]') {
    const parsed = parseJsonLoose(value);
    if (parsed.parsed && Array.isArray(parsed.value)) {
      return `new char[]{${parsed.value.map((item) => `'${String(item)[0] || ' '}'`).join(',')}}`;
    }
  }

  if (normalizedType === 'char[][]') {
    const parsed = parseJsonLoose(value);
    if (parsed.parsed && Array.isArray(parsed.value)) {
      const rows = parsed.value
        .map((row) => `{${row.map((item) => `'${String(item)[0] || ' '}'`).join(',')}}`)
        .join(',');
      return `new char[][]{${rows}}`;
    }
  }

  if (normalizedType === 'List<String>' || normalizedType === 'ArrayList<String>') {
    const parsed = parseJsonLoose(value);
    if (parsed.parsed && Array.isArray(parsed.value)) {
      return `new java.util.ArrayList<>(java.util.Arrays.asList(${parsed.value
        .map((item) => JSON.stringify(String(item)))
        .join(',')}))`;
    }
  }

  if (normalizedType === 'List<Integer>' || normalizedType === 'ArrayList<Integer>') {
    const parsed = parseJsonLoose(value);
    if (parsed.parsed && Array.isArray(parsed.value)) {
      return `new java.util.ArrayList<>(java.util.Arrays.asList(${parsed.value.join(',')}))`;
    }
  }

  if (normalizedType === 'String') {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.replace(/^'/, '"').replace(/'$/, '"');
    }
    return `"${value}"`;
  }

  if (normalizedType === 'boolean' || normalizedType === 'Boolean') {
    return /^true$/i.test(value) ? 'true' : 'false';
  }

  return value;
}

function parseNamedParams(testInput) {
  const result = [];
  const items = splitTopLevelComma(String(testInput || ''));
  for (const item of items) {
    const eq = item.indexOf('=');
    if (eq <= 0) continue;
    const name = item.slice(0, eq).trim();
    const value = item.slice(eq + 1).trim();
    if (name) result.push({ name, value });
  }
  return result;
}

function parseJsFunctionSignature(code) {
  const functionMatch = String(code).match(/function\s+(\w+)\s*\(([^)]*)\)/);
  if (functionMatch) {
    return {
      funcName: functionMatch[1],
      params: splitTopLevelComma(functionMatch[2]).map((name) => name.trim()).filter(Boolean),
    };
  }

  const arrowMatch = String(code).match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:\(([^)]*)\)|(\w+))\s*=>/);
  if (arrowMatch) {
    const paramsRaw = arrowMatch[2] || arrowMatch[3] || '';
    return {
      funcName: arrowMatch[1],
      params: splitTopLevelComma(paramsRaw).map((name) => name.trim()).filter(Boolean),
    };
  }

  return null;
}

function parsePythonFunctionSignature(code) {
  const match = String(code).match(/def\s+(\w+)\s*\(([^)]*)\)\s*:/);
  if (!match) return null;

  const params = splitTopLevelComma(match[2])
    .map((segment) => segment.trim().split('=').shift().trim())
    .map((segment) => segment.split(':').shift().trim())
    .filter((name) => name && name !== 'self');

  return {
    funcName: match[1],
    params,
  };
}

function valueToPythonLiteral(value) {
  if (value === null) return 'None';
  if (Array.isArray(value)) {
    return `[${value.map(valueToPythonLiteral).join(', ')}]`;
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${valueToPythonLiteral(item)}`);
    return `{${entries.join(', ')}}`;
  }
  return 'None';
}

function toPythonLiteral(rawValue) {
  const parsed = parseJsonLoose(rawValue);
  if (parsed.parsed) {
    return valueToPythonLiteral(parsed.value);
  }

  return String(rawValue ?? '')
    .replace(/\btrue\b/g, 'True')
    .replace(/\bfalse\b/g, 'False')
    .replace(/\bnull\b/g, 'None');
}

function valuesForParams(testInput, params) {
  const namedParams = parseNamedParams(testInput);
  if (namedParams.length > 0) {
    return params.map((param) => {
      const found = namedParams.find((item) => item.name === param);
      return found ? found.value : '';
    });
  }

  const trimmedInput = String(testInput || '').trim();
  if (params.length <= 1) return [trimmedInput];
  return splitTopLevelComma(trimmedInput);
}

function javaIntegerArray(rawValue) {
  const parsed = parseJsonLoose(rawValue);
  if (!parsed.parsed || !Array.isArray(parsed.value)) return 'new Integer[]{}';
  const values = parsed.value.map((item) => (item === null ? 'null' : String(item))).join(',');
  return `new Integer[]{${values}}`;
}

function javaIntArray(rawValue) {
  const parsed = parseJsonLoose(rawValue);
  if (!parsed.parsed || !Array.isArray(parsed.value)) return 'new int[]{}';
  return `new int[]{${parsed.value.map((item) => Number(item) || 0).join(',')}}`;
}

function javaIntMatrix(rawValue) {
  const parsed = parseJsonLoose(rawValue);
  if (!parsed.parsed || !Array.isArray(parsed.value)) return 'new int[][]{}';
  const rows = parsed.value
    .map((row) => `{${(Array.isArray(row) ? row : []).map((item) => Number(item) || 0).join(',')}}`)
    .join(',');
  return `new int[][]{${rows}}`;
}

function javaOutputHelpers() {
  return String.raw`
    private static String __aiToOutputString(Object value) {
        if (value == null) return "null";
        if (value instanceof String) return __aiQuote((String) value);
        if (value instanceof Character) return __aiQuote(String.valueOf(value));
        if (value instanceof Number || value instanceof Boolean) return String.valueOf(value);
        if (value instanceof java.util.Collection<?>) {
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            for (Object item : (java.util.Collection<?>) value) {
                if (!first) sb.append(",");
                sb.append(__aiToOutputString(item));
                first = false;
            }
            sb.append("]");
            return sb.toString();
        }
        if (value instanceof int[]) return java.util.Arrays.toString((int[]) value);
        if (value instanceof int[][]) return java.util.Arrays.deepToString((int[][]) value);
        if (value instanceof long[]) return java.util.Arrays.toString((long[]) value);
        if (value instanceof double[]) return java.util.Arrays.toString((double[]) value);
        if (value instanceof boolean[]) return java.util.Arrays.toString((boolean[]) value);
        if (value instanceof char[]) {
            StringBuilder sb = new StringBuilder("[");
            char[] arr = (char[]) value;
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(__aiQuote(String.valueOf(arr[i])));
            }
            sb.append("]");
            return sb.toString();
        }
        if (value instanceof char[][]) {
            StringBuilder sb = new StringBuilder("[");
            char[][] arr = (char[][]) value;
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(__aiToOutputString(arr[i]));
            }
            sb.append("]");
            return sb.toString();
        }
        if (value instanceof Object[]) {
            StringBuilder sb = new StringBuilder("[");
            Object[] arr = (Object[]) value;
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(__aiToOutputString(arr[i]));
            }
            sb.append("]");
            return sb.toString();
        }
        return String.valueOf(value);
    }

    private static String __aiQuote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }`;
}

function jsTreeHelpers() {
  return `
class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}
function __aiBuildTree(values) {
  if (!values || values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let i = 1;
  while (queue.length && i < values.length) {
    const node = queue.shift();
    if (values[i] !== null && values[i] !== undefined) {
      node.left = new TreeNode(values[i]);
      queue.push(node.left);
    }
    i += 1;
    if (i < values.length && values[i] !== null && values[i] !== undefined) {
      node.right = new TreeNode(values[i]);
      queue.push(node.right);
    }
    i += 1;
  }
  return root;
}
function __aiFindTreeNode(root, val) {
  if (!root) return null;
  if (root.val === val) return root;
  return __aiFindTreeNode(root.left, val) || __aiFindTreeNode(root.right, val);
}
function __aiTreeToArray(root) {
  if (!root) return [];
  const out = [];
  const queue = [root];
  while (queue.length) {
    const node = queue.shift();
    if (!node) {
      out.push(null);
    } else {
      out.push(node.val);
      queue.push(node.left);
      queue.push(node.right);
    }
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}`;
}

function pythonTreeHelpers() {
  return `
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def __ai_build_tree(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    i = 1
    while queue and i < len(values):
        node = queue.pop(0)
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root

def __ai_find_tree_node(root, val):
    if root is None:
        return None
    if root.val == val:
        return root
    return __ai_find_tree_node(root.left, val) or __ai_find_tree_node(root.right, val)

def __ai_tree_to_array(root):
    if root is None:
        return []
    out = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node is None:
            out.append(None)
        else:
            out.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out`;
}

function javaTreeHelpers() {
  return `
    static class TreeNode {
        int val;
        TreeNode left;
        TreeNode right;
        TreeNode(int val) { this.val = val; }
    }

    private static TreeNode __aiBuildTree(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        java.util.Queue<TreeNode> queue = new java.util.LinkedList<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            TreeNode node = queue.poll();
            if (i < values.length && values[i] != null) {
                node.left = new TreeNode(values[i]);
                queue.add(node.left);
            }
            i++;
            if (i < values.length && values[i] != null) {
                node.right = new TreeNode(values[i]);
                queue.add(node.right);
            }
            i++;
        }
        return root;
    }

    private static TreeNode __aiFindTreeNode(TreeNode root, int val) {
        if (root == null) return null;
        if (root.val == val) return root;
        TreeNode left = __aiFindTreeNode(root.left, val);
        return left != null ? left : __aiFindTreeNode(root.right, val);
    }

    private static java.util.List<Integer> __aiTreeToList(TreeNode root) {
        java.util.List<Integer> out = new java.util.ArrayList<>();
        if (root == null) return out;
        java.util.Queue<TreeNode> queue = new java.util.LinkedList<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            if (node == null) {
                out.add(null);
            } else {
                out.add(node.val);
                queue.add(node.left);
                queue.add(node.right);
            }
        }
        while (!out.isEmpty() && out.get(out.size() - 1) == null) {
            out.remove(out.size() - 1);
        }
        return out;
    }`;
}

function wrapTreeHarness(code, language, testInput, question) {
  const title = question?.title || '';
  const values = valuesForParams(testInput, title.includes('Lowest Common Ancestor') || title.includes('Kth Smallest')
    ? ['root', 'p', 'q']
    : title === 'Same Tree'
      ? ['p', 'q']
      : title === 'Path Sum'
        ? ['root', 'targetSum']
        : title === 'Construct Binary Tree from Preorder and Inorder'
          ? ['preorder', 'inorder']
    : ['root']);

  if (language === 'javascript') {
    const signature = parseJsFunctionSignature(code);
    if (!signature) return code;
    const treeValue = values[0] || '[]';
    let invocation = `const root = __aiBuildTree(${treeValue});\n`;
    if (title.includes('Lowest Common Ancestor')) {
      invocation += `const result = ${signature.funcName}(root, __aiFindTreeNode(root, ${values[1]}), __aiFindTreeNode(root, ${values[2]}));\nconsole.log(JSON.stringify(result ? result.val : null));`;
    } else if (title.includes('Kth Smallest')) {
      invocation += `const result = ${signature.funcName}(root, ${values[1]});\nconsole.log(JSON.stringify(result));`;
    } else if (title === 'Same Tree') {
      invocation = `const p = __aiBuildTree(${values[0] || '[]'});\nconst q = __aiBuildTree(${values[1] || '[]'});\nconst result = ${signature.funcName}(p, q);\nconsole.log(JSON.stringify(result));`;
    } else if (title === 'Path Sum') {
      invocation += `const result = ${signature.funcName}(root, ${values[1]});\nconsole.log(JSON.stringify(result));`;
    } else if (title === 'Construct Binary Tree from Preorder and Inorder') {
      invocation = `const result = ${signature.funcName}(${values[0] || '[]'}, ${values[1] || '[]'});\nconsole.log(JSON.stringify(__aiTreeToArray(result)));`;
    } else if (title === 'Invert Binary Tree') {
      invocation += `const result = ${signature.funcName}(root);\nconsole.log(JSON.stringify(__aiTreeToArray(result)));`;
    } else {
      invocation += `const result = ${signature.funcName}(root);\nconsole.log(JSON.stringify(result));`;
    }
    return `${jsTreeHelpers()}\n${code}\n${invocation}`;
  }

  if (language === 'python') {
    const signature = parsePythonFunctionSignature(code);
    if (!signature) return code;
    const treeValue = toPythonLiteral(values[0] || '[]');
    let invocation = `root = __ai_build_tree(${treeValue})\n`;
    if (title.includes('Lowest Common Ancestor')) {
      invocation += `result = ${signature.funcName}(root, __ai_find_tree_node(root, ${values[1]}), __ai_find_tree_node(root, ${values[2]}))\nprint(json.dumps(result.val if result else None))`;
    } else if (title.includes('Kth Smallest')) {
      invocation += `result = ${signature.funcName}(root, ${values[1]})\nprint(json.dumps(result))`;
    } else if (title === 'Same Tree') {
      invocation = `p = __ai_build_tree(${toPythonLiteral(values[0] || '[]')})\nq = __ai_build_tree(${toPythonLiteral(values[1] || '[]')})\nresult = ${signature.funcName}(p, q)\nprint(json.dumps(result))`;
    } else if (title === 'Path Sum') {
      invocation += `result = ${signature.funcName}(root, ${values[1]})\nprint(json.dumps(result))`;
    } else if (title === 'Construct Binary Tree from Preorder and Inorder') {
      invocation = `result = ${signature.funcName}(${toPythonLiteral(values[0] || '[]')}, ${toPythonLiteral(values[1] || '[]')})\nprint(json.dumps(__ai_tree_to_array(result)))`;
    } else if (title === 'Invert Binary Tree') {
      invocation += `result = ${signature.funcName}(root)\nprint(json.dumps(__ai_tree_to_array(result)))`;
    } else {
      invocation += `result = ${signature.funcName}(root)\nprint(json.dumps(result))`;
    }
    return `import json\n${pythonTreeHelpers()}\n${code}\nif __name__ == "__main__":\n    ${invocation.replace(/\n/g, '\n    ')}`;
  }

  if (language === 'java') {
    const imports = extractJavaImports(code);
    const userBody = extractJavaUserBody(code);
    const signature = parseJavaMethodSignature(userBody);
    if (!signature) return code;
    const treeValue = javaIntegerArray(values[0] || '[]');
    let invocation = `Integer[] values = ${treeValue};\n        TreeNode root = __aiBuildTree(values);\n        `;
    if (title.includes('Lowest Common Ancestor')) {
      invocation += `TreeNode result = test.${signature.funcName}(root, __aiFindTreeNode(root, ${values[1]}), __aiFindTreeNode(root, ${values[2]}));\n        System.out.println(__aiToOutputString(result == null ? null : result.val));`;
    } else if (title.includes('Kth Smallest')) {
      invocation += `Object result = test.${signature.funcName}(root, ${values[1]});\n        System.out.println(__aiToOutputString(result));`;
    } else if (title === 'Same Tree') {
      invocation = `TreeNode p = __aiBuildTree(${javaIntegerArray(values[0] || '[]')});\n        TreeNode q = __aiBuildTree(${javaIntegerArray(values[1] || '[]')});\n        Object result = test.${signature.funcName}(p, q);\n        System.out.println(__aiToOutputString(result));`;
    } else if (title === 'Path Sum') {
      invocation += `Object result = test.${signature.funcName}(root, ${values[1]});\n        System.out.println(__aiToOutputString(result));`;
    } else if (title === 'Construct Binary Tree from Preorder and Inorder') {
      invocation = `TreeNode result = test.${signature.funcName}(${javaIntArray(values[0] || '[]')}, ${javaIntArray(values[1] || '[]')});\n        System.out.println(__aiToOutputString(__aiTreeToList(result)));`;
    } else if (title === 'Invert Binary Tree') {
      invocation += `TreeNode result = test.${signature.funcName}(root);\n        System.out.println(__aiToOutputString(__aiTreeToList(result)));`;
    } else {
      invocation += `Object result = test.${signature.funcName}(root);\n        System.out.println(__aiToOutputString(result));`;
    }

    return `${imports ? `${imports}\n` : ''}import java.util.*;

public class TestClass {
    ${javaTreeHelpers()}
    ${userBody}
    ${javaOutputHelpers()}

    public static void main(String[] args) {
        TestClass test = new TestClass();
        ${invocation}
    }
}`;
  }

  return code;
}

function wrapCodecHarness(code, language, testInput) {
  if (language === 'javascript') {
    return `${jsTreeHelpers()}\n${code}\nconst root = __aiBuildTree(${testInput});\nconst result = deserialize(serialize(root));\nconsole.log(JSON.stringify(__aiTreeToArray(result)));`;
  }

  if (language === 'python') {
    return `import json\n${pythonTreeHelpers()}\n${code}\nif __name__ == "__main__":\n    root = __ai_build_tree(${toPythonLiteral(testInput)})\n    result = deserialize(serialize(root))\n    print(json.dumps(__ai_tree_to_array(result)))`;
  }

  if (language === 'java') {
    const imports = extractJavaImports(code);
    const userBody = extractJavaUserBody(code);
    return `${imports ? `${imports}\n` : ''}import java.util.*;

public class TestClass {
    ${javaTreeHelpers()}
    ${userBody}
    ${javaOutputHelpers()}

    public static void main(String[] args) {
        TestClass test = new TestClass();
        TreeNode root = __aiBuildTree(${javaIntegerArray(testInput)});
        TreeNode result = test.deserialize(test.serialize(root));
        System.out.println(__aiToOutputString(__aiTreeToList(result)));
    }
}`;
  }

  return code;
}

function jsGraphHelpers() {
  return `
class Node {
  constructor(val = 0, neighbors = []) {
    this.val = val;
    this.neighbors = neighbors;
  }
}
function __aiBuildGraph(adjList) {
  if (!adjList || adjList.length === 0) return null;
  const nodes = adjList.map((_, i) => new Node(i + 1));
  adjList.forEach((neighbors, i) => {
    nodes[i].neighbors = neighbors.map((val) => nodes[val - 1]);
  });
  return nodes[0];
}
function __aiSerializeGraph(node) {
  if (!node) return [];
  const map = new Map();
  const queue = [node];
  map.set(node.val, node);
  while (queue.length) {
    const cur = queue.shift();
    for (const next of cur.neighbors || []) {
      if (!map.has(next.val)) {
        map.set(next.val, next);
        queue.push(next);
      }
    }
  }
  const size = Math.max(...map.keys(), 0);
  const out = Array.from({ length: size }, () => []);
  for (const [val, cur] of map) {
    out[val - 1] = (cur.neighbors || []).map((next) => next.val);
  }
  return out;
}`;
}

function pythonGraphHelpers() {
  return `
class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

def __ai_build_graph(adj_list):
    if not adj_list:
        return None
    nodes = [Node(i + 1) for i in range(len(adj_list))]
    for i, neighbors in enumerate(adj_list):
        nodes[i].neighbors = [nodes[val - 1] for val in neighbors]
    return nodes[0]

def __ai_serialize_graph(node):
    if node is None:
        return []
    seen = {node.val: node}
    queue = [node]
    while queue:
        cur = queue.pop(0)
        for nxt in cur.neighbors:
            if nxt.val not in seen:
                seen[nxt.val] = nxt
                queue.append(nxt)
    out = [[] for _ in range(max(seen.keys()) if seen else 0)]
    for val, cur in seen.items():
        out[val - 1] = [nxt.val for nxt in cur.neighbors]
    return out`;
}

function javaGraphHelpers() {
  return `
    static class Node {
        public int val;
        public java.util.List<Node> neighbors;
        public Node() { val = 0; neighbors = new java.util.ArrayList<>(); }
        public Node(int val) { this.val = val; neighbors = new java.util.ArrayList<>(); }
        public Node(int val, java.util.ArrayList<Node> neighbors) { this.val = val; this.neighbors = neighbors; }
    }

    private static Node __aiBuildGraph(int[][] adjList) {
        if (adjList.length == 0) return null;
        Node[] nodes = new Node[adjList.length];
        for (int i = 0; i < adjList.length; i++) nodes[i] = new Node(i + 1);
        for (int i = 0; i < adjList.length; i++) {
            for (int val : adjList[i]) nodes[i].neighbors.add(nodes[val - 1]);
        }
        return nodes[0];
    }

    private static java.util.List<java.util.List<Integer>> __aiSerializeGraph(Node node) {
        java.util.List<java.util.List<Integer>> out = new java.util.ArrayList<>();
        if (node == null) return out;
        java.util.Map<Integer, Node> seen = new java.util.HashMap<>();
        java.util.Queue<Node> queue = new java.util.LinkedList<>();
        seen.put(node.val, node);
        queue.add(node);
        while (!queue.isEmpty()) {
            Node cur = queue.poll();
            for (Node next : cur.neighbors) {
                if (!seen.containsKey(next.val)) {
                    seen.put(next.val, next);
                    queue.add(next);
                }
            }
        }
        int size = 0;
        for (Integer key : seen.keySet()) size = Math.max(size, key);
        for (int i = 0; i < size; i++) out.add(new java.util.ArrayList<>());
        for (java.util.Map.Entry<Integer, Node> entry : seen.entrySet()) {
            java.util.List<Integer> neighbors = out.get(entry.getKey() - 1);
            for (Node next : entry.getValue().neighbors) neighbors.add(next.val);
        }
        return out;
    }`;
}

function wrapGraphCloneHarness(code, language, testInput) {
  if (language === 'javascript') {
    const signature = parseJsFunctionSignature(code);
    if (!signature) return code;
    return `${jsGraphHelpers()}\n${code}\nconst node = __aiBuildGraph(${testInput});\nconst result = ${signature.funcName}(node);\nconsole.log(JSON.stringify(__aiSerializeGraph(result)));`;
  }

  if (language === 'python') {
    const signature = parsePythonFunctionSignature(code);
    if (!signature) return code;
    return `import json\n${pythonGraphHelpers()}\n${code}\nif __name__ == "__main__":\n    node = __ai_build_graph(${toPythonLiteral(testInput)})\n    result = ${signature.funcName}(node)\n    print(json.dumps(__ai_serialize_graph(result)))`;
  }

  if (language === 'java') {
    const imports = extractJavaImports(code);
    const userBody = extractJavaUserBody(code);
    const signature = parseJavaMethodSignature(userBody);
    if (!signature) return code;
    return `${imports ? `${imports}\n` : ''}import java.util.*;

public class TestClass {
    ${javaGraphHelpers()}
    ${userBody}
    ${javaOutputHelpers()}

    public static void main(String[] args) {
        TestClass test = new TestClass();
        Node node = __aiBuildGraph(${toJavaValue('int[][]', testInput)});
        Node result = test.${signature.funcName}(node);
        System.out.println(__aiToOutputString(__aiSerializeGraph(result)));
    }
}`;
  }

  return code;
}

function jsLinkedListHelpers() {
  return `
class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}
function __aiBuildList(values) {
  const dummy = new ListNode(0);
  let cur = dummy;
  for (const val of values || []) {
    cur.next = new ListNode(val);
    cur = cur.next;
  }
  return dummy.next;
}
function __aiBuildCycleList(values, pos) {
  const nodes = [];
  const dummy = new ListNode(0);
  let cur = dummy;
  for (const val of values || []) {
    cur.next = new ListNode(val);
    cur = cur.next;
    nodes.push(cur);
  }
  if (pos >= 0 && nodes[pos]) cur.next = nodes[pos];
  return dummy.next;
}
function __aiListToArray(head) {
  const out = [];
  const seen = new Set();
  let cur = head;
  while (cur && !seen.has(cur) && out.length < 10000) {
    seen.add(cur);
    out.push(cur.val);
    cur = cur.next;
  }
  return out;
}`;
}

function pythonLinkedListHelpers() {
  return `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def __ai_build_list(values):
    dummy = ListNode(0)
    cur = dummy
    for val in values or []:
        cur.next = ListNode(val)
        cur = cur.next
    return dummy.next

def __ai_build_cycle_list(values, pos):
    nodes = []
    dummy = ListNode(0)
    cur = dummy
    for val in values or []:
        cur.next = ListNode(val)
        cur = cur.next
        nodes.append(cur)
    if pos >= 0 and pos < len(nodes):
        cur.next = nodes[pos]
    return dummy.next

def __ai_list_to_array(head):
    out = []
    seen = set()
    cur = head
    while cur is not None and id(cur) not in seen and len(out) < 10000:
        seen.add(id(cur))
        out.append(cur.val)
        cur = cur.next
    return out`;
}

function javaLinkedListHelpers() {
  return `
    static class ListNode {
        int val;
        ListNode next;
        ListNode() {}
        ListNode(int val) { this.val = val; }
        ListNode(int val, ListNode next) { this.val = val; this.next = next; }
    }

    private static ListNode __aiBuildList(int[] values) {
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy;
        for (int val : values) {
            cur.next = new ListNode(val);
            cur = cur.next;
        }
        return dummy.next;
    }

    private static ListNode __aiBuildCycleList(int[] values, int pos) {
        java.util.List<ListNode> nodes = new java.util.ArrayList<>();
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy;
        for (int val : values) {
            cur.next = new ListNode(val);
            cur = cur.next;
            nodes.add(cur);
        }
        if (pos >= 0 && pos < nodes.size()) cur.next = nodes.get(pos);
        return dummy.next;
    }

    private static java.util.List<Integer> __aiListToList(ListNode head) {
        java.util.List<Integer> out = new java.util.ArrayList<>();
        java.util.Set<ListNode> seen = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        ListNode cur = head;
        while (cur != null && !seen.contains(cur) && out.size() < 10000) {
            seen.add(cur);
            out.add(cur.val);
            cur = cur.next;
        }
        return out;
    }`;
}

function wrapLinkedListHarness(code, language, testInput, question = {}) {
  const title = question?.title || '';
  const params = title === 'Merge Two Sorted Lists' || title === 'Add Two Numbers'
    ? ['list1', 'list2']
    : title === 'Linked List Cycle'
      ? ['head', 'pos']
      : title === 'Remove Nth Node From End'
        ? ['head', 'n']
        : title === 'Merge K Sorted Lists'
          ? ['lists']
          : ['head'];
  const values = valuesForParams(testInput, params);

  if (language === 'javascript') {
    const signature = parseJsFunctionSignature(code);
    if (!signature) return code;
    let setup = '';
    let call = '';
    let output = 'console.log(JSON.stringify(__aiListToArray(result === undefined ? head : result)));';

    if (title === 'Merge Two Sorted Lists' || title === 'Add Two Numbers') {
      setup = `const list1 = __aiBuildList(${values[0] || '[]'});\nconst list2 = __aiBuildList(${values[1] || '[]'});`;
      call = `const result = ${signature.funcName}(list1, list2);`;
    } else if (title === 'Linked List Cycle') {
      setup = `const head = __aiBuildCycleList(${values[0] || '[]'}, ${values[1] ?? -1});`;
      call = `const result = ${signature.funcName}(head);`;
      output = 'console.log(JSON.stringify(result));';
    } else if (title === 'Remove Nth Node From End') {
      setup = `const head = __aiBuildList(${values[0] || '[]'});`;
      call = `const result = ${signature.funcName}(head, ${values[1]});`;
    } else if (title === 'Merge K Sorted Lists') {
      setup = `const lists = (${values[0] || '[]'}).map(__aiBuildList);`;
      call = `const result = ${signature.funcName}(lists);`;
    } else {
      setup = `const head = __aiBuildList(${values[0] || '[]'});`;
      call = `const result = ${signature.funcName}(head);`;
      if (title === 'Palindrome Linked List') output = 'console.log(JSON.stringify(result));';
    }

    return `${jsLinkedListHelpers()}\n${code}\n${setup}\n${call}\n${output}`;
  }

  if (language === 'python') {
    const signature = parsePythonFunctionSignature(code);
    if (!signature) return code;
    let setup = '';
    let call = '';
    let output = 'print(json.dumps(__ai_list_to_array(result if result is not None else head)))';

    if (title === 'Merge Two Sorted Lists' || title === 'Add Two Numbers') {
      setup = `list1 = __ai_build_list(${toPythonLiteral(values[0] || '[]')})\nlist2 = __ai_build_list(${toPythonLiteral(values[1] || '[]')})`;
      call = `result = ${signature.funcName}(list1, list2)`;
    } else if (title === 'Linked List Cycle') {
      setup = `head = __ai_build_cycle_list(${toPythonLiteral(values[0] || '[]')}, ${values[1] ?? -1})`;
      call = `result = ${signature.funcName}(head)`;
      output = 'print(json.dumps(result))';
    } else if (title === 'Remove Nth Node From End') {
      setup = `head = __ai_build_list(${toPythonLiteral(values[0] || '[]')})`;
      call = `result = ${signature.funcName}(head, ${values[1]})`;
    } else if (title === 'Merge K Sorted Lists') {
      setup = `lists = [__ai_build_list(item) for item in ${toPythonLiteral(values[0] || '[]')}]`;
      call = `result = ${signature.funcName}(lists)`;
    } else {
      setup = `head = __ai_build_list(${toPythonLiteral(values[0] || '[]')})`;
      call = `result = ${signature.funcName}(head)`;
      if (title === 'Palindrome Linked List') output = 'print(json.dumps(result))';
    }

    return `import json\n${pythonLinkedListHelpers()}\n${code}\nif __name__ == "__main__":\n    ${setup.replace(/\n/g, '\n    ')}\n    ${call}\n    ${output}`;
  }

  if (language === 'java') {
    const imports = extractJavaImports(code);
    const userBody = extractJavaUserBody(code);
    const signature = parseJavaMethodSignature(userBody);
    if (!signature) return code;
    let invocation = '';

    if (title === 'Merge Two Sorted Lists' || title === 'Add Two Numbers') {
      invocation = `ListNode list1 = __aiBuildList(${javaIntArray(values[0] || '[]')});\n        ListNode list2 = __aiBuildList(${javaIntArray(values[1] || '[]')});\n        ListNode result = test.${signature.funcName}(list1, list2);\n        System.out.println(__aiToOutputString(__aiListToList(result)));`;
    } else if (title === 'Linked List Cycle') {
      invocation = `ListNode head = __aiBuildCycleList(${javaIntArray(values[0] || '[]')}, ${values[1] ?? -1});\n        Object result = test.${signature.funcName}(head);\n        System.out.println(__aiToOutputString(result));`;
    } else if (title === 'Remove Nth Node From End') {
      invocation = `ListNode head = __aiBuildList(${javaIntArray(values[0] || '[]')});\n        ListNode result = test.${signature.funcName}(head, ${values[1]});\n        System.out.println(__aiToOutputString(__aiListToList(result)));`;
    } else if (title === 'Merge K Sorted Lists') {
      invocation = `int[][] rawLists = ${javaIntMatrix(values[0] || '[]')};\n        ListNode[] lists = new ListNode[rawLists.length];\n        for (int i = 0; i < rawLists.length; i++) lists[i] = __aiBuildList(rawLists[i]);\n        ListNode result = test.${signature.funcName}(lists);\n        System.out.println(__aiToOutputString(__aiListToList(result)));`;
    } else if (title === 'Palindrome Linked List') {
      invocation = `ListNode head = __aiBuildList(${javaIntArray(values[0] || '[]')});\n        Object result = test.${signature.funcName}(head);\n        System.out.println(__aiToOutputString(result));`;
    } else if (title === 'Reorder List') {
      invocation = `ListNode head = __aiBuildList(${javaIntArray(values[0] || '[]')});\n        test.${signature.funcName}(head);\n        System.out.println(__aiToOutputString(__aiListToList(head)));`;
    } else {
      invocation = `ListNode head = __aiBuildList(${javaIntArray(values[0] || '[]')});\n        ListNode result = test.${signature.funcName}(head);\n        System.out.println(__aiToOutputString(__aiListToList(result)));`;
    }

    return `${imports ? `${imports}\n` : ''}import java.util.*;

public class TestClass {
    ${javaLinkedListHelpers()}
    ${userBody}
    ${javaOutputHelpers()}

    public static void main(String[] args) {
        TestClass test = new TestClass();
        ${invocation}
    }
}`;
  }

  return code;
}

function operationInput(testInput) {
  const parts = splitTopLevelComma(String(testInput || ''));
  const operations = parseJsonLoose(parts[0]).value || [];
  const args = parseJsonLoose(parts[1]).value || [];
  return { operations, args };
}

function javaOperationArgs(args) {
  return (args || []).map((arg) => {
    if (Array.isArray(arg)) {
      return `new int[]{${arg.join(',')}}`;
    }
    if (typeof arg === 'string') {
      return JSON.stringify(arg);
    }
    if (arg === null || arg === undefined) return 'null';
    return String(arg);
  });
}

function wrapOperationsHarness(code, language, testInput) {
  const { operations, args } = operationInput(testInput);
  if (!operations.length) return code;
  const className = operations[0];

  if (language === 'javascript') {
    return `${code}
const __aiOps = ${JSON.stringify(operations)};
const __aiArgs = ${JSON.stringify(args)};
const __aiObj = new ${className}(...__aiArgs[0]);
const __aiOut = [null];
for (let i = 1; i < __aiOps.length; i += 1) {
  const value = __aiObj[__aiOps[i]](...__aiArgs[i]);
  __aiOut.push(value === undefined ? null : value);
}
console.log(JSON.stringify(__aiOut));`;
  }

  if (language === 'python') {
    return `import json\n${code}\nif __name__ == "__main__":\n    __ai_ops = ${valueToPythonLiteral(operations)}\n    __ai_args = ${valueToPythonLiteral(args)}\n    __ai_obj = globals()[__ai_ops[0]](*__ai_args[0])\n    __ai_out = [None]\n    for i in range(1, len(__ai_ops)):\n        value = getattr(__ai_obj, __ai_ops[i])(*__ai_args[i])\n        __ai_out.append(value)\n    print(json.dumps(__ai_out))`;
  }

  if (language === 'java') {
    const imports = extractJavaImports(code);
    const userBody = stripJavaImports(code)
      .replace(new RegExp(`public\\s+class\\s+${className}\\b`), `class ${className}`)
      .trim();
    const declarations = [];
    const outputLines = [`Object[] __aiOut = new Object[${operations.length}];`];
    const ctorArgs = javaOperationArgs(args[0] || []);
    declarations.push(`${className} __aiObj = new ${className}(${ctorArgs.join(', ')});`);
    outputLines.push('__aiOut[0] = null;');

    for (let i = 1; i < operations.length; i += 1) {
      const op = operations[i];
      const callArgs = javaOperationArgs(args[i] || []).join(', ');
      if (['get', 'search', 'startsWith', 'findMedian'].includes(op)) {
        outputLines.push(`__aiOut[${i}] = __aiObj.${op}(${callArgs});`);
      } else {
        outputLines.push(`__aiObj.${op}(${callArgs});`);
        outputLines.push(`__aiOut[${i}] = null;`);
      }
    }

    return `${imports ? `${imports}\n` : ''}import java.util.*;

public class TestClass {
    ${javaOutputHelpers()}

    public static void main(String[] args) {
        ${declarations.join('\n        ')}
        ${outputLines.join('\n        ')}
        System.out.println(__aiToOutputString(__aiOut));
    }
}

${userBody}`;
  }

  return code;
}

function wrapSpecialHarness(code, language, testInput, question = {}) {
  switch (question.testHarness) {
    case 'tree':
      return wrapTreeHarness(code, language, testInput, question);
    case 'codec':
      return wrapCodecHarness(code, language, testInput);
    case 'graph-clone':
      return wrapGraphCloneHarness(code, language, testInput);
    case 'operations':
      return wrapOperationsHarness(code, language, testInput);
    case 'linked-list':
      return wrapLinkedListHarness(code, language, testInput, question);
    default:
      return null;
  }
}

/**
 * Wrap code with test harness to call function with parameters.
 * Extracts parameters from test input string and creates executable code.
 */
function wrapCodeWithTestHarness(code, language, testInput, question = {}) {
  const specialWrapped = wrapSpecialHarness(code, language, testInput, question);
  if (specialWrapped) return specialWrapped;

  if (language === 'java') {
    const imports = extractJavaImports(code);
    const userBody = extractJavaUserBody(code);
    const signature = parseJavaMethodSignature(userBody);
    if (!signature) return code;

    const namedParams = parseNamedParams(testInput);
    const hasNamedParams = namedParams.length > 0;
    let rawValues = [];

    if (!hasNamedParams) {
      const trimmedInput = String(testInput || '').trim();
      rawValues = signature.params.length <= 1 ? [trimmedInput] : splitTopLevelComma(trimmedInput);
    }

    const paramDecl = [];
    const funcCall = [];

    signature.params.forEach((param, idx) => {
      const named = hasNamedParams ? namedParams.find((p) => p.name === param.name) : null;
      const raw = named ? named.value : (rawValues[idx] ?? rawValues[0] ?? '');
      const javaValue = toJavaValue(param.type, raw);
      paramDecl.push(`${param.type} ${param.name} = ${javaValue};`);
      funcCall.push(param.name);
    });

    const receiver = signature.isStatic ? 'TestClass' : 'test';
    const methodCall = `${receiver}.${signature.funcName}(${funcCall.join(', ')})`;
    const invocation = signature.returnType === 'void'
      ? `${methodCall};\n        System.out.println(__aiToOutputString(${signature.params[0]?.name || 'null'}));`
      : `Object result = ${methodCall};\n        System.out.println(__aiToOutputString(result));`;

    return `${imports ? `${imports}\n` : ''}import java.util.*;

public class TestClass {
    ${userBody}
    ${javaOutputHelpers()}

    public static void main(String[] args) {
        TestClass test = new TestClass();
        ${paramDecl.join('\n        ')}
        ${invocation}
    }
}`;
  }

  if (language === 'python') {
    const signature = parsePythonFunctionSignature(code);
    if (!signature) return code;

    const values = valuesForParams(testInput, signature.params);
    const paramDecl = signature.params
      .map((param, idx) => `    ${param} = ${toPythonLiteral(values[idx] ?? values[0] ?? '')}`)
      .join('\n');
    const funcCall = signature.params.join(', ');
    const fallbackValue = signature.params[0] || 'result';

    return `${code}
if __name__ == "__main__":
    import json
${paramDecl}
    result = ${signature.funcName}(${funcCall})
    if result is None:
        result = ${fallbackValue}
    print(json.dumps(result))`;
  }

  if (language === 'javascript') {
    const signature = parseJsFunctionSignature(code);
    if (!signature) return code;

    const values = valuesForParams(testInput, signature.params);
    const paramDecl = signature.params
      .map((param, idx) => `const ${param} = ${values[idx] ?? values[0] ?? 'undefined'};`)
      .join('\n');
    const funcCall = signature.params.join(', ');
    const fallbackValue = signature.params[0] || 'result';

    return `${code}
${paramDecl}
let result = ${signature.funcName}(${funcCall});
if (result === undefined) result = ${fallbackValue};
console.log(JSON.stringify(result));`;
  }

  return code;
}

/**
 * Run code against test cases.
 *
 * @param {string} code - Source code
 * @param {string} language - Language
 * @param {Object[]} testCases - Array of { input, expectedOutput }
 * @param {Object} question - Question metadata for special test harnesses
 * @returns {Object[]} Test results
 */
const runTestCases = async (code, language, testCases, question = {}) => {
  const results = [];

  for (const testCase of testCases) {
    try {
      // Wrap code with test harness to inject test parameters
      const wrappedCode = wrapCodeWithTestHarness(code, language, testCase.input, question);
      
      const execResult = await executeCode(wrappedCode, language, '');

      // Check if Piston is unavailable
      if (execResult.pistonUnavailable) {
        logger.warn(`⚠ Piston API unavailable - cannot execute test cases`, { 
          pistonUrl: config.piston.url 
        });
        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          passed: false,
          error: `Piston service unavailable at ${config.piston.url}. Please ensure Piston is running or update PISTON_URL in .env`,
          executionTimeMs: 0,
        });
        continue;
      }

      const actualOutput = (execResult.stdout || '').trim();
      const expectedOutput = String(testCase.expectedOutput || '').trim();

      const {
        passed,
        normalizedActual,
        normalizedExpected,
      } = compareOutputs(
        actualOutput,
        expectedOutput,
        testCase.comparisonMode || 'exact',
        testCase.input
      );

      logger.debug(`Test case comparison`, {
        testInput: testCase.input.substring(0, 50),
        expected: expectedOutput.substring(0, 50),
        actual: actualOutput.substring(0, 50),
        normalizedExpected: normalizedExpected.substring(0, 50),
        normalizedActual: normalizedActual.substring(0, 50),
        comparisonMode: testCase.comparisonMode || 'exact',
        passed,
        language
      });

      results.push({
        input: testCase.input,
        expectedOutput,
        actualOutput,
        passed,
        executionTimeMs: execResult.executionTimeMs,
        stderr: execResult.stderr,
        timedOut: execResult.timedOut,
        normalizedActual,
        normalizedExpected,
      });
    } catch (error) {
      logger.error(`Test case execution error: ${error.message}`, { testInput: testCase.input });
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
  if (language === 'javascript') {
    return LIMITS.javascript;
  }
  if (language === 'python') {
    return LIMITS.python;
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
