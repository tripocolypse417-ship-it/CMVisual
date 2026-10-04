import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Radar, User, Dog, Box, HelpCircle, Crosshair } from 'lucide-react';

// Scan-built floor plan: instead of uploading an image, this constructs a
// top-down model in real time from your scan data. Every detection (live or
// historical) is a point at a bearing + distance from where you stand; as
// scans accumulate, the convex hull of those points resolves into the sensed
// structure outline. The map is heading-up (the way you face = up) and rotates
// with your compass, so it stays aligned with reality as you turn.

const FOV_HALF = 38;
const TYPE_CONFIG = {
  human:   { color: '#00ff88', label: 'HUMAN',  Icon: User },
  animal:  { color: '#00ccff', label: 'ANIMAL', Icon: Dog },
  object:  { color: '#ffaa00', label: 'OBJECT', Icon: Box },
  unknown: { color: '#ff4466', label: 'UNKNOWN', Icon: HelpCircle },
};

const norm = (a) => ((a % 360) + 360) % 360;
// world frame: north = up. bearing B (clockwise from north) → (sin*B, -cos*B)
const toWorld = (bearing, dist) => ({
  x: Math.sin((bearing * Math.PI) / 180) * dist,
  y: -Math.cos((bearing * Math.PI) / 180) * dist,
});

// Monotone-chain convex hull (in world px). Returns [] if < 3 points.
function convexHull(pts) {
  if (pts.length < 3) return [];
  const points = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (O, A, B) => (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
  const lower = [];
  for (const p of points) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

export default function AutoFloorplanMap({ detections = [], heading, color = '#00ff88', sensorConnected = false, lastFrame = null, bridgeStats = null, selectedDetection = null, onSelectDetection }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [scanPoints, setScanPoints] = useState([]); // accumulated history (world meters)
  const [lastLiveUpdate, setLastLiveUpdate] = useState(0);
  const [sourceCounts, setSourceCounts] = useState({ wifiRtt: 0, uwb: 0, ble: 0, other: 0 });
  const [liveTick, setLiveTick] = useState(0);
  const lastHistoryFrameRef = useRef(null);

  // Track container size.
  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Seed the model from historical scans, then grow it live as new detections
  // are logged. Each event is one scan point (bearing + distance + type).
  // The live prop is authoritative for the current frame; persisted events are
  // only historical context and never replace the live frame.
  useEffect(() => {
    let unsub = () => {};
    base44.entities.DetectionEvent.list('-created_date', 600).then((evs) => {
      const pts = (evs || []).map((e) => {
        const w = toWorld(e.bearing ?? 0, e.distance ?? 0);
        return { x: w.x, y: w.y, type: e.target_type || 'unknown', moving: !!e.moving };
      });
      setScanPoints(pts.slice(-600));
    }).catch(() => {});
    try {
      unsub = base44.entities.DetectionEvent.subscribe((ev) => {
        if (ev.type === 'delete') return;
        const e = ev.data;
        const w = toWorld(e.bearing ?? 0, e.distance ?? 0);
        setScanPoints((prev) => [...prev, { x: w.x, y: w.y, type: e.target_type || 'unknown', moving: !!e.moving }].slice(-600));
      });
    } catch {}
    return () => { try { unsub(); } catch {} };
  }, []);

  const h = heading ?? 0;
  const sameTrack = (a, b) => {
    if (!a || !b) return false;
    const idsA = [a.trackId, a.id].filter((v) => v != null).map(String);
    const idsB = [b.trackId, b.id].filter((v) => v != null).map(String);
    return idsA.some((id) => idsB.includes(id));
  };
  const radiusPx = Math.min(size.w, size.h) / 2 - 26;
  // Scale all geometry from the same fitted map radius so range rings and
  // measurements remain metrically consistent while the map auto-fits.
  const pxPerM = radiusPx > 0 ? radiusPx / 12 : 1;

  // Live detections → world points (bright current markers).
  // Current-frame targets only. A short TTL prevents a frozen React render from
  // making old positions look live when the sensor stream has stopped.
  const livePts = useMemo(() => {
    const now = performance.now();
    const frameReceived = Number(lastFrame?.receivedAt ?? 0);
    if (!frameReceived || now - frameReceived > 1500) return [];
    return detections
      .filter((d) => Number.isFinite(Number(d.angle)) && Number.isFinite(Number(d.distance)) && Number(d.distance) >= 0)
      .map((d) => {
        const w = toWorld(Number(d.angle), Number(d.distance));
        return { ...d, wx: w.x, wy: w.y };
      });
  }, [detections, lastFrame?.receivedAt, liveTick]);

  // Refresh the live-age display at a modest rate. The sensor frame itself remains
  // authoritative; this timer never creates or mutates measurement data.
  useEffect(() => {
    if (!lastFrame?.receivedAt) return;
    const id = window.setInterval(() => setLiveTick((v) => v + 1), 500);
    return () => window.clearInterval(id);
  }, [lastFrame?.receivedAt]);

  // The frame timestamp is authoritative. An empty frame is still a real live
  // measurement and must not be displayed as "waiting".
  // New sensor frames also feed a bounded scan history so the map visibly evolves
  // from real measurements instead of only repainting the current markers.
  useEffect(() => {
    const frameId = lastFrame?.sequence ?? lastFrame?.timestamp ?? lastFrame?.receivedAt;
    if (frameId == null || frameId === lastHistoryFrameRef.current) return;
    lastHistoryFrameRef.current = frameId;
    const fresh = (detections || [])
      .filter((d) => Number.isFinite(Number(d.angle)) && Number.isFinite(Number(d.distance)) && Number(d.distance) >= 0)
      .map((d) => {
        const w = toWorld(Number(d.angle), Number(d.distance));
        return { x: w.x, y: w.y, type: d.type || 'unknown', moving: !!d.moving, source: d.source, measuredAt: d.measuredAt };
      });
    if (fresh.length) setScanPoints((prev) => [...prev, ...fresh].slice(-600));
  }, [lastFrame?.sequence, lastFrame?.timestamp, lastFrame?.receivedAt, detections]);

  useEffect(() => {
    if (lastFrame?.receivedAt) {
      setLastLiveUpdate(lastFrame.receivedAt);
      const frames = Array.isArray(lastFrame?.measurements) ? lastFrame.measurements : [];
      const counts = frames.reduce((acc, m) => {
        const source = String(m?.source || m?.technology || 'other').toLowerCase();
        if (source.includes('uwb')) acc.uwb += 1;
        else if (source.includes('rtt') || source.includes('wifi')) acc.wifiRtt += 1;
        else if (source.includes('ble')) acc.ble += 1;
        else acc.other += 1;
        return acc;
      }, { wifiRtt: 0, uwb: 0, ble: 0, other: 0 });
      setSourceCounts(counts);
    }
  }, [lastFrame?.receivedAt, lastFrame?.measurements]);

  // Auto-fit view radius to the farthest point (clamped) so the model stays framed.
  const viewMeters = useMemo(() => {
    let maxD = 6;
    scanPoints.forEach((p) => { const d = Math.hypot(p.x, p.y); if (d > maxD) maxD = d; });
    livePts.forEach((p) => { const d = Math.hypot(p.wx, p.wy); if (d > maxD) maxD = d; });
    return Math.min(14, Math.max(6, maxD + 1.5));
  }, [scanPoints, livePts]);
  const fitPx = radiusPx > 0 ? radiusPx / viewMeters : 1;

  // Hull is only a visualization of accumulated measurement coverage. It is
  // deliberately NOT labeled as a physical wall/floor-plan reconstruction.
  const hull = useMemo(() => {
    const pts = scanPoints.map((p) => ({ x: p.x * fitPx, y: p.y * fitPx }));
    return convexHull(pts);
  }, [scanPoints, fitPx]);
  const hullPath = hull.length >= 3
    ? `M${hull.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')} Z`
    : '';

  const liveHumans = livePts.filter((p) => p.type === 'human').length;
  const liveAnimals = livePts.filter((p) => p.type === 'animal').length;
  const historyHumans = scanPoints.filter((p) => p.type === 'human').length;
  const historyAnimals = scanPoints.filter((p) => p.type === 'animal').length;
  const frameAge = lastFrame?.receivedAt ? Math.max(0, (performance.now() - lastFrame.receivedAt) / 1000) : Infinity;
  const capabilities = lastFrame?.capabilities || {};
  const capabilityLabels = [capabilities.uwb && 'UWB', capabilities.wifiRtt && 'RTT', capabilities.bleCs && 'BLE-CS', capabilities.bleRssi && 'BLE-RSSI'].filter(Boolean);
  const liveRate = Number(bridgeStats?.hz) || 0;
  const dropRate = Number(bridgeStats?.totalFrames) > 0
    ? ((Number(bridgeStats?.totalDropped || 0) / (Number(bridgeStats?.totalFrames) + Number(bridgeStats?.totalDropped || 0))) * 100)
    : 0;

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[340px] rounded-xl overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.45)' }}>
      {size.w === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Radar className="w-8 h-8 animate-spin" style={{ color }} />
        </div>
      ) : (
        <svg viewBox={`${-size.w / 2} ${-size.h / 2} ${size.w} ${size.h}`} className="absolute inset-0 w-full h-full">
          {/* range rings (fixed, rotation-invariant) */}
          {[2, 4, 6, 8, 10].filter((m) => m <= viewMeters).map((m) => (
            <g key={m}>
              <circle cx="0" cy="0" r={m * fitPx} fill="none" stroke={color} strokeOpacity="0.12" strokeWidth="1" />
              <text x="2" y={-m * fitPx + 10} fontSize="7" fontFamily="monospace" fill={color} fillOpacity="0.5">{m}m</text>
            </g>
          ))}

          {/* rotating world (heading-up) */}
          <g transform={`rotate(${-h})`}>
            {/* cardinal compass markers — rotate with the world */}
            {[['N', 0, -radiusPx], ['E', radiusPx, 0], ['S', 0, radiusPx], ['W', -radiusPx, 0]].map(([lbl, x, y]) => (
              <text key={lbl} x={x} y={y + 3} fontSize="8" fontFamily="monospace" fill={color} fillOpacity="0.55" textAnchor="middle">{lbl}</text>
            ))}

            {/* accumulated measurement coverage — not a claimed wall outline */}
            {hullPath && (
              <>
                <path d={hullPath} fill={color} fillOpacity="0.06" stroke={color} strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="4 3" />
                <path d={hullPath} fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="6" />
                <text x={-radiusPx + 8} y={radiusPx - 12} fontSize="6.5" fontFamily="monospace" fill={color} fillOpacity="0.55">MEASUREMENT COVERAGE · NOT WALL GEOMETRY</text>
              </>
            )}

            {/* accumulated scan points — the history/coverage */}
            {scanPoints.map((p, i) => {
              const c = (TYPE_CONFIG[p.type] || TYPE_CONFIG.unknown).color;
              return <circle key={i} cx={p.x * fitPx} cy={p.y * fitPx} r="1.6" fill={c} opacity="0.5" />;
            })}

            {/* live current detections — bright markers */}
            {livePts.map((d) => {
              const cfg = TYPE_CONFIG[d.type] || TYPE_CONFIG.unknown;
              const cx = d.wx * fitPx, cy = d.wy * fitPx;
              return (
                <g key={d.id}>
                  {d.moving && <circle cx={cx} cy={cy} r="7" fill="none" stroke={cfg.color} strokeOpacity="0.5" strokeWidth="1" className="ar-ring" />}
                  {sameTrack(selectedDetection, d) && <circle cx={cx} cy={cy} r="9" fill="none" stroke="#fff" strokeOpacity="0.95" strokeWidth="1.5" />}
                  <circle cx={cx} cy={cy} r="4" fill={cfg.color} stroke="#000" strokeOpacity="0.6" strokeWidth="0.8" onClick={() => onSelectDetection?.(sameTrack(selectedDetection, d) ? null : d)} style={{ cursor: 'pointer' }} />
                  <circle cx={cx} cy={cy} r="2" fill="#fff" opacity="0.8" pointerEvents="none" />
                </g>
              );
            })}
          </g>

          {/* device + FOV cone (fixed, always at center pointing up) */}
          <g>
            <path d={`M0,0 L${Math.sin(-FOV_HALF * Math.PI / 180) * radiusPx},${-Math.cos(-FOV_HALF * Math.PI / 180) * radiusPx} A${radiusPx},${radiusPx} 0 0 1 ${Math.sin(FOV_HALF * Math.PI / 180) * radiusPx},${-Math.cos(FOV_HALF * Math.PI / 180) * radiusPx} Z`}
              fill={color} fillOpacity="0.06" stroke={color} strokeOpacity="0.3" strokeWidth="1" />
            <polygon points="0,-9 6,4 -6,4" fill={color} stroke="#000" strokeOpacity="0.5" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="2.5" fill="#fff" />
          </g>
        </svg>
      )}

      {/* rotating radar sweep */}
      <motion.div className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ background: `conic-gradient(from 0deg, ${color}00 0deg, ${color}33 25deg, ${color}00 55deg)`, transformOrigin: 'center' }}
        animate={sensorConnected && lastFrame?.receivedAt ? { rotate: 360 } : false}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} />

      {/* header */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg"
        style={{ background: 'rgba(0,0,0,0.78)', border: `1px solid ${color}30`, backdropFilter: 'blur(6px)' }}>
        <Radar className="w-3.5 h-3.5" style={{ color }} />
        <div>
          <div className="font-display text-[9px] tracking-widest" style={{ color, textShadow: `0 0 6px ${color}, 0 1px 2px rgba(0,0,0,0.9)` }}>LIVE MEASUREMENT MAP</div>
          <div className="font-mono text-[7px] tracking-wider" style={{ color: `${color}aa` }}>LIVE FRAME · {livePts.length} OBS · {scanPoints.length} MEASUREMENTS{capabilityLabels.length ? ` · ${capabilityLabels.join(' / ')}` : ''}</div>
        </div>
      </div>

      {/* counts */}
      <div className="absolute top-2 right-2 flex items-center gap-2 px-2 py-1 rounded-lg"
        style={{ background: 'rgba(0,0,0,0.78)', border: `1px solid ${color}30`, backdropFilter: 'blur(6px)' }}>
        <span className="font-mono text-[8px]" style={{ color: '#00ff88' }}>● {liveHumans}H</span>
        <span className="font-mono text-[8px]" style={{ color: '#00ccff' }}>● {liveAnimals}A</span>
        <span className="font-mono text-[7px]" style={{ color: '#ffffff66' }}>H{historyHumans}/A{historyAnimals}</span>
      </div>

      {/* live status */}
      <div className="absolute top-11 left-2 px-2 py-0.5 rounded-md"
        style={{ background: 'rgba(0,0,0,0.72)', border: `1px solid ${color}25` }}>
        <span className="font-mono text-[7px]" style={{ color: sensorConnected ? color : '#ffffff66' }}>
          {sensorConnected && lastLiveUpdate && frameAge <= 1.5
            ? `● LIVE · ${frameAge.toFixed(1)}s · ${liveRate.toFixed(1)}Hz · DROP ${dropRate.toFixed(1)}% · UWB ${sourceCounts.uwb} · RTT ${sourceCounts.wifiRtt} · BLE ${sourceCounts.ble}`
            : '○ STALE / WAITING FOR LIVE SENSOR FRAME'}
        </span>
      </div>

      {/* compact scan quality */}
      <div className="absolute top-11 right-2 px-2 py-0.5 rounded-md"
        style={{ background: 'rgba(0,0,0,0.72)', border: `1px solid ${color}25` }}>
        <span className="font-mono text-[7px]" style={{ color: sensorConnected && frameAge <= 1.5 ? color : '#ffffff66' }}>
          {sensorConnected && frameAge <= 1.5
            ? `QUALITY ${dropRate < 2 ? 'GOOD' : dropRate < 8 ? 'FAIR' : 'DEGRADED'}`
            : 'NO LIVE QUALITY'}
        </span>
      </div>

      {/* you + heading */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg"
        style={{ background: 'rgba(0,0,0,0.78)', border: `1px solid ${color}30`, backdropFilter: 'blur(6px)' }}>
        <Crosshair className="w-3 h-3" style={{ color }} />
        <span className="font-mono text-[8px]" style={{ color }}>YOU · {Math.round(h)}°</span>
      </div>

      {/* legend */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-0.5 px-2 py-1 rounded-lg"
        style={{ background: 'rgba(0,0,0,0.78)', border: `1px solid ${color}30`, backdropFilter: 'blur(6px)' }}>
        {Object.entries(TYPE_CONFIG).map(([k, cfg]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }} />
            <span className="font-mono text-[7px]" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}