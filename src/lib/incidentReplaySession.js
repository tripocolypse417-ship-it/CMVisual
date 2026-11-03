/**
 * Shared, deterministic replay-session model for Command View and Helmet View.
 * Both consumers subscribe to the same immutable snapshot stream. This module
 * does not fetch evidence or authorize access; callers must supply an already
 * authorized replay result from the server.
 */
const MODES = new Set(['AS_KNOWN_THEN', 'BEST_EVIDENCE_NOW']);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createIncidentReplaySession({ replay, initialPositionMs } = {}) {
  if (!replay || !Array.isArray(replay.records)) throw new TypeError('An authorized replay result is required');
  if (!MODES.has(replay.mode)) throw new TypeError('Unsupported replay mode');
  const events = replay.records.map((record) => {
    const time = record.replay?.eventTimeMs ?? Date.parse(record.event_time?.timestamp ?? record.eventTime);
    if (!Number.isFinite(time)) throw new TypeError('Every replay record requires a valid event time');
    return Object.freeze({ ...record, __timelineTime: time });
  }).sort((a, b) => a.__timelineTime - b.__timelineTime ||
    String(a.observation_id ?? a.id).localeCompare(String(b.observation_id ?? b.id)));
  const start = events[0]?.__timelineTime ?? 0;
  const end = events.at(-1)?.__timelineTime ?? start;
  let state = Object.freeze({
    incidentId: replay.incidentId,
    mode: replay.mode,
    positionMs: clamp(Number.isFinite(initialPositionMs) ? initialPositionMs : start, start, end),
    startMs: start,
    endMs: end,
    playing: false,
    speed: 1,
    revision: 0,
  });
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener(state));
  const update = (patch) => {
    state = Object.freeze({ ...state, ...patch, revision: state.revision + 1 });
    emit();
    return state;
  };

  return Object.freeze({
    getSnapshot: () => state,
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('listener must be a function');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    seek(positionMs) {
      if (!Number.isFinite(positionMs)) throw new TypeError('positionMs must be finite');
      return update({ positionMs: clamp(positionMs, start, end), playing: false });
    },
    setPlaying(playing) {
      return update({ playing: Boolean(playing) && end > start && state.positionMs < end });
    },
    setSpeed(speed) {
      if (![0.25, 0.5, 1, 2, 4, 8].includes(speed)) throw new TypeError('Unsupported replay speed');
      return update({ speed });
    },
    advance(realElapsedMs) {
      if (!Number.isFinite(realElapsedMs) || realElapsedMs < 0) throw new TypeError('elapsed time must be non-negative');
      if (!state.playing) return state;
      const positionMs = clamp(state.positionMs + realElapsedMs * state.speed, start, end);
      return update({ positionMs, playing: positionMs < end });
    },
    eventsAtPosition() {
      return events.filter((event) => event.__timelineTime <= state.positionMs)
        .map(({ __timelineTime, ...event }) => event);
    },
    eventWindow(fromMs, toMs) {
      if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs < fromMs) {
        throw new TypeError('A valid event window is required');
      }
      return events.filter((event) => event.__timelineTime >= fromMs && event.__timelineTime <= toMs)
        .map(({ __timelineTime, ...event }) => event);
    },
  });
}
