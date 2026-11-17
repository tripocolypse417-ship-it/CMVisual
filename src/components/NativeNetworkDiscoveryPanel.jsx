import React from 'react';
import { Activity, Bluetooth, Radio, RefreshCw, ShieldAlert, Wifi } from 'lucide-react';
import useNativeNetworkDiscovery from '../hooks/useNativeNetworkDiscovery';

const Status = ({ label, value }) => (
  <div className="rounded-lg border border-white/10 bg-black/20 p-2">
    <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
    <div className="mt-1 text-xs font-semibold text-slate-200">{value || 'UNKNOWN'}</div>
  </div>
);

export default function NativeNetworkDiscoveryPanel() {
  const state = useNativeNetworkDiscovery();
  const busy = ['REQUESTING_ACCESS', 'READING_PLATFORM_DATA'].includes(state.phase);

  return (
    <section className="rounded-xl border border-cyan-400/20 bg-slate-950/70 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2"><Radio className="h-4 w-4 text-cyan-300" /></div>
          <div>
            <h3 className="text-xs font-semibold tracking-wider text-slate-100">NETWORK SENSOR DISCOVERY</h3>
            <p className="text-[9px] text-slate-500">Android platform-accessible network observations</p>
          </div>
        </div>
        <button type="button" onClick={state.discover} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-[10px] font-semibold text-cyan-200 disabled:opacity-50">
          <RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'READING' : 'DISCOVER'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Status label="Adapter" value={state.native ? 'NATIVE ANDROID' : 'NOT CONNECTED'} />
        <Status label="Permission" value={state.permission} />
        <Status label="Wi-Fi cache" value={state.wifiStatus} />
        <Status label="Cellular" value={state.cellularStatus} />
      </div>

      {state.error && <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-2 text-[10px] text-amber-200">{state.error}</div>}

      {state.phase === 'CAPTURED' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Status label="Observations" value={state.observations.length} />
            <Status label="Wi-Fi" value={state.counts?.wifi ?? 0} />
            <Status label="Cellular" value={state.counts?.cellular ?? 0} />
          </div>
          <div className="max-h-48 space-y-1 overflow-auto">
            {state.observations.map((item, index) => (
              <div key={item.observationId || index} className="flex items-center justify-between gap-2 rounded-md bg-black/25 px-2 py-1.5 text-[9px]">
                <span className="min-w-0 truncate text-slate-300">{item.capabilityId}</span>
                <span className="shrink-0 font-mono text-cyan-200">{item.value ?? 'UNKNOWN'} {item.unit || ''}</span>
                <span className="shrink-0 text-slate-500">{item.state || 'UNKNOWN'}</span>
              </div>
            ))}
            {state.observations.length === 0 && <p className="text-[10px] text-slate-500">No readable observations returned. This is not proof that no devices or sensors are present.</p>}
          </div>
        </>
      )}

      <div className="space-y-1 border-t border-white/10 pt-2">
        <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-amber-200"><ShieldAlert className="h-3 w-3" /> Coverage boundaries</div>
        {state.limitations.map((item, index) => <p key={index} className="text-[9px] leading-relaxed text-slate-500">• {item}</p>)}
      </div>
      {state.capturedAt && <p className="text-right text-[9px] text-slate-600">Captured {new Date(state.capturedAt).toLocaleString()}</p>}
    </section>
  );
}
