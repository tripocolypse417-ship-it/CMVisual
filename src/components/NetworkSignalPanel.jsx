import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, Activity, Gauge, Save, Radio, ArrowRight } from 'lucide-react';
import useNetworkSignal from '../hooks/useNetworkSignal';

const fmtTime = (t) => new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function Sparkline({ values, color, max }) {
  if (!values || values.length < 2) {
    return <div className="h-8 flex items-center justify-center font-mono text-[7px] text-muted-foreground">COLLECTING…</div>;
  }
  const w = 100, h = 32;
  const hi = max || Math.max(...values, 1);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - (Math.min(v, hi) / hi) * (h - 2) - 1}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
}

function Metric({ icon: Icon, label, value, unit, color }) {
  return (
    <div className="flex flex-col items-center py-1.5 rounded-md" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <Icon className="w-3 h-3 mb-0.5" style={{ color }} />
      <span className="font-mono text-[11px] font-bold" style={{ color }}>{value}</span>
      <span className="font-mono text-[7px] text-muted-foreground">{unit}</span>
      <span className="font-mono text-[7px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

export default function NetworkSignalPanel({ color = '#00ff88' }) {
  const { supported, current, history, changes } = useNetworkSignal();
  const rttVals = history.map(h => h.rtt ?? 0);
  const dlVals = history.map(h => h.downlink ?? 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
            <Radio className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <h3 className="font-display text-xs tracking-wider text-foreground">NETWORK SIGNAL</h3>
        </div>
        {supported && current && (
          <motion.span className="font-mono text-[8px] flex items-center gap-1"
            style={{ color }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
            LIVE
          </motion.span>
        )}
      </div>

      <p className="font-mono text-[8px] text-muted-foreground leading-relaxed">
        Real telemetry from the Network Information API — connection class, throughput &amp; latency. Honest network quality, not a wall-penetration radar.
      </p>

      {!supported && (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(255,68,102,0.08)', border: '1px solid #ff446640' }}>
          <Wifi className="w-3.5 h-3.5 text-red-400" />
          <span className="font-mono text-[9px] text-red-400">UNSUPPORTED ON THIS BROWSER</span>
        </div>
      )}

      {supported && current && (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            <Metric icon={Wifi} label="CLASS" value={(current.type || '—').toUpperCase()} unit="" color={color} />
            <Metric icon={Activity} label="DOWNLINK" value={current.downlink ?? '—'} unit="Mbps" color={color} />
            <Metric icon={Gauge} label="RTT" value={current.rtt ?? '—'} unit="ms" color={color} />
            <Metric icon={Save} label="SAVER" value={current.saveData ? 'ON' : 'OFF'} unit="" color={current.saveData ? '#ffaa00' : color} />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] text-muted-foreground">RTT TREND</span>
              <span className="font-mono text-[8px] font-bold" style={{ color }}>{current.rtt ?? '—'} ms</span>
            </div>
            <Sparkline values={rttVals} color="#ff6633" max={Math.max(...rttVals, 100)} />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] text-muted-foreground">DOWNLINK TREND</span>
              <span className="font-mono text-[8px] font-bold" style={{ color }}>{current.downlink ?? '—'} Mbps</span>
            </div>
            <Sparkline values={dlVals} color={color} max={Math.max(...dlVals, 10)} />
          </div>

          <div className="space-y-1 pt-1 border-t border-white/5">
            <span className="font-mono text-[8px] text-muted-foreground tracking-wider">CHANGE FEED</span>
            <div className="space-y-1 max-h-[88px] overflow-y-auto">
              <AnimatePresence initial={false}>
                {changes.length === 0 && (
                  <div className="font-mono text-[8px] text-muted-foreground py-1">STABLE — NO TRANSITIONS</div>
                )}
                {changes.map((c, i) => (
                  <motion.div key={`${c.t}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="px-1.5 py-1 rounded-md" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="font-mono text-[7px] text-muted-foreground mb-0.5">{fmtTime(c.t)}</div>
                    {c.fields.map((f, j) => (
                      <div key={j} className="flex items-center gap-1 font-mono text-[8px]" style={{ color }}>
                        <ArrowRight className="w-2 h-2 shrink-0" /> {f}
                      </div>
                    ))}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}
    </div>
  );
}