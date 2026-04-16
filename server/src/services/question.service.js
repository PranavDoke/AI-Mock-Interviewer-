const { Question } = require('../models');
const ApiError = require('../utils/ApiError');
const aiService = require('./ai.service');

/**
 * Create a new question manually.
 */
const createQuestion = async (questionData) => {
  const question = await Question.create(questionData);
  return question;
};

/**
 * Get question by ID.
 */
const getQuestionById = async (questionId) => {
  const question = await Question.findById(questionId);
  if (!question) {
    throw new ApiError(404, 'Question not found.');
  }
  return question;
};

/**
 * List questions with filtering and pagination.
 */
const listQuestions = async ({ page = 1, limit = 20, topic, difficulty, type, search }) => {
  const filter = { isActive: true };

  if (topic) filter.topic = topic;
  if (difficulty) filter.difficulty = parseInt(difficulty, 10);
  if (type) filter.type = type;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [questions, total] = await Promise.all([
    Question.find(filter)
      .sort({ difficulty: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Question.countDocuments(filter),
  ]);

  return { questions, total, page, limit };
};

/**
 * Generate a question using AI and save it.
 */
const generateAndSaveQuestion = async (topic, difficulty, type = 'coding') => {
  const questionData = await aiService.generateQuestion(topic, difficulty, type);

  const question = await Question.create({
    ...questionData,
    source: 'ai-generated',
    isActive: true,
  });

  return question;
};

/**
 * Seed database with initial questions.
 */
const seedQuestions = async () => {
  const count = await Question.countDocuments();
  if (count > 0) return { seeded: false, count };

  const seedData = getSeedQuestions();

  const questions = await Question.insertMany(seedData);
  return { seeded: true, count: questions.length };
};

/**
 * Pre-built seed questions for initial database population.
 */
function getSeedQuestions() {
  return [
    // Arrays - Easy
    {
      title: 'Two Sum',
      description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers that add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\n**Example:**\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].',
      topic: 'arrays',
      difficulty: 2,
      type: 'coding',
      starterCode: {
        javascript: 'function twoSum(nums, target) {\n  // Your code here\n}',
        python: 'def two_sum(nums, target):\n    # Your code here\n    pass',
      },
      testCases: [
        { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isHidden: false, explanation: '2 + 7 = 9' },
        { input: '[3,2,4]\n6', expectedOutput: '[1,2]', isHidden: false, explanation: '2 + 4 = 6' },
        { input: '[3,3]\n6', expectedOutput: '[0,1]', isHidden: true },
      ],
      constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Only one valid answer exists.'],
      hints: ['Try using a hash map to store values you\'ve seen.', 'For each number, check if (target - number) exists in the map.'],
      solutionApproach: 'Use a hash map. For each element, check if target - element exists in the map. If yes, return both indices. Otherwise, add current element to map.',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      expectedKeyPoints: ['Hash map approach', 'Single pass solution', 'O(n) time complexity'],
      tags: ['arrays', 'hash-table', 'easy'],
      estimatedTimeMinutes: 10,
    },
    // Arrays - Medium
    {
      title: 'Maximum Subarray Sum',
      description: 'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\n**Example:**\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: The subarray [4,-1,2,1] has the largest sum 6.',
      topic: 'arrays',
      difficulty: 3,
      type: 'coding',
      starterCode: {
        javascript: 'function maxSubArray(nums) {\n  // Your code here\n}',
        python: 'def max_sub_array(nums):\n    # Your code here\n    pass',
      },
      testCases: [
        { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', isHidden: false },
        { input: '[1]', expectedOutput: '1', isHidden: false },
        { input: '[5,4,-1,7,8]', expectedOutput: '23', isHidden: true },
      ],
      constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
      hints: ['Think about Kadane\'s algorithm.', 'Track the maximum sum ending at each position.'],
      solutionApproach: 'Kadane\'s algorithm: maintain current_sum and max_sum. For each element, current_sum = max(element, current_sum + element). Update max_sum accordingly.',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      expectedKeyPoints: ['Kadane\'s algorithm', 'Dynamic programming approach', 'O(n) single pass'],
      tags: ['arrays', 'dynamic-programming', 'medium'],
      estimatedTimeMinutes: 15,
    },
    // Strings - Easy
    {
      title: 'Valid Palindrome',
      description: 'Given a string `s`, return `true` if it is a palindrome after converting all uppercase letters to lowercase and removing all non-alphanumeric characters.\n\n**Example:**\nInput: s = "A man, a plan, a canal: Panama"\nOutput: true\nExplanation: "amanaplanacanalpanama" is a palindrome.',
      topic: 'strings',
      difficulty: 2,
      type: 'coding',
      starterCode: {
        javascript: 'function isPalindrome(s) {\n  // Your code here\n}',
        python: 'def is_palindrome(s):\n    # Your code here\n    pass',
      },
      testCases: [
        { input: 'A man, a plan, a canal: Panama', expectedOutput: 'true', isHidden: false },
        { input: 'race a car', expectedOutput: 'false', isHidden: false },
        { input: ' ', expectedOutput: 'true', isHidden: true },
      ],
      constraints: ['1 <= s.length <= 2 * 10^5', 's consists only of printable ASCII characters.'],
      hints: ['Use two pointers from both ends.', 'Skip non-alphanumeric characters.'],
      solutionApproach: 'Two pointer technique. Start from both ends, skip non-alphanumeric chars, compare lowercase versions.',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      tags: ['strings', 'two-pointers', 'easy'],
      estimatedTimeMinutes: 10,
    },
    // Trees - Medium
    {
      title: 'Binary Tree Level Order Traversal',
      description: 'Given the root of a binary tree, return the level order traversal of its nodes\' values (i.e., from left to right, level by level).\n\n**Example:**\nInput: root = [3,9,20,null,null,15,7]\nOutput: [[3],[9,20],[15,7]]',
      topic: 'trees',
      difficulty: 3,
      type: 'coding',
      starterCode: {
        javascript: 'function levelOrder(root) {\n  // Your code here\n}',
        python: 'def level_order(root):\n    # Your code here\n    pass',
      },
      testCases: [
        { input: '[3,9,20,null,null,15,7]', expectedOutput: '[[3],[9,20],[15,7]]', isHidden: false },
        { input: '[1]', expectedOutput: '[[1]]', isHidden: false },
        { input: '[]', expectedOutput: '[]', isHidden: true },
      ],
      constraints: ['0 <= number of nodes <= 2000', '-1000 <= Node.val <= 1000'],
      hints: ['Use BFS with a queue.', 'Process all nodes at the same level before moving to the next.'],
      solutionApproach: 'BFS using a queue. For each level, process all nodes currently in the queue, collect their values, and enqueue their children.',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      tags: ['trees', 'bfs', 'medium'],
      estimatedTimeMinutes: 15,
    },
    // Dynamic Programming - Hard
    {
      title: 'Longest Common Subsequence',
      description: 'Given two strings `text1` and `text2`, return the length of their longest common subsequence. A subsequence is a sequence that can be derived from another sequence by deleting some or no elements without changing the order of the remaining elements.\n\n**Example:**\nInput: text1 = "abcde", text2 = "ace"\nOutput: 3\nExplanation: The longest common subsequence is "ace".',
      topic: 'dynamic-programming',
      difficulty: 4,
      type: 'coding',
      starterCode: {
        javascript: 'function longestCommonSubsequence(text1, text2) {\n  // Your code here\n}',
        python: 'def longest_common_subsequence(text1, text2):\n    # Your code here\n    pass',
      },
      testCases: [
        { input: 'abcde\nace', expectedOutput: '3', isHidden: false },
        { input: 'abc\nabc', expectedOutput: '3', isHidden: false },
        { input: 'abc\ndef', expectedOutput: '0', isHidden: true },
      ],
      constraints: ['1 <= text1.length, text2.length <= 1000', 'Strings consist of lowercase English characters.'],
      hints: ['Think about 2D DP table.', 'If characters match, extend the LCS. Otherwise, take the max.'],
      solutionApproach: '2D DP. dp[i][j] = LCS of text1[:i] and text2[:j]. If text1[i-1] == text2[j-1], dp[i][j] = dp[i-1][j-1] + 1. Else, dp[i][j] = max(dp[i-1][j], dp[i][j-1]).',
      timeComplexity: 'O(m*n)',
      spaceComplexity: 'O(m*n)',
      tags: ['dynamic-programming', 'strings', 'hard'],
      estimatedTimeMinutes: 25,
    },
    // Sorting - Easy
    {
      title: 'Sort an Array',
      description: 'Given an array of integers `nums`, sort the array in ascending order and return it. You must solve the problem without using any built-in sort functions.\n\n**Example:**\nInput: nums = [5,2,3,1]\nOutput: [1,2,3,5]',
      topic: 'sorting',
      difficulty: 2,
      type: 'coding',
      starterCode: {
        javascript: 'function sortArray(nums) {\n  // Your code here\n}',
        python: 'def sort_array(nums):\n    # Your code here\n    pass',
      },
      testCases: [
        { input: '[5,2,3,1]', expectedOutput: '[1,2,3,5]', isHidden: false },
        { input: '[5,1,1,2,0,0]', expectedOutput: '[0,0,1,1,2,5]', isHidden: false },
      ],
      constraints: ['1 <= nums.length <= 5 * 10^4', '-5 * 10^4 <= nums[i] <= 5 * 10^4'],
      hints: ['Implement merge sort or quick sort.', 'Merge sort has guaranteed O(n log n) time.'],
      solutionApproach: 'Implement merge sort: recursively split array in half, sort each half, and merge.',
      timeComplexity: 'O(n log n)',
      spaceComplexity: 'O(n)',
      tags: ['sorting', 'divide-and-conquer', 'easy'],
      estimatedTimeMinutes: 15,
    },
    // Graphs - Medium
    {
      title: 'Number of Islands',
      description: 'Given an m x n 2D binary grid which represents a map of "1"s (land) and "0"s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.\n\n**Example:**\nInput: grid = [\n  ["1","1","0","0","0"],\n  ["1","1","0","0","0"],\n  ["0","0","1","0","0"],\n  ["0","0","0","1","1"]\n]\nOutput: 3',
      topic: 'graphs',
      difficulty: 3,
      type: 'coding',
      starterCode: {
        javascript: 'function numIslands(grid) {\n  // Your code here\n}',
        python: 'def num_islands(grid):\n    # Your code here\n    pass',
      },
      testCases: [
        { input: '[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', expectedOutput: '3', isHidden: false },
        { input: '[["1","1","1"],["0","1","0"],["1","1","1"]]', expectedOutput: '1', isHidden: true },
      ],
      constraints: ['m == grid.length', 'n == grid[i].length', '1 <= m, n <= 300'],
      hints: ['Use DFS or BFS to explore each island.', 'Mark visited cells to avoid counting them again.'],
      solutionApproach: 'Iterate through grid. When a "1" is found, increment counter and use DFS/BFS to mark all connected "1"s as visited.',
      timeComplexity: 'O(m*n)',
      spaceComplexity: 'O(m*n)',
      tags: ['graphs', 'dfs', 'bfs', 'medium'],
      estimatedTimeMinutes: 20,
    },
    // Conceptual - Easy
    {
      title: 'Explain Time Complexity',
      description: 'Explain the concept of time complexity in algorithms. Cover:\n1. What is Big O notation?\n2. Common time complexities (O(1), O(n), O(n log n), O(n²))\n3. How to analyze the time complexity of a simple loop\n4. Why time complexity matters in software engineering\n\nProvide examples for each complexity class.',
      topic: 'arrays',
      difficulty: 1,
      type: 'conceptual',
      expectedKeyPoints: [
        'Big O measures upper bound of growth rate',
        'O(1) - constant time, array access',
        'O(n) - linear, single loop',
        'O(n log n) - merge sort, efficient sorting',
        'O(n²) - nested loops, bubble sort',
        'Helps predict performance at scale',
      ],
      rubric: { understanding: 30, examples: 25, clarity: 25, depth: 20 },
      tags: ['fundamentals', 'time-complexity', 'conceptual'],
      estimatedTimeMinutes: 10,
    },
    // Hash Tables - Medium
    {
      title: 'Group Anagrams',
      description: 'Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.\n\n**Example:**\nInput: strs = ["eat","tea","tan","ate","nat","bat"]\nOutput: [["bat"],["nat","tan"],["ate","eat","tea"]]',
      topic: 'hash-tables',
      difficulty: 3,
      type: 'coding',
      starterCode: {
        javascript: 'function groupAnagrams(strs) {\n  // Your code here\n}',
        python: 'def group_anagrams(strs):\n    # Your code here\n    pass',
      },
      testCases: [
        { input: '["eat","tea","tan","ate","nat","bat"]', expectedOutput: '[["eat","tea","ate"],["tan","nat"],["bat"]]', isHidden: false },
        { input: '[""]', expectedOutput: '[[""]]', isHidden: false },
        { input: '["a"]', expectedOutput: '[["a"]]', isHidden: true },
      ],
      constraints: ['1 <= strs.length <= 10^4', '0 <= strs[i].length <= 100'],
      hints: ['Sort each string and use it as a hash key.', 'Alternatively, use character frequency as key.'],
      solutionApproach: 'Sort each string alphabetically and use as hash map key. Group strings with the same sorted key.',
      timeComplexity: 'O(n * k log k) where k is max string length',
      spaceComplexity: 'O(n * k)',
      tags: ['hash-tables', 'strings', 'sorting', 'medium'],
      estimatedTimeMinutes: 15,
    },
    // Recursion - Medium
    {
      title: 'Generate Parentheses',
      description: 'Given `n` pairs of parentheses, write a function to generate all combinations of well-formed parentheses.\n\n**Example:**\nInput: n = 3\nOutput: ["((()))","(()())","(())()","()(())","()()()"]',
      topic: 'recursion',
      difficulty: 3,
      type: 'coding',
      starterCode: {
        javascript: 'function generateParenthesis(n) {\n  // Your code here\n}',
        python: 'def generate_parenthesis(n):\n    # Your code here\n    pass',
      },
      testCases: [
        { input: '3', expectedOutput: '["((()))","(()())","(())()","()(())","()()()"]', isHidden: false },
        { input: '1', expectedOutput: '["()"]', isHidden: false },
      ],
      constraints: ['1 <= n <= 8'],
      hints: ['Use backtracking.', 'Track count of open and close parentheses used.'],
      solutionApproach: 'Backtracking: maintain open and close counts. Add "(" if open < n, add ")" if close < open.',
      timeComplexity: 'O(4^n / sqrt(n))',
      spaceComplexity: 'O(n)',
      tags: ['recursion', 'backtracking', 'medium'],
      estimatedTimeMinutes: 20,
    },
  ];
}

module.exports = {
  createQuestion,
  getQuestionById,
  listQuestions,
  generateAndSaveQuestion,
  seedQuestions,
};
