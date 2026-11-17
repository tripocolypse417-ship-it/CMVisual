import assert from 'node:assert/strict';
import { createEvidenceStoreClient } from '../src/lib/nativeEvidenceStore.js';

const calls = [];
const plugin = {
  async appendEvents(input) { calls.push(['append', input]); return { inserted: input.events.length, duplicates: 0, collisions: [], invalidIndexes: [], storage: 'ANDROID_APP_PRIVATE_SQLITE' }; },
  async readEvents(input) { calls.push(['read', input]); return { events: [], nextSequence: input.afterSequence, limit: input.limit }; },
  async getStatus() { return { eventCount: 2, encryptedAtRest: false }; },
};
const store = createEvidenceStoreClient(plugin);
const batch = [{ eventId: 'e1', incidentId: 'i1' }, { eventId: 'e2', incidentId: 'i1' }];
const appended = await store.append(batch);
assert.equal(appended.inserted, 2);
assert.equal(calls[0][0], 'append');
await store.read({ incidentId: 'i1', afterSequence: 3, limit: 50 });
assert.deepEqual(calls[1], ['read', { incidentId: 'i1', afterSequence: 3, limit: 50 }]);
assert.equal((await store.status()).encryptedAtRest, false);
await assert.rejects(() => store.append([]), /between 1 and 500/);
await assert.rejects(() => store.append([{ eventId: 'x' }]), /eventId and incidentId/);
await assert.rejects(() => store.read({ incidentId: 'i1', afterSequence: -1 }), /non-negative/);
await assert.rejects(() => store.read({ incidentId: 'i1', limit: 501 }), /between 1 and 500/);
const unavailable = createEvidenceStoreClient({});
assert.equal((await unavailable.append(batch)).available, false);
assert.equal((await unavailable.read({ incidentId: 'i1' })).available, false);
assert.equal((await unavailable.status()).available, false);
console.log('WaveRadar native evidence store bridge contract: PASS');
