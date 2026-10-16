import { useCallback, useEffect, useState } from 'react';

const CORE_URL = 'https://waveradar-20.hatchable.site/api/health';

function initialChecks() {
  return [
    { id: 'runtime', label: 'App interface', detail: 'The WaveRadar screen is running.', state: 'checking' },
    { id: 'secure', label: 'Secure device context', detail: 'Checking whether Android APIs can be used safely.', state: 'checking' },
    { id: 'camera', label: 'Camera capability', detail: 'Checking browser support; permission is never requested silently.', state: 'checking' },
    { id: 'motion', label: 'Motion sensors', detail: 'Checking whether motion events are exposed by this runtime.', state: 'checking' },
    { id: 'service', label: 'WaveRadar Core service', detail: 'Checking the live service health endpoint.', state: 'checking' },
  ];
}

export default function StartupSetupWizard() {
  const [open, setOpen] = useState(true);
  const [checks, setChecks] = useState(initialChecks);
  const [running, setRunning] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('');
  const [lastChecked, setLastChecked] = useState('');

  const runChecks = useCallback(async () => {
    setRunning(true);
    setCameraMessage('');
    const secure = Boolean(globalThis.isSecureContext);
    const camera = Boolean(navigator.mediaDevices?.getUserMedia);
    const motion = ('DeviceMotionEvent' in window) || ('Accelerometer' in window);
    setChecks([
      { id: 'runtime', label: 'App interface', detail: 'The WaveRadar screen is running.', state: 'pass' },
      { id: 'secure', label: 'Secure device context', detail: secure ? 'Secure context detected.' : 'This runtime is not marked secure; some device APIs may be blocked.', state: secure ? 'pass' : 'warn' },
      { id: 'camera', label: 'Camera capability', detail: camera ? 'Camera API is available. Permission still requires your tap.' : 'Camera API is not exposed in this runtime.', state: camera ? 'pass' : 'warn' },
      { id: 'motion', label: 'Motion sensors', detail: motion ? 'Motion API is exposed; this does not prove a sensor is producing valid readings.' : 'Motion API is not exposed in this runtime.', state: motion ? 'pass' : 'warn' },
      { id: 'service', label: 'WaveRadar Core service', detail: 'Checking the live service health endpoint…', state: 'checking' },
    ]);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(CORE_URL, { method: 'GET', cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const body = await response.json();
      const healthy = body && (body.status === 'ok' || body.ok === true || body.service || body.version);
      setChecks(current => current.map(item => item.id === 'service'
        ? { ...item, state: healthy ? 'pass' : 'warn', detail: healthy ? 'Core service responded. This does not certify sensor accuracy.' : 'Service responded, but its health payload needs review.' }
        : item));
    } catch (error) {
      setChecks(current => current.map(item => item.id === 'service'
        ? { ...item, state: 'warn', detail: 'Could not confirm the service from this app runtime. The app can still open; retry when online.' }
        : item));
    } finally {
      clearTimeout(timeout);
      setLastChecked(new Date().toLocaleTimeString());
      setRunning(false);
    }
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  const requestCamera = async () => {
    setCameraMessage('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage('Camera access is not available in this runtime. The app will not pretend the camera is connected.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      stream.getTracks().forEach(track => track.stop());
      setCameraMessage('Camera permission and startup succeeded. Camera data was not retained; this is not a detection or accuracy test.');
    } catch (error) {
      setCameraMessage(error?.name === 'NotAllowedError'
        ? 'Camera permission was denied. You can allow it in Android app permissions and retry.'
        : 'Camera could not start in this runtime. Check Android app permissions and whether another app is using it.');
    }
  };

  const statusColor = state => state === 'pass' ? '#34d399' : state === 'warn' ? '#fbbf24' : '#94a3b8';

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); runChecks(); }}
        className="fixed z-[90] bottom-4 left-4 rounded-full border border-emerald-400/50 bg-slate-950/95 px-3 py-2 text-xs font-mono text-emerald-200 shadow-lg">
        SETUP WIZARD
      </button>
      {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="wr-setup-title">
        <section className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-emerald-400/40 bg-slate-950 p-4 sm:p-6 text-white shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] tracking-[0.25em] text-emerald-300">WAVERADAR · AUTOMATIC SETUP</div>
              <h2 id="wr-setup-title" className="mt-2 text-2xl font-semibold">Let WaveRadar check itself</h2>
              <p className="mt-2 text-sm text-slate-300">Automatic checks run first. Only permissions and real-world reference measurements need your action.</p>
            </div>
            <button type="button" aria-label="Close setup wizard" onClick={() => setOpen(false)} className="rounded-lg border border-white/15 px-3 py-1 text-slate-300">✕</button>
          </div>
          <div className="mt-5 space-y-2">
            {checks.map(item => <div key={item.id} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="mt-0.5 text-lg" style={{ color: statusColor(item.state) }}>{item.state === 'pass' ? '✓' : item.state === 'warn' ? '!' : '·'}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">{item.label}</b><span className="text-[10px] font-mono" style={{ color: statusColor(item.state) }}>{item.state.toUpperCase()}</span></div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.detail}</p>
              </div>
            </div>)}
          </div>
          {cameraMessage && <p className="mt-3 rounded-lg border border-white/10 p-3 text-xs text-slate-300" role="status">{cameraMessage}</p>}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" disabled={running} onClick={runChecks} className="rounded-xl border border-emerald-300/40 px-4 py-3 text-sm font-semibold text-emerald-200 disabled:opacity-50">{running ? 'Checking…' : 'Run checks again'}</button>
            <button type="button" onClick={requestCamera} className="rounded-xl border border-sky-300/40 px-4 py-3 text-sm font-semibold text-sky-200">Test camera permission</button>
            <a href="https://waveradar-20.hatchable.site/guided-setup.html" target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm text-slate-200">Open full phone setup</a>
            <a href="https://waveradar-20.hatchable.site/validation/measurement-session.html" target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm text-slate-200">Open measurement test</a>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-amber-200/90">Safety boundary: successful software checks do not prove spatial accuracy, person detection, or rescue-route reliability. WaveRadar will not invent measurements or mark a device physically validated without real reference evidence.</p>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <span className="text-[10px] text-slate-500">{lastChecked ? 'Last checked ' + lastChecked : 'Checks starting…'}</span>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-emerald-300 px-5 py-2.5 text-sm font-bold text-slate-950">Continue to WaveRadar</button>
          </div>
        </section>
      </div>}
    </>
  );
}
