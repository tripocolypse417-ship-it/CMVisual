import { createEvidenceLedger } from './evidenceLedger.js';

const MAX_EVENTS = 10000;
const PAGE_SIZE = 500;

/**
 * Read one incident's local journal into the canonical evidence ledger.
 * Stops safely on unavailable storage, stalled cursors or configured bounds.
 */
export function createEvidenceJournalRepository(store) {
  return Object.freeze({
    async listIncidents() {
      if (!store?.listIncidents) return { available: false, incidents: [], reason: 'STORE_UNAVAILABLE' };
      return store.listIncidents();
    },
    async loadIncident(incidentId, { maxEvents = MAX_EVENTS, pageSize = PAGE_SIZE } = {}) {
      if (typeof incidentId !== 'string' || !incidentId.trim()) throw new TypeError('incidentId is required');
      if (!Number.isSafeInteger(maxEvents) || maxEvents < 1 || maxEvents > MAX_EVENTS) throw new TypeError('maxEvents must be between 1 and 10000');
      if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > PAGE_SIZE) throw new TypeError('pageSize must be between 1 and 500');
      if (!store?.read) return { available: false, ledger: null, loadedCount: 0, hasMore: false, reason: 'STORE_UNAVAILABLE' };
      const events = [];
      let afterSequence = 0;
      let hasMore = false;
      while (events.length < maxEvents) {
        const limit = Math.min(pageSize, maxEvents - events.length);
        const page = await store.read({ incidentId, afterSequence, limit });
        if (!page?.available) return { available: false, ledger: null, loadedCount: events.length, hasMore: false, reason: page?.reason || 'STORE_UNAVAILABLE' };
        const batch = Array.isArray(page.events) ? page.events : [];
        if (batch.length === 0) break;
        events.push(...batch);
        const next = Number(page.nextSequence);
        if (!Number.isSafeInteger(next) || next <= afterSequence) {
          return { available: true, ledger: createEvidenceLedger(events), loadedCount: events.length, hasMore: true, error: 'PAGINATION_CURSOR_DID_NOT_ADVANCE' };
        }
        afterSequence = next;
        if (batch.length < limit) break;
      }
      if (events.length >= maxEvents) hasMore = true;
      return {
        available: true,
        ledger: createEvidenceLedger(events),
        loadedCount: events.length,
        hasMore,
        nextSequence: afterSequence,
      };
    },
  });
}
