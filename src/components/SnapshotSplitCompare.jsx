import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MODE_COLORS = { sonar: '#00ff88', thermal: '#ff6633', motion: '#00ccff' };
const TYPE_COLORS = { human: '#00ff88', animal: '#00ccff', object: '#ffaa00', unknown: '#ff4466' };

function parseDetections(snap) {
  if (!snap) return [];
  try { return JSON.parse(snap.detections_json || '[]'); } catch { return []; }
}

function Radar({ detections, color, size = 220 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 12;
  return (
    <svg width={size} height={size} className="opacity-95">
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <circle key={i} cx={cx} cy={cy} r={r * f} fill="none" stroke={color} strokeOpacity="0.15" strokeWidth="1" />
      ))}
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={color} strokeOpacity="0.1" strokeWidth="1" />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={color} strokeOpacity="0.1" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={3} fill={color} opacity="0.6" />
      {detections.map((d, i) => {
        const rad = (d.angle * Math.PI) / 180;
        const dist = (d.distance / 100) * r;
        const x = cx + dist * Math.cos(rad - Math.PI / 2);
        const y = cy + dist * Math.sin(rad - Math.PI / 2);
        const c = TYPE_COLORS[d.type] || '#fff';
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={9} fill={c} opacity="0.12" />
            <circle cx={x} cy={y} r={4.5} fill={c} opacity="0.95" />
          </g>
        );
      })}
    </svg>
  );
}

function ScanPicker({ label, snapshots, value, onChange, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-[10px] tracking-wider shrink-0" style={{ color }}>{label}</span>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-black/40 border rounded-lg px-2 py-1.5 font-mono text-[10px] text-foreground focus:outline-none"
        style={{ borderColor: `${color}30` }}
      >
        <option value="" className="bg-background">Select scan…</option>
        {snapshots.map(s => (
          <option key={s.id} value={s.id} className="bg-background">
            {s.label} · {new Date(s.created_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </option>
        ))}
      </select>
    </div>
  );
}

function ScanPanel({ snap, align }) {
  const detections = parseDetections(snap);
  const modeColor = snap ? (MODE_COLORS[snap.scan_mode] || '#00ff88') : '#ffffff30';

  if (!snap) {
    return (
      <div className="flex-1 flex items-center justify-center py-16 text-center">
        <span className="font-mono text-[10px] text-muted-foreground">No scan selected</span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 p-4 space-y-3">
      <div className={align === 'right' ? 'text-right' : 'text-left'}>
        <div className="font-display text-[11px] tracking-wider truncate" style={{ color: modeColor }}>{snap.label}</div>
        <div className="font-mono text-[8px] text-muted-foreground flex items-center gap-1 mt-0.5"
          style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
          <Clock className="w-2.5 h-2.5" />
          {new Date(snap.created_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          <span className="px-1.5 py-0.5 rounded-full ml-1" style={{ color: modeColor, background: `${modeColor}15` }}>
            {snap.scan_mode.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="flex justify-center">
        <Radar detections={detections} color={modeColor} />
      </div>
      <div className="space-y-1">
        {detections.map((d, i) => (
          <div key={i} className="flex items-center justify-between font-mono text-[8px] px-2 py-1 rounded-md bg-white/5">
            <span style={{ color: TYPE_COLORS[d.type] }}>{d.type.toUpperCase()}</span>
            <span className="text-muted-foreground">{d.distance.toFixed(1)}m · {Math.round(d.angle)}°</span>
            <span style={{ color: modeColor }}>{d.intensity}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeltaStat({ label, a, b }) {
  const diff = b - a;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const color = diff > 0 ? '#00ff88' : diff < 0 ? '#ff4466' : '#ffffff50';
  return (
    <div className="text-center py-2 rounded-lg bg-white/5 border border-white/5">
      <div className="flex items-center justify-center gap-1">
        <span className="font-display text-sm font-bold text-foreground">{a}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span className="font-display text-sm font-bold text-foreground">{b}</span>
      </div>
      <div className="flex items-center justify-center gap-1 mt-0.5">
        <Icon className="w-2.5 h-2.5" style={{ color }} />
        <span className="font-mono text-[9px]" style={{ color }}>{diff > 0 ? `+${diff}` : diff}</span>
      </div>
      <div className="font-mono text-[7px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

export default function SnapshotSplitCompare({ snapshots, color }) {
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');

  // Default to the two most recent scans
  useEffect(() => {
    if (snapshots.length >= 2 && !idA && !idB) {
      setIdA(snapshots[1].id);
      setIdB(snapshots[0].id);
    }
  }, [snapshots, idA, idB]);

  const snapA = snapshots.find(s => s.id === idA) || null;
  const snapB = snapshots.find(s => s.id === idB) || null;

  const detA = parseDetections(snapA);
  const detB = parseDetections(snapB);
  const count = (dets, fn) => dets.filter(fn).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${color}25`, background: 'rgba(3,14,9,0.9)' }}
    >
      {/* Pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border-b" style={{ borderColor: `${color}15` }}>
        <ScanPicker label="A" snapshots={snapshots} value={idA} onChange={setIdA} color="#00ccff" />
        <ScanPicker label="B" snapshots={snapshots} value={idB} onChange={setIdB} color="#00ff88" />
      </div>

      {/* Split screen */}
      <div className="flex items-stretch relative">
        <ScanPanel snap={snapA} align="left" />
        <div className="w-px shrink-0 self-stretch" style={{ background: `linear-gradient(to bottom, transparent, ${color}50, transparent)` }} />
        <ScanPanel snap={snapB} align="right" />
      </div>

      {/* Change tracking */}
      {snapA && snapB && (
        <div className="p-3 border-t space-y-2" style={{ borderColor: `${color}15` }}>
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3 h-3" style={{ color }} />
            <span className="font-display text-[10px] tracking-wider" style={{ color }}>CHANGES · A → B</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <DeltaStat label="TARGETS" a={detA.length} b={detB.length} />
            <DeltaStat label="HUMANS" a={count(detA, d => d.type === 'human')} b={count(detB, d => d.type === 'human')} />
            <DeltaStat label="ANIMALS" a={count(detA, d => d.type === 'animal')} b={count(detB, d => d.type === 'animal')} />
            <DeltaStat label="MOVING" a={count(detA, d => d.moving)} b={count(detB, d => d.moving)} />
          </div>
        </div>
      )}
    </motion.div>
  );
}