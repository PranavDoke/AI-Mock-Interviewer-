/**
 * Picks specified keys from an object.
 */
const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {});
};

/**
 * Generates a random integer between min and max (inclusive).
 */
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Clamps a value between min and max.
 */
const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Calculates weighted average from an array of { value, weight } objects.
 */
const weightedAverage = (items) => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = items.reduce((sum, item) => sum + item.value * item.weight, 0);
  return weightedSum / totalWeight;
};

module.exports = { pick, randomInt, clamp, weightedAverage };
