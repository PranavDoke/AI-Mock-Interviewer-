const axios = require('axios');
const config = require('../config/config');
const logger = require('../config/logger');

const predictScore = async (features) => {
  const url = process.env.ML_SERVICE_URL || 'http://localhost:8000/predict';
  try {
    // Ensure all features are present and numeric
    const cleanFeatures = {
      testPassRate: Number(features.testPassRate || 0),
      executionTime: features.executionTime === null ? -1 : Number(features.executionTime || 0),
      codeLength: Number(features.codeLength || 0),
      codeCharCount: Number(features.codeCharCount || 0),
      errorCount: Number(features.errorCount || 0),
      complexityScore: Number(features.complexityScore || 50),
      implementationCompleteness: Number(features.implementationCompleteness || 0),
      codeQualityScore: Number(features.codeQualityScore || 0),
      passedTestCases: Number(features.passedTestCases || 0),
      totalTestCases: Number(features.totalTestCases || 0),
      explanationClarity: Number(features.explanationClarity || 0),
      reasoningDepth: Number(features.reasoningDepth || 0),
      structuredThinking: Number(features.structuredThinking || 0),
      approachRelevance: Number(features.approachRelevance || 0),
      explanationCompleteness: Number(features.explanationCompleteness || 0),
      explanationWordCount: Number(features.explanationWordCount || 0),
      hasMeaningfulCode: features.hasMeaningfulCode !== false,
      hasExplanation: Boolean(features.hasExplanation),
    };

    logger.debug(`ML Service: Sending features`, { cleanFeatures });

    const resp = await axios.post(
      url,
      { features: cleanFeatures },
      { timeout: 2000 }
    );

    if (resp?.data?.predictedScore !== undefined) {
      const prediction = {
        predictedScore: Number(resp.data.predictedScore),
        usedModel: !!resp.data.usedModel,
      };
      logger.debug(`ML Service: Received prediction`, { prediction });
      return prediction;
    }
    
    logger.warn(`ML Service: Invalid response structure`, { response: resp.data });
    return { predictedScore: null, usedModel: false };
  } catch (err) {
    logger.warn(`ML service unavailable or error: ${err.message}`);
    logger.debug(`ML error details`, { 
      message: err.message, 
      code: err.code,
      url 
    });
    return { predictedScore: null, usedModel: false };
  }
};

module.exports = { predictScore };
