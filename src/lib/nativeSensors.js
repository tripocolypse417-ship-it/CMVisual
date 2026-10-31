import { registerPlugin } from '@capacitor/core';

export const WaveRadarSensors = registerPlugin('WaveRadarSensors');

async function invokeNative(method) {
  try {
    const value = await WaveRadarSensors[method]();
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { state: 'INVALID_RESPONSE', value: null };
    }
    return { state: 'OK', value };
  } catch (error) {
    // Keep the diagnostic state; do not silently turn bridge/auth/lifecycle
    // failures into an indistinguishable "no sensor" result.
    return {
      state: 'CALL_FAILED',
      value: null,
      errorName: typeof error?.name === 'string' ? error.name : 'Error',
    };
  }
}

export async function getNativeSensorSnapshotResult() {
  return invokeNative('getSnapshot');
}

export async function getNativeSensorCapabilitiesResult() {
  return invokeNative('getCapabilities');
}

// Compatibility wrappers for existing callers. New validation code should use
// the result variants so native bridge failure is distinguishable from data.
export async function getNativeSensorSnapshot() {
  const result = await getNativeSensorSnapshotResult();
  return result.value;
}

export async function getNativeSensorCapabilities() {
  const result = await getNativeSensorCapabilitiesResult();
  return result.value;
}
