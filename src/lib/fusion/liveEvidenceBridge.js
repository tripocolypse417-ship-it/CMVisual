import { fuseEvidencePositions } from './evidencePipeline.js';

/**
 * Explicitly opt-in experimental stream bridge.
 * subscribe(onObservation) must return an unsubscribe function.
 * It never controls navigation or promotes candidates to verified detections.
 */
export function connectExperimentalFusion({ subscribe, onResult, now = Date.now, maxSamples = 64, maxAgeMs = 2000 } = {}) {
  if (typeof subscribe !== 'function' || typeof onResult !== 'function' || typeof now !== 'function') throw new TypeError('invalid-bridge-callbacks');
  if (!Number.isInteger(maxSamples) || maxSamples < 2 || maxSamples > 1000) throw new RangeError('invalid-max-samples');
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) throw new RangeError('invalid-max-age');
  let closed = false;
  let records = [];
  const unsubscribe = subscribe((record) => {
    if (closed) return;
    const time = now();
    if (!Number.isFinite(time)) return;
    if (record && typeof record === 'object' && !Array.isArray(record)) records.push(record);
    records = records.filter(item => typeof item?.timestampMs === 'number' && item.timestampMs <= time && time - item.timestampMs <= maxAgeMs).slice(-maxSamples);
    const result = fuseEvidencePositions(records, { nowMs: time, maxAgeMs });
    onResult(result);
  });
  if (typeof unsubscribe !== 'function') throw new TypeError('subscribe-must-return-unsubscribe');
  return () => { if (closed) return; closed = true; records = []; unsubscribe(); };
}
