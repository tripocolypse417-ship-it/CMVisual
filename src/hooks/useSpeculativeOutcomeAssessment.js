import { useMemo } from 'react';

// Speculative, evidence-grounded outcome assessment. This deliberately does
// NOT classify a person as dangerous, hostile, criminal, violent, or mentally
// ill. It estimates the likelihood of observable physical outcomes and reports
// why the estimate is strong/weak. All inputs are optional and unavailable
// inputs remain unavailable rather than being imputed as facts.
const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number(v) || 0));

function assessTrack(track, prediction, physical, reliability, conflicts, context = {}) {
  const speed = finite(track?.derivedTrack?.speedMps) ?? finite(track?.speed) ?? 0;
  const observations = finite(track?.derivedTrack?.observationCount) ?? 0;
  const uncertainty = finite(track?.uncertaintyM);
  const distance = finite(track?.distance);
  const confidence = finite(track?.confidence);
  const sensorSupport = finite(track?.sensorSupportCount) ?? 0;
  const rel = finite(reliability?.overall);
  const conflictCount = Array.isArray(conflicts?.conflicts) ? conflicts.conflicts.length : 0;

  let risk = 25;
  const reasons = [];
  const limitations = [];

  if (speed > 0.3) { risk += 15; reasons.push('sustained measurable motion'); }
  if (speed > 1.2) { risk += 10; reasons.push('higher observed speed'); }
  if (observations >= 5) { risk += 10; reasons.push('repeated track observations'); }
  else limitations.push('short track history');
  if (sensorSupport > 0) { risk += Math.min(15, sensorSupport * 5); reasons.push('cross-sensor support'); }
  if (distance != null && distance < 1.5) { risk += 12; reasons.push('short measured range'); }
  if (prediction?.horizons?.length) { risk += 5; reasons.push('future motion model available'); }
  if (physical?.outcome === 'CLOSE PROXIMITY') { risk += 8; reasons.push('forecast indicates continued proximity'); }
  if (rel != null) risk += (rel - 50) * 0.12;
  else limitations.push('sensor reliability unavailable');
  if (confidence != null) risk += (confidence - 0.5) * 12;
  if (uncertainty != null && uncertainty > 1.5) { risk -= 12; limitations.push('large spatial uncertainty'); }
  if (conflictCount > 0) { risk -= Math.min(20, conflictCount * 5); limitations.push('sensor disagreement present'); }
  if (!context.isScanning) limitations.push('live scanning inactive');
  if (context.cameraActive === false) limitations.push('camera unavailable');
  if (context.cellularStatus === 'UNAVAILABLE') limitations.push('cellular fusion unavailable');
  if (context.acousticAvailable === false) limitations.push('acoustic input unavailable');
  if (context.validatedPhysiologyAvailable === false) limitations.push('no validated physiological input');

  const score = clamp(Math.round(risk));
  const evidenceQuality = clamp(Math.round(
    (rel ?? 45) * 0.45 +
    Math.min(100, observations * 10) * 0.25 +
    (sensorSupport > 0 ? 75 : 40) * 0.15 +
    (conflictCount === 0 ? 80 : 35) * 0.15
  ));

  const outcome = physical?.outcome || (speed < 0.08 ? 'REMAIN / STOP' : speed > 0.15 ? 'CONTINUE PATH' : 'CONTINUE OBSERVATION');
  const alternatives = outcome === 'CONTINUE PATH'
    ? [{ label: 'CONTINUE PATH', probability: score }, { label: 'REMAIN / STOP', probability: clamp(100 - score - 10) }, { label: 'CHANGE DIRECTION', probability: clamp(110 - score - 40) }]
    : [{ label: outcome, probability: score }, { label: 'CONTINUE OBSERVATION', probability: clamp(100 - score) }];

  return {
    trackId: String(track?.trackId ?? track?.id ?? 'unknown'),
    classification: 'SPECULATIVE PHYSICAL-OUTCOME ASSESSMENT',
    riskScore: score,
    evidenceQuality,
    outcome,
    outcomeProbability: score,
    alternatives,
    reasons: reasons.slice(0, 8),
    limitations: limitations.slice(0, 8),
    dataSources: {
      camera: context.cameraActive === true,
      externalSensor: context.sensorConnected === true,
      cellular: context.cellularStatus && context.cellularStatus !== 'UNAVAILABLE',
      acoustic: context.acousticAvailable === true,
      environmental: context.environmentalAvailable === true,
      geolocation: context.geolocationAvailable === true,
      physiological: context.validatedPhysiologyAvailable === true,
      history: observations > 0,
      prediction: Boolean(prediction?.horizons?.length),
    },
    semantics: 'Speculative estimate of observable physical outcome. Not a probability that a person is dangerous or a statement of intent.',
    methodVersion: 'speculative-outcome-v1',
  };
}

export default function useSpeculativeOutcomeAssessment({ tracks = [], predictions = [], physicalForecasts = [], sensorReliability = null, sensorConflicts = null, context = {} } = {}) {
  return useMemo(() => {
    const predictionByTrack = new Map((predictions || []).map(p => [String(p.trackId), p]));
    const physicalByTrack = new Map((physicalForecasts || []).map(p => [String(p.trackId), p]));
    const assessments = (Array.isArray(tracks) ? tracks : []).map(track => {
      const id = String(track?.trackId ?? track?.id ?? 'unknown');
      return assessTrack(track, predictionByTrack.get(id), physicalByTrack.get(id), sensorReliability, sensorConflicts, context);
    });
    return { assessments, methodVersion: 'speculative-outcome-v1' };
  }, [tracks, predictions, physicalForecasts, sensorReliability, sensorConflicts, context]);
}