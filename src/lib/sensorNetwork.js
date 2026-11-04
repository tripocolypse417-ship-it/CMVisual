import { DATA_CONTRACT_VERSION, EVIDENCE_CLASS, SENSOR_FAMILY, normalizeObservation, mergeObservations, auditDataCompleteness, MODALITIES } from './dataContract';

export const NETWORK_EVIDENCE = EVIDENCE_CLASS;
export const SENSOR_FAMILIES = Object.freeze(Object.values(SENSOR_FAMILY));

let localObservationSequence = 0;

export function createSensorObservation({ deviceId, sensorFamily, sensorType, timestamp, value, unit = null, accuracy = null, evidenceClass = EVIDENCE_CLASS.MEASURED, frameId = null, location = null, uncertaintyM = null, provenance = null, sensorId = null, sequence = null, correlationKey = null } = {}) {
  if (!deviceId || !sensorFamily || value == null) return null;
  // Never replace a missing measurement timestamp with processing/arrival time.
  const observationSequence = sequence ?? ++localObservationSequence;
  const observationId = `${deviceId}:${sensorId || sensorType || sensorFamily}:${timestamp ?? 'untimed'}:${observationSequence}`;
  return normalizeObservation({
    observationId,
    deviceId,
    sensorId,
    sequence: observationSequence,
    correlationKey,
    sensorFamily,
    sensorType: sensorType || sensorFamily,
    modality: sensorType || sensorFamily,
    timestamp: timestamp ?? null,
    observedAt: timestamp ?? null,
    value,
    unit,
    accuracy,
    uncertaintyM,
    evidenceClass,
    frameId,
    location,
    provenance: provenance || { source: sensorType || sensorFamily, deviceId, sensorId },
  }, { deviceId });
}

export function mergeSensorObservations(observations = []) {
  return mergeObservations([observations]).map(observation => ({ ...observation, networkRole: 'PEER_OBSERVATION', sourceDevice: observation.deviceId }));
}

/**
 * Summarize independent, time-aligned observations of the same explicitly
 * correlated candidate. Timing alone is not physical measurement agreement.
 */
export function summarizeCrossDeviceCorroboration(observations = [], toleranceMs = 250) {
  const valid = observations.filter(o =>
    o &&
    o.deviceId &&
    o.sensorFamily &&
    o.correlationKey &&
    Number.isFinite(Number(o.timestamp))
  );
  const groups = new Map();
  for (const observation of valid) {
    const key = `${observation.sensorFamily}|${observation.correlationKey}`;
    const group = groups.get(key) || [];
    group.push(observation);
    groups.set(key, group);
  }

  let comparisons = 0;
  let timeAlignedPairs = 0;
  const corroboratedGroups = [];
  for (const [key, group] of groups) {
    const independentDevices = [...new Set(group.map(item => String(item.deviceId)))];
    if (independentDevices.length < 2) continue;
    let aligned = false;
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        if (String(group[i].deviceId) === String(group[j].deviceId)) continue;
        comparisons += 1;
        if (Math.abs(Number(group[i].timestamp) - Number(group[j].timestamp)) <= toleranceMs) {
          timeAlignedPairs += 1;
          aligned = true;
        }
      }
    }
    if (aligned) corroboratedGroups.push({ key, independentDeviceCount: independentDevices.length });
  }

  return {
    status: corroboratedGroups.length ? 'TIME_ALIGNED_INDEPENDENT_OBSERVATIONS' : 'INSUFFICIENT_INDEPENDENT_EVIDENCE',
    independentDeviceCount: Math.max(0, ...corroboratedGroups.map(group => group.independentDeviceCount)),
    corroboratedGroups,
    samples: valid.length,
    comparisons,
    timeAlignedPairs,
    score: comparisons ? timeAlignedPairs / comparisons : null,
    interpretation: 'Temporal co-observation only; does not establish that sensor values agree or prove a person is present.',
  };
}

// Backward-compatible name; semantics are explicitly limited to independent temporal corroboration.
export function calculateCrossDeviceAgreement(observations = [], toleranceMs = 250) {
  return summarizeCrossDeviceCorroboration(observations, toleranceMs);
}

export function auditSensorObservation(observation) {
  return auditDataCompleteness(normalizeObservation(observation), { expectedByModality: true });
}

export const DATA_SCHEMA_VERSION = DATA_CONTRACT_VERSION;
export const SENSOR_MODALITY_REGISTRY = MODALITIES;
