import assert from 'node:assert/strict';
import { createIncidentReplaySession } from '../src/lib/incidentReplaySession.js';

const replay = {
  incidentId: 'incident-1',
  mode: 'BEST_EVIDENCE_NOW',
  records: [
    { id: 'b', eventTime: '2026-11-02T14:00:02Z', replay: { eventTimeMs: Date.parse('2026-11-02T14:00:02Z') } },
    { id: 'a', eventTime: '2026-11-02T14:00:01Z', replay: { eventTimeMs: Date.parse('2026-11-02T14:00:01Z') } },
  ],
};
const session = createIncidentReplaySession({ replay });
const commandView = session.getSnapshot;
let helmetSnapshot;
const unsubscribe = session.subscribe((snapshot) => { helmetSnapshot = snapshot; });
const start = Date.parse('2026-11-02T14:00:01Z');
const end = Date.parse('2026-11-02T14:00:02Z');
assert.equal(commandView().positionMs, start);
session.setSpeed(2);
session.setPlaying(true);
session.advance(250);
assert.equal(commandView().positionMs, start + 500);
assert.equal(helmetSnapshot.positionMs, commandView().positionMs);
assert.equal(session.eventsAtPosition().length, 1);
session.seek(end);
assert.equal(commandView().playing, false);
assert.equal(session.eventsAtPosition().length, 2);
assert.deepEqual(session.eventWindow(start, end).map((event) => event.id), ['a', 'b']);
assert.throws(() => session.setSpeed(3), /Unsupported/);
unsubscribe();
console.log('Shared incident replay session checks passed. Both views observe the same session snapshot.');
