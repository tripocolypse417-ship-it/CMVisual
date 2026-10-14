import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, CheckCircle2, ChevronDown, ChevronUp, CircleAlert, Database, RefreshCw, ShieldCheck, WandSparkles, X } from 'lucide-react';
import { getDeviceIdentityStatus } from '@/lib/deviceIdentity';
import { getNativeSensorCapabilities } from '@/lib/nativeSensors';

const QUEUE_KEY = 'waveradar:physical-validation:queue:v1';
const KNOWN_POINTS_KEY = 'waveradar:known-point-checks:v1';

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

  const runAudit = useCallback(async () => {
    setBusy(true);
    const next = [];
    const add = (id, title, status, detail, action = null) => next.push({ id, title, status, detail, action });
    try {
      const identity = getDeviceIdentityStatus();
      add('identity', 'Installation identity', identity.initialized && (identity.localStorage || identity.sessionStorage || identity.cookie) ? 'READY' : 'ACTION', identity.initialized ? 'Stable installation key available; this is not a hardware identity.' : 'Initialize the installation key before device enrollment.');
    } catch (error) {
      add('identity', 'Installation identity', 'ACTION', 'Identity check failed safely. Re-run the check or open physical validation.');
    }

    const offlineQueue = safeArrayFromStorage(QUEUE_KEY);
    add('queue', 'Offline evidence queue', offlineQueue.malformed ? 'ACTION' : offlineQueue.count ? 'ACTION' : 'READY', offlineQueue.malformed ? 'Queue data is malformed. Existing content was not overwritten.' : offlineQueue.count ? `${offlineQueue.count} queued validation record(s) need sync review.` : 'No queued validation records waiting locally.');

    const knownPoints = safeArrayFromStorage(KNOWN_POINTS_KEY);
    add('known-points', 'Known-point evidence', knownPoints.malformed ? 'ACTION' : knownPoints.count ? 'READY' : 'ACTION', knownPoints.malformed ? 'Known-point record store is unreadable; it was not overwritten.' : knownPoints.count ? `${knownPoints.count} saved comparison(s); none is automatically considered a pass.` : 'No physical-reference comparison recorded yet.');

    const online = typeof navigator !== 'undefined' && navigator.onLine;
    add('network', 'Network connectivity', online ? 'READY' : 'ACTION', online ? 'Online; queued evidence can attempt sync.' : 'Offline; capture can continue locally and sync can retry later.');

    const cameraPermission = await permissionState('camera');
    add('camera', 'Camera permission', cameraPermission === 'GRANTED' ? 'READY' : cameraPermission === 'DENIED' ? 'ACTION' : 'ACTION', cameraPermission === 'GRANTED' ? 'Browser reports camera permission granted; camera operation still needs a live capability check.' : `Camera permission: ${cameraPermission}. The wizard will not request permission without your tap.`);

    let native = null;
    try { native = await getNativeSensorCapabilities(); } catch {}
    add('native-sensors', 'Native phone sensor bridge', native?.androidSensorManager ? 'READY' : 'ACTION', native?.androidSensorManager ? `Native bridge detected; ${Number(native.sensorCount) || 0} sensor(s) reported.` : 'Native sensor bridge not confirmed. Web sensor fallback may be available; real measurements must be checked during capture.');

    let localKeys = [];
    try {
      localKeys = Object.keys(localStorage).filter(key => /waveradar|cmvisual/i.test(key));
    } catch {}
    add('inventory', 'Local data inventory', localKeys.length ? 'READY' : 'ACTION', localKeys.length ? `${localKeys.length} WaveRadar/CMVisual local-storage key(s) found; only known evidence stores are interpreted automatically.` : 'No recognizable local WaveRadar data keys found in this browser context.');

    add('world-data', 'World-model source integrity', 'ACTION', 'The wizard can inventory app evidence now. External maps, public benchmarks, and partner datasets must retain source, license, timestamp, and measured-versus-inferred labels before import.');
    const counts = next.reduce((acc, item) => {
      if (item.status === 'READY') acc.ready++;
      else if (item.status === 'BLOCKED') acc.blocked++;
      else acc.action++;
      return acc;
    }, { ready: 0, action: 0, blocked: 0 });
    setChecks(next);
    setSummary(counts);
    setLastRun(new Date().toISOString());
    setBusy(false);
  }, []);

  useEffect(() => { void runAudit(); }, [runAudit]);

  const nextStep = useMemo(() => {
    if (checks.some(c => c.id === 'identity' && c.status !== 'READY')) return { label: 'Initialize device', route: '/physical-validation' };
    if (checks.some(c => c.id === 'camera' && c.status !== 'READY')) return { label: 'Check camera and permissions', route: '/physical-validation' };
    if (checks.some(c => c.id === 'native-sensors' && c.status !== 'READY')) return { label: 'Check phone sensors', route: '/physical-validation' };
    if (checks.some(c => c.id === 'known-points' && c.status !== 'READY')) return { label: 'Record a known point', route: '/physical-validation' };
    if (checks.some(c => c.id === 'queue' && c.status !== 'READY')) return { label: 'Review evidence sync', route: '/physical-validation' };
    return { label: 'Run physical validation', route: '/physical-validation' };
  }, [checks]);

  if (location.pathname === '/about' || location.pathname === '/contact' || location.pathname === '/how-it-works' || location.pathname === '/investors') return null;

  return (
    <div className="fixed bottom-3 right-3 z-[100] w-[min(390px,calc(100vw-24px))] text-slate-100" data-global-automation-wizard>
      {!open ? (
        <button onClick={() => setOpen(true)} className="ml-auto flex items-center gap-2 rounded-full border border-emerald-300/40 bg-slate-950/95 px-4 py-3 text-sm shadow-xl backdrop-blur">
          <WandSparkles size={17} className="text-emerald-300" />
          <span>WaveRadar Auto-Wizard</span>
          <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[11px] text-amber-200">{summary.action} to review</span>
        </button>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-emerald-300/25 bg-slate-950/95 shadow-2xl backdrop-blur">
          <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold"><WandSparkles size={17} className="text-emerald-300" /> WaveRadar Auto-Wizard</div>
              <p className="mt-1 text-xs text-slate-400">One control surface for setup, evidence, sensor readiness, and next steps.</p>
            </div>
            <button aria-label="Close wizard" onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:text-white"><X size={18} /></button>
          </header>
          <div className="grid grid-cols-3 gap-2 p-3">
            <div className="rounded-lg bg-emerald-400/10 p-2"><div className="text-lg font-semibold text-emerald-200">{summary.ready}</div><div className="text-[10px] text-slate-400">READY</div></div>
            <div className="rounded-lg bg-amber-300/10 p-2"><div className="text-lg font-semibold text-amber-200">{summary.action}</div><div className="text-[10px] text-slate-400">NEEDS ACTION</div></div>
            <div className="rounded-lg bg-red-400/10 p-2"><div className="text-lg font-semibold text-red-200">{summary.blocked}</div><div className="text-[10px] text-slate-400">BLOCKED</div></div>
          </div>
          <div className="max-h-[42vh] space-y-2 overflow-auto px-3 pb-3">
            {checks.map(check => (
              <div key={check.id} className="flex gap-2 rounded-lg border border-white/10 p-2.5">
                <div className="pt-0.5">{check.status === 'READY' ? <CheckCircle2 size={16} className="text-emerald-300" /> : <CircleAlert size={16} className="text-amber-200" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium">{check.title}</div>
                  <div className="mt-0.5 text-[11px] leading-4 text-slate-400">{check.detail}</div>
                </div>
                <span className={`text-[9px] ${check.status === 'READY' ? 'text-emerald-300' : 'text-amber-200'}`}>{check.status}</span>
              </div>
            ))}
          </div>
          <footer className="space-y-2 border-t border-white/10 p-3">
            <button onClick={() => navigate(nextStep.route)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-300 px-3 py-3 text-sm font-semibold text-slate-950">
              <Activity size={16} /> {nextStep.label}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button disabled={busy} onClick={() => void runAudit()} className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs disabled:opacity-50"><RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> {busy ? 'Checking…' : 'Recheck all'}</button>
              <button onClick={() => navigate('/admin')} className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs"><ShieldCheck size={14} /> Admin / evidence</button>
            </div>
            {lastRun && <p className="text-center text-[10px] text-slate-500">Last audit: {new Date(lastRun).toLocaleTimeString()}</p>}
          </footer>
        </section>
      )}
    </div>
  );
}
