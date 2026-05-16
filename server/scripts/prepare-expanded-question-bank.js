const fs = require('fs');
const path = require('path');

const SOURCE_FILES = [
  {
    label: 'seed-30',
    file: 'c:/Users/Pranav Doke/Downloads/ai-mock-interviewer.questions.json',
  },
  {
    label: 'first-105',
    file: 'c:/Users/Pranav Doke/Downloads/ai_mock_interviewer_105_questions.json',
  },
  {
    label: 'third-105',
    file: 'c:/Users/Pranav Doke/Downloads/third_ai_mock_interviewer_105_questions.json',
  },
  {
    label: 'new-105',
    file: 'c:/Users/Pranav Doke/Downloads/new_ai_mock_interviewer_question_sets/new_ai_mock_interviewer_105_questions.json',
  },
];

const OUTPUT_FILE = path.join(__dirname, '../src/data/ai-mock-interviewer-all-unique-questions.json');
const CACHE_FILE = 'c:/Users/Pranav Doke/Downloads/leetcode_question_cache_for_ai_mock_interviewer.json';

const GFG_REFS = {
  'Book Allocation Problem': ['https://www.geeksforgeeks.org/problems/allocate-minimum-number-of-pages0937/'],
  'Aggressive Cows': ['https://www.geeksforgeeks.org/problems/aggressive-cows/'],
  'Detect Cycle in Directed Graph': ['https://www.geeksforgeeks.org/detect-cycle-in-a-graph/'],
};

const TITLE_ALIASES = {
  'Two Sum II': 'two-sum-ii-input-array-is-sorted',
  'Gas Station II': 'gas-station',
  'Find First and Last Position of Element': 'find-first-and-last-position-of-element-in-sorted-array',
  'Find Smallest Letter Greater Than Target': 'find-smallest-letter-greater-than-target',
  'Find K-th Smallest Pair Distance': 'find-k-th-smallest-pair-distance',
  'Smallest Divisor Given Threshold': 'find-the-smallest-divisor-given-a-threshold',
  'Number of Subarrays of Size K and Average Greater Than Threshold': 'number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold',
  'Count Number of Nice Subarrays': 'count-number-of-nice-subarrays',
  'Longest Continuous Subarray With Absolute Diff Limit': 'longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit',
  'Capacity To Ship Packages Within D Days': 'capacity-to-ship-packages-within-d-days',
  'Subarrays with K Different Integers': 'subarrays-with-k-different-integers',
  'Binary Subarrays With Sum': 'binary-subarrays-with-sum',
  'Maximum Erasure Value': 'maximum-erasure-value',
  'My Calendar I': 'my-calendar-i',
  'My Calendar II': 'my-calendar-ii',
  'File System': 'design-file-system',
  'Design Tic Tac Toe': 'design-tic-tac-toe',
  'Design Search Autocomplete System': 'design-search-autocomplete-system',
  'Design In-Memory File System': 'design-in-memory-file-system',
  'Logger Rate Limiter': 'logger-rate-limiter',
  'Moving Average from Data Stream': 'moving-average-from-data-stream',
  'Recent Counter': 'number-of-recent-calls',
  'Meeting Rooms': 'meeting-rooms',
  'Meeting Rooms II': 'meeting-rooms-ii',
  'Employee Free Time': 'employee-free-time',
  'Missing Ranges': 'missing-ranges',
  'Search in a Sorted Array of Unknown Size': 'search-in-a-sorted-array-of-unknown-size',
  'Minimum Knight Moves': 'minimum-knight-moves',
  'Frequency Sort': 'sort-characters-by-frequency',
  'Min Stack Advanced': 'min-stack',
  'LRU Cache Advanced': 'lru-cache',
  'LFU Cache Advanced': 'lfu-cache',
  'Insert Delete GetRandom O1 Duplicates': 'insert-delete-getrandom-o1-duplicates-allowed',
  'Serialize and Deserialize N-ary Tree': 'serialize-and-deserialize-n-ary-tree',
  'Vertical Order Traversal': 'vertical-order-traversal-of-a-binary-tree',
  'Boundary of Binary Tree': 'boundary-of-binary-tree',
  'Populating Next Right Pointers': 'populating-next-right-pointers-in-each-node',
  'Convert Sorted Array to BST': 'convert-sorted-array-to-binary-search-tree',
  'Sorted List to BST': 'convert-sorted-list-to-binary-search-tree',
  'Delete Node in BST': 'delete-node-in-a-bst',
  'Check Completeness of Binary Tree': 'check-completeness-of-a-binary-tree',
  'Clone N-ary Tree': 'clone-n-ary-tree',
  'Minimum Window Subsequence': 'minimum-window-subsequence',
  'Group Shifted Strings': 'group-shifted-strings',
  'Sentence Similarity': 'sentence-similarity',
  'Pow x n': 'powx-n',
  'Sqrt x': 'sqrtx',
  'Remove Nth Node From End': 'remove-nth-node-from-end-of-list',
  'Construct Binary Tree from Preorder and Inorder': 'construct-binary-tree-from-preorder-and-inorder-traversal',
  'Number of Connected Components': 'number-of-connected-components-in-an-undirected-graph',
  'Letter Combinations of Phone Number': 'letter-combinations-of-a-phone-number',
  'String to Integer atoi': 'string-to-integer-atoi',
  'Time Based Key Value Store': 'time-based-key-value-store',
  'Randomized Set': 'insert-delete-getrandom-o1',
  'Range Sum Query Mutable': 'range-sum-query-mutable',
  'Find Duplicate Number': 'find-the-duplicate-number',
  'Kth Largest Element in an Array': 'kth-largest-element-in-an-array',
  'Validate Binary Search Tree': 'validate-binary-search-tree',
  'Lowest Common Ancestor of BST': 'lowest-common-ancestor-of-a-binary-search-tree',
  'Kth Smallest Element in BST': 'kth-smallest-element-in-a-bst',
  'Trie (Prefix Tree)': 'implement-trie-prefix-tree',
  'Median of Data Stream': 'find-median-from-data-stream',
  'Cheapest Flights Within K Stops': 'cheapest-flights-within-k-stops',
  'Merge K Sorted Lists': 'merge-k-sorted-lists',
  'Encode and Decode Strings': 'encode-and-decode-strings',
  'Graph Valid Tree': 'graph-valid-tree',
};

const BRIEF_OVERRIDES = {
  'Two Sum II': 'Given a sorted 1-indexed integer array and a target, return the two 1-based indices whose values add up to the target.',
  '4Sum': 'Given an integer array and a target, return all unique quadruplets whose values sum to the target.',
  'Combination Sum III': 'Choose exactly k distinct numbers from 1 through 9 whose sum is n, and return every valid combination.',
  'Minimum Genetic Mutation': 'Find the minimum number of valid one-character gene mutations needed to transform the start gene into the end gene using only genes from the bank.',
  'Snakes and Ladders': 'Given a snakes-and-ladders board, return the fewest dice throws needed to reach the final square.',
  'Open the Lock': 'Starting from 0000, return the minimum wheel turns needed to reach the target lock value without entering a deadend.',
  'Find Eventual Safe States': 'Return every graph node from which all possible paths eventually stop at a terminal node.',
  'Shortest Bridge': 'Given a binary grid with exactly two islands, return the fewest water cells that must be flipped to connect them.',
  'As Far from Land as Possible': 'Given a grid of land and water, return the maximum distance from any water cell to its nearest land cell.',
  'Max Area of Island': 'Return the largest area of a 4-directionally connected island in a binary grid.',
  'Critical Connections in a Network': 'Find all edges in an undirected network whose removal disconnects at least one pair of servers.',
  'Bus Routes': 'Return the minimum number of bus routes needed to travel from the source stop to the target stop.',
  'Minimum Height Trees': 'Given an undirected tree, return all root labels that produce a tree of minimum possible height.',
  'Path With Minimum Effort': 'Find a path across the height grid that minimizes the maximum absolute height difference between adjacent cells.',
  'Regions Cut By Slashes': 'Given a grid of slash characters, count how many separated regions are formed.',
  'Number of Provinces': 'Given an adjacency matrix of cities, count the number of connected province groups.',
  'Shortest Path in Binary Matrix': 'Return the length of the shortest clear 8-directional path from the top-left cell to the bottom-right cell.',
  'Minimum Knight Moves': 'Return the minimum number of chess knight moves needed to reach the target coordinate from the origin.',
  'Detect Cycle in Directed Graph': 'Given a directed graph, determine whether any directed cycle exists.',
  'Top K Frequent Words': 'Return the k most frequent words, sorted by frequency descending and lexicographic order ascending for ties.',
  'Reorganize String': 'Rearrange the characters so no two adjacent characters are equal, or return an empty string if impossible.',
  'Longest Happy String': 'Build the longest string from a, b, and c counts without placing three identical letters consecutively.',
  'Remove Duplicate Letters': 'Return the lexicographically smallest subsequence that contains each distinct character exactly once.',
  'Smallest Subsequence of Distinct Characters': 'Return the smallest lexicographic subsequence that keeps one copy of each distinct character.',
  'Frequency Sort': 'Sort the characters of a string by descending frequency, grouping equal characters together.',
  'Find K Pairs with Smallest Sums': 'Given two sorted arrays, return the k pairs with the smallest sums.',
  'Sliding Window Median': 'Return the median value for every contiguous window of size k in the array.',
  IPO: 'Choose at most k projects whose capital requirements can be met, maximizing final capital after collecting project profits.',
  'Minimum Number of Refueling Stops': 'Return the fewest refueling stops needed to reach the target distance, or -1 if it cannot be reached.',
  'Furthest Building You Can Reach': 'Using bricks and ladders for upward climbs, return the furthest building index that can be reached.',
  'Stone Game': 'Determine whether Alice wins the stone game when both players choose piles optimally.',
  'Stone Game II': 'Return the maximum stones Alice can collect when both players play optimally under the changing M rule.',
  'Cherry Pickup': 'Return the maximum cherries collectible by moving through the grid and accounting for blocked cells.',
  'Dungeon Game': 'Find the minimum initial health needed for the knight to rescue the princess without health dropping to zero.',
  'Distinct Subsequences': 'Count how many distinct subsequences of s are equal to t.',
  'Interleaving String': 'Determine whether s3 can be formed by interleaving s1 and s2 while preserving each string order.',
  'Regular Expression Matching': 'Implement full-string matching where dot matches one character and star repeats the previous element zero or more times.',
  'Wildcard Matching': 'Implement full-string wildcard matching where question mark matches one character and star matches any sequence.',
  'Super Egg Drop': 'Return the minimum moves needed to determine the critical floor with k eggs and n floors.',
  'Best Time to Buy and Sell Stock III': 'Return the maximum stock profit possible using at most two transactions.',
  'Best Time to Buy and Sell Stock IV': 'Return the maximum stock profit possible using at most k transactions.',
  'Burst Balloons': 'Return the maximum coins obtainable by choosing the best order to burst balloons.',
  'Russian Doll Envelopes': 'Return the maximum number of envelopes that can be nested by both width and height.',
  'Count Palindromic Subsequences': 'Count the distinct non-empty palindromic subsequences in the string.',
  'Longest Valid Parentheses': 'Return the length of the longest well-formed parentheses substring.',
  'Basic Calculator': 'Evaluate a string arithmetic expression containing integers, plus, minus, parentheses, and spaces.',
  'Basic Calculator II': 'Evaluate a string arithmetic expression containing integers and the basic operators plus, minus, multiply, and divide.',
  'Remove Invalid Parentheses': 'Remove the minimum number of invalid parentheses and return all possible valid results.',
  'Exclusive Time of Functions': 'Given function start and end logs, return each function exclusive execution time.',
  '132 Pattern': 'Determine whether there is a subsequence i, j, k with i < j < k and nums[i] < nums[k] < nums[j].',
  'Online Stock Span': 'Design a stock span structure whose next method returns the span of the current price.',
  'Min Stack Advanced': 'Design a stack that supports push, pop, top, and retrieving the minimum value in constant time.',
  'LRU Cache Advanced': 'Design an LRU cache with get and put operations in average constant time.',
  'LFU Cache Advanced': 'Design an LFU cache that evicts the least frequently used key, breaking ties by recency.',
  'Design Browser History': 'Design browser history navigation with visit, back, and forward operations.',
  'Design Circular Queue': 'Design a fixed-size circular queue supporting enqueue, dequeue, front, rear, and state checks.',
  'Design Underground System': 'Track passenger check-ins and check-outs and return average travel time between station pairs.',
  'Design Hit Counter': 'Design a counter that records hits and returns hits received within the past 5 minutes.',
  'Insert Delete GetRandom O1 Duplicates': 'Design a randomized collection that supports duplicate values, removal, and random retrieval.',
  'Serialize and Deserialize N-ary Tree': 'Design serialization and deserialization for an N-ary tree.',
  'Flatten Nested List Iterator': 'Design an iterator that flattens nested integers and returns them one at a time.',
  'Nested List Weight Sum': 'Return the depth-weighted sum of all integers in a nested list.',
  'Iterator for Combination': 'Design an iterator over combinations of fixed length from a sorted character string.',
  'Peeking Iterator': 'Design an iterator wrapper that can peek at the next value without consuming it.',
  'Binary Tree Zigzag Level Order Traversal': 'Return binary tree levels alternating left-to-right and right-to-left order.',
  'Vertical Order Traversal': 'Return binary tree nodes grouped by vertical column with row and value ordering.',
  'Boundary of Binary Tree': 'Return the boundary of a binary tree in anti-clockwise order without duplicating nodes.',
  'Recover Binary Search Tree': 'Recover a binary search tree where exactly two node values were swapped.',
  'Populating Next Right Pointers': 'Connect each node next pointer to its neighbor on the right at the same level.',
  'Convert Sorted Array to BST': 'Convert a sorted integer array into a height-balanced binary search tree.',
  'Sorted List to BST': 'Convert a sorted linked list into a height-balanced binary search tree.',
  'Delete Node in BST': 'Delete a key from a binary search tree and return the updated root.',
  'Trim a Binary Search Tree': 'Return a BST containing only values within the inclusive low and high range.',
  'All Nodes Distance K in Binary Tree': 'Return all node values exactly k edges away from the target node in a binary tree.',
  'Check Completeness of Binary Tree': 'Determine whether a binary tree is complete, with all levels filled left to right except possibly the last.',
  'Maximum Width of Binary Tree': 'Return the maximum width across all levels of a binary tree using complete-tree positions.',
  'Construct Quad Tree': 'Construct a quad tree representation from a binary grid.',
  'Clone N-ary Tree': 'Return a deep copy of an N-ary tree.',
  'Minimum Window Subsequence': 'Return the shortest substring of s1 that contains s2 as a subsequence.',
  'Repeated DNA Sequences': 'Return all 10-letter DNA sequences that appear more than once.',
  'Longest Duplicate Substring': 'Return any longest substring that appears at least twice.',
  'Shortest Palindrome': 'Add characters in front of the string to create the shortest possible palindrome.',
  'Palindrome Pairs': 'Return all index pairs whose concatenated words form a palindrome.',
  'Word Pattern': 'Determine whether a pattern string bijectively matches the words in a sentence.',
  'Reverse Words in a String': 'Reverse the order of words in a string while removing extra spaces.',
  'Group Shifted Strings': 'Group strings that belong to the same shifting sequence.',
  'Sentence Similarity': 'Determine whether two sentences are similar using the provided similar word pairs.',
  'Integer to Roman': 'Convert an integer to its Roman numeral representation.',
  'Roman to Integer': 'Convert a Roman numeral string to its integer value.',
  'Multiply Strings': 'Multiply two non-negative integers represented as strings and return the product string.',
  'Add Binary': 'Add two binary strings and return their binary sum.',
  'Valid Number': 'Determine whether a string is a valid decimal number.',
  'Compare Version Numbers': 'Compare two version strings and return -1, 0, or 1.',
  'Pow x n': 'Compute x raised to the integer power n.',
  'Sqrt x': 'Return the integer square root of x rounded down.',
  'Happy Number': 'Determine whether repeated square-of-digits replacement eventually reaches 1.',
  'Ugly Number II': 'Return the nth positive number whose only prime factors are 2, 3, and 5.',
  'Perfect Squares': 'Return the fewest perfect square numbers whose sum equals n.',
  'Nth Digit': 'Return the nth digit in the infinite sequence 123456789101112...',
  'Fraction to Recurring Decimal': 'Convert a fraction to a decimal string, wrapping repeating fractional parts in parentheses.',
  'Excel Sheet Column Number': 'Convert an Excel column title into its numeric column number.',
  'Excel Sheet Column Title': 'Convert a positive column number into its Excel column title.',
  'Spiral Matrix II': 'Generate an n by n matrix filled from 1 to n squared in spiral order.',
  'Diagonal Traverse II': 'Return all values from a jagged 2D list in diagonal traversal order.',
  'Toeplitz Matrix': 'Determine whether every top-left to bottom-right diagonal contains the same value.',
};

const UNORDERED_DEEP_TITLES = new Set([
  '4Sum',
  'Combination Sum III',
  'Find K Pairs with Smallest Sums',
  'Remove Invalid Parentheses',
  'Palindrome Pairs',
  'Group Shifted Strings',
  'Find Eventual Safe States',
  'Critical Connections in a Network',
  'Minimum Height Trees',
]);

const LONGEST_PAL_TITLES = new Set(['Longest Duplicate Substring']);

const MANUAL_TEST_CASES = {
  'Minimum Knight Moves': [
    { input: '2,1', expectedOutput: '1' },
    { input: '5,5', expectedOutput: '4', isHidden: true },
  ],
  'Detect Cycle in Directed Graph': [
    { input: '4,[[0,1],[1,2],[2,0],[2,3]]', expectedOutput: 'true' },
    { input: '4,[[0,1],[1,2],[2,3]]', expectedOutput: 'false', isHidden: true },
  ],
  'Online Stock Span': [
    {
      input: '["StockSpanner","next","next","next","next","next","next","next"],[[],[100],[80],[60],[70],[60],[75],[85]]',
      expectedOutput: '[null,1,1,1,2,1,4,6]',
    },
  ],
  'Min Stack Advanced': [
    {
      input: '["MinStack","push","push","push","getMin","pop","top","getMin"],[[],[-2],[0],[-3],[],[],[],[]]',
      expectedOutput: '[null,null,null,null,-3,null,0,-2]',
    },
  ],
  'Design Circular Queue': [
    {
      input: '["MyCircularQueue","enQueue","enQueue","enQueue","enQueue","Rear","isFull","deQueue","enQueue","Rear"],[[3],[1],[2],[3],[4],[],[],[],[4],[]]',
      expectedOutput: '[null,true,true,true,false,3,true,true,true,4]',
    },
  ],
  'Design Underground System': [
    {
      input: '["UndergroundSystem","checkIn","checkIn","checkIn","checkOut","checkOut","getAverageTime","checkOut","getAverageTime"],[[],[45,"Leyton",3],[32,"Paradise",8],[27,"Leyton",10],[45,"Waterloo",15],[27,"Waterloo",20],["Leyton","Waterloo"],[32,"Cambridge",22],["Paradise","Cambridge"]]',
      expectedOutput: '[null,null,null,null,null,null,11,null,14]',
    },
  ],
  'Design Hit Counter': [
    {
      input: '["HitCounter","hit","hit","hit","getHits","hit","getHits","getHits"],[[],[1],[2],[3],[4],[300],[300],[301]]',
      expectedOutput: '[null,null,null,null,3,null,4,3]',
    },
  ],
  'Insert Delete GetRandom O1 Duplicates': [
    {
      input: '["RandomizedCollection","insert","insert","insert","remove","remove"],[[],[1],[1],[2],[1],[1]]',
      expectedOutput: '[null,true,false,true,true,true]',
    },
  ],
  'Serialize and Deserialize N-ary Tree': [
    { input: '[1,null,3,2,4,null,5,6]', expectedOutput: '[1,null,3,2,4,null,5,6]' },
  ],
  'Nested List Weight Sum': [
    { input: '[[1,1],2,[1,1]]', expectedOutput: '10' },
    { input: '[1,[4,[6]]]', expectedOutput: '27', isHidden: true },
  ],
  'Iterator for Combination': [
    {
      input: '["CombinationIterator","next","hasNext","next","hasNext","next","hasNext"],[["abc",2],[],[],[],[],[],[]]',
      expectedOutput: '[null,"ab",true,"ac",true,"bc",false]',
    },
  ],
  'Peeking Iterator': [
    {
      input: '["PeekingIterator","next","peek","next","next","hasNext"],[[[1,2,3]],[],[],[],[],[]]',
      expectedOutput: '[null,1,2,2,3,false]',
    },
  ],
  'Boundary of Binary Tree': [
    { input: '[1,null,2,3,4]', expectedOutput: '[1,3,4,2]' },
  ],
  'Clone N-ary Tree': [
    { input: '[1,null,3,2,4,null,5,6]', expectedOutput: '[1,null,3,2,4,null,5,6]' },
  ],
  'Minimum Window Subsequence': [
    { input: '"abcdebdde","bde"', expectedOutput: '"bcde"' },
    { input: '"jmeqksfrsdcmsiwvaovztaqenprpvnbstl","u"', expectedOutput: '""', isHidden: true },
  ],
  'Group Shifted Strings': [
    {
      input: '["abc","bcd","acef","xyz","az","ba","a","z"]',
      expectedOutput: '[["abc","bcd","xyz"],["acef"],["az","ba"],["a","z"]]',
      comparisonMode: 'unorderedDeep',
    },
  ],
  'Sentence Similarity': [
    {
      input: '["great","acting","skills"],["fine","drama","talent"],[["great","fine"],["drama","acting"],["skills","talent"]]',
      expectedOutput: 'true',
    },
  ],
};

const STARTER_OVERRIDES = {
  'Minimum Knight Moves': {
    javascript: 'function minKnightMoves(x, y) {\n  \n}',
    python: 'def minKnightMoves(x, y):\n    pass',
    java: 'public int minKnightMoves(int x, int y) {\n}',
  },
  'Detect Cycle in Directed Graph': {
    javascript: 'function hasCycle(n, edges) {\n  \n}',
    python: 'def hasCycle(n, edges):\n    pass',
    java: 'public boolean hasCycle(int n, int[][] edges) {\n}',
  },
  'Design Hit Counter': {
    javascript: 'var HitCounter = function() {\n  \n};\n\nHitCounter.prototype.hit = function(timestamp) {\n  \n};\n\nHitCounter.prototype.getHits = function(timestamp) {\n  \n};',
    python: 'class HitCounter:\n    def __init__(self):\n        pass\n\n    def hit(self, timestamp):\n        pass\n\n    def getHits(self, timestamp):\n        pass',
    java: 'public class HitCounter {\n    public HitCounter() {\n    }\n\n    public void hit(int timestamp) {\n    }\n\n    public int getHits(int timestamp) {\n    }\n}',
  },
  'Peeking Iterator': {
    javascript: 'var PeekingIterator = function(nums) {\n  \n};\n\nPeekingIterator.prototype.peek = function() {\n  \n};\n\nPeekingIterator.prototype.next = function() {\n  \n};\n\nPeekingIterator.prototype.hasNext = function() {\n  \n};',
    python: 'class PeekingIterator:\n    def __init__(self, nums):\n        pass\n\n    def peek(self):\n        pass\n\n    def next(self):\n        pass\n\n    def hasNext(self):\n        pass',
    java: 'public class PeekingIterator {\n    public PeekingIterator(int[] nums) {\n    }\n\n    public Integer peek() {\n    }\n\n    public Integer next() {\n    }\n\n    public boolean hasNext() {\n    }\n}',
  },
  'Boundary of Binary Tree': {
    javascript: 'function boundaryOfBinaryTree(root) {\n  \n}',
    python: 'def boundaryOfBinaryTree(root):\n    pass',
    java: 'public List<Integer> boundaryOfBinaryTree(TreeNode root) {\n}',
  },
  'Minimum Window Subsequence': {
    javascript: 'function minWindow(s1, s2) {\n  \n}',
    python: 'def minWindow(s1, s2):\n    pass',
    java: 'public String minWindow(String s1, String s2) {\n}',
  },
  'Group Shifted Strings': {
    javascript: 'function groupStrings(strings) {\n  \n}',
    python: 'def groupStrings(strings):\n    pass',
    java: 'public List<List<String>> groupStrings(String[] strings) {\n}',
  },
  'Sentence Similarity': {
    javascript: 'function areSentencesSimilar(sentence1, sentence2, similarPairs) {\n  \n}',
    python: 'def areSentencesSimilar(sentence1, sentence2, similarPairs):\n    pass',
    java: 'public boolean areSentencesSimilar(String[] sentence1, String[] sentence2, List<List<String>> similarPairs) {\n}',
  },
};

const HARNESS_OVERRIDES = {
  'Boundary of Binary Tree': 'tree',
};

const VALID_TOPICS = new Set([
  'arrays', 'string', 'searching', 'stack', 'dp', 'graph',
  'heap', 'matrix', 'hashing', 'hash-tables', 'backtracking',
  'tree', 'design', 'binary-search', 'bit-manipulation',
  'greedy', 'intervals', 'linked-list', 'segment-tree',
  'sliding-window', 'two-pointers', 'math', 'sorting',
]);

const TOPIC_PRIORITY = [
  ['design', 'design'],
  ['linked-list', 'linked-list'],
  ['binary-search-tree', 'tree'],
  ['binary-tree', 'tree'],
  ['tree', 'tree'],
  ['trie', 'tree'],
  ['graph', 'graph'],
  ['union-find', 'graph'],
  ['depth-first-search', 'graph'],
  ['breadth-first-search', 'graph'],
  ['heap-priority-queue', 'heap'],
  ['priority-queue', 'heap'],
  ['heap', 'heap'],
  ['dynamic-programming', 'dp'],
  ['memoization', 'dp'],
  ['backtracking', 'backtracking'],
  ['binary-search', 'binary-search'],
  ['sliding-window', 'sliding-window'],
  ['two-pointers', 'two-pointers'],
  ['monotonic-stack', 'stack'],
  ['stack', 'stack'],
  ['matrix', 'matrix'],
  ['string', 'string'],
  ['hash-table', 'hash-tables'],
  ['greedy', 'greedy'],
  ['bit-manipulation', 'bit-manipulation'],
  ['sorting', 'sorting'],
  ['math', 'math'],
  ['array', 'arrays'],
];

const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const titleToFunctionName = (title) => {
  const special = {
    '4Sum': 'fourSum',
    '132 Pattern': 'find132pattern',
    'Pow x n': 'myPow',
    'Sqrt x': 'mySqrt',
  };
  if (special[title]) return special[title];
  const words = String(title || '').match(/[A-Za-z0-9]+/g) || ['solve'];
  return words
    .map((word, index) => {
      const clean = word.toLowerCase();
      if (index === 0) return clean.replace(/^\d+/, '');
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    })
    .join('') || 'solve';
};

const splitTopLevel = (value, delimiter = ',') => {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (const char of String(value || '')) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      current += char;
      escaped = true;
      continue;
    }
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      current += char;
      quote = char;
      continue;
    }
    if ('[{('.includes(char)) {
      depth += 1;
      current += char;
      continue;
    }
    if (']})'.includes(char)) {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }
    if (char === delimiter && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim() || parts.length) parts.push(current.trim());
  return parts.filter(Boolean);
};

const htmlToText = (html) => String(html || '')
  .replace(/<br\s*\/?\s*>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .replace(/&#39;/g, "'")
  .replace(/\r/g, '')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const parseExamplesFromContent = (content) => {
  const html = String(content || '');
  const blocks = [
    ...[...html.matchAll(/<pre>([\s\S]*?)<\/pre>/gi)].map((match) => htmlToText(match[1])),
    ...[...html.matchAll(/<div class="example-block">([\s\S]*?)<\/div>/gi)].map((match) => htmlToText(match[1])),
  ];
  const examples = [];
  for (const block of blocks) {
    const input = (block.match(/Input:\s*([\s\S]*?)\s*Output:/i) || [])[1];
    const output = (block.match(/Output:\s*([\s\S]*?)(?:\s*Explanation:|\s*Note:|\s*Constraints:|$)/i) || [])[1];
    const explanation = (block.match(/Explanation:\s*([\s\S]*)/i) || [])[1];
    if (!input || !output) continue;
    examples.push({
      inputLine: input.trim().replace(/\s*\n\s*/g, ' '),
      expectedOutput: output.trim().replace(/\s*\n\s*/g, ' '),
      explanation: explanation ? explanation.trim().replace(/\s*\n\s*/g, ' ') : undefined,
    });
  }
  return examples;
};

const inputLineToRaw = (inputLine) => {
  const cleaned = String(inputLine || '').trim();
  const parts = splitTopLevel(cleaned);
  if (parts.length && parts.every((part) => /^[A-Za-z_][\w. ]*\s*=/.test(part))) {
    return parts.map((part) => part.slice(part.indexOf('=') + 1).trim()).join(',');
  }
  return cleaned;
};

const parseFunctionFromJsSnippet = (snippet) => {
  const code = String(snippet || '');
  let match = code.match(/var\s+(\w+)\s*=\s*function\s*\(([^)]*)\)/);
  if (match) return { name: match[1], params: splitTopLevel(match[2]) };
  match = code.match(/function\s+(\w+)\s*\(([^)]*)\)/);
  if (match) return { name: match[1], params: splitTopLevel(match[2]) };
  return null;
};

const parsePythonMethod = (snippet) => {
  const match = String(snippet || '').match(/def\s+(\w+)\s*\(([^)]*)\)\s*:/);
  if (!match) return null;
  const params = splitTopLevel(match[2])
    .map((part) => part.split('=').shift().trim())
    .map((part) => part.split(':').shift().trim())
    .filter((param) => param && param !== 'self');
  return { name: match[1], params };
};

const parseJavaMethod = (snippet) => {
  const match = String(snippet || '').match(/public\s+([\w<>\[\], ?]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/);
  if (!match) return null;
  return {
    returnType: match[1].trim(),
    name: match[2],
    params: match[3].trim(),
  };
};

const isOperationQuestion = (question, detail, examples) => {
  const title = question.title;
  if (/cache|stack|iterator|counter|calendar|browser|parking|twitter|hashmap|skiplist|queue|file system|underground|stock span|phone directory|tic tac toe|snake game|randomized set|randomized collection|time based/i.test(title)) {
    return true;
  }
  const firstInput = examples[0]?.inputLine || detail?.exampleTestcases || '';
  return /^\s*\["[A-Z]/.test(firstInput);
};

const buildStarterCode = (question, detail, operationQuestion) => {
  if (STARTER_OVERRIDES[question.title]) return STARTER_OVERRIDES[question.title];

  const snippets = detail?.codeSnippets || [];
  const jsSnippet = snippets.find((item) => item.langSlug === 'javascript')?.code || '';
  const pySnippet = snippets.find((item) => item.langSlug === 'python3' || item.langSlug === 'python')?.code || '';
  const javaSnippet = snippets.find((item) => item.langSlug === 'java')?.code || '';

  if (operationQuestion) {
    return {
      javascript: jsSnippet || question.starterCode?.javascript || `function ${titleToFunctionName(question.title)}(operations) {\n  \n}`,
      python: pySnippet || question.starterCode?.python || `class ${titleToFunctionName(question.title)}:\n    pass`,
      java: javaSnippet || question.starterCode?.java || `public class ${titleToFunctionName(question.title)} {\n}`,
    };
  }

  const jsFunc = parseFunctionFromJsSnippet(jsSnippet);
  const pyFunc = parsePythonMethod(pySnippet);
  const javaMethod = parseJavaMethod(javaSnippet);
  const fallbackName = titleToFunctionName(question.title);
  const existingJs = question.starterCode?.javascript || '';
  const existingJsValid = /^function\s+[A-Za-z_$][\w$]*\s*\(/.test(existingJs.trim());

  return {
    javascript: jsFunc
      ? `function ${jsFunc.name}(${jsFunc.params.join(', ')}) {\n  \n}`
      : existingJsValid
        ? existingJs
        : `function ${fallbackName}(input) {\n  \n}`,
    python: pyFunc
      ? `def ${pyFunc.name}(${pyFunc.params.join(', ')}):\n    pass`
      : question.starterCode?.python || `def ${fallbackName}(input):\n    pass`,
    java: javaMethod
      ? `public ${javaMethod.returnType} ${javaMethod.name}(${javaMethod.params}) {\n}`
      : question.starterCode?.java || `public Object ${fallbackName}(Object input) {\n}`,
  };
};

const extractSignature = (starterCode = {}) => {
  const js = starterCode.javascript || '';
  const py = starterCode.python || '';
  const java = starterCode.java || '';
  let match = js.match(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/);
  if (match) return { name: match[1], params: splitTopLevel(match[2]) };
  match = js.match(/var\s+([A-Za-z_$][\w$]*)\s*=\s*function\s*\(([^)]*)\)/);
  if (match) return { name: match[1], params: splitTopLevel(match[2]) };
  match = py.match(/def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/);
  if (match) {
    return {
      name: match[1],
      params: splitTopLevel(match[2]).map((param) => param.split(':').shift().trim()).filter((param) => param && param !== 'self'),
    };
  }
  match = java.match(/\b([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/);
  if (match) {
    return {
      name: match[1],
      params: splitTopLevel(match[2]).map((param) => param.trim().split(/\s+/).pop()).filter(Boolean),
    };
  }
  return { name: '', params: [] };
};

const formatInput = (question, rawInput) => {
  if (String(rawInput || '').includes('=')) return rawInput;
  const signature = extractSignature(question.starterCode);
  const parts = splitTopLevel(rawInput);
  if (signature.params.length === 1) return `${signature.params[0]} = ${rawInput}`;
  if (signature.params.length > 1 && parts.length === signature.params.length) {
    return parts.map((part, index) => `${signature.params[index]} = ${part}`).join(', ');
  }
  return String(rawInput || '');
};

const normalizeExistingTestCases = (testCases, title) => {
  if (!Array.isArray(testCases)) return [];
  const seen = new Set();
  const comparisonMode = UNORDERED_DEEP_TITLES.has(title)
    ? 'unorderedDeep'
    : LONGEST_PAL_TITLES.has(title)
      ? 'longestPalindrome'
      : 'exact';
  return testCases
    .filter((testCase) => testCase && typeof testCase.input === 'string' && typeof testCase.expectedOutput === 'string')
    .filter((testCase) => {
      const key = `${testCase.input}=>${testCase.expectedOutput}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((testCase, index) => ({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      comparisonMode: testCase.comparisonMode || comparisonMode,
      isHidden: Boolean(testCase.isHidden ?? index > 0),
      explanation: testCase.explanation,
    }));
};

const isPlaceholderTests = (question) => {
  const testCases = question.testCases || [];
  if (!testCases.length) return true;
  return testCases.length === 1
    && testCases[0].input === '[1,2,3]'
    && testCases[0].expectedOutput === '[1,2,3]';
};

const buildTestCases = (question, detail, parsedExamples) => {
  const comparisonMode = UNORDERED_DEEP_TITLES.has(question.title)
    ? 'unorderedDeep'
    : LONGEST_PAL_TITLES.has(question.title)
      ? 'longestPalindrome'
      : 'exact';

  if (!isPlaceholderTests(question)) {
    return normalizeExistingTestCases(question.testCases, question.title);
  }

  const parsed = parsedExamples
    .slice(0, 3)
    .map((example, index) => ({
      input: inputLineToRaw(example.inputLine),
      expectedOutput: example.expectedOutput,
      comparisonMode,
      isHidden: index > 0,
      explanation: example.explanation,
    }))
    .filter((testCase) => testCase.input && testCase.expectedOutput);

  if (parsed.length) return parsed;
  if (MANUAL_TEST_CASES[question.title]) {
    return normalizeExistingTestCases(MANUAL_TEST_CASES[question.title], question.title);
  }
  return normalizeExistingTestCases(question.testCases, question.title);
};

const topicFromMeta = (question, meta) => {
  const raw = String(question.topic || '').toLowerCase();
  if (VALID_TOPICS.has(raw) && question.sourceLabel !== 'new-105') return raw;
  const tagSlugs = new Set((meta?.topicTags || []).map((tag) => tag.slug));
  for (const [tag, topic] of TOPIC_PRIORITY) {
    if (tagSlugs.has(tag)) return topic;
  }
  if (VALID_TOPICS.has(raw)) return raw;
  return 'arrays';
};

const difficultyFromMeta = (rawDifficulty, meta) => {
  const map = { Easy: 1, Medium: 3, Hard: 5 };
  if (meta?.difficulty && map[meta.difficulty]) return map[meta.difficulty];
  const parsed = Number.parseInt(rawDifficulty, 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(5, parsed)) : 3;
};

const buildExamplesText = (question) => {
  const cases = Array.isArray(question.testCases) ? question.testCases.slice(0, 3) : [];
  if (!cases.length) return '';
  return cases
    .map((testCase, index) => {
      const lines = [
        `Example ${index + 1}:`,
        `Input: ${formatInput(question, testCase.input)}`,
        `Output: ${testCase.expectedOutput}`,
      ];
      if (testCase.explanation) lines.push(`Explanation: ${testCase.explanation}`);
      return lines.join('\n');
    })
    .join('\n\n');
};

const buildFullDescription = (question, brief) => {
  const signature = extractSignature(question.starterCode);
  const sections = [brief.trim()];
  if (signature.name) sections.push(`Function signature: ${signature.name}(${signature.params.join(', ')})`);
  const examples = buildExamplesText(question);
  if (examples) sections.push(`Examples:\n\n${examples}`);
  if (Array.isArray(question.constraints) && question.constraints.length) {
    sections.push(`Constraints:\n${question.constraints.map((item) => `- ${item}`).join('\n')}`);
  }
  const complexityParts = [];
  if (question.timeComplexity && !/depends on approach/i.test(question.timeComplexity)) {
    complexityParts.push(`Time: ${question.timeComplexity}`);
  }
  if (question.spaceComplexity && !/depends on approach/i.test(question.spaceComplexity)) {
    complexityParts.push(`Space: ${question.spaceComplexity}`);
  }
  if (complexityParts.length) sections.push(`Expected complexity: ${complexityParts.join(', ')}.`);
  const notes = [];
  if (question.testHarness === 'linked-list') {
    notes.push('Linked lists are represented as arrays in the examples.');
  }
  if (question.testHarness === 'tree') {
    notes.push('Binary trees are represented in level-order array form, using null for missing children.');
  }
  if (question.testHarness === 'operations') {
    notes.push('For design questions, process the operations from left to right and return the operation results as shown.');
  }
  notes.push('Return the result from your function in the format shown by the examples.');
  sections.push(`Notes:\n${notes.map((note) => `- ${note}`).join('\n')}`);
  return sections.join('\n\n');
};

const referenceUrls = (meta, title) => {
  const refs = [];
  if (meta?.titleSlug) {
    refs.push(`https://leetcode.com/problems/${meta.titleSlug}/`);
    refs.push(`https://leetcode.doocs.org/en/lc/${meta.questionFrontendId}/`);
  }
  refs.push(...(GFG_REFS[title] || []));
  return Array.from(new Set(refs));
};

const leetcodeListQuery = `query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
    total: totalNum
    questions: data {
      questionFrontendId
      title
      titleSlug
      difficulty
      isPaidOnly
      topicTags { name slug }
    }
  }
}`;

const leetcodeDetailQuery = `query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId
    title
    titleSlug
    content
    exampleTestcases
    codeSnippets { lang langSlug code }
    topicTags { name slug }
    difficulty
    isPaidOnly
  }
}`;

async function fetchLeetcodeList() {
  const questions = [];
  let total = Infinity;
  for (let skip = 0; skip < total; skip += 100) {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0' },
      body: JSON.stringify({
        query: leetcodeListQuery,
        variables: { categorySlug: '', skip, limit: 100, filters: {} },
      }),
    });
    const payload = await response.json();
    const page = payload.data.problemsetQuestionList;
    total = page.total;
    questions.push(...page.questions);
  }
  return questions;
}

async function fetchQuestionDetail(slug) {
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0' },
    body: JSON.stringify({ query: leetcodeDetailQuery, variables: { titleSlug: slug } }),
  });
  const payload = await response.json();
  return payload.data.question;
}

async function loadLeetcodeCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (Array.isArray(cache.questions) && cache.questions.length > 1000) return cache;
    } catch (error) {
      // Ignore invalid cache and refetch.
    }
  }
  const questions = await fetchLeetcodeList();
  const cache = { createdAt: new Date().toISOString(), questions, details: {} };
  fs.writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
  return cache;
}

function matchLeetcode(question, byNorm, bySlug, allQuestions) {
  const alias = TITLE_ALIASES[question.title];
  if (alias && bySlug.has(alias)) return bySlug.get(alias);
  const exact = byNorm.get(norm(question.title));
  if (exact) return exact;
  const titleNorm = norm(question.title);
  return allQuestions
    .filter((candidate) => {
      const candidateNorm = norm(candidate.title);
      return candidateNorm.startsWith(titleNorm) || titleNorm.startsWith(candidateNorm);
    })
    .sort((a, b) => Math.abs(norm(a.title).length - titleNorm.length) - Math.abs(norm(b.title).length - titleNorm.length))[0];
}

async function detailFor(meta, cache) {
  if (!meta?.titleSlug) return null;
  cache.details = cache.details || {};
  if (!cache.details[meta.titleSlug]) {
    cache.details[meta.titleSlug] = await fetchQuestionDetail(meta.titleSlug);
    fs.writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
  }
  return cache.details[meta.titleSlug];
}

function loadSourceQuestions() {
  const rows = [];
  for (const source of SOURCE_FILES) {
    if (!fs.existsSync(source.file)) {
      console.warn(`Skipping missing source: ${source.file}`);
      continue;
    }
    const items = JSON.parse(fs.readFileSync(source.file, 'utf8'));
    if (!Array.isArray(items)) throw new Error(`Expected array JSON in ${source.file}`);
    for (const item of items) {
      rows.push({ ...item, sourceLabel: source.label, sourceFile: source.file });
    }
    console.log(`${source.label}: loaded ${items.length}`);
  }
  return rows;
}

async function main() {
  const cache = await loadLeetcodeCache();
  const allLeetcode = cache.questions;
  const byNorm = new Map(allLeetcode.map((question) => [norm(question.title), question]));
  const bySlug = new Map(allLeetcode.map((question) => [question.titleSlug, question]));
  const rows = loadSourceQuestions();
  const output = [];
  const seen = new Map();
  const duplicateRows = [];
  const unmatched = [];
  let placeholderTestsRemaining = 0;

  for (const row of rows) {
    const meta = matchLeetcode(row, byNorm, bySlug, allLeetcode);
    if (!meta && !GFG_REFS[row.title]) unmatched.push(row.title);
    const canonicalKey = meta?.titleSlug ? `leetcode:${meta.titleSlug}` : `title:${norm(row.title)}`;
    if (seen.has(canonicalKey)) {
      duplicateRows.push({ kept: seen.get(canonicalKey), skipped: row.title, key: canonicalKey });
      continue;
    }

    const detail = await detailFor(meta, cache);
    const parsedExamples = parseExamplesFromContent(detail?.content);
    const operationQuestion = isOperationQuestion(row, detail, parsedExamples);
    const starterCode = buildStarterCode(row, detail, operationQuestion);
    const testCases = buildTestCases(row, detail, parsedExamples);
    if (isPlaceholderTests({ testCases })) placeholderTestsRemaining += 1;

    const normalized = {
      title: row.title,
      description: '',
      topic: topicFromMeta(row, meta),
      difficulty: difficultyFromMeta(row.difficulty, meta),
      type: row.type || 'coding',
      starterCode,
      testCases,
      constraints: Array.isArray(row.constraints) && row.constraints.length
        ? row.constraints
        : ['Use an efficient approach for large inputs.', 'Handle boundary cases and duplicate values where applicable.'],
      hints: Array.isArray(row.hints) ? row.hints : [],
      solutionApproach: typeof row.solutionApproach === 'string' ? row.solutionApproach : '',
      timeComplexity: row.timeComplexity || '',
      spaceComplexity: row.spaceComplexity || '',
      expectedKeyPoints: Array.isArray(row.expectedKeyPoints) ? row.expectedKeyPoints : [],
      tags: Array.from(new Set(['dsa', topicFromMeta(row, meta), ...(Array.isArray(row.tags) ? row.tags : [])])),
      estimatedTimeMinutes: Number.isFinite(row.estimatedTimeMinutes) ? row.estimatedTimeMinutes : 20,
      referenceUrls: Array.from(new Set([...(Array.isArray(row.referenceUrls) ? row.referenceUrls : []), ...referenceUrls(meta, row.title)])),
      testHarness: HARNESS_OVERRIDES[row.title] || (operationQuestion ? 'operations' : row.testHarness),
      isActive: row.isActive !== false,
      source: 'leetcode-style',
    };

    const brief = BRIEF_OVERRIDES[row.title]
      || (row.description && !/^Solve the problem:/i.test(row.description) ? row.description : `Implement an efficient solution for ${row.title}.`);
    normalized.description = buildFullDescription(normalized, brief);

    seen.set(canonicalKey, row.title);
    output.push(normalized);
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log('\nExpanded Question Bank');
  console.log(`  raw rows: ${rows.length}`);
  console.log(`  unique rows: ${output.length}`);
  console.log(`  duplicates removed: ${duplicateRows.length}`);
  console.log(`  unmatched references: ${unmatched.length}`);
  console.log(`  placeholder tests remaining: ${placeholderTestsRemaining}`);
  console.log(`  output: ${OUTPUT_FILE}`);

  if (duplicateRows.length) {
    console.log('\nDuplicates removed:');
    duplicateRows.forEach((item) => console.log(`  skipped "${item.skipped}" because "${item.kept}" already uses ${item.key}`));
  }
  if (unmatched.length) {
    console.log('\nUnmatched titles:');
    unmatched.forEach((title) => console.log(`  ${title}`));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
