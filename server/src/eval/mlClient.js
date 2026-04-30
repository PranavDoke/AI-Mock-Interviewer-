const axios = require('axios');
const config = require('../config/config');
const logger = require('../config/logger');

const predictScore = async (features) => {
  const url = process.env.ML_SERVICE_URL || 'http://localhost:8000/predict';
  try {
    const resp = await axios.post(url, { features }, { timeout: 3000 });
    if (resp?.data?.predictedScore !== undefined) return Number(resp.data.predictedScore);
    return null;
  } catch (err) {
    logger.debug(`ML service unavailable: ${err.message}`);
    return null;
  }
};

module.exports = { predictScore };
