import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getStableDeviceId } from '../lib/deviceIdentity';
import { acknowledgeNativeSensorSamples, getNativeSensorSnapshot } from '../lib/nativeSensors';
import { createWaveRadarEventEnvelope } from '../lib/eventEnvelope';
import {
  appendLocalEvidenceEvent,
  getLocalEvidenceStatus,
  listPendingLocalEvidenceEvents,
  listLocalEvidenceEvents,
  markLocalEvidenceDelivered,
} from '../lib/localEvidenceStore';

const POLL_INTERVAL_MS = 1000;
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
    samplesCapturedThisCycle: 0,
    droppedSamplesTotal: 0,
    droppedSamplesSinceLastAck: 0,
    lastCaptureAt: null,
    lastError: null,
    remoteIngestion: 'NOT_CONFIGURED',
  });
  const runningRef = useRef(false);
  const seenRef = useRef(new Set());
  const remoteRetryAfterRef = useRef(0);
  const remoteInFlightRef = useRef(false);
  const deviceIdRef = useRef(null);
  const persistedSampleKeysRef = useRef(new Set());
  const networkInFlightRef = useRef(0);
  const pairingInFlightRef = useRef(false);
  const deferredNetworkEventsRef = useRef([]);

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) {
      setStatus((old) => ({ ...old, phase: 'NATIVE_ANDROID_REQUIRED', native: false }));
      return undefined;
    }

    let active = true;
    let timer;
    deviceIdRef.current = getStableDeviceId();

    const hydratePersistedSampleKeys = async (deviceId) => {
      const records = await listLocalEvidenceEvents({ limit: 1000 });
      for (const record of records) {
        if (String(record.event?.source?.device_id || '') !== String(deviceId)) continue;
        const data = record.event?.payload?.data || {};
        const samples = Array.isArray(data.samples) ? data.samples : [];
        for (const sample of samples) {
          if (sample?.sequence == null) continue;
          persistedSampleKeysRef.current.add([deviceId, data.capabilityId || sample.capabilityId || 'unknown', sample.sequence].join(':'));
        }
      }
    };

    const persistNativeSnapshot = async (snapshot, deviceId) => {
      const samples = Array.isArray(snapshot?.samples) ? snapshot.samples : null;
      if (samples) {
        const groups = new Map();
        let highestSequence = Number(snapshot.lastReturnedSequence || snapshot.lastSampleSequence || 0);
        for (const sample of samples) {
          const capabilityId = sample?.capabilityId || ('sensorType-' + String(sample?.sensorType ?? 'unknown'));
          const sequence = Number(sample?.sequence);
          if (!Number.isSafeInteger(sequence) || sequence <= 0) continue;
          highestSequence = Math.max(highestSequence, sequence);
          const identity = [deviceId, capabilityId, sequence].join(':');
          if (persistedSampleKeysRef.current.has(identity)) continue;
          if (!groups.has(capabilityId)) groups.set(capabilityId, []);
          groups.get(capabilityId).push(sample);
        }

        let added = 0;
        for (const [capabilityId, group] of groups.entries()) {
          group.sort((a, b) => Number(a.sequence) - Number(b.sequence));
          for (let offset = 0; offset < group.length; offset += 250) {
            const batch = group.slice(offset, offset + 250);
            const firstSequence = Number(batch[0].sequence);
            const lastSample = batch[batch.length - 1];
            const lastSequence = Number(lastSample.sequence);
            const sampleKey = [deviceId, capabilityId, firstSequence, lastSequence].join(':');
            const sourceNs = Number(lastSample.sourceTimestampNs);
            const event = await createWaveRadarEventEnvelope({
              sessionId,
              snapshot: {
                capabilityId,
                samples: batch,
                sampleCount: batch.length,
                droppedSamplesSinceLastAck: Number(snapshot.droppedSamplesSinceLastAck || 0),
                droppedSamplesTotal: Number(snapshot.droppedSamplesTotal || 0),
                pendingSampleCount: Number(snapshot.pendingSampleCount || samples.length),
                sampleBufferCapacity: Number(snapshot.sampleBufferCapacity || 0),
                nativeSnapshotCapturedAt: snapshot.lastSensorAt ?? null,
                nativeBridgeVersion: snapshot.nativeBridgeVersion ?? null,
              },
              source: {
                ...SOURCE,
                sourceId: deviceId,
                deviceId,
                capabilityId: 'android.sensor.' + capabilityId,
              },
              observedClockDomain: lastSample.sourceClockDomain || 'ANDROID_ELAPSED_REALTIME_NANOS',
              observedMonotonicNs: Number.isSafeInteger(sourceNs) && sourceNs > 0 ? sourceNs : null,
              measurementAgeMs: Number.isFinite(Number(lastSample.sampleAgeMs))
                ? Math.max(0, Number(lastSample.sampleAgeMs)) : null,
              receivedAt: new Date().toISOString(),
              evidenceClass: 'MEASURED',
              collectionMethod: 'ANDROID_SENSOR_MANAGER_BUFFERED_SAMPLE_BATCH',
              payloadSchema: 'waveradar.android.sensor-sample-batch.v1',
              retentionClass: 'DIAGNOSTIC',
              rawPayloadRef: 'local-indexeddb://waveradar-evidence-v1/events/' + encodeURIComponent(sampleKey),
            });
            const result = await appendLocalEvidenceEvent(event, sampleKey);
            for (const sample of batch) {
              persistedSampleKeysRef.current.add([deviceId, capabilityId, sample.sequence].join(':'));
            }
            if (result.added) {
              added += 1;
              window.dispatchEvent(new CustomEvent('waveradar:event-envelope', { detail: event }));
            }
          }
        }

        const droppedSince = Number(snapshot.droppedSamplesSinceLastAck || 0);
        const droppedTotal = Number(snapshot.droppedSamplesTotal || 0);
        if (groups.size === 0 && droppedSince > 0) {
          const sampleKey = [deviceId, 'android-sensor-buffer-overflow', droppedTotal].join(':');
          const event = await createWaveRadarEventEnvelope({
            eventType: 'DEVICE_STATUS',
            sessionId,
            snapshot: {
              capabilityId: 'android.sensor.buffer',
              status: 'SENSOR_SAMPLE_BUFFER_OVERFLOW',
              droppedSamplesSinceLastAck: droppedSince,
              droppedSamplesTotal: droppedTotal,
              sampleBufferCapacity: Number(snapshot.sampleBufferCapacity || 0),
              lastSampleSequence: highestSequence,
            },
            source: {
              ...SOURCE,
              sourceId: deviceId,
              deviceId,
              capabilityId: 'android.sensor.buffer',
            },
            observedClockDomain: 'UNKNOWN',
            receivedAt: new Date().toISOString(),
            evidenceClass: 'UNKNOWN',
            collectionMethod: 'ANDROID_SENSOR_BUFFER_DIAGNOSTIC',
            payloadSchema: 'waveradar.android.sensor-buffer-status.v1',
            retentionClass: 'DIAGNOSTIC',
            rawPayloadRef: 'local-indexeddb://waveradar-evidence-v1/events/' + encodeURIComponent(sampleKey),
          });
          const result = await appendLocalEvidenceEvent(event, sampleKey);
          if (result.added) {
            added += 1;
            window.dispatchEvent(new CustomEvent('waveradar:event-envelope', { detail: event }));
          }
        }

        if (samples.length > 0 || droppedSince > 0) {
          await acknowledgeNativeSensorSamples(highestSequence, droppedTotal);
        }
        return {
          added,
          skippedNoSourceTime: 0,
          pendingSampleCount: samples.length,
          droppedSamplesSinceLastAck: droppedSince,
          droppedSamplesTotal: droppedTotal,
        };
      }

      let added = 0;
      let skippedNoSourceTime = 0;
      for (const [capabilityId, measurement] of Object.entries(snapshot?.measurements || {})) {
        if (!measurement || !Array.isArray(measurement.values)) continue;
        const sourceNs = Number(measurement.sourceTimestampNs);
        if (!Number.isSafeInteger(sourceNs) || sourceNs <= 0) {
          skippedNoSourceTime += 1;
          continue;
        }
        const sampleKey = [deviceId, capabilityId, sourceNs].join(':');
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
          rawPayloadRef: 'local-indexeddb://waveradar-evidence-v1/events/' + encodeURIComponent(sampleKey),
        });
        const result = await appendLocalEvidenceEvent(event, sampleKey);
        seenRef.current.add(sampleKey);
        if (result.added) {
          added += 1;
          window.dispatchEvent(new CustomEvent('waveradar:event-envelope', { detail: event }));
        }
      }
      return { added, skippedNoSourceTime, pendingSampleCount: 0, droppedSamplesSinceLastAck: 0, droppedSamplesTotal: 0 };
    };

    const onEnrollmentBundleUpdated = async (customEvent) => {
      let bundle = customEvent?.detail || null;
      if (!bundle) {
        try { bundle = JSON.parse(localStorage.getItem('waveradar.pending-enrollment-bundle') || 'null'); } catch {}
      }
      const token = typeof bundle?.enrollmentToken === 'string' ? bundle.enrollmentToken.trim() : '';
      const nextDeviceId = (typeof bundle?.deviceId === 'string' && bundle.deviceId.trim()) || deviceIdRef.current;
      if (!token || !nextDeviceId) {
        setStatus(old => ({ ...old, remoteIngestion: 'ENROLLMENT_BUNDLE_REQUIRED', lastError: 'BUNDLE_MISSING_DEVICE_ID_OR_TOKEN' }));
        return;
      }
      pairingInFlightRef.current = true;
      remoteRetryAfterRef.current = Date.now() + 5000;
      while (runningRef.current || networkInFlightRef.current > 0) {
        await new Promise(resolve => window.setTimeout(resolve, 25));
      }
      runningRef.current = true;
      let localIdentityQuarantineCount = 0;
      try {
        const previousDeviceId = deviceIdRef.current;
        if (previousDeviceId) {
          await hydratePersistedSampleKeys(previousDeviceId);
          const pendingSnapshot = await getNativeSensorSnapshot();
          await persistNativeSnapshot(pendingSnapshot, previousDeviceId);
        }
        localStorage.setItem('waveradar.device.id.v1', nextDeviceId);
        localStorage.setItem('waveradar.enrollment.token', token);
        localStorage.setItem('waveradar.device.registered', 'true');
        localStorage.removeItem('waveradar.pending-enrollment-bundle');
        deviceIdRef.current = getStableDeviceId();

        if (previousDeviceId && previousDeviceId !== nextDeviceId) {
          while (true) {
            const pending = await listPendingLocalEvidenceEvents({ limit: 1000 });
            const mismatched = pending.filter(record =>
              String(record.event?.source?.device_id || '') === String(previousDeviceId)
            );
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
        }
        persistedSampleKeysRef.current.clear();
        await hydratePersistedSampleKeys(deviceIdRef.current);
        seenRef.current.clear();
        remoteRetryAfterRef.current = 0;
        setStatus(old => ({
          ...old,
          remoteIngestion: 'PENDING',
          lastError: localIdentityQuarantineCount
            ? localIdentityQuarantineCount + ' pre-pairing event(s) retained locally under the previous device identity.'
            : null,
        }));
        window.dispatchEvent(new CustomEvent('waveradar:enrollment-bundle-applied', {
          detail: { deviceId: deviceIdRef.current, localIdentityQuarantineCount },
        }));
        window.dispatchEvent(new CustomEvent('waveradar:remote-evidence-status', {
          detail: { localIdentityQuarantineCount },
        }));
      } catch (error) {
        setStatus(old => ({
          ...old,
          remoteIngestion: 'PAIRING_RECONCILIATION_FAILED',
          lastError: error?.message || 'LOCAL_IDENTITY_RECONCILIATION_FAILED',
        }));
      } finally {
        runningRef.current = false;
        pairingInFlightRef.current = false;
      }
      const deferred = deferredNetworkEventsRef.current.splice(0);
      for (const detail of deferred) await onNetworkEvidence({ detail });
    };
    window.addEventListener('waveradar:enrollment-token-updated', onEnrollmentBundleUpdated);

    const onNetworkEvidence = async (customEvent) => {
      const detail = customEvent?.detail || {};
      if (pairingInFlightRef.current) {
        deferredNetworkEventsRef.current.push(detail);
        return;
      }
      networkInFlightRef.current += 1;
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
          samplesCapturedThisCycle: capture.pendingSampleCount || 0,
          droppedSamplesTotal: capture.droppedSamplesTotal || 0,
          droppedSamplesSinceLastAck: capture.droppedSamplesSinceLastAck || 0,
          lastCaptureAt: new Date().toISOString(),
        }));
      } catch (error) {
        if (active) setStatus((old) => ({
          ...old,
          phase: error?.name === 'QuotaExceededError' ? 'STORAGE_FULL' : 'ERROR',
          lastError: error?.message || 'NETWORK_EVIDENCE_PERSIST_FAILED',
        }));
      } finally {
        networkInFlightRef.current = Math.max(0, networkInFlightRef.current - 1);
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
      const pending = await listPendingLocalEvidenceEvents({ limit: 100 });
      if (!pending.length) {
        setStatus((old) => ({ ...old, remoteIngestion: 'SYNCED' }));
        return;
      }
      const currentDeviceId = String(deviceIdRef.current || '');
      const uploadable = [];
      let identityHeld = 0;
      for (const record of pending) {
        const eventDeviceId = String(record.event?.source?.device_id || '');
        if (eventDeviceId && eventDeviceId === currentDeviceId) {
          uploadable.push(record);
        } else {
          await markLocalEvidenceDelivered(record.sample_key, {
            status: 'QUARANTINED',
            reason: 'DEVICE_ID_MISMATCH_LOCAL_HOLD',
            note: 'Evidence retained locally; event device identity does not match the currently paired collector.',
          });
          identityHeld += 1;
        }
      }
      if (!uploadable.length) {
        const storageStatus = await getLocalEvidenceStatus();
        setStatus(old => ({
          ...old,
          pendingEvents: storageStatus.pending,
          quarantinedEvents: storageStatus.quarantined,
          remoteIngestion: identityHeld ? 'LOCAL_IDENTITY_HOLD' : 'SYNCED',
        }));
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
          body: JSON.stringify({ events: uploadable.map(record => record.event) }),
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

        const byEventId = new Map(uploadable.map(record => [record.event.event_id, record]));
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

        const capture = await persistNativeSnapshot(snapshot, deviceIdRef.current);
        const addedThisCycle = capture.added || 0;
        const skippedNoSourceTime = capture.skippedNoSourceTime || 0;
        const storageStatus = await getLocalEvidenceStatus();
        if (!active) return;
        setStatus((old) => ({
          ...old,
          phase: !storageStatus.available ? 'STORAGE_UNAVAILABLE' : capture.droppedSamplesSinceLastAck > 0 ? 'BUFFER_OVERFLOW' : 'CAPTURING_LOCAL',
          native: true,
          storedEvents: storageStatus.count,
          pendingEvents: storageStatus.pending,
          quarantinedEvents: storageStatus.quarantined,
          pendingNativeSamples: capture.pendingSampleCount || 0,
          droppedSamplesTotal: capture.droppedSamplesTotal || 0,
          droppedSamplesSinceLastAck: capture.droppedSamplesSinceLastAck || 0,
          lastCaptureAt: new Date().toISOString(),
          lastError: skippedNoSourceTime ? 'Some samples had no source monotonic timestamp and were not assigned fabricated times.' : capture.droppedSamplesSinceLastAck > 0 ? 'Native sample buffer overflow: dropped sample count is recorded in the evidence stream.' : old.lastError,
          addedThisCycle,
        }));
        window.dispatchEvent(new CustomEvent('waveradar:local-evidence-status', {
          detail: { ...storageStatus, ...capture, addedThisCycle, skippedNoSourceTime },
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
    const start = async () => {
      try {
        await hydratePersistedSampleKeys(deviceIdRef.current);
        let pendingBundle = null;
        try { pendingBundle = JSON.parse(localStorage.getItem('waveradar.pending-enrollment-bundle') || 'null'); } catch {}
        if (pendingBundle) await onEnrollmentBundleUpdated({ detail: pendingBundle });
        if (active) await poll();
      } catch (error) {
        if (active) setStatus(old => ({ ...old, phase: 'ERROR', lastError: error?.message || 'NATIVE_EVIDENCE_INITIALIZATION_FAILED' }));
      }
      if (active) timer = window.setInterval(poll, POLL_INTERVAL_MS);
    };
    start();
    return () => {
      active = false;
      window.removeEventListener(NETWORK_EVENT_NAME, onNetworkEvidence);
      window.removeEventListener('waveradar:enrollment-token-updated', onEnrollmentBundleUpdated);
      if (timer) window.clearInterval(timer);
    };
  }, [enabled, sessionId]);

  return status;
}
