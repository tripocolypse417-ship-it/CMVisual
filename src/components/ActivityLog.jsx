import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Layers, Move, Trash2 } from 'lucide-react';

const TYPE_COLORS = {
  human: '#00ff88',
  animal: '#00ccff',
  object: '#ffaa00',
  unknown: '#ff4466',
};

const EVENT_ICONS = {
  movement: Move,
  material: Layers,
  new: Activity,
};

function LogEntry({ entry }) {
  const color = TYPE_COLORS[entry.detectionType] || '#00ff88';
  const Icon = EVENT_ICONS[entry.eventType] || Activity;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-transparent hover:border-white/5 transition-colors"
      style={{ background: `${color}06` }}
    >
      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        <Icon className="w-2.5 h-2.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="font-mono text-[9px] font-bold truncate" style={{ color }}>{entry.label}</span>
          <span className="font-mono text-[8px] text-muted-foreground flex-shrink-0">{entry.time}</span>
        </div>
        <div className="font-mono text-[9px] text-muted-foreground leading-relaxed">{entry.detail}</div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-0.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${entry.signal}%`, background: color, opacity: 0.6 }} />
          </div>
          <span className="font-mono text-[8px] flex-shrink-0" style={{ color: `${color}80` }}>{entry.signal}%</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function ActivityLog({ detections, isScanning }) {
  const [logs, setLogs] = useState([]);
  const prevDetections = useRef({});
  const idCounter = useRef(0);
  const listRef = useRef(null);

  const fmt = d => d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const addLog = (entry) => {
    setLogs(prev => [entry, ...prev].slice(0, 80));
  };

  useEffect(() => {
    if (!isScanning) return;

    detections.forEach(d => {
      const prev = prevDetections.current[d.id];
      const now = new Date();

      if (!prev) {
        // New detection
        addLog({
          id: idCounter.current++,
          eventType: 'new',
          detectionType: d.type,
          label: `${d.type.toUpperCase()} ACQUIRED`,
          detail: `Dist ${d.distance.toFixed(1)}m · Angle ${Math.round(d.angle)}°`,
          signal: d.intensity,
          time: fmt(now),
        });
      } else {
        // Movement change
        const distDelta = Math.abs(d.distance - prev.distance);
        const angleDelta = Math.abs(d.angle - prev.angle);
        if (d.moving && (distDelta > 1.5 || angleDelta > 3)) {
          addLog({
            id: idCounter.current++,
            eventType: 'movement',
            detectionType: d.type,
            label: `${d.type.toUpperCase()} MOVED`,
            detail: `Δdist ${distDelta.toFixed(1)}m · Δangle ${angleDelta.toFixed(1)}° · ${Math.round(d.angle)}°`,
            signal: d.intensity,
            time: fmt(now),
          });
        }

        // Signal/material change
        const sigDelta = Math.abs(d.intensity - prev.intensity);
        if (sigDelta > 8) {
          addLog({
            id: idCounter.current++,
            eventType: 'material',
            detectionType: d.type,
            label: `SIGNAL SHIFT`,
            detail: `${d.type.toUpperCase()} · ${prev.intensity.toFixed(0)}% → ${d.intensity.toFixed(0)}%`,
            signal: d.intensity,
            time: fmt(now),
          });
        }
      }

      prevDetections.current[d.id] = { ...d };
    });
  }, [detections, isScanning]);

  return (
    <div className="flex flex-col h-full" style={{ maxHeight: 320 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-xs tracking-wider text-foreground">ACTIVITY LOG</h3>
          {logs.length > 0 && (
            <motion.span
              className="font-mono text-[8px] px-1.5 py-0.5 rounded-full"
              style={{ background: '#00ff8815', color: '#00ff8880', border: '1px solid #00ff8825' }}
              animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }}>
              {logs.length}
            </motion.span>
          )}
        </div>
        {logs.length > 0 && (
          <button onClick={() => setLogs([])}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <Trash2 className="w-3 h-3" />
            <span className="font-mono text-[8px]">CLEAR</span>
          </button>
        )}
      </div>

      {/* Log list */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-1 pr-0.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#00ff8820 transparent' }}>
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <div className="text-center py-6">
              <Activity className="w-5 h-5 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="font-mono text-[10px] text-muted-foreground">Waiting for events…</p>
              <p className="font-mono text-[9px] text-muted-foreground opacity-60 mt-0.5">Start scanning to log activity</p>
            </div>
          ) : (
            logs.map(entry => <LogEntry key={entry.id} entry={entry} />)
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}