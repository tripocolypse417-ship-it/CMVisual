import React, { useEffect, useRef, useState } from 'react';
import useDeviceSensors from '@/hooks/useDeviceSensors';
import { getStableDeviceId, getDeviceIdentityStatus } from '@/lib/deviceIdentity';
import { base44 } from '@/api/base44Client';
import { getNativeSensorSnapshot, getNativeSensorCapabilities } from '@/lib/nativeSensors';
import { EVIDENCE_CLASS } from '@/lib/dataContract';
import {
  enqueuePhysicalValidationRecord,
  getPhysicalValidationQueueStatus,
  readPhysicalValidationQueue,
  syncPhysicalValidationQueue,
} from '@/lib/physicalValidationQueue';

const DURATION_MS = 60000;
const SAMPLE_MS = 250;

const makeId = (prefix = 'wr') =>
  globalThis.crypto?.randomUUID?.() ||
  prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2);

export default function PhysicalValidation() {
  const sensors = useDeviceSensors(true);
  const [deviceId] = useState(() => getStableDeviceId());
  const [identity, setIdentity] = useState(() => getDeviceIdentityStatus());
  const [run, setRun] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [samples, setSamples] = useState([]);
  const [marks, setMarks] = useState([]);
  const [knownPointName, setKnownPointName] = useState('');
  const [referenceDistance, setReferenceDistance] = useState('');
  const [observedDistance, setObservedDistance] = useState('');
  const [referenceBearing, setReferenceBearing] = useState('');
  const [observedBearing, setObservedBearing] = useState('');
  const [knownPointChecks, setKnownPointChecks] = useState(() => {
    try {
      const saved = JSON.parse(globalThis.localStorage?.getItem('waveradar:known-point-checks:v1') || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && typeof item.checkId === 'string') : [];
    } catch { return []; }
  });
  const latestSensors = useRef(sensors);
  latestSensors.current = sensors;
  const [cameraState, setCameraState] = useState('NOT CHECKED');
  const [captureState, setCaptureState] = useState('READY');
  const [saveState, setSaveState] = useState('NOT SAVED');
  const [queueStatus, setQueueStatus] = useState(() => getPhysicalValidationQueueStatus());
  const [nativeSnapshot, setNativeSnapshot] = useState(null);
  const [nativeCapabilities, setNativeCapabilities] = useState(null);
  const start = useRef(0);
  const timer = useRef(null);
  const sampler = useRef(null);
  const data = useRef([]);
  const pendingValidationRecord = useRef(null);
  const savedCapture = useRef(false);

  const cameraSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const refreshIdentity = () => setIdentity(getDeviceIdentityStatus());

  const checkCamera = async () => {
    if (!cameraSupported) {
      setCameraState('UNAVAILABLE');
      return;
    }
    setCameraState('CHECKING');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      setCameraState(track ? 'READY' : 'NO VIDEO TRACK');
      stream.getTracks().forEach(t => t.stop());
    } catch (error) {
      setCameraState(
        error?.name === 'NotAllowedError'
          ? 'PERMISSION DENIED'
          : error?.name === 'NotFoundError'
            ? 'NO CAMERA'
            : 'BLOCKED / UNAVAILABLE'
      );
    }
  };

  const sampleInFlight = useRef(false);

  const takeSample = async () => {
    // Native bridge calls can take longer than the 250 ms sample interval.
    // Never allow overlapping reads to reorder or inflate the capture.
    if (sampleInFlight.current) return;
    sampleInFlight.current = true;
    try {
      const native = await getNativeSensorSnapshot();
      const now = Date.now();
      if (native) setNativeSnapshot(native);
      const heading = latestSensors.current.heading;
      const moving = latestSensors.current.isMoving;
      const motion = latestSensors.current.motion;
      const nativeMeasurements = native?.measurements ?? null;
      const sample = {
        t: Math.max(0, now - start.current),
        capturedAt: new Date(now).toISOString(),
        deviceId,
        // This envelope combines different evidence types; consumers must use
        // evidenceByField instead of treating the whole sample as measured.
        evidenceClass: EVIDENCE_CLASS.UNKNOWN,
        heading,
        moving,
        motion,
        nativeSensors: nativeMeasurements,
        nativeSensorAt: native?.lastSensorAt ?? null,
        evidenceByField: {
          heading: {
            value: heading,
            evidenceClass: heading == null ? EVIDENCE_CLASS.UNKNOWN : EVIDENCE_CLASS.DERIVED,
            modality: 'MODEL',
            source: 'DeviceOrientationEvent heading normalized by useDeviceSensors',
            note: 'Platform-provided orientation may itself be fused; not an independently calibrated bearing.',
          },
          motionAxes: {
            value: motion?.timestamp ? { x: motion.x, y: motion.y, z: motion.z } : null,
            evidenceClass: motion?.timestamp ? EVIDENCE_CLASS.MEASURED : EVIDENCE_CLASS.UNKNOWN,
            modality: 'IMU',
            source: 'DeviceMotionEvent accelerationIncludingGravity or acceleration',
            observedAt: motion?.timestamp ? new Date(motion.timestamp).toISOString() : null,
          },
          motionMagnitude: {
            value: motion?.magnitude ?? null,
            evidenceClass: motion?.timestamp ? EVIDENCE_CLASS.DERIVED : EVIDENCE_CLASS.UNKNOWN,
            modality: 'MODEL',
            derivedFrom: ['motionAxes'],
            note: 'Computed from changes between successive acceleration samples.',
          },
          motionJerk: {
            value: motion?.jerk ?? null,
            evidenceClass: motion?.timestamp ? EVIDENCE_CLASS.DERIVED : EVIDENCE_CLASS.UNKNOWN,
            modality: 'MODEL',
            derivedFrom: ['motionMagnitude'],
          },
          moving: {
            value: moving,
            evidenceClass: EVIDENCE_CLASS.INFERRED,
            modality: 'MODEL',
            derivedFrom: ['motionMagnitude'],
            source: 'Motion-threshold heuristic; not ground-truth movement.',
          },
          nativeSensors: {
            value: nativeMeasurements,
            evidenceClass: nativeMeasurements ? EVIDENCE_CLASS.MEASURED : EVIDENCE_CLASS.UNKNOWN,
            modality: 'IMU',
            source: 'WaveRadar native Android sensor bridge',
            observedAt: native?.lastSensorAt ?? null,
            accuracy: native?.accuracy ?? null,
          },
        },
      };
      data.current = [...data.current, sample];
      setSamples([...data.current]);
    } catch (error) {
      console.warn('[WaveRadar] sensor sample skipped', error);
    } finally {
      sampleInFlight.current = false;
    }
  };

  const stop = (completed = false) => {
    clearInterval(timer.current);
    clearInterval(sampler.current);
    timer.current = null;
    sampler.current = null;
    setRun(false);
    setCaptureState(completed ? 'COMPLETE' : 'STOPPED');
  };

  const begin = () => {
    data.current = [];
    pendingValidationRecord.current = null;
    savedCapture.current = false;
    setSamples([]);
    setMarks([]);
    setSaveState('NOT SAVED');
    start.current = Date.now();
    setElapsed(0);
    setCaptureState('RUNNING');
    setRun(true);
    void takeSample();

    sampler.current = setInterval(() => { void takeSample(); }, SAMPLE_MS);
    timer.current = setInterval(() => {
      const e = Date.now() - start.current;
      setElapsed(Math.min(DURATION_MS, e));
      if (e >= DURATION_MS) stop(true);
    }, 100);
  };

  const mark = (label) => {
    if (!run) return;
    const marker = {
      markerId: makeId('gt'),
      label,
      t: Date.now() - start.current,
      at: new Date().toISOString(),
      deviceId,
      evidenceClass: 'GROUND_TRUTH_OPERATOR_MARKER',
    };
    setMarks(v => [...v, marker]);
  };

  const recordKnownPointCheck = () => {
    const refDistance = Number(referenceDistance);
    const obsDistance = Number(observedDistance);
    const refBearing = Number(referenceBearing);
    const obsBearing = Number(observedBearing);
    if (!knownPointName.trim() || referenceDistance === '' || observedDistance === '' || referenceBearing === '' || observedBearing === '') return;
    if (![refDistance, obsDistance, refBearing, obsBearing].every(Number.isFinite) || refDistance < 0 || obsDistance < 0) return;
    const rawBearingError = Math.abs(((obsBearing - refBearing + 540) % 360) - 180);
    const check = {
      checkId: makeId('known-point'),
      referenceName: knownPointName.trim(),
      referenceDistanceMeters: refDistance,
      observedDistanceMeters: obsDistance,
      absoluteDistanceErrorMeters: Math.abs(obsDistance - refDistance),
      referenceBearingDegrees: ((refBearing % 360) + 360) % 360,
      observedBearingDegrees: ((obsBearing % 360) + 360) % 360,
      absoluteBearingErrorDegrees: rawBearingError,
      deviceId,
      recordedAt: new Date().toISOString(),
      evidenceClass: 'OPERATOR_ENTERED_KNOWN_POINT_COMPARISON',
      calibrationStatus: 'UNVERIFIED_REVIEW_REQUIRED',
      note: 'Errors compare operator-entered reference and observed values; they do not independently prove sensor accuracy.',
    };
    setKnownPointChecks(previous => {
      const next = [...previous, check].slice(-100);
      try { localStorage.setItem('waveradar:known-point-checks:v1', JSON.stringify(next)); } catch (error) { console.warn('[WaveRadar] known-point local save failed', error); }
      return next;
    });
  };

  const saveValidation = async () => {
    if (!elapsed || !deviceId || savedCapture.current) {
      if (savedCapture.current) setSaveState('SAVED');
      return;
    }
    setSaveState('SAVING');

    try {
      if (!pendingValidationRecord.current) {
        const headingSamples = data.current.filter(v => Number.isFinite(Number(v.heading))).length;
        const motionSamples = data.current.filter(v => v.motion?.timestamp).length;
        const quality = Math.max(
          0,
          Math.min(1, (Math.min(data.current.length, 200) / 200) * 0.5 +
            (headingSamples > 0 ? 0.25 : 0) +
            (motionSamples > 0 ? 0.25 : 0))
        );

        const sessionPayload = {
          session_id: makeId('validation'),
          started_at: new Date(start.current).toISOString(),
          ended_at: new Date(start.current + elapsed).toISOString(),
          status: elapsed >= DURATION_MS ? 'COMPLETE' : 'STOPPED',
          frames: data.current.length,
          targets: marks.length + knownPointChecks.length,
          quality,
          notes: 'WaveRadar physical validation; capture completeness and operator annotations only. Spatial accuracy remains unverified.',
        };

        const validationPayload = {
          sensor_id: deviceId,
          sensor_type: 'PHONE_IMU_ORIENTATION',
          observed_at: new Date().toISOString(),
          quality_score: quality,
          freshness_score: elapsed > 0 ? 1 : 0,
          agreement_score: 0,
          repeatability_score: 0,
          calibration_status: 'UNVERIFIED',
          sample_count: data.current.length,
          metrics_json: JSON.stringify({
            durationMs: elapsed,
            qualityMeaning: 'CAPTURE_COMPLETENESS_ONLY_NOT_ACCURACY',
            headingSamples,
            motionSamples,
            cameraState,
            groundTruthMarkers: marks.length,
            knownPointChecks,
            evidencePolicy: 'Per-field evidenceByField classifications are authoritative; mixed sample envelope is UNKNOWN.',
          }),
          limitations_json: JSON.stringify([
            'Phone/browser sensors are device-dependent.',
            'No through-wall measurement is claimed by this validation run.',
            'Calibration and physical accuracy remain unverified until ground-truth comparison is performed.',
            'Computed motion magnitude and jerk are DERIVED; moving/still is INFERRED.',
          ]),
          method_version: 'waveradar-physical-validation-v3',
        };

        pendingValidationRecord.current = {
          queueId: sessionPayload.session_id,
          sessionPayload,
          validationPayload,
          queuedAt: new Date().toISOString(),
          schemaVersion: 2,
          sessionState: 'pending',
          validationState: 'pending',
          sessionSaved: false,
          validationSaved: false,
        };
      }

      // Write-ahead queue persistence must succeed before any remote write.
      const queued = enqueuePhysicalValidationRecord(pendingValidationRecord.current);
      if (!queued.ok) {
        const status = getPhysicalValidationQueueStatus();
        setQueueStatus(status);
        setSaveState(queued.error === 'STORAGE_FULL'
          ? 'SAVE BLOCKED · LOCAL STORAGE FULL'
          : 'SAVE BLOCKED · QUEUE STORAGE UNAVAILABLE');
        return;
      }

      const result = await syncPhysicalValidationQueue({
        online: typeof navigator !== 'undefined' && navigator.onLine,
        createSession: payload => base44.entities.ScanSession.create(payload),
        createValidation: payload => base44.entities.SensorValidation.create(payload),
      });
      const status = getPhysicalValidationQueueStatus();
      setQueueStatus(status);
      const latestQueue = readPhysicalValidationQueue();
      const ownRecordPending = !latestQueue.ok ||
        latestQueue.queue.some(item => item?.queueId === pendingValidationRecord.current.queueId ||
          item?.sessionPayload?.session_id === pendingValidationRecord.current.queueId);

      if (!result.ok || result.checkpointFailed) {
        setSaveState('QUEUED · CHECKPOINT / STORAGE REVIEW');
      } else if (ownRecordPending && result.ambiguousCount > 0) {
        setSaveState('QUEUED · REVIEW REQUIRED');
      } else if (ownRecordPending && !(typeof navigator !== 'undefined' && navigator.onLine)) {
        setSaveState('QUEUED OFFLINE');
      } else if (ownRecordPending) {
        setSaveState('QUEUED · SYNC PENDING');
      } else {
        savedCapture.current = true;
        setSaveState(status.ok && status.pendingCount > 0
          ? 'SAVED · OTHER RECORDS NEED REVIEW'
          : 'SAVED');
      }
    } catch (error) {
      console.error('[WaveRadar] validation save preparation failed', error);
      setQueueStatus(getPhysicalValidationQueueStatus());
      setSaveState('SAVE FAILED · RECORD RETAINED IF QUEUED');
    }
  };

  useEffect(() => {
    let flushInFlight = false;

    const refreshQueueStatus = () => setQueueStatus(getPhysicalValidationQueueStatus());
    const flushQueue = async () => {
      if (flushInFlight) return;
      refreshQueueStatus();
      if (!navigator.onLine) return;
      flushInFlight = true;
      try {
        const result = await syncPhysicalValidationQueue({
          online: true,
          createSession: payload => base44.entities.ScanSession.create(payload),
          createValidation: payload => base44.entities.SensorValidation.create(payload),
        });
        const status = getPhysicalValidationQueueStatus();
        setQueueStatus(status);
        if (!result.ok || result.checkpointFailed) {
          setSaveState(previous => previous === 'NOT SAVED' ? 'QUEUE CHECKPOINT NEEDS REVIEW' : previous);
        } else if (status.ok && status.ambiguousCount > 0) {
          setSaveState(previous => previous === 'NOT SAVED' ? 'QUEUE REVIEW REQUIRED' : previous);
        } else if (status.ok && status.pendingCount === 0) {
          setSaveState(previous => previous.startsWith('QUEUED') ? 'SYNCED' : previous);
        }
      } catch (error) {
        console.warn('[WaveRadar] queued validation sync failed', error);
        refreshQueueStatus();
      } finally {
        flushInFlight = false;
      }
    };

    refreshQueueStatus();
    void flushQueue();
    window.addEventListener('online', flushQueue);
    const retry = window.setInterval(flushQueue, 30000);
    return () => {
      window.removeEventListener('online', flushQueue);
      window.clearInterval(retry);
    };
  }, []);

  const exportPendingQueue = () => {
    const loaded = readPhysicalValidationQueue();
    setQueueStatus(loaded.ok ? getPhysicalValidationQueueStatus() : loaded);
    if (!loaded.ok) {
      setSaveState('QUEUE EXPORT FAILED · STORAGE UNAVAILABLE');
      return;
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify({
      schema: 'waveradar-physical-validation-queue-v2',
      exportedAt: new Date().toISOString(),
      records: loaded.queue,
      note: 'Ambiguous records are intentionally not retried automatically; reconcile against server records before any manual retry.',
    }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waveradar-pending-validation-queue.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportData = () => {
    const payload = {
      schema: 'cmvisual-physical-validation-v2',
      deviceId,
      identity,
      durationMs: elapsed,
      completed60s: elapsed >= DURATION_MS,
      captureState,
      cameraState,
      sensorState: {
        hasSensors: sensors.hasSensors,
        needsPermission: sensors.needsPermission,
        denied: sensors.denied,
      },
      samples: data.current,
      groundTruthMarkers: marks,
      knownPointChecks,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waveradar-physical-validation.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  useEffect(() => {
    void checkCamera();
    void getNativeSensorCapabilities().then(setNativeCapabilities);

  return () => {
      clearInterval(timer.current);
      clearInterval(sampler.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <div className="text-xs tracking-widest text-emerald-300">WAVERADAR · PHYSICAL VALIDATION</div>
          <h1 className="text-xl font-semibold mt-2">Real-device validation</h1>
          <p className="text-xs text-slate-400 mt-1">
            Measured sensor data, camera capability, and operator ground truth remain separate.
          </p>
        </header>

        <section className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
            <b className="text-xs">LOCAL INSTALLATION KEY</b>
            <div className="font-mono text-xs text-emerald-300 mt-2 break-all">{deviceId || 'NOT INITIALIZED'}</div>
            <div className="text-[10px] text-slate-500 mt-1">Browser/app installation key only; not a hardware ID or device enrollment.</div>
            <div className="text-[10px] text-slate-500 mt-2">
              STORAGE: local {identity.localStorage ? 'OK' : 'NO'} · session {identity.sessionStorage ? 'OK' : 'NO'} · cookie {identity.cookie ? 'OK' : 'NO'}
            </div>
            <button onClick={refreshIdentity} className="mt-2 border border-white/15 px-3 py-2 text-xs">
              VERIFY ID
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
            <b className="text-xs">CAPABILITIES</b>
            <div className="font-mono text-xs mt-2">MOTION: {sensors.hasSensors || nativeCapabilities?.androidSensorManager ? 'AVAILABLE' : 'NOT DETECTED'}</div>
            <div className="font-mono text-xs mt-1">NATIVE: {nativeCapabilities?.nativeBridgeVersion || 'WEB FALLBACK'}</div>
            {nativeCapabilities && <div className="font-mono text-[10px] text-slate-500 mt-1">SENSORS: {nativeCapabilities.sensorCount ?? 0} · WIFI RTT: {nativeCapabilities.androidWifiRtt ? 'YES' : 'NO'} · UWB: {nativeCapabilities.uwb ? 'YES' : 'NO'}</div>}
            <div className="font-mono text-xs mt-1">CAMERA: {cameraState}</div>
            {sensors.denied && <div className="font-mono text-xs text-red-300 mt-1">SENSOR PERMISSION DENIED</div>}
            <div className="flex flex-wrap gap-2 mt-2">
              <button onClick={checkCamera} className="border border-white/15 px-3 py-2 text-xs">CHECK CAMERA</button>
              {sensors.needsPermission && (
                <button onClick={sensors.requestPermission} className="border border-emerald-400/40 px-3 py-2 text-xs">ENABLE SENSORS</button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-amber-400/25 bg-slate-900 p-4 space-y-3">
          <div>
            <b className="text-xs text-amber-200">KNOWN-POINT ACCURACY CHECK</b>
            <p className="text-[11px] text-slate-400 mt-1">Use a physical landmark with a known distance and bearing. Enter the reference and observed values; WaveRadar calculates the difference and saves the evidence. This does not pass calibration automatically.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-[11px] text-slate-300">Reference / landmark name
              <input value={knownPointName} onChange={e => setKnownPointName(e.target.value)} placeholder="e.g. marked doorway A" className="block w-full mt-1 rounded border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-[11px] text-slate-300">Known distance (meters)
              <input type="number" min="0" step="0.01" value={referenceDistance} onChange={e => setReferenceDistance(e.target.value)} placeholder="Reference value" className="block w-full mt-1 rounded border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-[11px] text-slate-300">Observed distance (meters)
              <input type="number" min="0" step="0.01" value={observedDistance} onChange={e => setObservedDistance(e.target.value)} placeholder="Measured / observed value" className="block w-full mt-1 rounded border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-[11px] text-slate-300">Known bearing (degrees)
              <input type="number" min="0" max="360" step="0.1" value={referenceBearing} onChange={e => setReferenceBearing(e.target.value)} placeholder="0–360" className="block w-full mt-1 rounded border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-[11px] text-slate-300">Observed bearing (degrees)
              <input type="number" min="0" max="360" step="0.1" value={observedBearing} onChange={e => setObservedBearing(e.target.value)} placeholder="0–360" className="block w-full mt-1 rounded border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
            </label>
          </div>
          <button onClick={recordKnownPointCheck} disabled={!knownPointName.trim() || [referenceDistance, observedDistance, referenceBearing, observedBearing].some(value => value === '') || ![Number(referenceDistance), Number(observedDistance), Number(referenceBearing), Number(observedBearing)].every(Number.isFinite) || Number(referenceDistance) < 0 || Number(observedDistance) < 0} className="border border-amber-300/40 px-3 py-2 text-xs disabled:opacity-30">CALCULATE & RECORD CHECK</button>
          {knownPointChecks.length > 0 && <div className="space-y-2">
            <div className="text-xs text-emerald-200">{knownPointChecks.length} known-point comparison(s) recorded · calibration remains unverified</div>
            {knownPointChecks.slice(-3).reverse().map(check => <div key={check.checkId} className="rounded border border-white/10 p-2 text-xs" >
              <div className="font-semibold">{check.referenceName}</div>
              <div className="font-mono text-slate-300 mt-1">Distance error: {check.absoluteDistanceErrorMeters.toFixed(2)} m · Bearing error: {check.absoluteBearingErrorDegrees.toFixed(1)}°</div>
              <div className="text-[10px] text-amber-200 mt-1">RECORDED · REVIEW REQUIRED · NOT A PASS</div>
            </div>)}
          </div>}
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <div className="flex justify-between">
            <b className="text-xs">60-SECOND CAPTURE</b>
            <span className="font-mono text-xs">{(elapsed / 1000).toFixed(1)} / 60.0s</span>
          </div>
          <div className="h-2 bg-white/10 rounded mt-3">
            <div className="h-full bg-emerald-400" style={{ width: Math.min(100, elapsed / DURATION_MS * 100) + '%' }} />
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {!run
              ? <button onClick={begin} className="border border-emerald-400/40 px-3 py-2 text-xs">START TEST</button>
              : <button onClick={() => stop(false)} className="border border-red-400/40 px-3 py-2 text-xs">STOP</button>}
            <button disabled={!run} onClick={() => mark('VISIBLE REFERENCE')} className="border border-amber-400/40 px-3 py-2 text-xs disabled:opacity-30">MARK REFERENCE</button>
            <button disabled={!run} onClick={() => mark('OBSTACLE REFERENCE')} className="border border-amber-400/40 px-3 py-2 text-xs disabled:opacity-30">MARK OBSTACLE EVENT</button>
            <button disabled={!elapsed || saveState === 'SAVING'} onClick={saveValidation} className="border border-emerald-400/40 px-3 py-2 text-xs disabled:opacity-30">SAVE VALIDATION</button>
            <button disabled={!elapsed && !knownPointChecks.length} onClick={exportData} className="border border-white/15 px-3 py-2 text-xs disabled:opacity-30">EXPORT JSON</button>
          </div>

          <div className="font-mono text-xs mt-3">
            {samples.length} sensor samples · {marks.length} operator markers · HEADING {sensors.heading ?? '—'}° · {sensors.isMoving ? 'MOVING' : 'STILL'}
            {nativeSnapshot?.lastSensorAt && <span> · NATIVE SENSOR LIVE</span>}
          </div>
          <div className="font-mono text-[10px] text-slate-500 mt-2">
            Operator markers are timestamped annotations, not measured coordinates. Record reference distances/orientations separately.
          </div>
          <div className="font-mono text-[10px] text-slate-500 mt-2">
            CAPTURE: {captureState} · STORAGE: {saveState}
          </div>
          <div className="font-mono text-[10px] text-slate-400 mt-2">
            OFFLINE QUEUE: {queueStatus.ok ? `${queueStatus.pendingCount} pending · ${queueStatus.ambiguousCount} require review` : `UNAVAILABLE · ${queueStatus.error}`}
          </div>
          {queueStatus.ok && queueStatus.pendingCount > 0 && (
            <div className="mt-2 space-y-2">
              {queueStatus.ambiguousCount > 0 && <div className="text-[10px] text-amber-200">Some remote write outcomes are ambiguous. They are retained and will not be retried automatically to avoid duplicate evidence.</div>}
              <button onClick={exportPendingQueue} className="border border-amber-300/30 px-3 py-2 text-xs">EXPORT PENDING QUEUE</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}