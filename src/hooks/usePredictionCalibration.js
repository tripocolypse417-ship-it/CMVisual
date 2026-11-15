import { useMemo } from 'react';
import { evaluatePredictionCalibration } from '../lib/predictionCalibration.js';

export default function usePredictionCalibration(predictions, observations) {
  return useMemo(
    () => evaluatePredictionCalibration(predictions, observations),
    [predictions, observations]
  );
}
