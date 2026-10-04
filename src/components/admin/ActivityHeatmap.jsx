import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Flame, RefreshCw, Activity, Navigation, Gauge } from 'lucide-react';

const SECTORS = 16;            // bearing bins (22.5° each)
const RINGS = 8;               // distance bins
const MAX_DIST = 10;           // meters
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// Annular sector SVG path. bearing 0 = up (north), clockwise.
function sectorPath(cx, cy, r1, r2, a1Deg, a2Deg) {
  const toXY = (r, deg) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
  };
  const [x1, y1] = toXY(r1, a1Deg);
  const [x2, y2] = toXY(r2, a1Deg);
  const [x3, y3] = toXY(r2, a2Deg);
  const [x4, y4] = toXY(r1, a2Deg);
  const large = a2Deg - a1Deg > 180 ? 1 : 0;
  return `M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 ${large} 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 ${large} 0 ${x1} ${y1} Z`;
}

// green → yellow → red density ramp
function densityColor(t) {
  if (t <= 0) return 'rgba(0,255,136,0.04)';
  const stops = [
    { p: 0,    c: [0, 255, 136] },
    { p: 0.5,  c: [255, 204, 0] },
    { p: 1,    c: [255, 51, 34] },
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].p && t <= stops[i + 1].p) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const span = hi.p - lo.p || 1;
  const k = (t - lo.p) / span;
  const r = Math.round(lo.c[0] + (hi.c[0] - lo.c[0]) * k);
  const g = Math.round(lo.c[1] + (hi.c[1] - lo.c[1]) * k);
  const b = Math.round(lo.c[2] + (hi.c[2] - lo.c[2]) * k);
  return `rgba(${r},${g},${b},${0.25 + 0.65 * t})`;
}

export default function ActivityHeatmap({ color = '#00ff88' }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.DetectionEvent.list('-created_date', 400);
      setEvents(data);
    } catch {
      /* bubble */
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const unsub = base44.entities.DetectionEvent.subscribe(() => { load(); });
    return unsub;
  }, []);

  // Build the polar density grid: [ring][sector] = count.
  const grid = useMemo(() => {
    const g = Array.from({ length: RINGS }, () => Array(SECTORS).fill(0));
    events.forEach((e) => {
      const dist = e.distance ?? 0;
      if (dist == null || dist < 0 || dist > MAX_DIST) return;
      const ring = Math.min(RINGS - 1, Math.floor((dist / MAX_DIST) * RINGS));
      const brg = ((e.bearing ?? 0) % 360 + 360) % 360;
      const sec = Math.min(SECTORS - 1, Math.floor(brg / (360 / SECTORS)));
      g[ring][sec] += 1;
    });
    return g;
  }, [events]);

  const maxCount = useMemo(() => Math.max(1, ...grid.flat()), [grid]);
  const total = events.length;

  // High-activity zones: top 3 cells by count.
  const hotZones = useMemo(() => {
    const cells = [];
    grid.forEach((row, r) => row.forEach((c, s) => {
      if (c > 0) cells.push({ r, s, count: c });
    }));
    cells.sort((a, b) => b.count - a.count);
    return cells.slice(0, 3).map((cell) => {
      const a1 = cell.s * (360 / SECTORS);
      const a2 = (cell.s + 1) * (360 / SECTORS);
      const d1 = (cell.r / RINGS) * MAX_DIST;
      const d2 = ((cell.r + 1) / RINGS) * MAX_DIST;
      const midBrg = (a1 + a2) / 2;
      const dir = COMPASS[Math.round(midBrg / 45) % 8];
      return { ...cell, dir, d1, d2, share: Math.round((cell.count / total) * 100) };
    });
  }, [grid, total]);

  // SVG geometry
  const SIZE = 360;
  const CX = SIZE / 2, CY = SIZE / 2;
  const RMAX = SIZE / 2 - 28;
  const ringR = (r) => (r / RINGS) * RMAX;

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4" style={{ color }} />
          <h2 className="font-display text-xs tracking-wider" style={{ color }}>ACTIVITY HEATMAP</h2>
          <span className="font-mono text-[8px] text-muted-foreground">where targets spend the most time</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-muted-foreground">{total} events</span>
          <button onClick={load} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Activity className="w-10 h-10 text-muted-foreground opacity-30" />
          <div className="font-mono text-[10px] text-muted-foreground max-w-xs">No detection events yet. Run scans to populate the activity heatmap.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* heatmap */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-4 relative corner-decoration">
            <div className="flex items-center justify-center">
              <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ maxWidth: 420 }}>
                {/* density cells */}
                {grid.map((row, r) =>
                  row.map((c, s) => {
                    const a1 = s * (360 / SECTORS);
                    const a2 = (s + 1) * (360 / SECTORS);
                    const t = c / maxCount;
                    return (
                      <path
                        key={`${r}-${s}`}
                        d={sectorPath(CX, CY, ringR(r), ringR(r + 1), a1, a2)}
                        fill={densityColor(t)}
                        stroke="rgba(0,255,136,0.08)"
                        strokeWidth="0.5"
                      />
                    );
                  })
                )}
                {/* range rings */}
                {Array.from({ length: RINGS + 1 }).map((_, r) => (
                  <circle key={r} cx={CX} cy={CY} r={ringR(r)} fill="none" stroke="rgba(0,255,136,0.12)" strokeWidth="0.5" />
                ))}
                {/* sector spokes */}
                {Array.from({ length: SECTORS }).map((_, s) => {
                  const a = s * (360 / SECTORS);
                  const rad = (a * Math.PI) / 180;
                  return (
                    <line key={s} x1={CX} y1={CY}
                      x2={CX + RMAX * Math.sin(rad)} y2={CY - RMAX * Math.cos(rad)}
                      stroke="rgba(0,255,136,0.08)" strokeWidth="0.5" />
                  );
                })}
                {/* compass labels */}
                {COMPASS.map((dir, i) => {
                  const a = i * 45;
                  const rad = (a * Math.PI) / 180;
                  return (
                    <text key={dir} x={CX + (RMAX + 14) * Math.sin(rad)} y={CY - (RMAX + 14) * Math.cos(rad) + 3}
                      textAnchor="middle" fontSize="8" fill={color} fontFamily="monospace">{dir}</text>
                  );
                })}
                {/* distance labels */}
                {[2, 4, 6, 8].map((d) => (
                  <text key={d} x={CX + 2} y={CY - ringR((d / MAX_DIST) * RINGS) - 2}
                    fontSize="6" fill="rgba(0,255,136,0.5)" fontFamily="monospace">{d}m</text>
                ))}
                {/* device center */}
                <circle cx={CX} cy={CY} r="3" fill={color} />
                <circle cx={CX} cy={CY} r="6" fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
              </svg>
            </div>
            {/* legend */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="font-mono text-[8px] text-muted-foreground">LOW</span>
              <div className="h-2 w-40 rounded-full"
                style={{ background: 'linear-gradient(90deg, rgba(0,255,136,0.2), #ffcc00, #ff3322)' }} />
              <span className="font-mono text-[8px] text-muted-foreground">HIGH</span>
            </div>
          </div>

          {/* high-activity zones + stats */}
          <div className="space-y-3">
            <div className="glass-panel rounded-2xl p-4 relative corner-decoration">
              <div className="font-mono text-[9px] tracking-wider text-muted-foreground mb-2">HIGH-ACTIVITY ZONES</div>
              {hotZones.length === 0 ? (
                <div className="font-mono text-[10px] text-muted-foreground">No zones yet.</div>
              ) : (
                <div className="space-y-2">
                  {hotZones.map((z, i) => (
                    <motion.div key={i} layout
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}25` }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: densityColor(z.count / maxCount), border: `1px solid ${color}40` }}>
                        <span className="font-mono text-[9px] font-bold" style={{ color: '#001a0d' }}>{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-[11px] tracking-wider" style={{ color }}>
                          {z.dir} · {z.d1.toFixed(1)}–{z.d2.toFixed(1)}m
                        </div>
                        <div className="font-mono text-[8px] text-muted-foreground">
                          {z.count} events · {z.share}% of activity
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}25` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity className="w-3 h-3" style={{ color }} />
                  <span className="font-mono text-[8px] tracking-wider text-muted-foreground">TOTAL</span>
                </div>
                <div className="font-display text-lg font-bold" style={{ color }}>{total}</div>
                <div className="font-mono text-[8px] text-muted-foreground">events tracked</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}25` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Gauge className="w-3 h-3" style={{ color }} />
                  <span className="font-mono text-[8px] tracking-wider text-muted-foreground">PEAK</span>
                </div>
                <div className="font-display text-lg font-bold" style={{ color }}>{maxCount}</div>
                <div className="font-mono text-[8px] text-muted-foreground">densest zone</div>
              </div>
            </div>

            <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}25` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Navigation className="w-3 h-3" style={{ color }} />
                <span className="font-mono text-[8px] tracking-wider text-muted-foreground">DOMINANT DIRECTION</span>
              </div>
              <div className="font-display text-base font-bold" style={{ color }}>
                {hotZones[0]?.dir || '—'}
              </div>
              <div className="font-mono text-[8px] text-muted-foreground">
                {hotZones[0] ? `${hotZones[0].d1.toFixed(1)}–${hotZones[0].d2.toFixed(1)}m range` : 'awaiting data'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}