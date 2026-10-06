import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Rectangle, Polyline, Circle, Marker, Polygon, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';

const TYPE_COLORS = { human: '#00ff88', animal: '#00ccff', object: '#ffaa00', unknown: '#ff4466' };
const FURN_FILL = { desk: '#0d2518', chair: '#102818', table: '#0d2518', shelf: '#0a1f14', bed: '#0a1f14', default: '#0d2518' };

const HALF = 4.5;
const BOUNDS = [[-HALF, -HALF], [HALF, HALF]]; // [lat,lng] = [-z, x]
const MAX_BOUNDS = [[-6.5, -6.5], [6.5, 6.5]];

const toLL = (wx, wz) => [-wz, wx];
const polar2world = (angleDeg, distPct) => {
  const rad = (angleDeg * Math.PI) / 180;
  const r = (distPct / 100) * 7;
  return { wx: r * Math.cos(rad), wz: r * Math.sin(rad) };
};
const rectBounds = (x1, z1, x2, z2) => [
  [-Math.max(z1, z2), Math.min(x1, x2)],
  [-Math.min(z1, z2), Math.max(x1, x2)],
];

// ── Floor plan ──
// No fixed walls, rooms, furniture, or generic floor-plan geometry are used here.
// The map is an instrument view: geometry is added only when supported by live
// measurements. This prevents an attractive but false "floor plan" from being
// mistaken for a scan result.



// ── Leaflet icon helpers ──
function labelIcon(text, color, size = 9) {
  const w = Math.max(40, text.length * size * 0.75);
  return L.divIcon({
    className: 'floor-label',
    html: `<div style="width:${w}px;text-align:center;font:600 ${size}px 'Share Tech Mono',monospace;color:${color};opacity:0.85;text-shadow:0 1px 2px #000;letter-spacing:0.5px">${text}</div>`,
    iconSize: [w, size + 4],
    iconAnchor: [w / 2, (size + 4) / 2],
  });
}

function roomIcon(text, color) {
  return L.divIcon({
    className: 'room-label',
    html: `<div style="font:700 13px 'Orbitron',sans-serif;color:${color};opacity:0.18;letter-spacing:2px;text-shadow:0 1px 2px #000;white-space:nowrap;transform:translate(-50%,-50%)">${text}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

const GLYPH = { human: '🧍', animal: '🐾', object: '📦', unknown: '❓' };

const sameTrack = (a, b) => {
  if (!a || !b) return false;
  const idsA = [a.trackId, a.id].filter((v) => v != null).map(String);
  const idsB = [b.trackId, b.id].filter((v) => v != null).map(String);
  return idsA.some((id) => idsB.includes(id));
};

function detectionIcon(d, selected) {
  const c = TYPE_COLORS[d.type] || TYPE_COLORS.unknown;
  const sz = selected ? 30 : 24;
  const range = Number.isFinite(Number(d.distance)) ? `${Number(d.distance).toFixed(1)}m` : 'RANGE ?';
  return L.divIcon({
    className: 'detection-marker',
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;width:48px">
      <div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${c}22;border:1.5px solid ${c};box-shadow:0 0 ${selected ? 16 : 9}px ${c};display:flex;align-items:center;justify-content:center;font-size:13px">${GLYPH[d.type] || '❓'}</div>
      <div style="font:7px 'Share Tech Mono',monospace;color:${c};background:rgba(0,0,0,0.78);padding:1px 3px;border-radius:2px;white-space:nowrap;letter-spacing:0.3px;border:1px solid ${c}55">${d.type.toUpperCase()} ${range}${d.moving ? ' ▶' : ''}</div>
    </div>`,
    iconSize: [48, 40],
    iconAnchor: [24, 36],
  });
}

// ── Child components ──
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => { map.fitBounds(bounds, { padding: [24, 24] }); }, [map, bounds]);
  return null;
}

function Wall({ w, color }) {
  return (
    <Rectangle
      bounds={rectBounds(w.x1, w.z1, w.x2, w.z2)}
      pathOptions={{ color, weight: 0.4, opacity: 0.5, fillColor: '#0a1a10', fillOpacity: 0.92 }}
    />
  );
}

function Window({ w }) {
  return (
    <Rectangle
      bounds={rectBounds(w.x1, w.z1, w.x2, w.z2)}
      pathOptions={{ color: '#33ccff', weight: 0.3, opacity: 0.6, fillColor: '#0a3344', fillOpacity: 0.5 }}
    />
  );
}

const FurnitureRect = ({ f, color }) => (
  <>
    <Rectangle
      bounds={rectBounds(f.wx - f.ww / 2, f.wz - f.wd / 2, f.wx + f.ww / 2, f.wz + f.wd / 2)}
      pathOptions={{ color, weight: 0.5, opacity: 0.45, fillColor: FURN_FILL[f.type] || '#0d2518', fillOpacity: 0.6 }}
    />
    <Marker position={toLL(f.wx, f.wz)} icon={labelIcon(f.label, color, 8)} interactive={false} />
  </>
);

const DetectionMarker = ({ d, selected, onSelect }) => {
  if (!Number.isFinite(Number(d.distance)) || !Number.isFinite(Number(d.angle))) return null;
  const { wx, wz } = polar2world(Number(d.angle), Number(d.distance));
  const pos = toLL(wx, wz);
  const c = TYPE_COLORS[d.type] || TYPE_COLORS.unknown;
  return (
    <>
      <Marker
        position={pos}
        icon={detectionIcon(d, selected)}
        zIndexOffset={selected ? 1000 : 500}
        eventHandlers={{ click: () => onSelect(selected ? null : d) }}
      />
      {selected && (
        <Circle center={pos} radius={0.6} pathOptions={{ color: c, weight: 2, opacity: 0.9, fill: false }} />
      )}
    </>
  );
};

// Range rings with distance labels — static reference circles at 2/4/6 m.
const RANGE_RINGS = [
  { r: 2, label: '2m' },
  { r: 4, label: '4m' },
  { r: 6, label: '6m' },
];

function RangeRings({ color }) {
  return (
    <>
      {RANGE_RINGS.map(ring => (
        <Circle key={ring.r} center={[0, 0]} radius={ring.r}
          pathOptions={{ color, weight: 0.4, opacity: 0.18, fill: false, dashArray: '0.4,0.5' }} />
      ))}
      {RANGE_RINGS.map(ring => (
        <Marker key={`lbl-${ring.r}`} position={toLL(0, ring.r)} interactive={false}
          icon={labelIcon(ring.label, color, 7)} />
      ))}
    </>
  );
}

// Classic rotating radar sweep wedge — a filled sector that rotates around the
// sensor, fading at its trailing edge. Isolated tick state keeps the rest of
// the map from re-rendering at 25fps.
function RadarSweep({ color, detections, isScanning, heading }) {
  const safeDetections = Array.isArray(detections) ? detections : [];
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isScanning) return;
    // 6.25 Hz is enough for a compact map sweep while reducing React work
    // during the main 3D renderer's animation loop.
    const id = setInterval(() => setTick(t => (t + 1) % 100000), 160);
    return () => clearInterval(id);
  }, [isScanning]);

  // Sweep angle rotates clockwise; 0° = north (positive z / up on map).
  const sweepAngle = isScanning ? (tick * 1.4) % 360 : (heading ?? 0);
  const SWEEP_W = 38; // wedge width in degrees
  const R = 6.5;

  // Build the wedge polygon: origin → arc points along the leading+trailing edge.
  const wedgePts = useMemo(() => {
    const pts = [[0, 0]]; // origin (lat,lng) = [0,0]
    for (let a = sweepAngle - SWEEP_W; a <= sweepAngle; a += 3) {
      const rad = (a * Math.PI) / 180;
      const wx = R * Math.sin(rad);
      const wz = R * Math.cos(rad);
      pts.push(toLL(wx, wz));
    }
    return pts;
  }, [sweepAngle]);

  // FOV cone — points where the device camera actually faces (real compass).
  const fovPts = useMemo(() => {
    if (heading == null) return null;
    const pts = [[0, 0]];
    const FOV_W = 60;
    for (let a = heading - FOV_W / 2; a <= heading + FOV_W / 2; a += 4) {
      const rad = (a * Math.PI) / 180;
      const wx = R * 0.92 * Math.sin(rad);
      const wz = R * 0.92 * Math.cos(rad);
      pts.push(toLL(wx, wz));
    }
    return pts;
  }, [heading]);

  return (
    <>
      {isScanning && (
        <Polygon positions={wedgePts} pathOptions={{ color, weight: 0, fillColor: color, fillOpacity: 0.08, fillRule: 'evenodd' }} />
      )}
      {isScanning && (
        <Polyline
          positions={[toLL(0, 0), toLL(R * Math.sin((sweepAngle * Math.PI) / 180), R * Math.cos((sweepAngle * Math.PI) / 180))]}
          pathOptions={{ color, weight: 1.2, opacity: 0.7 }}
        />
      )}
      {fovPts && (
        <Polygon positions={fovPts} pathOptions={{ color: '#ffffff', weight: 0.5, opacity: 0.35, fillColor: '#ffffff', fillOpacity: 0.04 }} />
      )}
      {isScanning && safeDetections.map(d => {
        const { wx, wz } = polar2world(d.angle, d.distance);
        const ph = ((tick * 0.008 + (d.id || 0) * 0.22) % 1);
        return (
          <Circle
            key={d.id}
            center={toLL(wx, wz)}
            radius={ph * 4 * (d.intensity / 100)}
            pathOptions={{ color: TYPE_COLORS[d.type] || color, weight: 0.8, opacity: Math.max(0, 0.5 * (1 - ph)), fill: false }}
          />
        );
      })}
    </>
  );
}

export default function EnvironmentMap({ detections, scanMode, onSelectDetection, selectedDetection, isScanning, heading }) {
  const safeDetections = Array.isArray(detections) ? detections : [];
  const mc = { sonar: '#00ff88', thermal: '#ff6633', motion: '#00ccff' }[scanMode] ?? '#00ff88';

  const gridLines = useMemo(() => {
    const lines = [];
    for (let x = -4; x <= 4; x++) lines.push([[4.5, x], [-4.5, x]]);
    for (let z = -4; z <= 4; z++) lines.push([[-z, -4.5], [-z, 4.5]]);
    return lines;
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, #010f07 0%, #000500 100%)' }}>

      <MapContainer
        crs={L.CRS.Simple}
        center={[0, 0]}
        zoom={0}
        minZoom={-4}
        maxZoom={3}
        zoomSnap={0.25}
        maxBounds={MAX_BOUNDS}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom
        touchZoom
        className="w-full h-full"
        style={{ background: 'transparent' }}
      >
        <FitBounds bounds={BOUNDS} />
        <ZoomControl position="bottomright" />

        {/* Floor */}
        <Rectangle bounds={BOUNDS} pathOptions={{ color: mc, weight: 0, fillColor: mc, fillOpacity: 0.03 }} />

        {/* 1m grid */}
        {gridLines.map((line, i) => (
          <Polyline key={i} positions={line} pathOptions={{ color: mc, weight: 0.5, opacity: 0.06 }} />
        ))}

        {/* Measured geometry only. No generic walls, rooms, doors, or furniture. */}
        {safeDetections.map((d) => {
          const { wx, wz } = polar2world(d.angle, d.distance);
          return <Circle key={`coverage-${d.id}`} center={toLL(wx, wz)} radius={Math.max(0.12, Number(d.uncertaintyM) || 0.25)} pathOptions={{ color: TYPE_COLORS[d.type] || mc, weight: 0.7, opacity: 0.28, fillColor: TYPE_COLORS[d.type] || mc, fillOpacity: 0.05 }} />;
        })}

        {/* Range rings (2/4/6 m) */}
        <RangeRings color={mc} />

        {/* Sensor center */}
        <Circle center={[0, 0]} radius={0.28} pathOptions={{ color: mc, weight: 1, fillColor: mc, fillOpacity: 0.9 }} />
        <Circle center={[0, 0]} radius={0.6} pathOptions={{ color: mc, weight: 0.4, opacity: 0.35, fill: false }} />
        <Polyline positions={[[0, -1.4], [0, 1.4]]} pathOptions={{ color: mc, weight: 0.3, opacity: 0.3 }} />
        <Polyline positions={[[-1.4, 0], [1.4, 0]]} pathOptions={{ color: mc, weight: 0.3, opacity: 0.3 }} />
        <Marker position={[0.9, 0]} icon={labelIcon('SENSOR', mc, 7)} interactive={false} />

        {/* Compass */}
        {[
          { dir: 'N', pos: [4.9, 0] },
          { dir: 'S', pos: [-4.9, 0] },
          { dir: 'E', pos: [0, 4.9] },
          { dir: 'W', pos: [0, -4.9] },
        ].map(c => (
          <Marker key={c.dir} position={c.pos} icon={labelIcon(c.dir, mc, 11)} interactive={false} />
        ))}

        {/* Scale bar (2m) */}
        <Polyline positions={[[-4.2, -4.3], [-4.2, -2.3]]} pathOptions={{ color: mc, weight: 0.6, opacity: 0.5 }} />
        <Polyline positions={[[-4.35, -4.3], [-4.05, -4.3]]} pathOptions={{ color: mc, weight: 0.6, opacity: 0.5 }} />
        <Polyline positions={[[-4.35, -2.3], [-4.05, -2.3]]} pathOptions={{ color: mc, weight: 0.6, opacity: 0.5 }} />
        <Marker position={[-4.2, -3.3]} icon={labelIcon('2 m', mc, 8)} interactive={false} />

        {/* Detections */}
        {safeDetections.map(d => (
          <DetectionMarker
            key={d.id}
            d={d}
            selected={sameTrack(selectedDetection, d)}
            onSelect={onSelectDetection}
          />
        ))}

        {/* Radar sweep */}
        <RadarSweep color={mc} detections={safeDetections} isScanning={isScanning} heading={heading} />
      </MapContainer>

      {/* Title overlay */}
      <div className="absolute top-3 right-3 text-right pointer-events-none">
        <div className="font-display text-xs tracking-widest" style={{ color: mc, textShadow: `0 0 8px ${mc}` }}>{scanMode.toUpperCase()} MAP</div>
        <div className="font-mono text-[9px] text-muted-foreground">FLOOR PLAN · 9×9m · LEAFLET</div>
        {heading != null && (
          <div className="font-mono text-[9px] mt-0.5" style={{ color: `${mc}cc` }}>
            HDG {Math.round(heading)}° · {['N','NE','E','SE','S','SW','W','NW'][Math.round(heading / 45) % 8]}
          </div>
        )}
      </div>

      {/* Target count */}
      <div className="absolute top-3 left-3 font-mono text-[9px]" style={{ color: `${mc}90` }}>
        {safeDetections.length} TARGETS · {safeDetections.filter(d => d.moving).length} MOVING
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1 pointer-events-none">
        {Object.entries({ HUMAN: '#00ff88', ANIMAL: '#00ccff', OBJECT: '#ffaa00', UNKNOWN: '#ff4466' }).map(([label, c]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: c, opacity: 0.85 }} />
            <span className="font-mono text-[9px]" style={{ color: c }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Live dot */}
      <div className="absolute bottom-3 right-16 flex items-center gap-1.5 pointer-events-none">
        <motion.span className="w-1.5 h-1.5 rounded-full"
          style={{ background: mc, boxShadow: `0 0 6px ${mc}` }}
          animate={isScanning ? { opacity: [1, 0.2, 1] } : false}
          transition={{ duration: 1.1, repeat: Infinity }} />
        <span className="font-mono text-[8px]" style={{ color: isScanning ? mc : '#ffffff40' }}>{isScanning ? 'LIVE' : 'STANDBY'}</span>
      </div>
    </div>
  );
}