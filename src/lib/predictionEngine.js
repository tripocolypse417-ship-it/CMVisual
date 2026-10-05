/**
 * WaveRadar Prediction Engine v1
 *
 * Evidence-first baseline for trajectory, hazard, and situational prediction.
 * This module NEVER infers a person's intent and never upgrades predictions
 * into measurements. It is designed to sit after sensor validation/fusion.
 */

export const EVIDENCE = Object.freeze({
  MEASURED: 'MEASURED',
  DERIVED: 'DERIVED',
  ENVIRONMENTAL: 'ENVIRONMENTAL',
  PREDICTED: 'PREDICTED',
  GROUND_TRUTH_OPERATOR_MARKER: 'GROUND_TRUTH_OPERATOR_MARKER',
  UNKNOWN: 'UNKNOWN',
});

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, Number(v) || 0));
const finite = (v) => Number.isFinite(Number(v));
const degToRad = (d) => Number(d) * Math.PI / 180;

export function predictPosition({ x, y, speed = 0, headingDeg = 0, horizonSec = 2 }) {
  if (![x, y, speed, headingDeg, horizonSec].every(finite)) return null;
  const h = degToRad(headingDeg);
  return {
    x: Number(x) + Math.sin(h) * Number(speed) * Number(horizonSec),
    y: Number(y) + Math.cos(h) * Number(speed) * Number(horizonSec),
    horizonSec: Number(horizonSec),
    evidenceClass: EVIDENCE.PREDICTED,
  };
}

export function predictTrajectory(samples = [], horizonSec = 2) {
  const valid = samples.filter(s =>
    finite(s?.x) && finite(s?.y) && finite(s?.t)
  ).slice(-12);

  if (valid.length < 2) {
    return {
      status: 'INSUFFICIENT_DATA',
      confidence: 0,
      evidenceClass: EVIDENCE.PREDICTED,
    };
  }

  const a = valid[valid.length - 2];
  const b = valid[valid.length - 1];
  const dt = (Number(b.t) - Number(a.t)) / 1000;
  if (dt <= 0) return { status: 'INVALID_TIMING', confidence: 0, evidenceClass: EVIDENCE.PREDICTED };

  const vx = (Number(b.x) - Number(a.x)) / dt;
  const vy = (Number(b.y) - Number(a.y)) / dt;
  const speed = Math.hypot(vx, vy);
  const predicted = {
    x: Number(b.x) + vx * Number(horizonSec),
    y: Number(b.y) + vy * Number(horizonSec),
  };

  const timingQuality = clamp(dt > 0 && dt < 2 ? 1 : 0.5);
  const sampleQuality = clamp(valid.length / 12);
  const confidence = clamp(0.35 + 0.35 * sampleQuality + 0.30 * timingQuality);

  return {
    status: 'OK',
    position: { x: predicted.x, y: predicted.y },
    velocity: { x: vx, y: vy, evidenceClass: EVIDENCE.DERIVED },
    speed,
    horizonSec: Number(horizonSec),
    confidence,
    evidenceClass: EVIDENCE.PREDICTED,
  };
}

export function predictHazardIntersection(target, hazard, horizonSec = 5) {
  if (!target || !hazard) return { status: 'INSUFFICIENT_DATA', probability: 0, evidenceClass: EVIDENCE.PREDICTED };
  const trajectory = predictTrajectory(target.samples || [], horizonSec);
  if (trajectory.status !== 'OK' || !finite(hazard.x) || !finite(hazard.y)) {
    return { status: 'INSUFFICIENT_DATA', probability: 0, evidenceClass: EVIDENCE.PREDICTED };
  }

  const dx = trajectory.position.x - Number(hazard.x);
  const dy = trajectory.position.y - Number(hazard.y);
  const distance = Math.hypot(dx, dy);
  const radius = finite(hazard.radius) ? Math.max(0, Number(hazard.radius)) : 1;
  const probability = clamp((radius + 1 - distance) / (radius + 1));

  return {
    status: 'OK',
    distance,
    probability,
    horizonSec: Number(horizonSec),
    confidence: trajectory.confidence,
    evidenceClass: EVIDENCE.PREDICTED,
  };
}

export function assessEvidence({ measured = 0, derived = 0, environmental = 0, agreement = 0 } = {}) {
  const coverage = clamp((measured + derived + environmental) / 3);
  const confidence = clamp(0.55 * coverage + 0.45 * clamp(agreement));
  return {
    coverage,
    confidence,
    level: confidence >= 0.8 ? 'HIGH' : confidence >= 0.55 ? 'MODERATE' : 'LOW',
    evidenceClass: EVIDENCE.PREDICTED,
  };
}

/**
 * Intent is deliberately not inferred here.
 * Observed behavior may be flagged for review, but intent remains unknown
 * unless a separate, explicitly validated domain model establishes evidence.
 */
export function classifyBehaviorObservation({ anomalies = [], confidence = 0 } = {}) {
  return {
    status: anomalies.length ? 'BEHAVIORAL_ANOMALY_OBSERVED' : 'NO_ANOMALY_FLAGGED',
    anomalies: [...anomalies],
    confidence: clamp(confidence),
    intent: 'UNKNOWN',
    evidenceClass: EVIDENCE.PREDICTED,
  };
}

export function buildTargetPrediction(target = {}) {
  const trajectory = predictTrajectory(target.samples || [], target.horizonSec ?? 2);
  const hazardResults = (target.hazards || []).map(h =>
    predictHazardIntersection(target, h, target.horizonSec ?? 5)
  );

  const evidence = assessEvidence({
    measured: target.measuredQuality ?? 0,
    derived: trajectory.status === 'OK' ? 1 : 0,
    environmental: target.environmentalQuality ?? 0,
    agreement: target.sensorAgreement ?? 0,
  });

  const behavior = classifyBehaviorObservation({
    anomalies: target.anomalies || [],
    confidence: evidence.confidence,
  });

  return {
    targetId: target.targetId ?? null,
    generatedAt: new Date().toISOString(),
    trajectory,
    hazards: hazardResults,
    evidence,
    behavior,
    intent: 'UNKNOWN',
    modelVersion: 'waveradar-prediction-v1',
  };
}
