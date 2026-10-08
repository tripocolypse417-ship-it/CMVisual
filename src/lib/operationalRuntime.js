/**
 * WaveRadar operational runtime.
 *
 * Converts raw device capability/evidence signals into one conservative
 * operational state. This is intentionally dependency-free so the field UI,
 * validation screen, replay, and future native shell can share the same rules.
 */
import { evaluateCapability } from './capabilityRegistry';
import { FIELD_MODES, fieldModeLabel, selectFieldMode } from './gracefulDegradation';
import { DATA_CONTRACT_VERSION, EVIDENCE_CLASS } from './dataContract';

export const RUNTIME_VERSION = 'waveradar-runtime-v1';

const ADVANCED_EVIDENCE = ['WIFI_RTT', 'UWB', 'AR_DEPTH', 'THERMAL', 'MMWAVE', 'EXTERNAL_RANGING'];

function bool(v) { return v === true; }

function normalizeCapabilities(input = {}) {
  const native = input.native || {};
  const sensors = input.sensors || {};
  return {
    camera: bool(input.camera ?? input.cameraReady),
    imu: bool(input.imu ?? sensors.imu ?? input.motion),
    gnss: bool(input.gnss ?? sensors.gnss),
    wifiRtt: bool(input.wifiRtt ?? native.androidWifiRtt),
    uwb: bool(input.uwb ?? native.uwb),
    depth: bool(input.depth ?? input.arDepth),
    thermal: bool(input.thermal),
    mmwave: bool(input.mmwave),
    sensorData: bool(input.sensorData ?? input.hasSensors ?? sensors.available),
    map: input.map !== false,
  };
}

/**
 * Capability eligibility is stricter than hardware presence:
 * experimental capabilities remain visible but cannot become operational
 * evidence until a validation gate is satisfied.
 */
export function buildOperationalRuntime(input = {}) {
  const capabilities = normalizeCapabilities(input);
  const evidence = Array.isArray(input.evidence) ? input.evidence.map(v => String(v).toUpperCase()) : [];
  const validation = input.validation || {};
  const validated = new Set(
    Array.isArray(validation.validatedCapabilities)
      ? validation.validatedCapabilities.map(v => String(v).toLowerCase())
      : []
  );

  const mode = selectFieldMode(capabilities);
  const capabilityIds = [
    'visual-detection',
    'visual-tracking',
    'wifi-rtt-range',
    'depth-mapping',
    'thermal-mapping',
    'mmwave-range-motion',
    'cooperative-localization',
    'trajectory-prediction',
  ];

  const capabilityState = Object.fromEntries(capabilityIds.map(id => {
    const result = evaluateCapability(id, evidence);
    const validationPassed = validated.has(id);
    return [id, {
      ...result,
      operational: Boolean(result.eligible && (result.status !== 'DEGRADED' || validationPassed)),
      validationPassed,
    }];
  }));

  const advancedPresent = ADVANCED_EVIDENCE.some(v => evidence.includes(v));
  const measuredCount = Number(input.measuredCount || 0);
  const staleCount = Number(input.staleCount || 0);
  const conflictCount = Number(input.conflictCount || 0);
  const freshness = measuredCount > 0
    ? Math.max(0, Math.min(1, 1 - staleCount / measuredCount))
    : null;

  const integrity = conflictCount > 0 ? 'CONFLICT'
    : measuredCount === 0 ? 'NO_MEASUREMENTS'
    : freshness != null && freshness < 0.5 ? 'STALE'
    : 'NOMINAL';

  // A mode describes what the UI can render; it does not claim sensor accuracy.
  return {
    runtimeVersion: RUNTIME_VERSION,
    contractVersion: DATA_CONTRACT_VERSION,
    mode,
    modeLabel: fieldModeLabel(mode),
    capabilities,
    capabilityState,
    evidence,
    advancedEvidencePresent: advancedPresent,
    integrity,
    freshness,
    measuredCount,
    staleCount,
    conflictCount,
    truthBoundary: {
      measured: EVIDENCE_CLASS.MEASURED,
      inferred: EVIDENCE_CLASS.INFERRED,
      predicted: EVIDENCE_CLASS.PREDICTED,
      unknown: EVIDENCE_CLASS.UNKNOWN,
      unsupportedClaimsDisabled: true,
    },
    canRender3D: mode === FIELD_MODES[0] || mode === FIELD_MODES[1] || mode === FIELD_MODES[2],
    canRenderMap: true,
    canRenderReplay: true,
    safeToExposeAdvancedSensing: capabilityState['thermal-mapping']?.operational ||
      capabilityState['mmwave-range-motion']?.operational ||
      capabilityState['wifi-rtt-range']?.operational ||
      capabilityState['depth-mapping']?.operational ||
      false,
  };
}

export function explainRuntime(runtime) {
  if (!runtime) return 'Runtime unavailable';
  if (runtime.integrity === 'CONFLICT') return 'Sensor conflict — showing evidence with conflict state';
  if (runtime.integrity === 'STALE') return 'Inputs stale — degrading to safer operational view';
  if (runtime.integrity === 'NO_MEASUREMENTS') return 'No live measurements — replay/map only';
  return runtime.modeLabel;
}
