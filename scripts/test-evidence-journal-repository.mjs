import assert from 'node:assert/strict';
import { createEvidenceJournalRepository } from '../src/lib/evidenceJournalRepository.js';

const rows = Array.from({ length: 7 }, (_, i) => ({
  eventId: 'event-' + (i + 1), incidentId: 'incident-1', eventType: 'OBSERVATION',
  capturedAt: 1000 + i, receivedAt: 1100 + i, clockDomain: 'test-clock',
  evidenceClass: 'UNKNOWN', payload: { n: i + 1 },
}));
const calls = [];
const store = {
  async listIncidents() { return { available: true, incidents: [{ incidentId: 'incident-1', eventCount: rows.length }] }; },
  async read({ incidentId, afterSequence, limit }) {
    calls.push({ incidentId, afterSequence, limit });
    const start = afterSequence;
    const batch = rows.slice(start, start + limit);
    return { available: true, events: batch, nextSequence: batch.length ? start + batch.length : start };
  },
};
const repository = createEvidenceJournalRepository(store);
assert.equal((await repository.listIncidents()).incidents[0].eventCount, 7);
const loaded = await repository.loadIncident('incident-1', { pageSize: 3 });
assert.equal(loaded.loadedCount, 7);
assert.equal(loaded.ledger.counts.accepted, 7);
assert.equal(loaded.hasMore, false);
assert.deepEqual(calls.map(call => call.afterSequence), [0, 3, 6]);
assert.equal(calls.every(call => call.incidentId === 'incident-1'), true);
const bounded = await repository.loadIncident('incident-1', { maxEvents: 4, pageSize: 3 });
assert.equal(bounded.loadedCount, 4);
assert.equal(bounded.hasMore, true);
const stalled = createEvidenceJournalRepository({ read: async ({ afterSequence }) => ({ available: true, events: [rows[0]], nextSequence: afterSequence }) });
const stalledResult = await stalled.loadIncident('incident-1');
assert.equal(stalledResult.error, 'PAGINATION_CURSOR_DID_NOT_ADVANCE');
const unavailable = createEvidenceJournalRepository({});
assert.equal((await unavailable.listIncidents()).available, false);
assert.equal((await unavailable.loadIncident('incident-1')).available, false);
await assert.rejects(() => repository.loadIncident(''), /incidentId/);
console.log('WaveRadar evidence journal repository pagination: PASS');
