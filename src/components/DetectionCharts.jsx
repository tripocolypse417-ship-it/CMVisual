import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Users, Waves, Layers, Radio, TrendingUp, Loader2 } from 'lucide-react';

const TYPE_COLORS = { human: '#00ff88', animal: '#00ccff', object: '#ffaa00', unknown: '#ff4466' };
const TYPE_LABELS = { human: 'Human', animal: 'Animal', object: 'Object', unknown: 'Unknown' };

function ChartCard({ title, icon: Icon, color, children }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: `${color}20`, background: 'rgba(3,14,9,0.5)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="font-display text-[10px] tracking-wider text-foreground">{title}</span>
      </div>
      <div style={{ width: '100%', height: 180 }}>{children}</div>
    </div>
  );
}

const tooltipStyle = {
  background: 'rgba(1,8,5,0.95)',
  border: '1px solid rgba(0,255,136,0.3)',
  borderRadius: 8,
  fontSize: 10,
  fontFamily: 'monospace',
  color: '#00ff88',
};

/* ── Stick figure behind a wall, lit by WiFi pulses ── */
function StickFigure({ cx, cy, scale, color, intensity, pulseKey }) {
  const s = scale;
  return (
    <g>
      <circle cx={cx} cy={cy - 22 * s} r={18 * s} fill={color} opacity={0.08 * (intensity / 100)} />
      <circle cx={cx} cy={cy - 22 * s} r={5 * s} fill="none" stroke={color} strokeWidth={1.5} opacity={0.9} />
      <line x1={cx} y1={cy - 17 * s} x2={cx} y2={cy + 2 * s} stroke={color} strokeWidth={1.5} opacity={0.9} />
      <line x1={cx} y1={cy - 10 * s} x2={cx - 8 * s} y2={cy - 2 * s} stroke={color} strokeWidth={1.5} opacity={0.9} />
      <line x1={cx} y1={cy - 10 * s} x2={cx + 8 * s} y2={cy - 2 * s} stroke={color} strokeWidth={1.5} opacity={0.9} />
      <line x1={cx} y1={cy + 2 * s} x2={cx - 6 * s} y2={cy + 14 * s} stroke={color} strokeWidth={1.5} opacity={0.9} />
      <line x1={cx} y1={cy + 2 * s} x2={cx + 6 * s} y2={cy + 14 * s} stroke={color} strokeWidth={1.5} opacity={0.9} />
      <motion.circle cx={cx} cy={cy - 22 * s} r={5 * s} fill="none" stroke={color} strokeWidth={1}
        initial={{ r: 5 * s, opacity: 0.7 }}
        animate={{ r: 5 * s + 16, opacity: 0 }}
        transition={{ duration: 2, repeat: Infinity, delay: pulseKey * 0.4 }} />
    </g>
  );
}

function WallVisionPanel({ detections, color, isScanning }) {
  const humans = detections.filter(d => d.type === 'human');
  const W = 620, H = 270;
  const deviceX = W / 2, deviceY = H - 24;
  const wallY = H - 120;
  const maxDist = 100;
  const span = 230;
  const toX = d => deviceX + Math.sin((d.angle * Math.PI) / 180) * (d.distance / maxDist) * span;
  const toY = d => wallY - ((d.distance / maxDist) * 90) - 6;

  const wallLayers = [
    { y: wallY, h: 10, c: color, op: 0.28, label: 'DRYWALL' },
    { y: wallY + 10, h: 6, c: '#ffaa00', op: 0.2, label: 'INSULATION' },
    { y: wallY + 16, h: 8, c: '#00ccff', op: 0.16, label: 'STUD' },
  ];

  return (
    <div className="rounded-xl border p-3 relative overflow-hidden"
      style={{ borderColor: `${color}25`, background: 'rgba(3,14,9,0.5)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Waves className="w-3.5 h-3.5" style={{ color }} />
          <span className="font-display text-[10px] tracking-wider text-foreground">WALL VISION · WIFI PULSE</span>
        </div>
        <span className="font-mono text-[8px]" style={{ color: `${color}99` }}>
          {humans.length} HUMAN{humans.length === 1 ? '' : 'S'} DETECTED
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 270 }}>
        {[-2, -1, 0, 1, 2].map(i => (
          <line key={`g${i}`} x1={deviceX + i * 60} y1={wallY - 100} x2={deviceX + i * 60} y2={wallY}
            stroke={color} strokeOpacity={0.05} strokeWidth={1} />
        ))}
        {[0, 0.33, 0.66, 1].map((f, i) => (
          <line key={`h${i}`} x1={deviceX - span} y1={wallY - f * 90} x2={deviceX + span} y2={wallY - f * 90}
            stroke={color} strokeOpacity={0.05} strokeWidth={1} />
        ))}

        {wallLayers.map((l, i) => (
          <g key={i}>
            <rect x={deviceX - span - 20} y={l.y} width={span * 2 + 40} height={l.h} fill={l.c} opacity={l.op} />
            <line x1={deviceX - span - 20} y1={l.y + l.h} x2={deviceX + span + 20} y2={l.y + l.h}
              stroke={l.c} strokeOpacity={0.4} strokeWidth={0.5} />
            <text x={deviceX - span - 14} y={l.y + l.h / 2 + 3} fontSize={7} fontFamily="monospace" fill={l.c} opacity={0.7}>
              {l.label}
            </text>
          </g>
        ))}

        {[0, 1, 2, 3].map(i => (
          <motion.path
            key={i}
            d={`M ${deviceX - 4} ${deviceY - 8} A ${20 + i * 26} ${20 + i * 26} 0 0 1 ${deviceX + 4} ${deviceY - 8}`}
            fill="none" stroke={color} strokeWidth={1.5}
            initial={{ opacity: 0 }}
            animate={isScanning ? { opacity: [0, 0.7, 0] } : { opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}

        <rect x={deviceX - 12} y={deviceY - 14} width={24} height={16} rx={3} fill={color} opacity={0.2} stroke={color} strokeWidth={1} />
        <circle cx={deviceX} cy={deviceY - 6} r={3} fill={color} />
        <text x={deviceX} y={deviceY + 6} fontSize={7} fontFamily="monospace" fill={color} opacity={0.7} textAnchor="middle">DEVICE</text>

        {humans.length === 0 ? (
          <text x={W / 2} y={wallY - 40} fontSize={9} fontFamily="monospace" fill={`${color}66`} textAnchor="middle">
            NO HUMANS IN RANGE — SCANNING…
          </text>
        ) : (
          humans.map((h, i) => (
            <g key={i}>
              <line x1={deviceX} y1={deviceY - 6} x2={toX(h)} y2={toY(h)} stroke={color} strokeOpacity={0.12} strokeWidth={1} strokeDasharray="3 3" />
              <StickFigure cx={toX(h)} cy={toY(h)} scale={1} color={color} intensity={h.intensity ?? 60} pulseKey={i} />
              <text x={toX(h)} y={toY(h) + 24} fontSize={7} fontFamily="monospace" fill={color} opacity={0.7} textAnchor="middle">
                {h.distance?.toFixed(1)}m · {h.intensity ?? 0}%
              </text>
            </g>
          ))
        )}
      </svg>
    </div>
  );
}

export default function DetectionCharts({ detections, scanMode, isScanning, color }) {
  const [events, setEvents] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [evs, snaps] = await Promise.all([
          base44.entities.DetectionEvent.list('-created_date', 200),
          base44.entities.Snapshot.list('-created_date', 50),
        ]);
        setEvents(evs || []);
        setSnapshots(snaps || []);
      } catch { /* empty state */ }
      setLoading(false);
    })();
  }, []);

  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, '0')}`, human: 0, animal: 0, object: 0, unknown: 0 }));
    events.forEach(e => {
      const h = new Date(e.created_date).getHours();
      const t = e.target_type && TYPE_LABELS[e.target_type] ? e.target_type : 'unknown';
      if (buckets[h]) buckets[h][t] += 1;
    });
    return buckets;
  }, [events]);

  const movementData = useMemo(() => {
    return ['human', 'animal', 'object', 'unknown'].map(t => {
      const of = events.filter(e => e.target_type === t);
      return { type: TYPE_LABELS[t], moving: of.filter(e => e.moving).length, still: of.filter(e => !e.moving).length };
    });
  }, [events]);

  const intensityData = useMemo(() => {
    return [...events].reverse().slice(0, 30).map((e, i) => ({ idx: i + 1, intensity: e.intensity ?? 0, distance: e.distance ?? 0 }));
  }, [events]);

  const wallData = useMemo(() => {
    const acc = {};
    snapshots.forEach(s => {
      let dets = [];
      try { dets = JSON.parse(s.detections_json || '[]'); } catch {}
      dets.forEach(d => {
        (d.wallLayers || []).forEach(l => {
          if (!l.material) return;
          if (!acc[l.material]) acc[l.material] = { sum: 0, n: 0 };
          acc[l.material].sum += l.density ?? 0;
          acc[l.material].n += 1;
        });
      });
    });
    const built = Object.entries(acc).map(([material, v]) => ({ material, density: Math.round(v.sum / v.n) }));
    return built;
  }, [snapshots]);

  const hasEvents = events.length > 0;

  return (
    <div className="space-y-3 h-full overflow-y-auto pr-1">
      <WallVisionPanel detections={detections} color={color} isScanning={isScanning} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color }} />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          <ChartCard title="ACTIVITY OVER 24H" icon={TrendingUp} color={color}>
            <ResponsiveContainer>
              <AreaChart data={hourly} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  {Object.entries(TYPE_COLORS).map(([k, c]) => (
                    <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={c} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={`${color}15`} />
                <XAxis dataKey="hour" tick={{ fill: `${color}80`, fontSize: 9, fontFamily: 'monospace' }} interval={2} />
                <YAxis tick={{ fill: `${color}80`, fontSize: 9, fontFamily: 'monospace' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                {Object.entries(TYPE_COLORS).map(([k, c]) => (
                  <Area key={k} type="monotone" dataKey={k} stackId="1" stroke={c} fill={`url(#grad-${k})`} strokeWidth={1.5} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="MOVEMENT BEHAVIOR" icon={Users} color={color}>
            <ResponsiveContainer>
              <BarChart data={movementData} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${color}15`} />
                <XAxis dataKey="type" tick={{ fill: `${color}80`, fontSize: 9, fontFamily: 'monospace' }} />
                <YAxis tick={{ fill: `${color}80`, fontSize: 9, fontFamily: 'monospace' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                <Bar dataKey="moving" stackId="a" fill={color} radius={[2, 2, 0, 0]} />
                <Bar dataKey="still" stackId="a" fill={`${color}40`} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="SIGNAL INTENSITY TREND" icon={Radio} color={color}>
            <ResponsiveContainer>
              <LineChart data={intensityData} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${color}15`} />
                <XAxis dataKey="idx" tick={{ fill: `${color}80`, fontSize: 9, fontFamily: 'monospace' }} />
                <YAxis tick={{ fill: `${color}80`, fontSize: 9, fontFamily: 'monospace' }} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="intensity" stroke={color} strokeWidth={2} dot={{ fill: color, r: 2 }} />
                <Line type="monotone" dataKey="distance" stroke={`${color}50`} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="MEASURED MATERIAL SIGNALS" icon={Layers} color={color}>
            <ResponsiveContainer>
              <BarChart data={wallData} layout="vertical" margin={{ top: 5, right: 12, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${color}15`} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: `${color}80`, fontSize: 9, fontFamily: 'monospace' }} />
                <YAxis type="category" dataKey="material" tick={{ fill: `${color}80`, fontSize: 9, fontFamily: 'monospace' }} width={70} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="density" fill={color} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {!loading && !hasEvents && (
        <div className="text-center py-6 font-mono text-[10px]" style={{ color: `${color}80` }}>
          No detection history yet — run a scan to populate movement analytics.
        </div>
      )}
    </div>
  );
}