import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'cmvisual.evaluation.v1';

export default function useEvaluationMetrics({ liveDetections = [], worldProjection = null, sensorReliability = null, sensorConflicts = null, predictionCalibration = null, evidence = null, bridgeStats = null, worldTimeline = null }) {
  const [evaluationMode, setEvaluationMode] = useState(false);
  const [trainingMode, setTrainingMode] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [samples, setSamples] = useState(() => {
    try { return Number(localStorage.getItem(STORAGE_KEY) || 0); } catch { return 0; }
  });

  useEffect(() => {
    if (!evaluationMode) return;
    setSamples(v => v + 1);
    const id = setInterval(() => setSamples(v => v + 1), 1000);
    return () => clearInterval(id);
  }, [evaluationMode]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(samples)); } catch {}
  }, [samples]);

  const metrics = useMemo(() => {
    const live = Array.isArray(liveDetections) ? liveDetections : [];
    const measured = Number(worldProjection?.counts?.measured) || 0;
    const quarantined = Number(worldProjection?.dataQuality?.quarantined) || 0;
    const conflicts = Number(sensorConflicts?.conflicts?.length) || 0;
    const reliabilityPct = Number.isFinite(Number(sensorReliability?.overall)) ? Math.round(Number(sensorReliability.overall) * 100) : null;
    const calibrationPct = Number.isFinite(Number(predictionCalibration?.calibrationScore)) ? Number(predictionCalibration.calibrationScore) : null;
    const ageMs = Number.isFinite(Number(bridgeStats?.ageMs)) ? Number(bridgeStats.ageMs) : null;
    const eventCount = Number(worldTimeline?.events?.length) || Number(worldTimeline?.timeline?.eventCount) || 0;
    const gates = [
      { id: 'input-integrity', label: 'Input integrity', pass: quarantined === 0 && measured >= 0 },
      { id: 'track-continuity', label: 'Track continuity', pass: live.length === 0 || live.every(d => d.trackId != null || d.id != null) },
      { id: 'cross-sensor', label: 'Cross-sensor agreement', pass: conflicts === 0 },
      { id: 'provenance', label: 'Provenance / timestamps', pass: live.length === 0 || live.every(d => d.source || d.observedAt || d.timestamp) },
      { id: 'calibration', label: 'Prediction calibration', pass: calibrationPct == null || calibrationPct >= 70 },
      { id: 'evidence', label: 'Evidence thresholding', pass: evidence?.state != null },
      { id: 'replay', label: 'Replay record available', pass: eventCount > 0 || worldTimeline?.timeline?.live !== false },
      { id: 'degraded', label: 'Graceful degradation', pass: ageMs == null || ageMs <= 15000 },
      { id: 'training-isolation', label: 'Training / live isolation', pass: !trainingMode },
    ];
    return { measured, quarantined, conflicts, reliabilityPct, calibrationPct, ageMs, eventCount, samples, gates, passCount: gates.filter(g => g.pass).length, trainingMode };
  }, [liveDetections, worldProjection, sensorReliability, sensorConflicts, predictionCalibration, evidence, bridgeStats, worldTimeline, samples]);

  const start = () => { setEvaluationMode(true); setStartedAt(new Date().toISOString()); };
  const stop = () => setEvaluationMode(false);
  const reset = () => { setSamples(0); setStartedAt(null); setEvaluationMode(false); };
  const toggleTraining = () => setTrainingMode(v => !v);
  const exportRun = () => {
    const payload = { schema: 'cmvisual-evaluation-run-v1', startedAt, exportedAt: new Date().toISOString(), mode: evaluationMode ? 'LIVE_EVALUATION' : 'REVIEW', metrics };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cmvisual-evaluation-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return { evaluationMode, startedAt, metrics, start, stop, reset, exportRun, trainingMode, toggleTraining };
}