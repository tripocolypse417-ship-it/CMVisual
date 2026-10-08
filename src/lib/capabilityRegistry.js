/**
 * WaveRadar capability registry.
 *
 * Capabilities describe what the current evidence stack is allowed to expose.
 * A capability is never considered operational merely because a model or
 * adapter exists; validation gates determine eligibility.
 */

export const CAPABILITY_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  DEGRADED: 'DEGRADED',
  EXPERIMENTAL: 'EXPERIMENTAL',
  BLOCKED: 'BLOCKED',
  UNKNOWN: 'UNKNOWN',
});

export const CAPABILITIES = Object.freeze({
  VISUAL_DETECTION: {
    id: 'visual-detection',
    label: 'Camera object/person detection',
    evidence: ['CAMERA'],
    status: CAPABILITY_STATUS.AVAILABLE,
    output: 'DETECTION',
  },
  VISUAL_TRACKING: {
    id: 'visual-tracking',
    label: 'Visual track continuity',
    evidence: ['CAMERA', 'IMU'],
    status: CAPABILITY_STATUS.AVAILABLE,
    output: 'TRACK',
  },
  WIFI_RTT_RANGE: {
    id: 'wifi-rtt-range',
    label: 'Wi-Fi RTT measured ranging',
    evidence: ['WIFI_RTT'],
    status: CAPABILITY_STATUS.DEGRADED,
    output: 'RANGE',
  },
  DEPTH_MAPPING: {
    id: 'depth-mapping',
    label: 'Depth/surface mapping',
    evidence: ['AR_DEPTH'],
    status: CAPABILITY_STATUS.DEGRADED,
    output: 'GEOMETRY',
  },
  THERMAL_MAPPING: {
    id: 'thermal-mapping',
    label: 'Thermal spatial mapping',
    evidence: ['THERMAL'],
    status: CAPABILITY_STATUS.EXPERIMENTAL,
    output: 'THERMAL_FIELD',
  },
  MMWAVE_RANGE_MOTION: {
    id: 'mmwave-range-motion',
    label: 'mmWave range/motion sensing',
    evidence: ['MMWAVE'],
    status: CAPABILITY_STATUS.EXPERIMENTAL,
    output: 'RANGE_MOTION',
  },
  RF_CSI_RESEARCH: {
    id: 'rf-csi-research',
    label: 'RF/CSI environmental research',
    evidence: ['WIFI'],
    status: CAPABILITY_STATUS.EXPERIMENTAL,
    output: 'ENVIRONMENTAL_FEATURES',
  },
  COOPERATIVE_LOCALIZATION: {
    id: 'cooperative-localization',
    label: 'Cooperative device localization',
    evidence: ['CAMERA', 'WIFI_RTT', 'UWB', 'BLUETOOTH'],
    status: CAPABILITY_STATUS.DEGRADED,
    output: 'TEAM_POSITION',
  },
  TRAJECTORY_PREDICTION: {
    id: 'trajectory-prediction',
    label: 'Trajectory prediction',
    evidence: ['TRACK'],
    status: CAPABILITY_STATUS.AVAILABLE,
    output: 'PREDICTION',
  },
});

export function getCapability(id) {
  return Object.values(CAPABILITIES).find(c => c.id === id) || null;
}

export function evaluateCapability(id, availableEvidence = []) {
  const capability = getCapability(id);
  if (!capability) return { eligible: false, status: CAPABILITY_STATUS.UNKNOWN, reason: 'UNKNOWN_CAPABILITY' };

  const available = new Set((Array.isArray(availableEvidence) ? availableEvidence : []).map(v => String(v).toUpperCase()));
  const missing = capability.evidence.filter(v => !available.has(v));

  if (missing.length) {
    return { eligible: false, status: capability.status, capability, missingEvidence: missing };
  }

  if ([CAPABILITY_STATUS.EXPERIMENTAL, CAPABILITY_STATUS.BLOCKED].includes(capability.status)) {
    return { eligible: false, status: capability.status, capability, missingEvidence: [] };
  }

  return { eligible: true, status: capability.status, capability, missingEvidence: [] };
}
