import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, CheckCircle2, CircleAlert, ClipboardCheck, RefreshCw, ShieldCheck, WandSparkles, X } from 'lucide-react';
import { getDeviceIdentityStatus } from '@/lib/deviceIdentity';
import { getNativeSensorCapabilities } from '@/lib/nativeSensors';

const QUEUE_KEY = 'waveradar:physical-validation:queue:v1';
const KNOWN_POINTS_KEY = 'waveradar:known-point-checks:v1';
const REVIEW_LOG_KEY = 'waveradar:human-review-log:v1';

function safeArrayFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { count: 0, status: 'EMPTY', malformed: false };
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? { count: value.length, status: value.length ? 'AVAILABLE' : 'EMPTY', malformed: false }
      : { count: 0, status: 'MALFORMED', malformed: true };
  } catch {
    return { count: 0, status: 'MALFORMED', malformed: true };
  }
}

function readReviewLog() {
  try {
    const value = JSON.parse(localStorage.getItem(REVIEW_LOG_KEY) || '[]');
    return Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && typeof item.reviewKey === 'string') : [];
  } catch {
    return [];
  }
}

function reviewKeyFor(check) {
  return [check.id, check.status, check.detail].join('|');
}

function reviewGuidance(check) {
  const guidance = {
    identity: ['Initialize or inspect the installation identity in Physical Validation.', 'A stable app installation key is not proof of a unique hardware identity.'],
    queue: ['Inspect queued records and retry sync when online; preserve malformed data for diagnosis.', 'Do not delete or overwrite queued evidence to clear this warning.'],
    'known-points': ['Record a known reference point and compare captured measurements against it.', 'A saved comparison is not automatically a successful validation.'],
    network: ['Retry synchronization when a connection is available.', 'Offline status affects sync, not whether a measurement is physically accurate.'],
    camera: ['Open Physical Validation and check camera permission and live camera access.', 'Permission status alone does not prove the camera stream is working.'],
    'native-sensors': ['Check the native sensor bridge and the sensors reported by this device.', 'Sensor availability does not establish absolute position or through-wall detection.'],
    inventory: ['Inspect the app data stores and confirm expected records are available.', 'Only recognized data stores are summarized automatically.'],
    'world-data': ['Before importing a dataset, record its source, license, timestamp, coverage, and measurement type.', 'External or inferred data must not be presented as measured physical-validation evidence.'],
  };
  return guidance[check.id] || ['Inspect the attached evidence and choose the safest next step.', 'The review acknowledgement does not resolve the underlying issue.'];
}

async function permissionState(name) {
  try {
    if (!navigator.permissions?.query) return 'NOT EXPOSED BY BROWSER';
    const result = await navigator.permissions.query({ name });
    return String(result.state || 'UNKNOWN').toUpperCase();
  } catch {
    return 'NOT EXPOSED BY BROWSER';
  }
}

export default function GlobalAutomationWizard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [checks, setChecks] = useState([]);
  const [summary, setSummary] = useState({ ready: 0, action: 0, blocked: 0 });
  const [reviewLog, setReviewLog] = useState(readReviewLog);
  const [showAllChecks, setShowAllChecks] = useState(false);
  const initialAuditDone = useRef(false);

  const runAudit = useCallback(async () => {
    setBusy(true);
    const next = [];
    const add = (id, title, status, detail, action = null) => next.push({ id, title, status, detail, action });
    try {
      const identity = getDeviceIdentityStatus();
      add('identity', 'Installation identity', identity.initialized && (identity.localStorage || identity.sessionStorage || identity.cookie) ? 'READY' : 'ACTION', identity.initialized ? 'Stable installation key available; this is not a hardware identity.' : 'Initialize the installation key before device enrollment.');
    } catch {
      add('identity', 'Installation identity', 'ACTION', 'Identity check failed safely. Re-run the check or open physical validation.');
    }

    const offlineQueue = safeArrayFromStorage(QUEUE_KEY);
    add('queue', 'Offline evidence queue', offlineQueue.malformed ? 'ACTION' : offlineQueue.count ? 'ACTION' : 'READY', offlineQueue.malformed ? 'Queue data is malformed. Existing content was not overwritten.' : offlineQueue.count ? `${offlineQueue.count} queued validation record(s) need sync review.` : 'No queued validation records waiting locally.');

    const knownPoints = safeArrayFromStorage(KNOWN_POINTS_KEY);
    add('known-points', 'Known-point evidence', knownPoints.malformed ? 'ACTION' : knownPoints.count ? 'READY' : 'ACTION', knownPoints.malformed ? 'Known-point record store is unreadable; it was not overwritten.' : knownPoints.count ? `${knownPoints.count} saved comparison(s); none is automatically considered a pass.` : 'No physical-reference comparison recorded yet.');

    const online = typeof navigator !== 'undefined' && navigator.onLine;
    add('network', 'Network connectivity', online ? 'READY' : 'ACTION', online ? 'Online; queued evidence can attempt sync.' : 'Offline; capture can continue locally and sync can retry later.');

    const cameraPermission = await permissionState('camera');
    add('camera', 'Camera permission', cameraPermission === 'GRANTED' ? 'READY' : 'ACTION', cameraPermission === 'GRANTED' ? 'Browser reports camera permission granted; camera operation still needs a live capability check.' : `Camera permission: ${cameraPermission}. The wizard will not request permission without your tap.`);

    let native = null;
    try { native = await getNativeSensorCapabilities(); } catch {}
    add('native-sensors', 'Native phone sensor bridge', native?.androidSensorManager ? 'READY' : 'ACTION', native?.androidSensorManager ? `Native bridge detected; ${Number(native.sensorCount) || 0} sensor(s) reported.` : 'Native sensor bridge not confirmed. Web sensor fallback may be available; real measurements must be checked during capture.');

    let localKeys = [];
    try {
      localKeys = Object.keys(localStorage).filter(key => /waveradar|cmvisual/i.test(key));
    } catch {}
    add('inventory', 'Local data inventory', localKeys.length ? 'READY' : 'ACTION', localKeys.length ? `${localKeys.length} WaveRadar/CMVisual local-storage key(s) found; only known evidence stores are interpreted automatically.` : 'No recognizable local WaveRadar data keys found in this browser context.');

    add('world-data', 'World-model source integrity', 'ACTION', 'External maps, public benchmarks, and partner datasets need source, license, timestamp, coverage, and measured-versus-inferred labels before import.');
    const counts = next.reduce((acc, item) => {
      if (item.status === 'READY') acc.ready++;
      else if (item.status === 'BLOCKED') acc.blocked++;
      else acc.action++;
      return acc;
    }, { ready: 0, action: 0, blocked: 0 });
    setChecks(next);
    setSummary(counts);
    setLastRun(new Date().toISOString());
    if (!initialAuditDone.current && counts.action > 0) setOpen(true);
    initialAuditDone.current = true;
    setBusy(false);
  }, []);

  useEffect(() => { void runAudit(); }, [runAudit]);

  const reviewedKeys = useMemo(() => new Set(reviewLog.map(item => item.reviewKey)), [reviewLog]);
  const pendingReviews = useMemo(() => checks.filter(check => check.status !== 'READY' && !reviewedKeys.has(reviewKeyFor(check))), [checks, reviewedKeys]);

  const markReviewed = useCallback((check) => {
    const entry = {
      reviewKey: reviewKeyFor(check),
      checkId: check.id,
      title: check.title,
      statusAtReview: check.status,
      detailAtReview: check.detail,
      reviewedAt: new Date().toISOString(),
      disposition: 'ACKNOWLEDGED_NOT_RESOLVED',
    };
    const next = [...reviewLog.filter(item => item.reviewKey !== entry.reviewKey), entry].slice(-200);
    try { localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(next)); } catch {}
    setReviewLog(next);
  }, [reviewLog]);

  const nextStep = useMemo(() => {
    if (checks.some(c => c.id === 'identity' && c.status !== 'READY')) return { label: 'Initialize device', route: '/physical-validation' };
    if (checks.some(c => c.id === 'camera' && c.status !== 'READY')) return { label: 'Check camera and permissions', route: '/physical-validation' };
    if (checks.some(c => c.id === 'native-sensors' && c.status !== 'READY')) return { label: 'Check phone sensors', route: '/physical-validation' };
    if (checks.some(c => c.id === 'known-points' && c.status !== 'READY')) return { label: 'Record a known point', route: '/physical-validation' };
    if (checks.some(c => c.id === 'queue' && c.status !== 'READY')) return { label: 'Review evidence sync', route: '/physical-validation' };
    return { label: 'Run physical validation', route: '/physical-validation' };
  }, [checks]);

  if (location.pathname === '/about' || location.pathname === '/contact' || location.pathname === '/how-it-works' || location.pathname === '/investors') return null;

  const renderCheck = (check) => {
    const [recommendedAction, safeguard] = reviewGuidance(check);
    const isReviewed = reviewedKeys.has(reviewKeyFor(check));
    return (
      <article key={check.id} className="rounded-lg border border-white/10 p-3">
        <div className="flex items-start gap-2">
          <div className="pt-0.5">{check.status === 'READY' ? <CheckCircle2 size={16} className="text-emerald-300" /> : <CircleAlert size={16} className="text-amber-200" />}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">{check.title}<span className={check.status === 'READY' ? 'text-emerald-300' : 'text-amber-200'}>{check.status}</span></div>
            <p className="mt-1 text-[11px] leading-4 text-slate-300">{check.detail}</p>
            {check.status !== 'READY' && (
              <div className="mt-2 space-y-2 rounded-md bg-white/[0.04] p-2.5">
                <div><div className="text-[10px] uppercase tracking-wide text-slate-500">Suggested next step</div><p className="mt-0.5 text-[11px] leading-4 text-slate-200">{recommendedAction}</p></div>
                <div><div className="text-[10px] uppercase tracking-wide text-slate-500">Evidence safeguard</div><p className="mt-0.5 text-[11px] leading-4 text-slate-400">{safeguard}</p></div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => navigate(check.id === 'world-data' ? '/admin' : '/physical-validation')} className="rounded-md bg-emerald-300 px-3 py-2 text-[11px] font-semibold text-slate-950">Open workflow</button>
                  <button onClick={() => markReviewed(check)} disabled={isReviewed} className="rounded-md border border-white/15 px-3 py-2 text-[11px] disabled:opacity-50">{isReviewed ? 'Reviewed · still open' : 'Reviewed · keep issue open'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="fixed bottom-3 right-3 z-[100] w-[min(420px,calc(100vw-24px))] text-slate-100" data-global-automation-wizard>
      {!open ? (
        <button onClick={() => setOpen(true)} className="ml-auto flex items-center gap-2 rounded-full border border-emerald-300/40 bg-slate-950/95 px-4 py-3 text-sm shadow-xl backdrop-blur">
          <WandSparkles size={17} className="text-emerald-300" />
          <span>WaveRadar Review Wizard</span>
          <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[11px] text-amber-200">{pendingReviews.length} to review</span>
        </button>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-emerald-300/25 bg-slate-950/95 shadow-2xl backdrop-blur">
          <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold"><WandSparkles size={17} className="text-emerald-300" /> Human Review Wizard</div>
              <p className="mt-1 text-xs text-slate-400">Pre-filled findings, suggested next steps, and evidence safeguards. Review acknowledgements never resolve issues automatically.</p>
            </div>
            <button aria-label="Close wizard" onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:text-white"><X size={18} /></button>
          </header>
          <div className="grid grid-cols-3 gap-2 p-3">
            <div className="rounded-lg bg-emerald-400/10 p-2"><div className="text-lg font-semibold text-emerald-200">{summary.ready}</div><div className="text-[10px] text-slate-400">READY</div></div>
            <div className="rounded-lg bg-amber-300/10 p-2"><div className="text-lg font-semibold text-amber-200">{summary.action}</div><div className="text-[10px] text-slate-400">NEEDS ACTION</div></div>
            <div className="rounded-lg bg-red-400/10 p-2"><div className="text-lg font-semibold text-red-200">{summary.blocked}</div><div className="text-[10px] text-slate-400">BLOCKED</div></div>
          </div>
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="text-xs font-semibold"><ClipboardCheck size={14} className="mr-1 inline" /> {pendingReviews.length} pending human review(s)</div>
            <button onClick={() => setShowAllChecks(value => !value)} className="text-[11px] text-emerald-200 underline">{showAllChecks ? 'Pending only' : 'All checks'}</button>
          </div>
          <div className="max-h-[42vh] space-y-2 overflow-auto px-3 pb-3">
            {(showAllChecks ? checks : pendingReviews).length
              ? (showAllChecks ? checks : pendingReviews).map(renderCheck)
              : <div className="rounded-lg border border-emerald-300/20 p-4 text-xs text-slate-300"><CheckCircle2 size={16} className="mr-2 inline text-emerald-300" />No unacknowledged review items. Issues remain open until a fresh check verifies they are resolved.</div>}
          </div>
          <footer className="space-y-2 border-t border-white/10 p-3">
            <button onClick={() => navigate(nextStep.route)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-300 px-3 py-3 text-sm font-semibold text-slate-950">
              <Activity size={16} /> {nextStep.label}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button disabled={busy} onClick={() => void runAudit()} className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs disabled:opacity-50"><RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> {busy ? 'Checking…' : 'Recheck all'}</button>
              <button onClick={() => navigate('/admin')} className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs"><ShieldCheck size={14} /> Admin / evidence</button>
            </div>
            {lastRun && <p className="text-center text-[10px] text-slate-500">Last audit: {new Date(lastRun).toLocaleTimeString()} · review log stored locally</p>}
          </footer>
        </section>
      )}
    </div>
  );
}
