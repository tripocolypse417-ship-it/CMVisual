import React, { useEffect, useState } from 'react';
import useNativeEvidencePipeline from '../hooks/useNativeEvidencePipeline';

const statusColor = (phase) => {
  if (phase === 'CAPTURING_LOCAL') return 'text-emerald-300';
  if (phase === 'STORAGE_FULL' || phase === 'ERROR' || phase === 'STORAGE_UNAVAILABLE' || phase === 'BUFFER_OVERFLOW') return 'text-amber-300';
  return 'text-slate-300';
};

export default function NativeEvidenceStatusPanel({ sessionId = null }) {
  const state = useNativeEvidencePipeline(true, sessionId);
  const [bundleInput, setBundleInput] = useState('');
  const [bundleMessage, setBundleMessage] = useState('');
  const needsPairing = [
    'ENROLLMENT_BUNDLE_REQUIRED',
    'TOKEN_INVALID_OR_EXPIRED',
    'DEVICE_TOKEN_MISMATCH',
    'AUTH_REQUIRED',
    'PAIRING_RECONCILIATION_FAILED',
  ].includes(state.remoteIngestion);

  useEffect(() => {
    const onApplied = () => setBundleMessage('Device identity paired. Pending uploads will resume automatically.');
    window.addEventListener('waveradar:enrollment-bundle-applied', onApplied);
    return () => window.removeEventListener('waveradar:enrollment-bundle-applied', onApplied);
  }, []);

  const saveBundle = () => {
    const raw = bundleInput.trim();
    if (!raw) return;
    let token = raw;
    let deviceId = null;
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        token = parsed.enrollmentToken || parsed.token || '';
        deviceId = parsed.deviceId || null;
      } catch {
        setBundleMessage('The pasted bundle is not valid JSON.');
        return;
      }
    }
    if (typeof token !== 'string' || token.length < 16) {
      setBundleMessage('No valid enrollment token was found in the pasted value.');
      return;
    }
    try {
      const bundle = { deviceId: deviceId ? String(deviceId) : null, enrollmentToken: token };
      localStorage.setItem('waveradar.pending-enrollment-bundle', JSON.stringify(bundle));
      setBundleInput('');
      setBundleMessage('Bundle received. Preserving any pre-pairing samples before switching device identity…');
      window.dispatchEvent(new CustomEvent('waveradar:enrollment-token-updated', { detail: bundle }));
    } catch {
      setBundleMessage('Could not stage the enrollment bundle in this app storage.');
    }
  };

  return (
    <section className="rounded-xl border border-emerald-400/20 bg-slate-950/70 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold tracking-wider text-slate-100">NATIVE EVIDENCE PIPELINE</h3>
          <p className="text-[9px] text-slate-500">Android sensor samples · append-only local capture</p>
        </div>
        <span className={`text-[9px] font-mono font-semibold ${statusColor(state.phase)}`}>{state.phase.replaceAll('_', ' ')}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="text-[9px] uppercase text-slate-500">Stored events</div>
          <div className="mt-1 text-xs font-semibold text-slate-100">{state.storedEvents ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="text-[9px] uppercase text-slate-500">Pending upload</div>
          <div className="mt-1 text-xs font-semibold text-slate-100">{state.pendingEvents ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="text-[9px] uppercase text-slate-500">Quarantined</div>
          <div className="mt-1 text-xs font-semibold text-amber-200">{state.quarantinedEvents ?? 0}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="text-[9px] uppercase text-slate-500">Core ingestion</div>
          <div className="mt-1 text-xs font-semibold text-amber-200">{state.remoteIngestion || 'UNKNOWN'}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="text-[9px] uppercase text-slate-500">Buffer drops</div>
          <div className={`mt-1 text-xs font-semibold ${state.droppedSamplesSinceLastAck ? 'text-amber-200' : 'text-slate-100'}`}>{state.droppedSamplesTotal ?? 0}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="text-[9px] uppercase text-slate-500">Samples / batch</div>
          <div className="mt-1 text-xs font-semibold text-slate-100">{state.samplesCapturedThisCycle ?? 0}</div>
        </div>
      </div>
      <p className="text-[9px] leading-relaxed text-slate-500">
        Evidence is stored locally first. Android WebView storage is separate from the browser used for guided setup, so a one-time enrollment-bundle transfer may be required. Source monotonic timestamps remain separate from receive time. Server acknowledgment is not independent validation.
      </p>
      {state.droppedSamplesSinceLastAck > 0 && <p className="text-[8px] text-amber-200">Sensor buffer overflow recorded: {state.droppedSamplesSinceLastAck} sample(s) have been dropped since the last acknowledged batch. The count is retained in the evidence stream.</p>}
      {needsPairing && (
        <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 space-y-2">
          <div className="font-mono text-[8px] font-semibold tracking-wider text-amber-200">PAIR THIS APP WITH WAVELRADAR CORE</div>
          <p className="text-[8px] leading-relaxed text-slate-400">On the Core guided-setup page, copy the native-app enrollment bundle, then paste it here. The bundle contains the matching device ID and scoped upload token.</p>
          <a href="https://waveradar-20.hatchable.site/guided-setup.html" target="_blank" rel="noopener noreferrer" className="inline-flex rounded-md border border-white/15 px-2 py-1 font-mono text-[7px] text-cyan-200">OPEN CORE GUIDED SETUP</a>
          <input
            type="password"
            value={bundleInput}
            onChange={(event) => setBundleInput(event.target.value)}
            placeholder="Paste enrollment bundle or token"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-[9px] text-white placeholder:text-white/25 outline-none focus:border-cyan-300/50"
          />
          <button type="button" onClick={saveBundle} disabled={!bundleInput.trim()} className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 font-mono text-[8px] font-semibold tracking-wider text-cyan-100 disabled:opacity-40">SAVE BUNDLE & RESUME UPLOAD</button>
          {bundleMessage && <p className="text-[8px] text-emerald-200">{bundleMessage}</p>}
        </div>
      )}
      {state.lastError && <p className="text-[9px] leading-relaxed text-amber-200">{state.lastError}</p>}
    </section>
  );
}
