const fs = require('fs');

const DEFAULT_FILES = [
  'c:/Users/Pranav Doke/Downloads/ai_mock_interviewer_105_questions.json',
  'c:/Users/Pranav Doke/Downloads/ai_mock_interviewer_question_sets/ai_mock_interviewer_105_questions.json',
];

const leetcode = (number, slug) => [
  `https://leetcode.com/problems/${slug}/`,
  `https://leetcode.doocs.org/en/lc/${number}/`,
];

const gfg = (slug) => [
  `https://www.geeksforgeeks.org/problems/${slug}/`,
];

const DESCRIPTIONS = {
  'Best Time to Buy and Sell Stock': 'You are given an array prices where prices[i] is the stock price on day i. Choose one day to buy and a later day to sell so that the profit is maximized. Return the maximum profit, or 0 if no profitable transaction is possible.',
  'Contains Duplicate': 'Given an integer array nums, determine whether any value appears at least twice. Return true if a duplicate exists, otherwise return false.',
  'Product of Array Except Self': 'Given an integer array nums, return an array answer where answer[i] is the product of every element of nums except nums[i]. Solve it without using division and in linear time.',
  'Maximum Product Subarray': 'Given an integer array nums, find the contiguous non-empty subarray that has the largest product. Return that maximum product.',
  'Container With Most Water': 'Given an array height where each value represents a vertical line on the x-axis, choose two lines that together with the x-axis hold the most water. Return the maximum possible area.',
  '3Sum': 'Given an integer array nums, return all unique triplets [nums[i], nums[j], nums[k]] such that the three values sum to 0. The solution set must not contain duplicate triplets.',
  'Merge Intervals': 'Given an array of intervals where intervals[i] = [start, end], merge all overlapping intervals. Return the non-overlapping intervals that cover all ranges from the input.',
  'Jump Game': 'Given an array nums where nums[i] is the maximum jump length from index i, determine whether you can reach the last index starting from index 0.',
  'Majority Element': 'Given an array nums of size n, return the element that appears more than floor(n / 2) times. You may assume that a majority element always exists.',
  'Missing Number': 'Given an array nums containing n distinct numbers from the range [0, n], return the one number in that range that is missing from the array.',
  'Find Duplicate Number': 'Given an array nums containing n + 1 integers where each integer is in the range [1, n], return the repeated number. The array contains at least one duplicate.',
  'Minimum Size Subarray Sum': 'Given a target value and an array of positive integers nums, find the minimal length of a contiguous subarray whose sum is at least target. Return 0 if no such subarray exists.',
  'Longest Substring Without Repeating Characters': 'Given a string s, find the length of the longest substring that contains no repeated characters.',
  'Permutation in String': 'Given two strings s1 and s2, return true if s2 contains any permutation of s1 as a contiguous substring.',
  'Minimum Window Substring': 'Given strings s and t, return the smallest substring of s that contains every character of t including duplicate counts. Return an empty string if no such window exists.',
  'Valid Parentheses': 'Given a string containing only parentheses characters (), {}, and [], determine whether every opening bracket is closed by the same type of bracket in the correct order.',
  'Daily Temperatures': 'Given an array temperatures, return an array answer where answer[i] is the number of days you must wait after day i to get a warmer temperature. If no warmer day exists, answer[i] should be 0.',
  'Evaluate Reverse Polish Notation': 'Given an array of tokens representing an arithmetic expression in Reverse Polish Notation, evaluate the expression and return its integer result.',
  'Largest Rectangle in Histogram': 'Given an array heights where each value is a bar height in a histogram, return the area of the largest rectangle that can be formed using consecutive bars.',
  'Asteroid Collision': 'Given an array asteroids where the sign represents direction and the absolute value represents size, simulate collisions between moving asteroids. Return the state of the asteroids after all collisions are resolved.',
  'Decode String': 'Given an encoded string using patterns like k[encoded_string], decode it by repeating each bracketed substring k times. Nested encodings must also be handled.',
  'Binary Search': 'Given a sorted integer array nums and a target value, return the index of target if it exists. If target is not present, return -1.',
  'Search Insert Position': 'Given a sorted array of distinct integers and a target value, return the index if the target is found. Otherwise return the index where it should be inserted to preserve sorted order.',
  'Find Minimum in Rotated Sorted Array': 'Given a sorted array that has been rotated at an unknown pivot, return the minimum element. The array contains distinct values.',
  'Search in Rotated Sorted Array': 'Given a sorted array rotated at an unknown pivot and a target value, return the index of target if it exists. Return -1 if the target is absent.',
  'Koko Eating Bananas': 'Given piles of bananas and an integer h, find the minimum eating speed k such that all bananas can be eaten within h hours.',
  'Reverse Linked List': 'Given the head of a singly linked list, reverse the list and return the new head.',
  'Merge Two Sorted Lists': 'Given the heads of two sorted linked lists, merge them into one sorted linked list by reusing the existing nodes. Return the head of the merged list.',
  'Linked List Cycle': 'Given the head of a linked list, determine whether the list contains a cycle. A cycle exists if a node can be reached again by continuously following next pointers.',
  'Remove Nth Node From End': 'Given the head of a linked list and an integer n, remove the nth node from the end of the list and return the head of the modified list.',
  'Reorder List': 'Given a linked list L0 -> L1 -> ... -> Ln, reorder it as L0 -> Ln -> L1 -> Ln-1 -> L2 -> Ln-2 and so on. Modify the list in place.',
  'Add Two Numbers': 'Given two non-empty linked lists representing two non-negative integers in reverse digit order, add the numbers and return the sum as a linked list in the same reverse order.',
  'Palindrome Linked List': 'Given the head of a singly linked list, return true if the list values form a palindrome and false otherwise.',
  'Invert Binary Tree': 'Given the root of a binary tree, invert the tree by swapping every node left and right child. Return the root of the inverted tree.',
  'Same Tree': 'Given the roots of two binary trees, determine whether the trees are structurally identical and all corresponding nodes have the same value.',
  'Diameter of Binary Tree': 'Given the root of a binary tree, return the length of the diameter of the tree. The diameter is the number of edges on the longest path between any two nodes.',
  'Balanced Binary Tree': 'Given the root of a binary tree, return true if the tree is height-balanced. A tree is balanced when the left and right subtree heights of every node differ by no more than one.',
  'Binary Tree Level Order Traversal': 'Given the root of a binary tree, return its node values level by level from left to right.',
  'Binary Tree Right Side View': 'Given the root of a binary tree, return the values visible when looking at the tree from the right side, ordered from top to bottom.',
  'Path Sum': 'Given the root of a binary tree and a target sum, return true if the tree has a root-to-leaf path whose node values add up to targetSum.',
  'Construct Binary Tree from Preorder and Inorder': 'Given preorder and inorder traversal arrays of a binary tree with unique values, reconstruct the tree and return its root.',
  'Binary Tree Maximum Path Sum': 'Given the root of a non-empty binary tree, find the maximum path sum. A path may start and end at any nodes but must follow parent-child connections.',
  'Number of Islands': 'Given a 2D grid of 1s and 0s representing land and water, count the number of islands. An island is formed by horizontally or vertically connected land cells.',
  'Rotting Oranges': 'Given a grid with empty cells, fresh oranges, and rotten oranges, return the minimum minutes needed for all fresh oranges to rot. Return -1 if some fresh orange can never rot.',
  'Graph Valid Tree': 'Given n nodes labeled 0 to n - 1 and an edge list, determine whether the edges form one valid tree. A valid tree must be connected and contain no cycle.',
  'Number of Connected Components': 'Given n nodes labeled 0 to n - 1 and an undirected edge list, return the number of connected components in the graph.',
  'Redundant Connection': 'Given edges of an undirected graph that started as a tree with one extra edge added, return the edge that can be removed so the graph becomes a tree again.',
  'Min Cost to Connect All Points': 'Given points on a 2D plane, connect all points with minimum total cost where the cost between two points is their Manhattan distance.',
  'Word Ladder': 'Given beginWord, endWord, and a wordList, return the length of the shortest transformation sequence from beginWord to endWord. Each step may change exactly one character and every intermediate word must be in wordList.',
  'Climbing Stairs': 'Given n steps, you can climb either 1 or 2 steps at a time. Return the number of distinct ways to reach the top.',
  'House Robber': 'Given an array nums where nums[i] is the money in house i, return the maximum amount you can rob without robbing adjacent houses.',
  'House Robber II': 'Given circularly arranged houses where adjacent houses cannot both be robbed, return the maximum amount of money you can rob.',
  'Coin Change': 'Given coin denominations and an amount, return the fewest number of coins needed to make that amount. Return -1 if the amount cannot be formed.',
  'Decode Ways': 'Given a string of digits representing encoded letters where A is 1 through Z is 26, return the number of ways to decode the string.',
  'Longest Increasing Subsequence': 'Given an integer array nums, return the length of the longest strictly increasing subsequence.',
  'Partition Equal Subset Sum': 'Given an integer array nums, return true if it can be partitioned into two subsets with equal sum.',
  'Unique Paths': 'Given an m by n grid, a robot starts in the top-left corner and can only move right or down. Return the number of unique paths to the bottom-right corner.',
  'Target Sum': 'Given an array nums and a target, assign either + or - before each number. Return the number of ways to create an expression that evaluates to target.',
  'Palindromic Substrings': 'Given a string s, count how many substrings are palindromes. Single-character substrings count as palindromes.',
  Subsets: 'Given an array nums containing distinct integers, return all possible subsets. The solution set must not contain duplicate subsets.',
  'Subsets II': 'Given an integer array nums that may contain duplicates, return all unique subsets without duplicate subset results.',
  'Combination Sum II': 'Given candidate numbers and a target, return all unique combinations where the chosen numbers sum to target. Each candidate may be used at most once.',
  'Letter Combinations of Phone Number': 'Given a string of digits from 2 to 9, return all possible letter combinations the number could represent using a phone keypad mapping.',
  'Palindrome Partitioning': 'Given a string s, partition it so every substring in the partition is a palindrome. Return all possible palindrome partitions.',
  'Generate Parentheses': 'Given n pairs of parentheses, generate all combinations of well-formed parentheses.',
  'Last Stone Weight': 'Given stones with positive weights, repeatedly smash the two heaviest stones together. Return the final stone weight, or 0 if no stones remain.',
  'Task Scheduler': 'Given tasks represented by capital letters and a cooldown n, return the least number of time units needed to finish all tasks while respecting the cooldown between identical tasks.',
  'Merge K Sorted Lists': 'Given an array of k sorted linked lists, merge all lists into one sorted linked list and return its head.',
  'K Closest Points to Origin': 'Given points on a plane and an integer k, return the k points closest to the origin using Euclidean distance. The answer may be returned in any order.',
  'Valid Anagram': 'Given two strings s and t, return true if t is an anagram of s and false otherwise.',
  'Longest Common Prefix': 'Given an array of strings, return the longest common prefix shared by all strings. Return an empty string if there is no common prefix.',
  'Valid Palindrome': 'Given a string s, determine whether it is a palindrome after converting uppercase letters to lowercase and removing non-alphanumeric characters.',
  'Encode and Decode Strings': 'Design a way to encode a list of strings into one string and then decode it back to the original list. The encoding must handle empty strings and delimiter characters safely.',
  'String to Integer atoi': 'Implement a function that converts a string to a 32-bit signed integer following atoi-style parsing rules. Ignore leading spaces, handle an optional sign, read digits, and clamp overflow.',
  'Search a 2D Matrix': 'Given an m by n matrix where each row is sorted and the first value of each row is greater than the last value of the previous row, determine whether target exists in the matrix.',
  'Flood Fill': 'Given an image grid, a starting cell, and a replacement color, recolor the starting cell and all 4-directionally connected cells with the same original color.',
  'Surrounded Regions': 'Given a board of X and O cells, capture all O regions completely surrounded by X. Border-connected O cells should remain unchanged.',
  'Game of Life': 'Given a board representing Conway Game of Life, compute the next state using the standard neighbor-count rules. Update the board state according to the rules.',
  'Partition Labels': 'Given a string s, split it into as many parts as possible so that each letter appears in at most one part. Return the size of each partition.',
  'Non-overlapping Intervals': 'Given intervals, return the minimum number of intervals that must be removed so the remaining intervals do not overlap.',
  'Insert Interval': 'Given sorted non-overlapping intervals and a new interval, insert the new interval and merge overlaps so the result remains sorted and non-overlapping.',
  Candy: 'Given children ratings, distribute candies so each child gets at least one candy and children with higher ratings than an adjacent child get more candies. Return the minimum candies needed.',
  'Single Number': 'Given a non-empty integer array where every element appears twice except one, return the element that appears only once.',
  'Counting Bits': 'Given an integer n, return an array ans where ans[i] is the number of 1 bits in the binary representation of i for every 0 <= i <= n.',
  'Reverse Bits': 'Given a 32-bit unsigned integer, reverse its bits and return the resulting integer.',
  'Sum of Two Integers': 'Given two integers a and b, return their sum without using the + or - operators.',
  'Time Based Key Value Store': 'Implement a time-based key-value store. A set operation stores a value for a key at a timestamp, and a get operation returns the value with the greatest timestamp less than or equal to the requested timestamp.',
  'Design HashMap': 'Design a hash map without using a built-in hash table library. Support put, get, and remove operations for integer keys and values.',
  'Randomized Set': 'Design a data structure that supports insert, remove, and getRandom in average O(1) time. getRandom should return a random existing element.',
  'Design Twitter': 'Design a simplified Twitter service that supports posting tweets, following and unfollowing users, and retrieving the 10 most recent tweet ids in a user news feed.',
  'Range Sum Query Mutable': 'Design a mutable array that supports updating an element and querying the sum of values in an inclusive index range.',
  'Count of Smaller Numbers After Self': 'Given an integer array nums, return an array counts where counts[i] is the number of smaller elements to the right of nums[i].',
  'Book Allocation Problem': 'Given an array where each value is the number of pages in a book and k students, allocate contiguous books to students so the maximum pages assigned to any student is minimized.',
  'Aggressive Cows': 'Given stall positions and k cows, place the cows in stalls so the minimum distance between any two cows is as large as possible. Return that largest possible minimum distance.',
  'Sort Colors': 'Given an array containing only 0, 1, and 2, sort the array in-place so equal colors are adjacent and ordered as 0s, then 1s, then 2s.',
  'Move Zeroes': 'Given an integer array nums, move all 0 values to the end while preserving the relative order of the non-zero values.',
  'Maximum Subarray': 'Given an integer array nums, find the contiguous subarray with the largest sum and return that sum.',
  'Rotate Array': 'Given an array nums and an integer k, rotate the array to the right by k steps.',
  'Next Permutation': 'Given an array representing a permutation, rearrange it into the next lexicographically greater permutation. If no greater permutation exists, rearrange it into ascending order.',
  'Find All Anagrams in a String': 'Given strings s and p, return all starting indices in s where an anagram of p begins.',
  'Max Consecutive Ones III': 'Given a binary array nums and an integer k, return the maximum number of consecutive 1s obtainable by flipping at most k zeroes.',
  'Car Fleet': 'Given a target distance and arrays position and speed for cars moving toward the target, return the number of car fleets that will arrive.',
  'Simplify Path': 'Given an absolute Unix-style file path, simplify it to its canonical path using . and .. directory rules.',
  'Find Peak Element': 'Given an array nums where adjacent elements are not equal, return the index of any peak element. A peak is greater than its neighbors.',
  'Median of Two Sorted Arrays': 'Given two sorted arrays nums1 and nums2, return the median of the combined sorted values in O(log(m + n)) time if possible.',
};

const REFS = {
  'Best Time to Buy and Sell Stock': leetcode(121, 'best-time-to-buy-and-sell-stock'),
  'Contains Duplicate': leetcode(217, 'contains-duplicate'),
  'Product of Array Except Self': leetcode(238, 'product-of-array-except-self'),
  'Maximum Product Subarray': leetcode(152, 'maximum-product-subarray'),
  'Container With Most Water': leetcode(11, 'container-with-most-water'),
  '3Sum': leetcode(15, '3sum'),
  'Merge Intervals': leetcode(56, 'merge-intervals'),
  'Jump Game': leetcode(55, 'jump-game'),
  'Majority Element': leetcode(169, 'majority-element'),
  'Missing Number': leetcode(268, 'missing-number'),
  'Find Duplicate Number': leetcode(287, 'find-the-duplicate-number'),
  'Minimum Size Subarray Sum': leetcode(209, 'minimum-size-subarray-sum'),
  'Longest Substring Without Repeating Characters': leetcode(3, 'longest-substring-without-repeating-characters'),
  'Permutation in String': leetcode(567, 'permutation-in-string'),
  'Minimum Window Substring': leetcode(76, 'minimum-window-substring'),
  'Valid Parentheses': leetcode(20, 'valid-parentheses'),
  'Daily Temperatures': leetcode(739, 'daily-temperatures'),
  'Evaluate Reverse Polish Notation': leetcode(150, 'evaluate-reverse-polish-notation'),
  'Largest Rectangle in Histogram': leetcode(84, 'largest-rectangle-in-histogram'),
  'Asteroid Collision': leetcode(735, 'asteroid-collision'),
  'Decode String': leetcode(394, 'decode-string'),
  'Binary Search': leetcode(704, 'binary-search'),
  'Search Insert Position': leetcode(35, 'search-insert-position'),
  'Find Minimum in Rotated Sorted Array': leetcode(153, 'find-minimum-in-rotated-sorted-array'),
  'Search in Rotated Sorted Array': leetcode(33, 'search-in-rotated-sorted-array'),
  'Koko Eating Bananas': leetcode(875, 'koko-eating-bananas'),
  'Reverse Linked List': leetcode(206, 'reverse-linked-list'),
  'Merge Two Sorted Lists': leetcode(21, 'merge-two-sorted-lists'),
  'Linked List Cycle': leetcode(141, 'linked-list-cycle'),
  'Remove Nth Node From End': leetcode(19, 'remove-nth-node-from-end-of-list'),
  'Reorder List': leetcode(143, 'reorder-list'),
  'Add Two Numbers': leetcode(2, 'add-two-numbers'),
  'Palindrome Linked List': leetcode(234, 'palindrome-linked-list'),
  'Invert Binary Tree': leetcode(226, 'invert-binary-tree'),
  'Same Tree': leetcode(100, 'same-tree'),
  'Diameter of Binary Tree': leetcode(543, 'diameter-of-binary-tree'),
  'Balanced Binary Tree': leetcode(110, 'balanced-binary-tree'),
  'Binary Tree Level Order Traversal': leetcode(102, 'binary-tree-level-order-traversal'),
  'Binary Tree Right Side View': leetcode(199, 'binary-tree-right-side-view'),
  'Path Sum': leetcode(112, 'path-sum'),
  'Construct Binary Tree from Preorder and Inorder': leetcode(105, 'construct-binary-tree-from-preorder-and-inorder-traversal'),
  'Binary Tree Maximum Path Sum': leetcode(124, 'binary-tree-maximum-path-sum'),
  'Number of Islands': leetcode(200, 'number-of-islands'),
  'Rotting Oranges': leetcode(994, 'rotting-oranges'),
  'Graph Valid Tree': leetcode(261, 'graph-valid-tree'),
  'Number of Connected Components': leetcode(323, 'number-of-connected-components-in-an-undirected-graph'),
  'Redundant Connection': leetcode(684, 'redundant-connection'),
  'Min Cost to Connect All Points': leetcode(1584, 'min-cost-to-connect-all-points'),
  'Word Ladder': leetcode(127, 'word-ladder'),
  'Climbing Stairs': leetcode(70, 'climbing-stairs'),
  'House Robber': leetcode(198, 'house-robber'),
  'House Robber II': leetcode(213, 'house-robber-ii'),
  'Coin Change': leetcode(322, 'coin-change'),
  'Decode Ways': leetcode(91, 'decode-ways'),
  'Longest Increasing Subsequence': leetcode(300, 'longest-increasing-subsequence'),
  'Partition Equal Subset Sum': leetcode(416, 'partition-equal-subset-sum'),
  'Unique Paths': leetcode(62, 'unique-paths'),
  'Target Sum': leetcode(494, 'target-sum'),
  'Palindromic Substrings': leetcode(647, 'palindromic-substrings'),
  Subsets: leetcode(78, 'subsets'),
  'Subsets II': leetcode(90, 'subsets-ii'),
  'Combination Sum II': leetcode(40, 'combination-sum-ii'),
  'Letter Combinations of Phone Number': leetcode(17, 'letter-combinations-of-a-phone-number'),
  'Palindrome Partitioning': leetcode(131, 'palindrome-partitioning'),
  'Generate Parentheses': leetcode(22, 'generate-parentheses'),
  'Last Stone Weight': leetcode(1046, 'last-stone-weight'),
  'Task Scheduler': leetcode(621, 'task-scheduler'),
  'Merge K Sorted Lists': leetcode(23, 'merge-k-sorted-lists'),
  'K Closest Points to Origin': leetcode(973, 'k-closest-points-to-origin'),
  'Valid Anagram': leetcode(242, 'valid-anagram'),
  'Longest Common Prefix': leetcode(14, 'longest-common-prefix'),
  'Valid Palindrome': leetcode(125, 'valid-palindrome'),
  'Encode and Decode Strings': leetcode(271, 'encode-and-decode-strings'),
  'String to Integer atoi': leetcode(8, 'string-to-integer-atoi'),
  'Search a 2D Matrix': leetcode(74, 'search-a-2d-matrix'),
  'Flood Fill': leetcode(733, 'flood-fill'),
  'Surrounded Regions': leetcode(130, 'surrounded-regions'),
  'Game of Life': leetcode(289, 'game-of-life'),
  'Partition Labels': leetcode(763, 'partition-labels'),
  'Non-overlapping Intervals': leetcode(435, 'non-overlapping-intervals'),
  'Insert Interval': leetcode(57, 'insert-interval'),
  Candy: leetcode(135, 'candy'),
  'Single Number': leetcode(136, 'single-number'),
  'Counting Bits': leetcode(338, 'counting-bits'),
  'Reverse Bits': leetcode(190, 'reverse-bits'),
  'Sum of Two Integers': leetcode(371, 'sum-of-two-integers'),
  'Time Based Key Value Store': leetcode(981, 'time-based-key-value-store'),
  'Design HashMap': leetcode(706, 'design-hashmap'),
  'Randomized Set': leetcode(380, 'insert-delete-getrandom-o1'),
  'Design Twitter': leetcode(355, 'design-twitter'),
  'Range Sum Query Mutable': leetcode(307, 'range-sum-query-mutable'),
  'Count of Smaller Numbers After Self': leetcode(315, 'count-of-smaller-numbers-after-self'),
  'Book Allocation Problem': gfg('allocate-minimum-number-of-pages0937'),
  'Aggressive Cows': gfg('aggressive-cows'),
  'Sort Colors': leetcode(75, 'sort-colors'),
  'Move Zeroes': leetcode(283, 'move-zeroes'),
  'Maximum Subarray': leetcode(53, 'maximum-subarray'),
  'Rotate Array': leetcode(189, 'rotate-array'),
  'Next Permutation': leetcode(31, 'next-permutation'),
  'Find All Anagrams in a String': leetcode(438, 'find-all-anagrams-in-a-string'),
  'Max Consecutive Ones III': leetcode(1004, 'max-consecutive-ones-iii'),
  'Car Fleet': leetcode(853, 'car-fleet'),
  'Simplify Path': leetcode(71, 'simplify-path'),
  'Find Peak Element': leetcode(162, 'find-peak-element'),
  'Median of Two Sorted Arrays': leetcode(4, 'median-of-two-sorted-arrays'),
};

const splitTopLevel = (value) => {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (const char of String(value ?? '')) {
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

    if (char === '[' || char === '{' || char === '(') {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ']' || char === '}' || char === ')') {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim() || parts.length) parts.push(current.trim());
  return parts.filter((part) => part.length > 0);
};

const extractSignature = (starterCode = {}) => {
  const js = starterCode.javascript || '';
  const py = starterCode.python || '';
  const java = starterCode.java || '';
  let match = js.match(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/);
  if (match) {
    return {
      name: match[1],
      params: match[2].split(',').map((param) => param.trim()).filter(Boolean),
    };
  }

  match = py.match(/def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/);
  if (match) {
    return {
      name: match[1],
      params: match[2].split(',').map((param) => param.trim()).filter((param) => param && param !== 'self'),
    };
  }

  match = java.match(/\b([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/);
  if (match) {
    return {
      name: match[1],
      params: match[2]
        .split(',')
        .map((param) => param.trim().split(/\s+/).pop())
        .filter(Boolean),
    };
  }

  return { name: '', params: [] };
};

const formatInput = (question, rawInput) => {
  const signature = extractSignature(question.starterCode);
  const parts = splitTopLevel(rawInput);

  if (signature.params.length === 1) {
    return `${signature.params[0]} = ${rawInput}`;
  }

  if (signature.params.length > 1 && parts.length === signature.params.length) {
    return parts.map((part, index) => `${signature.params[index]} = ${part}`).join(', ');
  }

  return String(rawInput ?? '');
};

const buildExamples = (question) => {
  const cases = Array.isArray(question.testCases) ? question.testCases.slice(0, 3) : [];
  if (!cases.length) return '';

  return cases
    .map((testCase, index) => {
      const lines = [
        `Example ${index + 1}:`,
        `Input: ${formatInput(question, testCase.input)}`,
        `Output: ${testCase.expectedOutput}`,
      ];
      if (testCase.explanation) {
        lines.push(`Explanation: ${testCase.explanation}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');
};

const buildConstraints = (question) => {
  const constraints = Array.isArray(question.constraints) ? question.constraints.filter(Boolean) : [];
  if (!constraints.length) return '';
  return `Constraints:\n${constraints.map((constraint) => `- ${constraint}`).join('\n')}`;
};

const buildSignatureLine = (question) => {
  const signature = extractSignature(question.starterCode);
  if (!signature.name) return '';
  return `Function signature: ${signature.name}(${signature.params.join(', ')})`;
};

const buildNotes = (question) => {
  const notes = [];
  if (question.topic === 'linked-list') {
    notes.push('Linked lists are shown in examples as arrays, where each array value is a node value in order.');
  }
  if (question.topic === 'tree') {
    notes.push('Binary trees are shown in level-order array form, using null for missing children.');
  }
  if (question.topic === 'design') {
    notes.push('For design-style inputs, process the operations from left to right and return the values produced by the requested operations.');
  }
  if (['Reorder List', 'Game of Life', 'Sort Colors', 'Move Zeroes', 'Rotate Array', 'Next Permutation', 'Surrounded Regions'].includes(question.title)) {
    notes.push('This problem expects the input structure to be modified in place when the starter function requires it.');
  }
  notes.push('Return the result from your function in the format shown by the examples.');
  return `Notes:\n${notes.map((note) => `- ${note}`).join('\n')}`;
};

const buildDescription = (question, brief) => {
  const examples = buildExamples(question);
  const constraints = buildConstraints(question);
  const signature = buildSignatureLine(question);
  const complexityParts = [];
  if (
    typeof question.timeComplexity === 'string'
    && question.timeComplexity.trim()
    && !/depends on approach/i.test(question.timeComplexity)
  ) {
    complexityParts.push(`Time: ${question.timeComplexity.trim()}`);
  }
  if (
    typeof question.spaceComplexity === 'string'
    && question.spaceComplexity.trim()
    && !/depends on approach/i.test(question.spaceComplexity)
  ) {
    complexityParts.push(`Space: ${question.spaceComplexity.trim()}`);
  }

  return [
    brief,
    signature,
    examples ? `Examples:\n\n${examples}` : '',
    constraints,
    complexityParts.length ? `Expected complexity: ${complexityParts.join(', ')}.` : '',
    buildNotes(question),
  ].filter(Boolean).join('\n\n');
};

const files = process.argv.slice(2);
const targets = files.length ? files : DEFAULT_FILES;

let totalUpdated = 0;
for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.warn(`Skipping missing file: ${file}`);
    continue;
  }

  const questions = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(questions)) {
    throw new Error(`Expected array JSON in ${file}`);
  }

  let updated = 0;
  const next = questions.map((question) => {
    const brief = DESCRIPTIONS[question.title];
    if (!brief) return question;

    updated += 1;
    const referenceUrls = Array.from(new Set([
      ...(Array.isArray(question.referenceUrls) ? question.referenceUrls : []),
      ...(REFS[question.title] || []),
    ]));

    return {
      ...question,
      description: buildDescription(question, brief),
      referenceUrls,
    };
  });

  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  totalUpdated += updated;
  console.log(`${file}: updated ${updated}/${questions.length} descriptions`);
}

console.log(`Total descriptions updated: ${totalUpdated}`);
