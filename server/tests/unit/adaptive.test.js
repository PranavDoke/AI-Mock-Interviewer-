const { calculateNextDifficulty, selectNextTopic } = require('../../src/services/adaptive.service');

describe('Adaptive Service', () => {
  describe('calculateNextDifficulty', () => {
    it('should increase difficulty for high scores', () => {
      const session = {
        config: { targetDifficulty: 3 },
        difficultyProgression: [
          { score: 90, difficulty: 3 },
          { score: 85, difficulty: 3 },
        ],
      };
      const result = calculateNextDifficulty(session);
      expect(result).toBeGreaterThan(3);
    });

    it('should decrease difficulty for low scores', () => {
      const session = {
        config: { targetDifficulty: 3 },
        difficultyProgression: [
          { score: 20, difficulty: 3 },
          { score: 30, difficulty: 3 },
        ],
      };
      const result = calculateNextDifficulty(session);
      expect(result).toBeLessThan(3);
    });

    it('should clamp difficulty between 1 and 5', () => {
      const session = {
        config: { targetDifficulty: 5 },
        difficultyProgression: [
          { score: 99, difficulty: 5 },
        ],
      };
      const result = calculateNextDifficulty(session);
      expect(result).toBeLessThanOrEqual(5);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('should maintain difficulty for average scores', () => {
      const session = {
        config: { targetDifficulty: 3 },
        difficultyProgression: [
          { score: 55, difficulty: 3 },
        ],
      };
      const result = calculateNextDifficulty(session);
      expect(result).toBeCloseTo(3, 0);
    });
  });

  describe('selectNextTopic', () => {
    it('should return a topic from the available topics', () => {
      const topics = ['arrays', 'strings', 'trees'];
      const userSkillProfile = { topics: null };
      const result = selectNextTopic(userSkillProfile, topics, []);
      expect(topics).toContain(result);
    });

    it('should prioritize weak topics', () => {
      const topics = ['arrays', 'strings'];
      const userSkillProfile = {
        topics: new Map([
          ['arrays', { level: 5, questionsAttempted: 20, correctAnswers: 18 }],
          ['strings', { level: 1, questionsAttempted: 2, correctAnswers: 0 }],
        ]),
      };
      // Run multiple times — weak topic should appear more often
      const results = new Set();
      for (let i = 0; i < 20; i++) {
        results.add(selectNextTopic(userSkillProfile, topics, []));
      }
      expect(results.has('strings')).toBe(true);
    });
  });
});
