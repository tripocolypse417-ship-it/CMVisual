import { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import { Activity, Radio, Zap, BarChart2 } from 'lucide-react';

const MAX_POINTS = 30;

function generatePoint(prev, detections, t) {
  const numeric = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
  const signalValues = detections.map(d => numeric(d.signal)).filter(v => v != null);
  const noiseValues = detections.map(d => numeric(d.noise)).filter(v => v != null);
  const wallValues = detections.map(d => numeric(d.wallDensity)).filter(v => v != null);
  const intensities = detections.map(d => numeric(d.intensity)).filter(v => v != null);
  return {
    t,
    signal: signalValues.length ? signalValues.reduce((a,b) => a+b, 0) / signalValues.length : null,
    noise: noiseValues.length ? noiseValues.reduce((a,b) => a+b, 0) / noiseValues.length : null,
    humans: detections.filter(d => d.type === 'human').length,
    objects: detections.filter(d => d.type !== 'human').length,
    avgIntensity: intensities.length ? intensities.reduce((a,b) => a+b, 0) / intensities.length : 0,
    wallDensity: wallValues.length ? wallValues.reduce((a,b) => a+b, 0) / wallValues.length : null,
  };
}

const CHART_STYLE = {
  background: 'transparent',
  fontSize: 9,
  fontFamily: 'var(--font-mono)',
};

const CustomTooltip = ({ active, payload, label, color }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-[10px] font-mono shadow-xl">
      <div className="text-muted-foreground mb-1">t+{label}s</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span style={{ color: p.color }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const charts = [
  { id: 'signal', label: 'SIGNAL', icon: Radio },
  { id: 'detections', label: 'OBJECTS', icon: Activity },
  { id: 'intensity', label: 'INTENSITY', icon: Zap },
  { id: 'wall', label: 'WALL', icon: BarChart2 },
];

export default function SensorGraph({ detections, isScanning }) {
  const [data, setData] = useState([]);
  const [activeChart, setActiveChart] = useState('signal');
  const tickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isScanning) return;
      tickRef.current++;
      setData(prev => {
        const next = [...prev, generatePoint(prev[prev.length - 1], detections, tickRef.current)];
        return next.slice(-MAX_POINTS);
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isScanning, detections]);

  const glow = (color) => ({
    filter: `drop-shadow(0 0 4px ${color}80)`,
  });

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Stat pills */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'SIGNAL', value: data[data.length-1]?.signal == null ? 'N/A' : `${data[data.length-1].signal.toFixed(0)}%`, color: '#00ff88' },
          { label: 'NOISE', value: data[data.length-1]?.noise == null ? 'N/A' : `${data[data.length-1].noise.toFixed(0)}%`, color: '#ff4466' },
          { label: 'TARGETS', value: detections.length, color: '#00ccff' },
          { label: 'WALL ρ', value: data[data.length-1]?.wallDensity == null ? 'N/A' : `${data[data.length-1].wallDensity.toFixed(0)}%`, color: '#ffaa00' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-card/50 p-2 text-center">
            <div className="font-mono text-[9px] text-muted-foreground mb-0.5">{s.label}</div>
            <div className="font-display text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart selector */}
      <div className="flex gap-1">
        {charts.map(c => {
          const Icon = c.icon;
          const active = activeChart === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveChart(c.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[9px] font-mono tracking-wider transition-all"
              style={{
                borderColor: active ? '#00ff8840' : '#ffffff10',
                background: active ? '#00ff8812' : 'transparent',
                color: active ? '#00ff88' : '#ffffff40',
              }}
            >
              <Icon className="w-3 h-3" />
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Main chart area */}
      <div className="flex-1 min-h-[180px]">
        {activeChart === 'signal' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} style={CHART_STYLE}>
              <defs>
                <linearGradient id="gSignal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNoise" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4466" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ff4466" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#ffffff08" />
              <XAxis dataKey="t" tick={{ fill: '#ffffff30', fontSize: 8 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#ffffff30', fontSize: 8 }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="signal" name="Signal" stroke="#00ff88" fill="url(#gSignal)" strokeWidth={1.5} dot={false} style={glow('#00ff88')} />
              <Area type="monotone" dataKey="noise" name="Noise" stroke="#ff4466" fill="url(#gNoise)" strokeWidth={1} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'detections' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} style={CHART_STYLE} barSize={6}>
              <CartesianGrid strokeDasharray="2 4" stroke="#ffffff08" />
              <XAxis dataKey="t" tick={{ fill: '#ffffff30', fontSize: 8 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#ffffff30', fontSize: 8 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="humans" name="Humans" fill="#00ff88" opacity={0.8} radius={[2,2,0,0]} />
              <Bar dataKey="objects" name="Objects" fill="#ffaa00" opacity={0.8} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'intensity' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} style={CHART_STYLE}>
              <defs>
                <filter id="gf">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#ffffff08" />
              <XAxis dataKey="t" tick={{ fill: '#ffffff30', fontSize: 8 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#ffffff30', fontSize: 8 }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="avgIntensity" name="Avg Intensity" stroke="#00ccff" strokeWidth={2} dot={false} style={glow('#00ccff')} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'wall' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} style={CHART_STYLE}>
              <defs>
                <linearGradient id="gWall" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffaa00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ffaa00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#ffffff08" />
              <XAxis dataKey="t" tick={{ fill: '#ffffff30', fontSize: 8 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#ffffff30', fontSize: 8 }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="wallDensity" name="Wall Density" stroke="#ffaa00" fill="url(#gWall)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Mini sparkline row */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'PENETRATION DEPTH', value: '8.4m', color: '#00ff88', pct: 84 },
          { label: 'RESOLUTION', value: '0.12m', color: '#00ccff', pct: 92 },
          { label: 'REFLECTION LOSS', value: '3.2dB', color: '#ffaa00', pct: 32 },
          { label: 'SCAN COVERAGE', value: '360°', color: '#ff4466', pct: 100 },
        ].map(m => (
          <div key={m.label} className="flex items-center gap-2 rounded-lg border border-border bg-card/30 px-3 py-2">
            <div className="flex-1">
              <div className="font-mono text-[8px] text-muted-foreground mb-1">{m.label}</div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: m.color, width: `${m.pct}%`, opacity: 0.7 }}
                  animate={{ opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </div>
            <div className="font-mono text-[10px] font-bold" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}