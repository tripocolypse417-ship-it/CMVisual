import { registerPlugin } from '@capacitor/core';

export const WaveRadarEvidenceStore = registerPlugin('WaveRadarEvidenceStore');

const MAX_BATCH = 500;

/**
 * Dependency-injected bridge client so validation does not require a device.
 * The native implementation commits batches to app-private SQLite storage.
 */
export function createEvidenceStoreClient(plugin) {
  return Object.freeze({
    async append(events) {
      if (!Array.isArray(events) || events.length === 0 || events.length > MAX_BATCH) {
        throw new TypeError(`events must contain between 1 and ${MAX_BATCH} records`);
      }
      for (const event of events) {
        if (!event || typeof event.eventId !== 'string' || !event.eventId.trim() ||
            typeof event.incidentId !== 'string' || !event.incidentId.trim()) {
          throw new TypeError('each event requires eventId and incidentId');
        }
      }
      if (!plugin?.appendEvents) return { available: false, inserted: 0, reason: 'NATIVE_EVIDENCE_STORE_UNAVAILABLE' };
      const result = await plugin.appendEvents({ events });
      return { available: true, ...result };
    },
    async read({ incidentId, afterSequence = 0, limit = 100 } = {}) {
      if (typeof incidentId !== 'string' || !incidentId.trim()) throw new TypeError('incidentId is required');
      if (!Number.isSafeInteger(afterSequence) || afterSequence < 0) throw new TypeError('afterSequence must be a non-negative integer');
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_BATCH) throw new TypeError('limit must be between 1 and 500');
      if (!plugin?.readEvents) return { available: false, events: [], nextSequence: afterSequence, reason: 'NATIVE_EVIDENCE_STORE_UNAVAILABLE' };
      return { available: true, ...await plugin.readEvents({ incidentId, afterSequence, limit }) };
    },
    async status() {
      if (!plugin?.getStatus) return { available: false, storage: 'UNAVAILABLE' };
      return { available: true, ...await plugin.getStatus() };
    },
  });
}

export const nativeEvidenceStore = createEvidenceStoreClient(WaveRadarEvidenceStore);
