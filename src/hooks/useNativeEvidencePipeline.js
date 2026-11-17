import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getStableDeviceId } from '../lib/deviceIdentity';
import { getNativeSensorSnapshot } from '../lib/nativeSensors';
import { createWaveRadarEventEnvelope } from '../lib/eventEnvelope';
import { appendLocalEvidenceEvent, getLocalEvidenceStatus } from '../lib/localEvidenceStore';

const POLL_INTERVAL_MS = 2000;
const SOURCE = Object.freeze({
  sourceType: 'ANDROID_SENSOR_MANAGER',
  adapterId: 'waveradar-android-sensors',
  adapterVersion: '1.0.0',
  authorizationScopeId: 'device-owner-granted-android-runtime-permissions',
});

export default function useNativeEvidencePipeline(enabled = true) {
  const [status, setStatus] = useState({
    phase: 'IDLE',
    native: false,
    storedEvents: null,
    lastCaptureAt: null,
    lastError: null,
    remoteIngestion: 'NOT_CONNECTED',
  });
  const runningRef = useRef(false);
  const seenRef = useRef(new Set());

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) {
      setStatus((old) => ({ ...old, phase: 'NATIVE_ANDROID_REQUIRED', native: false }));
      return undefined;
    }

    let active = true;
    let timer;
    const deviceId = getStableDeviceId();

    const poll = async () => {
      if (!active || runningRef.current) return;
      runningRef.current = true;
      try {
        const snapshot = await getNativeSensorSnapshot();
        if (!snapshot || !snapshot.measurements || typeof snapshot.measurements !== 'object') {
          setStatus((old) => ({ ...old, phase: 'COLLECTOR_UNAVAILABLE', native: true }));
          return;
        }

        let addedThisCycle = 0;
        let skippedNoSourceTime = 0;
        for (const [capabilityId, measurement] of Object.entries(snapshot.measurements)) {
          if (!measurement || !Array.isArray(measurement.values)) continue;
          const sourceNs = Number(measurement.sourceTimestampNs);
          if (!Number.isSafeInteger(sourceNs) || sourceNs <= 0) {
            skippedNoSourceTime += 1;
            continue;
          }
          const sampleKey = [deviceId, capabilityId, sourceNs].join(':');
          if (seenRef.current.has(sampleKey)) continue;

          const event = await createWaveRadarEventEnvelope({
            snapshot: {
              capabilityId,
              measurement,
              nativeSnapshotCapturedAt: snapshot.lastSensorAt ?? null,
              nativeBridgeVersion: snapshot.nativeBridgeVersion ?? null,
            },
            source: {
              ...SOURCE,
              sourceId: deviceId,
              deviceId,
              capabilityId: 'android.sensor.' + capabilityId,
            },
            observedClockDomain: measurement.sourceClockDomain || 'ANDROID_ELAPSED_REALTIME_NANOS',
            observedMonotonicNs: sourceNs,
            measurementAgeMs: Number.isFinite(Number(measurement.sampleAgeMs))
              ? Math.max(0, Number(measurement.sampleAgeMs)) : null,
            receivedAt: new Date().toISOString(),
            evidenceClass: 'MEASURED',
            collectionMethod: 'ANDROID_SENSOR_MANAGER_SENSOR_EVENT',
            payloadSchema: 'waveradar.android.sensor-sample.v1',
            retentionClass: 'DIAGNOSTIC',
          });
          const result = await appendLocalEvidenceEvent(event, sampleKey);
          seenRef.current.add(sampleKey);
          if (result.added) {
            addedThisCycle += 1;
            window.dispatchEvent(new CustomEvent('waveradar:event-envelope', { detail: event }));
          }
        }

        const storageStatus = await getLocalEvidenceStatus();
        if (!active) return;
        setStatus({
          phase: storageStatus.available ? 'CAPTURING_LOCAL' : 'STORAGE_UNAVAILABLE',
          native: true,
          storedEvents: storageStatus.count,
          lastCaptureAt: new Date().toISOString(),
          lastError: skippedNoSourceTime ? 'Some samples had no source monotonic timestamp and were not assigned fabricated times.' : null,
          remoteIngestion: 'NOT_CONNECTED',
          addedThisCycle,
        });
        window.dispatchEvent(new CustomEvent('waveradar:local-evidence-status', {
          detail: { ...storageStatus, addedThisCycle, skippedNoSourceTime },
        }));
      } catch (error) {
        if (!active) return;
        const message = error?.name === 'QuotaExceededError'
          ? 'LOCAL_STORAGE_QUOTA_EXCEEDED'
          : error?.message || 'LOCAL_EVIDENCE_CAPTURE_FAILED';
        setStatus((old) => ({
          ...old,
          phase: message === 'LOCAL_STORAGE_QUOTA_EXCEEDED' ? 'STORAGE_FULL' : 'ERROR',
          native: true,
          lastError: message,
          remoteIngestion: 'NOT_CONNECTED',
        }));
      } finally {
        runningRef.current = false;
      }
    };

    setStatus((old) => ({ ...old, phase: 'INITIALIZING', native: true }));
    poll();
    timer = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [enabled]);

  return status;
}
