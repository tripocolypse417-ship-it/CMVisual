export const INDEPENDENT_GROUND_TRUTH_LOG_KEY = 'waveradar:independent-ground-truth:v1';

/**
 * Parse the local reference log without discarding entries from older or
 * unknown schemas. Unreadable payloads are returned intact for export and
 * must never be replaced automatically by the client.
 */
export function parseIndependentGroundTruthLog(rawValue) {
  if (rawValue == null) {
    return {
      state: 'EMPTY',
      records: [],
      rawValue: null,
      recoveryPayload: null,
    };
  }

  const raw = String(rawValue);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return {
        state: 'READABLE',
        records: parsed,
        rawValue: raw,
        recoveryPayload: null,
      };
    }
    return {
      state: 'INVALID_SHAPE',
      records: [],
      rawValue: raw,
      recoveryPayload: raw,
    };
  } catch {
    return {
      state: 'UNPARSEABLE',
      records: [],
      rawValue: raw,
      recoveryPayload: raw,
    };
  }
}

export function isIndependentGroundTruthLogWritable(state) {
  return state === 'EMPTY' || state === 'READABLE';
}
