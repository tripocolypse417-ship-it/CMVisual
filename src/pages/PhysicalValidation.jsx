import React, { useEffect, useRef, useState } from 'react';
import useDeviceSensors from '@/hooks/useDeviceSensors';
import { getStableDeviceId, getDeviceIdentityStatus } from '@/lib/deviceIdentity';
import { base44 } from '@/api/base44Client';
import { getNativeSensorSnapshot, getNativeSensorCapabilities } from '@/lib/nativeSensors';

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
  const [cameraState, setCameraState] = useState('NOT CHECKED');
  const [captureState, setCaptureState] = useState('READY');
  const [saveState, setSaveState] = useState('NOT SAVED');
  const [nativeSnapshot, setNativeSnapshot] = useState(null);
  const [nativeCapabilities, setNativeCapabilities] = useState(null);
  const start = useRef(0);
  const timer = useRef(null);
  const sampler = useRef(null);
  const data = useRef([]);

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

  const takeSample = async () => {
    const now = Date.now();
    const native = await getNativeSensorSnapshot();
    if (native) setNativeSnapshot(native);
    const sample = {
      t: now - start.current,
      at: new Date(now).toISOString(),
      deviceId,
      heading: sensors.heading,
      moving: sensors.isMoving,
      motion: sensors.motion,
      evidenceClass: 'MEASURED',
      nativeSensors: native?.measurements ?? null,
      nativeSensorAt: native?.lastSensorAt ?? null,
    };
    data.current = [...data.current, sample];
    setSamples(data.current);
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

  const saveValidation = async () => {
    if (!elapsed || !deviceId) return;
    setSaveState('SAVING');

    const QUEUE_KEY = 'waveradar:physical-validation:queue:v1';
    const readQueue = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };
    const writeQueue = (queue) => {
      try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-20)));
      } catch (error) {
        console.warn('[WaveRadar] offline queue unavailable', error);
      }
    };

    try {
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
        targets: marks.length,
        quality,
        notes: 'WaveRadar physical validation; measured phone sensors and operator ground truth kept separate.',
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
          headingSamples,
          motionSamples,
          cameraState,
          groundTruthMarkers: marks.length,
        }),
        limitations_json: JSON.stringify([
          'Phone/browser sensors are device-dependent.',
          'No through-wall measurement is claimed by this validation run.',
          'Calibration and physical accuracy remain unverified until ground-truth comparison is performed.',
        ]),
        method_version: 'waveradar-physical-validation-v2',
      };

      const pending = readQueue();
      const queued = { sessionPayload, validationPayload, queuedAt: new Date().toISOString() };

      try {
        await base44.entities.ScanSession.create(sessionPayload);
        await base44.entities.SensorValidation.create(validationPayload);
        writeQueue(pending);
        setSaveState('SAVED');
      } catch (error) {
        pending.push(queued);
        writeQueue(pending);
        console.warn('[WaveRadar] validation retained offline', error);
        setSaveState('QUEUED OFFLINE');
      }
    } catch (error) {
      console.error('[WaveRadar] validation save preparation failed', error);
      setSaveState('SAVE FAILED');
    }
  };

  useEffect(() => {
    const QUEUE_KEY = 'waveradar:physical-validation:queue:v1';

    const flushQueue = async () => {
      let queue = [];
      try {
        const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        queue = Array.isArray(parsed) ? parsed : [];
      } catch {
        return;
      }
      if (!queue.length || !navigator.onLine) return;

      const remaining = [];
      for (const item of queue) {
        try {
          await base44.entities.ScanSession.create(item.sessionPayload);
          await base44.entities.SensorValidation.create(item.validationPayload);
        } catch (error) {
          console.warn('[WaveRadar] queued validation still pending', error);
          remaining.push(item);
        }
      }
      try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining.slice(-20)));
      } catch {}
      if (!remaining.length) setSaveState('SYNCED');
    };

    void flushQueue();
    window.addEventListener('online', flushQueue);
    const retry = window.setInterval(flushQueue, 30000);
    return () => {
      window.removeEventListener('online', flushQueue);
      window.clearInterval(retry);
    };
  }, []);

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
            <b className="text-xs">DEVICE ID</b>
            <div className="font-mono text-xs text-emerald-300 mt-2 break-all">{deviceId || 'NOT INITIALIZED'}</div>
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
            <button disabled={!run} onClick={() => mark('VISIBLE REFERENCE')} className="border border-amber-400/40 px-3 py-2 text-xs disabled:opacity-30">GROUND TRUTH</button>
            <button disabled={!run} onClick={() => mark('OBSTACLE REFERENCE')} className="border border-amber-400/40 px-3 py-2 text-xs disabled:opacity-30">OBSTACLE</button>
            <button disabled={!elapsed || saveState === 'SAVING'} onClick={saveValidation} className="border border-emerald-400/40 px-3 py-2 text-xs disabled:opacity-30">SAVE VALIDATION</button>
            <button disabled={!elapsed} onClick={exportData} className="border border-white/15 px-3 py-2 text-xs disabled:opacity-30">EXPORT JSON</button>
          </div>

          <div className="font-mono text-xs mt-3">
            {samples.length} measured samples · {marks.length} ground-truth markers · HEADING {sensors.heading ?? '—'}° · {sensors.isMoving ? 'MOVING' : 'STILL'}
            {nativeSnapshot?.lastSensorAt && <span> · NATIVE SENSOR LIVE</span>}
          </div>
          <div className="font-mono text-[10px] text-slate-500 mt-2">
            CAPTURE: {captureState} · STORAGE: {saveState}
          </div>
        </section>
      </div>
    </div>
  );
}