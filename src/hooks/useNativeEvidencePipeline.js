import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getStableDeviceId } from '../lib/deviceIdentity';
import { getNativeSensorSnapshot } from '../lib/nativeSensors';
import { createWaveRadarEventEnvelope } from '../lib/eventEnvelope';
import {
  appendLocalEvidenceEvent,
  getLocalEvidenceStatus,
  listPendingLocalEvidenceEvents,
  markLocalEvidenceDelivered,
} from '../lib/localEvidenceStore';

const POLL_INTERVAL_MS = 2000;
const NETWORK_EVENT_NAME = 'waveradar:capability-observations';
const SOURCE = Object.freeze({
  sourceType: 'ANDROID_SENSOR_MANAGER',
  adapterId: 'waveradar-android-sensors',
  adapterVersion: '1.0.0',
  authorizationScopeId: null,
});

function apiBase() {
  const configured = typeof window !== 'undefined' ? window.__HATCHABLE__?.api : null;
  return String(configured || 'https://waveradar-20.hatchable.site/api').replace(/\/+$/, '');
}

function enrollmentToken() {
  try { return localStorage.getItem('waveradar.enrollment.token') || ''; } catch { return ''; }
}



export default function useNativeEvidencePipeline(enabled = true, sessionId = null) {
  const [status, setStatus] = useState({
    phase: 'IDLE',
    native: false,
    storedEvents: null,
    pendingEvents: null,
    quarantinedEvents: 0,
    lastCaptureAt: null,
    lastError: null,
    remoteIngestion: 'NOT_CONFIGURED',
  });
  const runningRef = useRef(false);
  const seenRef = useRef(new Set());
  const remoteRetryAfterRef = useRef(0);
  const remoteInFlightRef = useRef(false);
  const deviceIdRef = useRef(null);

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) {
      setStatus((old) => ({ ...old, phase: 'NATIVE_ANDROID_REQUIRED', native: false }));
      return undefined;
    }

    let active = true;
    let timer;
    deviceIdRef.current = getStableDeviceId();
    const onEnrollmentBundleUpdated = async () => {
      const previousDeviceId = deviceIdRef.current;
      const nextDeviceId = getStableDeviceId();
      deviceIdRef.current = nextDeviceId;
      seenRef.current.clear();
      remoteRetryAfterRef.current = Date.now() + 5000;
      if (previousDeviceId && previousDeviceId !== nextDeviceId) {
        try {
          let localIdentityQuarantineCount = 0;
          while (true) {
            const pending = await listPendingLocalEvidenceEvents({ limit: 1000 });
            const mismatched = pending.filter(record => String(record.event?.source?.device_id || '') !== String(nextDeviceId));
            if (!mismatched.length) break;
            for (const record of mismatched) {
              await markLocalEvidenceDelivered(record.sample_key, {
                status: 'QUARANTINED',
                reason: 'DEVICE_ID_CHANGED_BEFORE_UPLOAD',
                note: 'Original evidence retained locally; not rewritten to a different enrolled device identity.',
              });
              localIdentityQuarantineCount += 1;
            }
            if (pending.length < 1000) break;
          }
          window.dispatchEvent(new CustomEvent('waveradar:remote-evidence-status', {
            detail: { localIdentityQuarantineCount },
          }));
        } catch (error) {
          setStatus(old => ({ ...old, lastError: error?.message || 'LOCAL_IDENTITY_RECONCILIATION_FAILED' }));
        }
      }
      remoteRetryAfterRef.current = 0;
    };
    window.addEventListener('waveradar:enrollment-token-updated', onEnrollmentBundleUpdated);

    const onNetworkEvidence = async (customEvent) => {
      const detail = customEvent?.detail || {};
      const capturedAt = Number(detail.capturedAt);
      if (!Number.isFinite(capturedAt) || capturedAt <= 0 || !detail.snapshot) return;
      const sampleKey = [deviceIdRef.current, 'android-network', capturedAt].join(':');
      try {
        const event = await createWaveRadarEventEnvelope({
          snapshot: detail.snapshot,
          sessionId,
          source: {
            ...SOURCE,
            sourceType: 'ANDROID_NETWORK_PLATFORM_CACHE',
            adapterId: 'waveradar-android-network',
            sourceId: deviceIdRef.current,
            deviceId: deviceIdRef.current,
            capabilityId: 'android.network.snapshot',
          },
          observedClockDomain: 'UNKNOWN',
          observedAt: null,
          receivedAt: new Date().toISOString(),
          evidenceClass: 'MEASURED',
          collectionMethod: 'ANDROID_PLATFORM_WIFI_CELLULAR_BLE_APIS',
          payloadSchema: 'waveradar.android.network-snapshot.v1',
          retentionClass: 'DIAGNOSTIC',
          rawPayloadRef: 'local-indexeddb://waveradar-evidence-v1/events/' + encodeURIComponent(sampleKey),
          limitations: [
            'Wi-Fi scan results may be cached and are not a full radio scan.',
            'Cellular metadata is platform/carrier controlled and may be stale or unavailable.',
            'BLE observations are permission- and scan-window-limited.',
          ],
        });
        const result = await appendLocalEvidenceEvent(event, sampleKey);
        if (result.added) {
          window.dispatchEvent(new CustomEvent('waveradar:event-envelope', { detail: event }));
        }
        const storageStatus = await getLocalEvidenceStatus();
        if (active) setStatus((old) => ({
          ...old,
          storedEvents: storageStatus.count,
          pendingEvents: storageStatus.pending,
          quarantinedEvents: storageStatus.quarantined,
          lastCaptureAt: new Date().toISOString(),
        }));
      } catch (error) {
        if (active) setStatus((old) => ({
          ...old,
          phase: error?.name === 'QuotaExceededError' ? 'STORAGE_FULL' : 'ERROR',
          lastError: error?.message || 'NETWORK_EVIDENCE_PERSIST_FAILED',
        }));
      }
    };

    window.addEventListener(NETWORK_EVENT_NAME, onNetworkEvidence);

    const flushRemoteQueue = async () => {
      if (remoteInFlightRef.current || Date.now() < remoteRetryAfterRef.current) return;
      const token = enrollmentToken();
      if (!token) {
        setStatus((old) => ({ ...old, remoteIngestion: 'ENROLLMENT_BUNDLE_REQUIRED' }));
        return;
      }
      const pending = await listPendingLocalEvidenceEvents({ limit: 50 });
      if (!pending.length) {
        setStatus((old) => ({ ...old, remoteIngestion: 'SYNCED' }));
        return;
      }

      remoteInFlightRef.current = true;
      try {
        const response = await fetch(apiBase() + '/events/device-ingest', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify({ events: pending.map(record => record.event) }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          const reason = body.error || ('HTTP_' + response.status);
          if (response.status === 401 || response.status === 403) {
            setStatus((old) => ({
              ...old,
              remoteIngestion: response.status === 401 ? 'TOKEN_INVALID_OR_EXPIRED' : 'DEVICE_TOKEN_MISMATCH',
              lastError: reason,
            }));
            remoteRetryAfterRef.current = Date.now() + 60000;
            return;
          }
          const error = new Error(reason);
          error.status = response.status;
          throw error;
        }

        const byEventId = new Map(pending.map(record => [record.event.event_id, record]));
        let acknowledged = 0;
        for (const ack of Array.isArray(body.acknowledgments) ? body.acknowledgments : []) {
          const record = byEventId.get(ack.eventId);
          if (!record) continue;
          if (ack.status === 'ACCEPTED_STORED' || ack.status === 'DUPLICATE_ALREADY_STORED' || ack.status === 'QUARANTINED') {
            await markLocalEvidenceDelivered(record.sample_key, ack);
            acknowledged += 1;
          }
        }

        const storageStatus = await getLocalEvidenceStatus();
        if (!active) return;
        setStatus((old) => ({
          ...old,
          storedEvents: storageStatus.count,
          pendingEvents: storageStatus.pending,
          quarantinedEvents: storageStatus.quarantined,
          remoteIngestion: storageStatus.pending ? 'PENDING' : storageStatus.quarantined ? 'QUARANTINED' : 'SYNCED',
          lastError: storageStatus.quarantined ? 'One or more events were acknowledged into server quarantine; inspect reason codes before reuse.' : null,
        }));
        window.dispatchEvent(new CustomEvent('waveradar:remote-evidence-status', {
          detail: { ...storageStatus, acknowledgedThisCycle: acknowledged, serverAcknowledgments: body.acknowledgments || [] },
        }));
        remoteRetryAfterRef.current = Date.now() + (storageStatus.pending ? 5000 : 15000);
      } catch (error) {
        if (!active) return;
        setStatus((old) => ({
          ...old,
          remoteIngestion: 'RETRY_WAIT',
          lastError: error?.message || 'REMOTE_INGEST_FAILED',
        }));
        remoteRetryAfterRef.current = Date.now() + 30000;
      } finally {
        remoteInFlightRef.current = false;
      }
    };

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
          const sampleKey = [deviceIdRef.current, capabilityId, sourceNs].join(':');
          if (seenRef.current.has(sampleKey)) continue;

          const event = await createWaveRadarEventEnvelope({
            sessionId,
            snapshot: {
              capabilityId,
              measurement,
              nativeSnapshotCapturedAt: snapshot.lastSensorAt ?? null,
              nativeBridgeVersion: snapshot.nativeBridgeVersion ?? null,
            },
            source: {
              ...SOURCE,
              sourceId: deviceIdRef.current,
              deviceId: deviceIdRef.current,
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
            rawPayloadRef: 'local-indexeddb://waveradar-evidence-v1/events/' + encodeURIComponent(sampleKey),
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
        setStatus((old) => ({
          ...old,
          phase: storageStatus.available ? 'CAPTURING_LOCAL' : 'STORAGE_UNAVAILABLE',
          native: true,
          storedEvents: storageStatus.count,
          pendingEvents: storageStatus.pending,
          quarantinedEvents: storageStatus.quarantined,
          lastCaptureAt: new Date().toISOString(),
          lastError: skippedNoSourceTime ? 'Some samples had no source monotonic timestamp and were not assigned fabricated times.' : old.lastError,
          addedThisCycle,
        }));
        window.dispatchEvent(new CustomEvent('waveradar:local-evidence-status', {
          detail: { ...storageStatus, addedThisCycle, skippedNoSourceTime },
        }));
        await flushRemoteQueue();
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
      window.removeEventListener(NETWORK_EVENT_NAME, onNetworkEvidence);
      window.removeEventListener('waveradar:enrollment-token-updated', onEnrollmentBundleUpdated);
      if (timer) window.clearInterval(timer);
    };
  }, [enabled, sessionId]);

  return status;
}
