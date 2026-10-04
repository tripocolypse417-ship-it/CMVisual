import { useState, useEffect, useRef } from 'react';

// Real network telemetry from the browser Network Information API, sampled on
// a short interval so the dedicated panel can draw a live trend. This is honest
// network-quality data (effectiveType / downlink / RTT) — NOT a wall-penetration
// radar; browsers do not expose WiFi RF or CSI data.
//
// Kept separate from useNetworkInfo so the frequent polling here does not force
// the whole dashboard to re-render every tick.

const POLL_MS = 5000;
const MAX_SAMPLES = 24;
const RTT_CHANGE = 20;     // ms — ignore sub-threshold RTT jitter
const DL_CHANGE = 0.5;     // Mbps — ignore sub-threshold downlink jitter

export default function useNetworkSignal() {
  const [state, setState] = useState({ supported: false, current: null, history: [], changes: [] });
  const lastRef = useRef(null);

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) { setState({ supported: false, current: null, history: [], changes: [] }); return; }

    const sample = () => ({
      t: Date.now(),
      type: conn.effectiveType,          // '4g' | '3g' | '2g' | 'slow-2g'
      connectionType: conn.type,          // 'wifi' | 'cellular' (Chrome, behind flag)
      downlink: conn.downlink,            // Mbps
      rtt: conn.rtt,                      // ms
      saveData: conn.saveData,
    });

    const record = (s, forceChange = false) => {
      setState(prev => {
        const history = [...(prev.history || []), s].slice(-MAX_SAMPLES);
        let changes = prev.changes || [];
        const last = lastRef.current;
        if (last) {
          const rttDiff = Math.abs((s.rtt ?? 0) - (last.rtt ?? 0));
          const dlDiff = Math.abs((s.downlink ?? 0) - (last.downlink ?? 0));
          const significant = forceChange ||
            last.type !== s.type ||
            last.saveData !== s.saveData ||
            dlDiff >= DL_CHANGE ||
            rttDiff >= RTT_CHANGE;
          if (significant) {
            const fields = [];
            if (last.type !== s.type) fields.push(`TYPE ${last.type || '—'} → ${s.type || '—'}`);
            if (dlDiff >= DL_CHANGE) fields.push(`DOWNLINK ${last.downlink ?? '—'} → ${s.downlink ?? '—'} Mbps`);
            if (rttDiff >= RTT_CHANGE) fields.push(`RTT ${last.rtt ?? '—'} → ${s.rtt ?? '—'} ms`);
            if (last.saveData !== s.saveData) fields.push(`SAVER ${s.saveData ? 'ON' : 'OFF'}`);
            changes = [{ t: s.t, fields }, ...changes].slice(0, 8);
          }
        }
        lastRef.current = s;
        return { supported: true, current: s, history, changes };
      });
    };

    record(sample());
    const onChange = () => record(sample(), true);
    conn.addEventListener('change', onChange);
    const poll = setInterval(() => record(sample()), POLL_MS);
    return () => { conn.removeEventListener('change', onChange); clearInterval(poll); };
  }, []);

  return state;
}