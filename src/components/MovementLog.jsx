import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, RefreshCw, Target, Activity, Move, AlertTriangle, ScrollText, Clock, Radio } from 'lucide-react';

const EVENT_META = {
  new_target:     { label: 'NEW TARGET', color: '#00ff88', icon: Target },
  movement_start: { label: 'MOVEMENT',   color: '#00ccff', icon: Activity },
  shift:          { label: 'SHIFT',      color: '#ffaa00', icon: Move },
  alert:          { label: 'ALERT',      color: '#ff4466', icon: AlertTriangle },
};
const TYPE_COLORS = { human: '#00ff88', animal: '#00ccff', object: '#ffaa00', unknown: '#ff4466' };

function EventRow({ e }) {
  const meta = EVENT_META[e.event_type] || EVENT_META.shift;
  const Icon = meta.icon;
  const tColor = TYPE_COLORS[e.target_type] || '#ffffff80';
  const time = new Date(e.created_date);
  const timeStr = time.toLocaleTimeString('en-US', { hour12: false });
  const dateStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="relative flex gap-3 pl-4 pr-3 py-2.5 rounded-xl border bg-black/30"
      style={{ borderColor: `${meta.color}20` }}>
      {/* rail dot */}
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
        style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />

      <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}30` }}>
        <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[9px] font-bold tracking-wider" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="font-mono text-[8px] text-muted-foreground flex items-center gap-1 shrink-0">
            <Clock className="w-2.5 h-2.5" />
            {dateStr} {timeStr}
          </span>
        </div>
        <p className="font-mono text-[9px] text-foreground/90 mt-1 truncate">{e.summary}</p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full"
            style={{ color: tColor, background: `${tColor}12`, border: `1px solid ${tColor}30` }}>
            {(e.target_type || '').toUpperCase()}
          </span>
          {[
            { l: 'DIST', v: `${(e.distance ?? 0).toFixed(1)}m` },
            { l: 'BRG',  v: `${Math.round(e.bearing ?? 0)}°` },
            { l: 'SIG',  v: `${Math.round(e.intensity ?? 0)}%` },
            { l: 'SPD',  v: `${(e.speed ?? 0).toFixed(1)}m/s` },
          ].map(s => (
            <span key={s.l} className="font-mono text-[8px] text-muted-foreground">
              <span className="text-muted-foreground/60">{s.l}</span> {s.v}
            </span>
          ))}
          {e.scan_mode && (
            <span className="font-mono text-[8px] text-muted-foreground flex items-center gap-1">
              <Radio className="w-2.5 h-2.5" /> {e.scan_mode.toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function MovementLog({ color }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.DetectionEvent.list('-created_date', 200);
      setEvents(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.DetectionEvent.subscribe(() => { load(); });
    return unsub;
  }, [load]);

  // Continuous auto-scroll: the log drifts downward on its own and loops back
  // to the top (where the newest events live) so the latest detections stay
  // visible without touching the screen. Pauses briefly on manual interaction.
  const listRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const pausedRef = useRef(false);
  const pauseTimer = useRef(null);

  const pauseAutoScroll = useCallback(() => {
    pausedRef.current = true;
    clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => { pausedRef.current = false; }, 3500);
  }, []);

  const filtered = filter === 'all' ? events : events.filter(e => e.event_type === filter);
  // Keep the main view compact: collapse repeated events by target and show only the latest state.
  const activeEvents = Object.values(filtered.reduce((acc, e) => {
    const key = e.target_id || `${e.target_type || 'unknown'}:${e.summary || e.id}`;
    if (!acc[key] || new Date(e.created_date) > new Date(acc[key].created_date)) acc[key] = e;
    return acc;
  }, {}));
  activeEvents.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const visibleEvents = showHistory ? filtered : activeEvents.slice(0, 12);
  const counts = events.reduce((a, e) => { a[e.event_type] = (a[e.event_type] || 0) + 1; return a; }, {});
  const FILTERS = [
    { id: 'all', label: 'ALL', count: events.length },
    ...Object.entries(EVENT_META).map(([id, m]) => ({ id, label: m.label, count: counts[id] || 0, color: m.color })),
  ];

  useEffect(() => {
    if (!autoScroll || loading || filtered.length === 0) return;
    const el = listRef.current;
    if (!el) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
        el.scrollTop = 0;
      } else {
        el.scrollTop += 0.6;
      }
    }, 50);
    return () => clearInterval(id);
  }, [autoScroll, loading, filtered.length]);

  const clearAll = async () => {
    await base44.entities.DetectionEvent.deleteMany({});
    setEvents([]);
  };

  return (
    <div className="space-y-3 h-full flex flex-col relative z-10">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4" style={{ color }} />
          <h3 className="font-display text-xs tracking-wider text-foreground">LIVE TRACKS</h3>
          <span className="font-mono text-[9px] text-muted-foreground">{activeEvents.length} active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-md border font-mono text-[9px] transition-all"
            style={{ borderColor: showHistory ? `${color}50` : '#ffffff12', color: showHistory ? color : '#ffffff55', background: showHistory ? `${color}12` : 'transparent' }}>
            <ScrollText className="w-3 h-3" /> {showHistory ? 'LIVE' : 'HISTORY'}
          </button>
          <button onClick={() => setAutoScroll(v => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-md border font-mono text-[9px] transition-all"
            style={{
              borderColor: autoScroll ? `${color}50` : '#ffffff12',
              color: autoScroll ? color : '#ffffff55',
              background: autoScroll ? `${color}12` : 'transparent',
            }}
            title="Toggle automatic scrolling">
            {autoScroll ? <Activity className="w-3 h-3" /> : <Activity className="w-3 h-3 opacity-50" />}
            AUTO
          </button>
          <button onClick={load}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground font-mono text-[9px] transition-all">
            <RefreshCw className="w-3 h-3" /> REFRESH
          </button>
          {events.length > 0 && (
            <button onClick={clearAll}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-destructive/30 text-destructive/80 hover:text-destructive font-mono text-[9px] transition-all">
              <Trash2 className="w-3 h-3" /> CLEAR
            </button>
          )}
        </div>
      </div>

      {/* filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map(f => {
          const active = filter === f.id;
          const c = f.color || color;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[8px] tracking-wider transition-all"
              style={{
                borderColor: active ? `${c}50` : '#ffffff12',
                color: active ? c : '#ffffff55',
                background: active ? `${c}12` : 'transparent',
              }}>
              {f.label}
              <span className="opacity-70">{f.count}</span>
            </button>
          );
        })}
      </div>

      {/* list */}
      <div ref={listRef} onWheel={pauseAutoScroll} onTouchStart={pauseAutoScroll}
        className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0"
        style={{ scrollBehavior: 'auto' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <ScrollText className="w-10 h-10 text-muted-foreground opacity-30" />
            <div className="font-display text-[11px] tracking-wider text-muted-foreground">NO EVENTS RECORDED</div>
            <div className="font-mono text-[9px] text-muted-foreground max-w-xs">
              Movement detections are logged automatically while scanning. Start a scan and add or move targets to populate the history.
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {visibleEvents.map(e => <EventRow key={e.id} e={e} />)}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}