const VERSION = 'victim-evidence-record-v1';
const STORAGE_KEY = 'waveradar.victimEvidence.session.v1';
const MAX_EVENTS_PER_RECORD = 500;

export const VICTIM_CATEGORIES = [
  { value: 'RESPIRATORY', label: 'Breathing / respiratory observation' },
  { value: 'VISIBLE_BLEEDING', label: 'Visible bleeding' },
  { value: 'RESPONSIVENESS', label: 'Responsiveness' },
  { value: 'BURNS', label: 'Visible burn indicators' },
  { value: 'MOVEMENT_OR_LIMB', label: 'Movement / limb position' },
  { value: 'ENVIRONMENTAL_EXPOSURE', label: 'Environmental exposure' },
  { value: 'OTHER', label: 'Other observable finding' },
];

export const VICTIM_STATUSES = [
  { value: 'OBSERVED', label: 'Observed' },
  { value: 'NOT_OBSERVED', label: 'Not observed' },
  { value: 'NOT_ASSESSED', label: 'Not assessed' },
  { value: 'UNABLE_TO_ASSESS', label: 'Unable to assess' },
];

const ALLOWED_EVIDENCE_CLASSES = new Set([
  'MEASURED', 'DERIVED', 'INFERRED', 'PREDICTED', 'SIMULATED',
  'HUMAN_ENTERED', 'UNKNOWN', 'UNAVAILABLE',
]);

const safeStorage = () => { try { return globalThis.sessionStorage; } catch { return null; } };
const safeTimestamp = (value, fallback) => { const parsed = Date.parse(value || ''); return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback; };
const safeText = (value, max = 300) => String(value ?? '').trim().slice(0, max);
const isoNow = () => new Date().toISOString();
const makeId = (prefix) => {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
const normalizeClass = (value) => {
  const normalized = String(value || 'UNKNOWN').toUpperCase();
  return ALLOWED_EVIDENCE_CLASSES.has(normalized) ? normalized : 'UNKNOWN';
};

export function loadVictimRecords(storage = safeStorage()) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((record) =>
      record && typeof record === 'object' &&
      typeof record.victimId === 'string' &&
      typeof record.trackId === 'string' &&
      Array.isArray(record.events)
    );
  } catch {
    return [];
  }
}

export function saveVictimRecords(records, storage = safeStorage()) {
  if (!Array.isArray(records)) return false;
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function createVictimRecord({ incidentId, selectedTrack, now = isoNow() } = {}) {
  const trackId = safeText(selectedTrack?.trackId ?? selectedTrack?.id, 160);
  if (!trackId) throw new Error('A selected track is required to assign a victim record.');
  const victimId = makeId('victim');
  const label = `VICTIM ${String(Date.now()).slice(-4)}`;
  return {
    schemaVersion: VERSION,
    victimId,
    label,
    incidentId: safeText(incidentId || 'incident-unassigned', 160),
    trackId,
    createdAt: now,
    events: [{
      eventId: makeId('event'),
      eventType: 'VICTIM_ASSIGNED',
      observedAt: now,
      recordedAt: now,
      evidenceClass: 'HUMAN_ENTERED',
      source: 'RESPONDER_ACTION',
      note: 'Responder explicitly assigned this selected track to a victim record.',
    }],
  };
}

export function appendVictimObservation(record, input, now = isoNow()) {
  if (!record || !Array.isArray(record.events)) throw new Error('A valid victim record is required.');
  const category = safeText(input?.category, 48).toUpperCase();
  const status = safeText(input?.status, 48).toUpperCase();
  if (!VICTIM_CATEGORIES.some((item) => item.value === category)) throw new Error('Select a supported observation category.');
  if (!VICTIM_STATUSES.some((item) => item.value === status)) throw new Error('Select a supported observation status.');
  const note = safeText(input?.note, 300);
  if (!note) throw new Error('Describe the observable finding or why it could not be assessed.');
  if (record.events.length >= MAX_EVENTS_PER_RECORD) throw new Error('This session record reached its event limit; export it before continuing.');

  const event = {
    eventId: makeId('event'),
    eventType: 'OBSERVATION',
    observedAt: now,
    recordedAt: isoNow(),
    category,
    status,
    note,
    evidenceClass: 'HUMAN_ENTERED',
    source: 'RESPONDER_OBSERVATION',
    modality: 'MANUAL',
  };
  return { ...record, events: [...record.events, event] };
}

export function captureVictimScanReference(record, detection, now = isoNow()) {
  if (!record || !Array.isArray(record.events)) throw new Error('A valid victim record is required.');
  const trackId = safeText(detection?.trackId ?? detection?.id, 160);
  if (!trackId || trackId !== record.trackId) throw new Error('The selected scan must match the active victim track.');
  if (record.events.length >= MAX_EVENTS_PER_RECORD) throw new Error('This session record reached its event limit; export it before continuing.');

  const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
  const event = {
    eventId: makeId('event'),
    eventType: 'SCAN_REFERENCE',
    observedAt: safeTimestamp(detection?.observedAt ?? detection?.timestamp, now),
    recordedAt: isoNow(),
    evidenceClass: normalizeClass(detection?.evidenceClass ?? detection?.evidence_class),
    source: safeText(detection?.source, 100) || 'UNKNOWN',
    modality: safeText(detection?.sensorType ?? detection?.modality, 48).toUpperCase() || 'UNKNOWN',
    observationRef: safeText(detection?.eventId ?? detection?.observationId ?? detection?.id, 160) || null,
    displayLabel: safeText(detection?.displayId, 80) || null,
    distanceM: numeric(detection?.distance),
    bearingDeg: numeric(detection?.angle ?? detection?.bearing),
    confidence: numeric(detection?.confidence),
    uncertaintyM: numeric(detection?.uncertaintyM),
    sensorSources: Array.isArray(detection?.sensorSources) ? detection.sensorSources.map((x) => safeText(x, 80)).filter(Boolean).slice(0, 8) : [],
    corroborated: detection?.corroborated === true,
    limitations: [
      'This is a reference to an existing observation, not a clinical finding.',
      'No raw image, audio, biometric waveform, or identity data is copied into this record.',
      'Confidence and corroboration values retain their source meaning and are not injury probabilities.',
    ],
  };
  return { ...record, events: [...record.events, event] };
}

export function summarizeVictimRecord(record) {
  const events = Array.isArray(record?.events) ? record.events : [];
  const observations = events.filter((event) => event?.eventType === 'OBSERVATION');
  const byCategory = {};
  for (const event of observations) {
    const category = event.category || 'OTHER';
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(event);
  }
  const conflicts = Object.entries(byCategory).flatMap(([category, rows]) => {
    const recent = rows.filter((row) => {
      const age = Date.now() - Date.parse(row.observedAt || '');
      return (row.status === 'OBSERVED' || row.status === 'NOT_OBSERVED') && Number.isFinite(age) && age >= 0 && age <= 5 * 60 * 1000;
    });
    const statuses = [...new Set(recent.map((row) => row.status))];
    return statuses.length > 1 ? [{ category, eventIds: recent.map((row) => row.eventId), statuses }] : [];
  });
  const categoriesWithAssessment = new Set(observations.map((event) => event.category));
  const notAssessed = VICTIM_CATEGORIES.filter((category) => !categoriesWithAssessment.has(category.value)).map((category) => category.value);
  return {
    observationCount: observations.length,
    scanReferenceCount: events.filter((event) => event?.eventType === 'SCAN_REFERENCE').length,
    conflicts,
    notAssessed,
    latestEventAt: events.map((event) => Date.parse(event?.observedAt || '')).filter(Number.isFinite).sort((a, b) => b - a)[0] || null,
    evidenceClasses: [...new Set(events.map((event) => event?.evidenceClass || 'UNKNOWN'))],
  };
}

export function buildVictimHandoff(record) {
  if (!record) throw new Error('A victim record is required.');
  const summary = summarizeVictimRecord(record);
  return {
    schemaVersion: VERSION,
    incidentId: record.incidentId,
    victimLabel: record.label,
    victimRecordId: record.victimId,
    linkedTrackId: record.trackId,
    generatedAt: isoNow(),
    events: record.events,
    summary,
    limitations: [
      'This is an evidence handoff, not a diagnosis, triage determination, or treatment instruction.',
      'Absence of an observation does not establish absence of injury.',
      'Conflicting observations are preserved and flagged; they are not averaged or silently resolved.',
      'Clinical interpretation and care remain with qualified responders using applicable protocols.',
    ],
  };
}

export const VICTIM_STORAGE_SCOPE = 'Current browser tab session only; not encrypted, not synchronized, and not a durable incident-record system.';
