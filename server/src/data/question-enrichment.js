const ref = (id) => [
  `https://leetcode.com/problems/${id.slug}/`,
  `https://leetcode.doocs.org/en/lc/${id.number}/`,
];

const ids = {
  kthLargest: { number: 215, slug: 'kth-largest-element-in-an-array' },
  slidingWindow: { number: 239, slug: 'sliding-window-maximum' },
  longestConsecutive: { number: 128, slug: 'longest-consecutive-sequence' },
  rainWater: { number: 42, slug: 'trapping-rain-water' },
  editDistance: { number: 72, slug: 'edit-distance' },
  wordBreak: { number: 139, slug: 'word-break' },
  combinationSum: { number: 39, slug: 'combination-sum' },
  permutations: { number: 46, slug: 'permutations' },
  nQueens: { number: 51, slug: 'n-queens' },
  courseSchedule: { number: 207, slug: 'course-schedule' },
  cloneGraph: { number: 133, slug: 'clone-graph' },
  maxDepth: { number: 104, slug: 'maximum-depth-of-binary-tree' },
  validateBst: { number: 98, slug: 'validate-binary-search-tree' },
  lcaBst: { number: 235, slug: 'lowest-common-ancestor-of-a-binary-search-tree' },
  kthSmallest: { number: 230, slug: 'kth-smallest-element-in-a-bst' },
  serializeTree: { number: 297, slug: 'serialize-and-deserialize-binary-tree' },
  wordSearch: { number: 79, slug: 'word-search' },
  trie: { number: 208, slug: 'implement-trie-prefix-tree' },
  lru: { number: 146, slug: 'lru-cache' },
  lfu: { number: 460, slug: 'lfu-cache' },
  median: { number: 295, slug: 'find-median-from-data-stream' },
  rotateImage: { number: 48, slug: 'rotate-image' },
  spiral: { number: 54, slug: 'spiral-matrix' },
  zeroes: { number: 73, slug: 'set-matrix-zeroes' },
  subarraySum: { number: 560, slug: 'subarray-sum-equals-k' },
  palindrome: { number: 5, slug: 'longest-palindromic-substring' },
  groupAnagrams: { number: 49, slug: 'group-anagrams' },
  pacificAtlantic: { number: 417, slug: 'pacific-atlantic-water-flow' },
  networkDelay: { number: 743, slug: 'network-delay-time' },
  cheapestFlights: { number: 787, slug: 'cheapest-flights-within-k-stops' },
};

const tc = (input, expectedOutput, comparisonMode = 'exact', isHidden = true, explanation) => ({
  input,
  expectedOutput,
  comparisonMode,
  isHidden,
  ...(explanation ? { explanation } : {}),
});

const QUESTION_ENRICHMENT = {
  'Kth Largest Element in an Array': {
    referenceUrls: ref(ids.kthLargest),
    testHarness: 'function',
    testCases: [
      tc('[3,2,1,5,6,4],2', '5', 'exact', false),
      tc('[3,2,3,1,2,4,5,5,6],4', '4'),
      tc('[1],1', '1'),
      tc('[-1,-1],2', '-1'),
    ],
  },
  'Sliding Window Maximum': {
    referenceUrls: ref(ids.slidingWindow),
    testHarness: 'function',
    testCases: [
      tc('[1,3,-1,-3,5,3,6,7],3', '[3,3,5,5,6,7]', 'exact', false),
      tc('[1],1', '[1]'),
      tc('[9,11],2', '[11]'),
      tc('[4,-2],2', '[4]'),
    ],
  },
  'Longest Consecutive Sequence': {
    referenceUrls: ref(ids.longestConsecutive),
    testHarness: 'function',
    testCases: [
      tc('[100,4,200,1,3,2]', '4', 'exact', false),
      tc('[0,3,7,2,5,8,4,6,0,1]', '9'),
      tc('[]', '0'),
      tc('[1,2,0,1]', '3'),
    ],
  },
  'Trapping Rain Water': {
    referenceUrls: ref(ids.rainWater),
    testHarness: 'function',
    testCases: [
      tc('[0,1,0,2,1,0,1,3,2,1,2,1]', '6', 'exact', false),
      tc('[4,2,0,3,2,5]', '9'),
      tc('[1,2,3]', '0'),
      tc('[2,0,2]', '2'),
    ],
  },
  'Edit Distance': {
    referenceUrls: ref(ids.editDistance),
    testHarness: 'function',
    testCases: [
      tc('"horse","ros"', '3', 'exact', false),
      tc('"intention","execution"', '5'),
      tc('"","abc"', '3'),
      tc('"abc",""', '3'),
    ],
  },
  'Word Break': {
    referenceUrls: ref(ids.wordBreak),
    testHarness: 'function',
    testCases: [
      tc('"leetcode",["leet","code"]', 'true', 'exact', false),
      tc('"applepenapple",["apple","pen"]', 'true'),
      tc('"catsandog",["cats","dog","sand","and","cat"]', 'false'),
      tc('"cars",["car","ca","rs"]', 'true'),
    ],
  },
  'Combination Sum': {
    referenceUrls: ref(ids.combinationSum),
    testHarness: 'function',
    testCases: [
      tc('[2,3,6,7],7', '[[2,2,3],[7]]', 'unorderedDeep', false),
      tc('[2,3,5],8', '[[2,2,2,2],[2,3,3],[3,5]]', 'unorderedDeep'),
      tc('[2],1', '[]', 'unorderedDeep'),
    ],
  },
  Permutations: {
    referenceUrls: ref(ids.permutations),
    testHarness: 'function',
    testCases: [
      tc('[1,2,3]', '[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]', 'unorderedDeep', false),
      tc('[0,1]', '[[0,1],[1,0]]', 'unorderedDeep'),
      tc('[1]', '[[1]]', 'unorderedDeep'),
    ],
  },
  'N-Queens': {
    referenceUrls: ref(ids.nQueens),
    testHarness: 'function',
    testCases: [
      tc('4', '[[[".","Q",".","."],[".",".",".","Q"],["Q",".",".","."],[".",".","Q","."]],[[".",".","Q","."],["Q",".",".","."],[".",".",".","Q"],[".","Q",".","."]]]', 'nQueens', false),
      tc('1', '[[["Q"]]]', 'nQueens'),
      tc('2', '[]', 'nQueens'),
    ],
  },
  'Course Schedule': {
    referenceUrls: ref(ids.courseSchedule),
    testHarness: 'function',
    testCases: [
      tc('2,[[1,0]]', 'true', 'exact', false),
      tc('2,[[1,0],[0,1]]', 'false', 'exact', false),
      tc('4,[[1,0],[2,0],[3,1],[3,2]]', 'true'),
      tc('3,[[1,0],[1,2],[0,1]]', 'false'),
    ],
  },
  'Clone Graph': {
    referenceUrls: ref(ids.cloneGraph),
    testHarness: 'graph-clone',
    testCases: [
      tc('[[2,4],[1,3],[2,4],[1,3]]', '[[2,4],[1,3],[2,4],[1,3]]', 'exact', false),
      tc('[[]]', '[[]]'),
      tc('[]', '[]'),
    ],
  },
  'Maximum Depth of Binary Tree': {
    referenceUrls: ref(ids.maxDepth),
    testHarness: 'tree',
    testCases: [
      tc('[3,9,20,null,null,15,7]', '3', 'exact', false),
      tc('[1,null,2]', '2'),
      tc('[]', '0'),
      tc('[0]', '1'),
    ],
  },
  'Validate Binary Search Tree': {
    referenceUrls: ref(ids.validateBst),
    testHarness: 'tree',
    testCases: [
      tc('[2,1,3]', 'true', 'exact', false),
      tc('[5,1,4,null,null,3,6]', 'false', 'exact', false),
      tc('[2,2,2]', 'false'),
      tc('[2147483647]', 'true'),
    ],
  },
  'Lowest Common Ancestor of BST': {
    referenceUrls: ref(ids.lcaBst),
    testHarness: 'tree',
    testCases: [
      tc('[6,2,8,0,4,7,9,null,null,3,5],2,8', '6', 'exact', false),
      tc('[6,2,8,0,4,7,9,null,null,3,5],2,4', '2'),
      tc('[2,1],2,1', '2'),
    ],
  },
  'Kth Smallest Element in BST': {
    referenceUrls: ref(ids.kthSmallest),
    testHarness: 'tree',
    testCases: [
      tc('[3,1,4,null,2],1', '1', 'exact', false),
      tc('[5,3,6,2,4,null,null,1],3', '3'),
      tc('[1],1', '1'),
    ],
  },
  'Serialize and Deserialize Binary Tree': {
    referenceUrls: ref(ids.serializeTree),
    testHarness: 'codec',
    testCases: [
      tc('[1,2,3,null,null,4,5]', '[1,2,3,null,null,4,5]', 'treeArray', false),
      tc('[]', '[]', 'treeArray'),
      tc('[1]', '[1]', 'treeArray'),
    ],
  },
  'Word Search': {
    referenceUrls: ref(ids.wordSearch),
    testHarness: 'function',
    testCases: [
      tc('[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"ABCCED"', 'true', 'exact', false),
      tc('[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"SEE"', 'true'),
      tc('[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"ABCB"', 'false'),
      tc('[["a"]],"a"', 'true'),
    ],
  },
  'Trie (Prefix Tree)': {
    referenceUrls: ref(ids.trie),
    testHarness: 'operations',
    testCases: [
      tc('["Trie","insert","search","search","startsWith","insert","search"],[[],["apple"],["apple"],["app"],["app"],["app"],["app"]]', '[null,null,true,false,true,null,true]', 'exact', false),
      tc('["Trie","search"],[[],["a"]]', '[null,false]'),
    ],
  },
  'LRU Cache': {
    referenceUrls: ref(ids.lru),
    testHarness: 'operations',
    testCases: [
      tc('["LRUCache","put","put","get","put","get","put","get","get","get"],[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]', '[null,null,null,1,null,-1,null,-1,3,4]', 'exact', false),
      tc('["LRUCache","put","get","put","get","get"],[[1],[2,1],[2],[3,2],[2],[3]]', '[null,null,1,null,-1,2]'),
    ],
  },
  'LFU Cache': {
    referenceUrls: ref(ids.lfu),
    testHarness: 'operations',
    testCases: [
      tc('["LFUCache","put","put","get","put","get","get","put","get","get","get"],[[2],[1,1],[2,2],[1],[3,3],[2],[3],[4,4],[1],[3],[4]]', '[null,null,null,1,null,-1,3,null,-1,3,4]', 'exact', false),
      tc('["LFUCache","put","put","put","get","get"],[[2],[1,1],[2,2],[3,3],[1],[3]]', '[null,null,null,null,-1,3]'),
    ],
  },
  'Median of Data Stream': {
    referenceUrls: ref(ids.median),
    testHarness: 'operations',
    testCases: [
      tc('["MedianFinder","addNum","addNum","findMedian","addNum","findMedian"],[[],[1],[2],[],[3],[]]', '[null,null,null,1.5,null,2]', 'exact', false),
      tc('["MedianFinder","addNum","findMedian","addNum","findMedian"],[[],[-1],[],[-2],[]]', '[null,null,-1,null,-1.5]'),
    ],
  },
  'Rotate Image': {
    referenceUrls: ref(ids.rotateImage),
    testHarness: 'function',
    testCases: [
      tc('[[1,2,3],[4,5,6],[7,8,9]]', '[[7,4,1],[8,5,2],[9,6,3]]', 'exact', false),
      tc('[[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]', '[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]'),
      tc('[[1]]', '[[1]]'),
    ],
  },
  'Spiral Matrix': {
    referenceUrls: ref(ids.spiral),
    testHarness: 'function',
    testCases: [
      tc('[[1,2,3],[4,5,6],[7,8,9]]', '[1,2,3,6,9,8,7,4,5]', 'exact', false),
      tc('[[1,2,3,4],[5,6,7,8],[9,10,11,12]]', '[1,2,3,4,8,12,11,10,9,5,6,7]'),
      tc('[[1],[2],[3]]', '[1,2,3]'),
    ],
  },
  'Set Matrix Zeroes': {
    referenceUrls: ref(ids.zeroes),
    testHarness: 'function',
    testCases: [
      tc('[[1,1,1],[1,0,1],[1,1,1]]', '[[1,0,1],[0,0,0],[1,0,1]]', 'exact', false),
      tc('[[0,1,2,0],[3,4,5,2],[1,3,1,5]]', '[[0,0,0,0],[0,4,5,0],[0,3,1,0]]'),
      tc('[[1]]', '[[1]]'),
    ],
  },
  'Subarray Sum Equals K': {
    referenceUrls: ref(ids.subarraySum),
    testHarness: 'function',
    testCases: [
      tc('[1,1,1],2', '2', 'exact', false),
      tc('[1,2,3],3', '2'),
      tc('[1,-1,0],0', '3'),
      tc('[0,0,0],0', '6'),
    ],
  },
  'Longest Palindromic Substring': {
    referenceUrls: ref(ids.palindrome),
    testHarness: 'function',
    testCases: [
      tc('"babad"', '"bab"', 'longestPalindrome', false),
      tc('"cbbd"', '"bb"', 'longestPalindrome'),
      tc('"a"', '"a"', 'longestPalindrome'),
      tc('"ac"', '"a"', 'longestPalindrome'),
    ],
  },
  'Group Anagrams': {
    referenceUrls: ref(ids.groupAnagrams),
    testHarness: 'function',
    testCases: [
      tc('["eat","tea","tan","ate","nat","bat"]', '[["bat"],["nat","tan"],["ate","eat","tea"]]', 'unorderedDeep', false),
      tc('[""]', '[[""]]', 'unorderedDeep'),
      tc('["a"]', '[["a"]]', 'unorderedDeep'),
      tc('["",""]', '[["",""]]', 'unorderedDeep'),
    ],
  },
  'Pacific Atlantic Water Flow': {
    referenceUrls: ref(ids.pacificAtlantic),
    testHarness: 'function',
    testCases: [
      tc('[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]', '[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]', 'unorderedDeep', false),
      tc('[[1]]', '[[0,0]]', 'unorderedDeep'),
    ],
  },
  'Network Delay Time': {
    referenceUrls: ref(ids.networkDelay),
    testHarness: 'function',
    testCases: [
      tc('[[2,1,1],[2,3,1],[3,4,1]],4,2', '2', 'exact', false),
      tc('[[1,2,1]],2,1', '1'),
      tc('[[1,2,1]],2,2', '-1'),
      tc('[[1,2,1],[2,3,2],[1,3,4]],3,1', '3'),
    ],
  },
  'Cheapest Flights Within K Stops': {
    referenceUrls: ref(ids.cheapestFlights),
    testHarness: 'function',
    testCases: [
      tc('3,[[0,1,100],[1,2,100],[0,2,500]],0,2,1', '200', 'exact', false),
      tc('3,[[0,1,100],[1,2,100],[0,2,500]],0,2,0', '500'),
      tc('4,[[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]],0,3,1', '700'),
    ],
  },
};

module.exports = {
  QUESTION_ENRICHMENT,
};
