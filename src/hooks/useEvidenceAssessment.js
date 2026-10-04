import { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Evidence model v1.0
// Measures observable situational activity and evidence quality. It does NOT
// infer intent, dangerousness, mental state, identity, gender, or diagnosis.
// A high score means "more objective indicators require attention", not
// "this person is dangerous".
const VERSION = 'evidence-v1.1';
const MAX_HISTORY = 180;
const STALE_MS = 3000;
const SENSOR_WINDOW_MS = 8000;
const MIN_PERSISTENCE_SAMPLES = 3;

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number(n) || 0));
const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
function sensorQuality(s) {
  if (!s || typeof s !== 'object') return 0;
  if (s.status === 'LIVE' || s.connected === true || s.available === true) {
    const age = finite(s.ageMs);
    if (age == null) return 80;
    if (age <= 1000) return 100;
    if (age <= 3000) return 85;
    if (age <= 5000) return 60;
  }
  return 0;
}

function classify(score, validation, hasObjectiveHazard, persistence, disagreement) {
  // These are operational evidence states, not psychological/threat labels.
  // HIGH_CONCERN requires both high activity and adequate validation; a generic
  // behavioral score can never become CRITICAL by itself.
  if (validation < 45 || persistence < MIN_PERSISTENCE_SAMPLES) return 'INSUFFICIENT_EVIDENCE';
  if (hasObjectiveHazard && score >= 75 && validation >= 70 && disagreement < 35) return 'HIGH_CONCERN';
  if (score >= 55 && validation >= 65 && disagreement < 45) return 'ELEVATED_ACTIVITY';
  if (score >= 28) return 'CHANGING';
  return 'STABLE';
}

export default function useEvidenceAssessment({ detections = [], cameraDetections = [], tracks = [], sensors = null, network = null, acoustic = null, cellular = null, ambient = null, battery = null, geo = null, sensorConflicts = null, scanMode = 'sonar', isScanning = false } = {}) {
  const historyRef = useRef([]);
  const lastPersistRef = useRef(0);
  const [persisted, setPersisted] = useState(false);

  const assessment = useMemo(() => {
    const all = [...(Array.isArray(cameraDetections) ? cameraDetections : []), ...(Array.isArray(detections) ? detections : [])];
    const humans = all.filter(d => d?.type === 'human');
    const moving = all.filter(d => d?.moving);
    const validRange = all.filter(d => finite(d?.distance) != null && finite(d?.distance) >= 0);
    const corroborated = all.filter(d => Number(d?.sensorSupportCount) > 0 || d?.corroborated === true);
    const close = validRange.filter(d => Number(d.distance) <= 3);
    const rapidApproach = all.filter(d => d?.rapidApproach === true || d?.activityReason === 'RAPID APPROACH');
    const speeds = all.map(d => finite(d?.speed)).filter(v => v != null && v >= 0);
    const maxSpeed = speeds.length ? Math.max(...speeds) : 0;
    const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const directionChanges = tracks.filter(t => Number.isFinite(Number(t?.derivedTrack?.headingDeg))).length;
    const persistentTracks = tracks.filter(t => Number(t?.derivedTrack?.observationCount) >= MIN_PERSISTENCE_SAMPLES);
    const persistent = persistentTracks.length;
    const maxTrackObservations = persistentTracks.length ? Math.max(...persistentTracks.map(t => Number(t?.derivedTrack?.observationCount) || 0)) : 0;
    const repeatedObservationSamples = Math.max(maxTrackObservations, all.reduce((sum, d) => sum + Math.max(0, Number(d?.derivedTrack?.observationCount) || 0), 0));
    const now = Date.now();
    const recentExternal = all.filter(d => {
      const ts = finite(d?.measuredAt ?? d?.timestamp ?? d?.observedAt);
      return ts == null || Math.abs(now - ts) <= SENSOR_WINDOW_MS;
    });

    // Activity score: objective motion/proximity/change only.
    let activity = 0;
    activity += Math.min(28, moving.length * 9);
    activity += Math.min(22, rapidApproach.length * 18);
    activity += close.length ? Math.min(18, close.length * 8) : 0;
    activity += Math.min(16, maxSpeed > 1.2 ? 16 : maxSpeed > 0.7 ? 9 : maxSpeed > 0.3 ? 4 : 0);
    activity += Math.min(10, directionChanges * 2);
    activity += Math.min(6, corroborated.length * 3);
    const score = clamp(activity);

    const phoneSensors = [
      sensorQuality(sensors), sensorQuality(network), sensorQuality(acoustic),
      sensorQuality(cellular), sensorQuality(ambient), sensorQuality(battery), sensorQuality(geo)
    ].filter(v => v > 0);
    const externalQuality = all.map(d => {
      const q = finite(d?.signalQuality);
      const c = finite(d?.confidence);
      const u = finite(d?.uncertaintyM);
      let value = q != null ? q : c != null ? c * 100 : 55;
      if (u != null) value -= Math.min(30, u * 5);
      if (d?.frameAgeMs != null && d.frameAgeMs > STALE_MS) value -= 35;
      return clamp(value);
    });
    const qualitySamples = [...phoneSensors, ...externalQuality];
    const signalQuality = qualitySamples.length ? qualitySamples.reduce((a, b) => a + b, 0) / qualitySamples.length : 0;

    // Validation is intentionally conservative: corroboration, quality, temporal
    // persistence, and provenance matter more than a single detector output.
    const provenance = all.filter(d => d?.source || d?.provenance).length;
    const provenanceScore = all.length ? Math.min(20, provenance / all.length * 20) : 0;
    const corroborationScore = all.length ? Math.min(30, corroborated.length / all.length * 30) : 0;
    const qualityScore = signalQuality * 0.35;
    const persistenceScore = all.filter(d => Number(d?.derivedTrack?.observationCount) >= 3).length ? 20 : all.length ? 8 : 0;
    const disagreementValues = all.map(d => finite(d?.sensorDisagreement ?? d?.agreementError ?? d?.crossSensorError)).filter(v => v != null && v >= 0);
    const resolverConflicts = Array.isArray(sensorConflicts?.conflicts) ? sensorConflicts.conflicts : [];
    const resolverDisagreement = all.length ? Math.min(100, (resolverConflicts.length / all.length) * 100) : 0;
    const disagreement = disagreementValues.length
      ? Math.max(resolverDisagreement, clamp(disagreementValues.reduce((a, b) => a + b, 0) / disagreementValues.length))
      : resolverDisagreement;
    const freshness = all.length ? (recentExternal.length / all.length) * 15 : 0;
    const validation = clamp(corroborationScore + qualityScore + provenanceScore + persistenceScore + freshness - disagreement * 0.25);

    const limitations = [];
    if (!all.length) limitations.push('No current target observations');
    if (!corroborated.length) limitations.push('No independent sensor corroboration');
    if (signalQuality < 60) limitations.push('Signal quality is limited or unavailable');
    if (validRange.length < all.length) limitations.push('Some observations have no measured range');
    if (all.some(d => d?.frameAgeMs > STALE_MS)) limitations.push('At least one external observation is stale');
    if (disagreement >= 35) limitations.push('Sensors disagree materially on one or more observations');
    if (resolverConflicts.length) limitations.push(`${resolverConflicts.length} sensor conflict(s) retained for review; raw observations are preserved`);
    if (persistent < MIN_PERSISTENCE_SAMPLES) limitations.push('Insufficient repeated observations for persistence validation');
    if (!isScanning) limitations.push('Scanning is not active');
    if (cameraDetections.length && !detections.length) limitations.push('Camera-only observations are not independent ranging evidence');

    const confidence = clamp(validation * 0.7 + (humans.length ? 15 : 0) + (all.length ? 10 : 0));
    const hasObjectiveHazard = all.some(d => d?.hazard === true && d?.hazardValidated === true);
    const persistenceEvidence = Math.max(persistent, repeatedObservationSamples >= MIN_PERSISTENCE_SAMPLES ? MIN_PERSISTENCE_SAMPLES : repeatedObservationSamples);
    const state = classify(score, validation, hasObjectiveHazard, persistenceEvidence, disagreement);
    const baseline = historyRef.current.length ? historyRef.current.slice(-30).reduce((a, x) => a + x.score, 0) / Math.min(30, historyRef.current.length) : score;
    const changeFromBaseline = score - baseline;

    return {
      version: VERSION,
      state,
      score: Math.round(score),
      confidence: Math.round(confidence),
      validationScore: Math.round(validation),
      signalQuality: Math.round(signalQuality),
      sensorCount: qualitySamples.length,
      sensorDisagreement: Math.round(disagreement),
      persistenceCount: persistenceEvidence,
      persistentTrackCount: persistent,
      repeatedObservationSamples,
      freshnessScore: Math.round(freshness),
      targetCount: all.length,
      humanCount: humans.length,
      movingCount: moving.length,
      corroboratedCount: corroborated.length,
      closeCount: close.length,
      rapidApproachCount: rapidApproach.length,
      maxSpeed: Number(maxSpeed.toFixed(2)),
      avgSpeed: Number(avgSpeed.toFixed(2)),
      changeFromBaseline: Number(changeFromBaseline.toFixed(1)),
      hasObjectiveHazard,
      limitations,
      metrics: {
        targets: all.length,
        humans: humans.length,
        moving: moving.length,
        closeWithin3m: close.length,
        rapidApproach: rapidApproach.length,
        maxSpeedMps: Number(maxSpeed.toFixed(2)),
        avgSpeedMps: Number(avgSpeed.toFixed(2)),
        corroborated: corroborated.length,
        signalQuality: Math.round(signalQuality),
        validation: Math.round(validation),
        confidence: Math.round(confidence),
        baselineScore: Number(baseline.toFixed(1)),
        changeFromBaseline: Number(changeFromBaseline.toFixed(1)),
        sensorDisagreement: Math.round(disagreement),
        sensorConflicts: resolverConflicts.length,
        persistenceCount: persistenceEvidence,
        persistentTrackCount: persistent,
        repeatedObservationSamples,
        freshness: Math.round(freshness),
      },
      scanMode,
    };
  }, [detections, cameraDetections, tracks, sensors, network, acoustic, cellular, ambient, battery, geo, sensorConflicts, scanMode, isScanning]);

  useEffect(() => {
    if (!isScanning) return;
    historyRef.current.push({ t: Date.now(), score: assessment.score });
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.splice(0, historyRef.current.length - MAX_HISTORY);

    // Persist a sparse audit record, not every frame. The raw observations remain
    // the source of truth; this record documents how the assessment was formed.
    const now = Date.now();
    if (now - lastPersistRef.current < 10000) return;
    lastPersistRef.current = now;
    setPersisted(false);
    base44.entities.EvidenceAssessment.create({
      observed_at: new Date(now).toISOString(),
      state: assessment.state,
      score: assessment.score,
      confidence: assessment.confidence,
      validation_score: assessment.validationScore,
      sensor_count: assessment.sensorCount,
      corroborated_targets: assessment.corroboratedCount,
      metrics_json: JSON.stringify(assessment.metrics),
      limitations_json: JSON.stringify(assessment.limitations),
      method_version: VERSION,
    }).then(() => setPersisted(true)).catch(() => {});
  }, [assessment, isScanning]);

  return { ...assessment, persisted };
}