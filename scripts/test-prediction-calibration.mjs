import assert from 'node:assert/strict';
import { evaluatePredictionCalibration } from '../src/lib/predictionCalibration.js';

const generatedAt = Date.parse('2026-11-13T12:00:00.000Z');
const evaluatedAt = generatedAt + 10000;
const prediction = (uncertaintyM = 0.5) => ({
  trackId: 'track-1',
  generatedAt,
  horizons: [{ horizonMs: 1000, position: { x: 0, z: 0 }, uncertaintyM }],
});

const missingTime = evaluatePredictionCalibration(
  [prediction()],
  [{ trackId: 'track-1', position: { x: 0, z: 0 } }],
  evaluatedAt
);
assert.equal(missingTime.count, 0, 'missing observation time must not be replaced with processing time');

const invalidTime = evaluatePredictionCalibration(
  [prediction()],
  [{ trackId: 'track-1', observedAt: 'not-a-date', position: { x: 0, z: 0 } }],
  evaluatedAt
);
assert.equal(invalidTime.count, 0, 'invalid observation time must not be calibrated');

const invalidPosition = evaluatePredictionCalibration(
  [prediction()],
  [{ trackId: 'track-1', observedAt: generatedAt + 1000, position: { x: null, z: 0 } }],
  evaluatedAt
);
assert.equal(invalidPosition.count, 0, 'missing coordinates must not be coerced to zero');

const noUncertainty = evaluatePredictionCalibration(
  [prediction(null)],
  [{ trackId: 'track-1', observedAt: generatedAt + 1000, position: { x: 0.5, z: 0 } }],
  evaluatedAt
);
assert.equal(noUncertainty.count, 1, 'valid timed position error may still be reported');
assert.equal(noUncertainty.meanErrorM, 0.5);
assert.equal(noUncertainty.within2SigmaPct, null, 'uncertainty coverage cannot be scored without an uncertainty value');
assert.equal(noUncertainty.calibrationScore, null);

const valid = evaluatePredictionCalibration(
  [prediction(0.5)],
  [{ trackId: 'track-1', observedAt: generatedAt + 1000, position: { x: 0.5, z: 0 } }],
  evaluatedAt
);
assert.equal(valid.count, 1);
assert.equal(valid.meanErrorM, 0.5);
assert.equal(valid.within2SigmaPct, 100);
assert.ok(Number.isFinite(valid.calibrationScore));
assert.equal(valid.evaluationBasis, 'SAME_STREAM_LATER_OBSERVATIONS_NOT_INDEPENDENT_GROUND_TRUTH');

const future = evaluatePredictionCalibration(
  [prediction()],
  [{ trackId: 'track-1', observedAt: evaluatedAt + 5000, position: { x: 0, z: 0 } }],
  evaluatedAt
);
assert.equal(future.count, 0, 'future observations must not be used to calibrate past predictions');

console.log('WaveRadar prediction-calibration integrity tests: PASS');
