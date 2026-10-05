import { useEffect, useMemo, useRef, useState } from 'react';

// AI Analyst v1.0 — evidence fusion only.
// This module makes bounded, auditable inferences from supplied observations.
// It never invents sensor readings and never infers identity, intent, mental
// state, gender, or dangerousness from a person's appearance or movement.
const VERSION = 'ai-analyst-v1.1';
const INFERENCE_REGISTRY_VERSION = 'inference-registry-v1';
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number(n) || 0));
const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : null;

function analyzeTarget(target, allTargets, assessment, physicalOutcomeForecast = [], trackAnomalies = [], predictionCalibration = null, inferenceRegistry = null) {
  const observations = [target, ...(allTargets || []).filter(x => String(x?.id ?? x?.trackId) === String(target?.id ?? target?.trackId) && x !== target)];
  const confidenceValues = observations.map(x => finite(x?.confidence)).filter(x => x != null);
  const qualityValues = observations.map(x => finite(x?.signalQuality)).filter(x => x != null);
  const uncertainty = finite(target?.uncertaintyM);
  const support = Number(target?.sensorSupportCount) || 0;
  const repeated = Number(target?.derivedTrack?.observationCount) || 0;
  const disagreement = finite(target?.sensorDisagreement ?? target?.crossSensorError) ?? 0;
  const conf = confidenceValues.length ? confidenceValues.reduce((a,b)=>a+b,0) / confidenceValues.length : null;
  const quality = qualityValues.length ? qualityValues.reduce((a,b)=>a+b,0) / qualityValues.length : null;

  let evidence = 0;
  evidence += conf == null ? 0 : conf * 45;
  evidence += quality == null ? 0 : quality * 0.25;
  evidence += Math.min(20, support * 7);
  evidence += Math.min(15, repeated * 3);
  evidence -= Math.min(25, disagreement * 0.25);
  if (uncertainty != null) evidence -= Math.min(20, uncertainty * 4);
  evidence = clamp(evidence);

  const findings = [];
  if (repeated >= 3) findings.push('persistent track');
  if (support > 0) findings.push('independent sensor support');
  if (disagreement >= 35) findings.push('sensor disagreement');
  if (uncertainty != null) findings.push(`range uncertainty ±${uncertainty.toFixed(2)} m`);
  if (target?.moving) findings.push('measured motion');
  if (!findings.length) findings.push('single-source observation');

  const caveats = [];
  if (conf == null) caveats.push('no calibrated detector confidence');
  if (quality == null) caveats.push('no sensor-quality score');
  if (support === 0) caveats.push('not independently corroborated');
  if (repeated < 3) caveats.push('insufficient persistence history');
  if (disagreement >= 35) caveats.push('material cross-sensor disagreement');

  const classification = target?.type === 'human' ? 'HUMAN DETECTION' : String(target?.type || 'UNKNOWN').toUpperCase();
  const trackId = target?.trackId ?? target?.id ?? null;
  const forecast = (Array.isArray(physicalOutcomeForecast) ? physicalOutcomeForecast : []).find(x => String(x?.trackId) === String(trackId));
  const anomalies = (trackAnomalies || []).filter(x => String(x?.trackId) === String(trackId));
  const hypotheses = [];
  const dataGaps = [];
  if (forecast?.outcome) hypotheses.push({ label: String(forecast.outcome).toUpperCase(), basis: 'physical forecast from measured track history', status: 'PREDICTED' });
  if (target?.moving && finite(target?.derivedTrack?.speedMps) != null) hypotheses.push({ label: 'CONTINUE CURRENT PATH', basis: `measured motion at ${Number(target.derivedTrack.speedMps).toFixed(2)} m/s`, status: 'DERIVED' });
  if (target?.moving === false) hypotheses.push({ label: 'REMAIN / STOP', basis: 'measured stationary state', status: 'DERIVED' });
  if (anomalies.length) hypotheses.push({ label: 'MOTION STATE CHANGED', basis: anomalies.map(x => x.type).slice(0, 3).join(', '), status: 'CORROBORATED' });
  if (uncertainty == null) dataGaps.push('range uncertainty unavailable');
  if (repeated < 3) dataGaps.push('limited track history');
  if (support < 1) dataGaps.push('no independent sensor corroboration');
  if (!forecast) dataGaps.push('no physical outcome forecast available');
  const calibrated = Number.isFinite(Number(predictionCalibration?.calibrationScore)) ? Number(predictionCalibration.calibrationScore) : null;
  const eligibleFutureInference = (Array.isArray(inferenceRegistry?.eligible) ? inferenceRegistry.eligible : []).map(x => x.id);
  return {
    targetId: trackId,
    classification,
    evidenceScore: Math.round(evidence),
    confidence: conf == null ? null : Math.round(conf * 100),
    reasoning: findings,
    caveats,
    hypotheses,
    dataGaps,
    predictionCalibration: calibrated,
    inferenceRegistryVersion: INFERENCE_REGISTRY_VERSION,
    eligibleFutureInference,
    recommendation: evidence >= 75 && disagreement < 35 ? 'VERIFY WITH AN INDEPENDENT MEASUREMENT' : 'CONTINUE OBSERVATION',
    prohibitedInferences: ['identity', 'intent', 'mental state', 'gender', 'dangerousness', 'personality', 'neural state'],
    modelVersion: VERSION,
    assessmentState: assessment?.state || 'UNAVAILABLE',
  };
}

export default function useAIAnalyst({ detections = [], cameraDetections = [], assessment = null, physicalOutcomeForecast = [], trackAnomalies = [], predictionCalibration = null, inferenceRegistry = null, isScanning = false } = {}) {
  const [analysis, setAnalysis] = useState({ targets: [], generatedAt: null, modelVersion: VERSION });
  const previousRef = useRef('');

  const input = useMemo(() => {
    const merged = [...(Array.isArray(detections) ? detections : []), ...(Array.isArray(cameraDetections) ? cameraDetections : [])];
    const byId = new Map();
    merged.forEach(t => {
      const id = String(t?.id ?? t?.trackId ?? `${t?.source || 'observation'}-${t?.angle}-${t?.distance}`);
      if (!byId.has(id) || Number(t?.confidence || 0) > Number(byId.get(id)?.confidence || 0)) byId.set(id, t);
    });
    return [...byId.values()];
  }, [detections, cameraDetections]);

  useEffect(() => {
    if (!isScanning) return;
    const signature = JSON.stringify({ input: input.map(t => [t?.id, t?.trackId, t?.type, t?.distance, t?.angle, t?.confidence, t?.sensorSupportCount, t?.derivedTrack?.observationCount]), forecasts: (physicalOutcomeForecast || []).map(x => [x?.trackId, x?.outcome, x?.horizons?.[0]?.uncertaintyM]), anomalies: (trackAnomalies || []).map(x => [x?.trackId, x?.type, x?.observedAt]), calibration: predictionCalibration?.calibrationScore, inferenceRegistry: (inferenceRegistry?.eligible || []).map(x => x.id) });
    if (signature === previousRef.current) return;
    previousRef.current = signature;
    setAnalysis({
      targets: input.map(t => analyzeTarget(t, input, assessment, physicalOutcomeForecast, trackAnomalies, predictionCalibration, inferenceRegistry)),
      generatedAt: new Date().toISOString(),
      modelVersion: VERSION,
      dataPolicy: 'REAL INPUTS ONLY',
      inferencePolicy: inferenceRegistry?.policy || 'EVIDENCE-GATED · REAL DATA ONLY · UNKNOWN WHEN UNSUPPORTED',
      inferenceRegistryVersion: inferenceRegistry?.version || INFERENCE_REGISTRY_VERSION,
    });
  }, [input, assessment, physicalOutcomeForecast, trackAnomalies, predictionCalibration, inferenceRegistry, isScanning]);

  return analysis;
}