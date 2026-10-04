import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ImageOff, GitCompare, X, Clock, Radio, Users, Eye, Columns2, FileText, Share2, MessageSquare } from 'lucide-react';
import SnapshotSplitCompare from './SnapshotSplitCompare';
import SnapshotNotes from './snapshots/SnapshotNotes';
import generateReport from '@/lib/generateReport';

const MODE_COLORS = { sonar: '#00ff88', thermal: '#ff6633', motion: '#00ccff' };
const TYPE_COLORS = { human: '#00ff88', animal: '#00ccff', object: '#ffaa00', unknown: '#ff4466' };

function MiniRadar({ detections, color }) {
  const size = 120;
  const cx = size / 2, cy = size / 2, r = size / 2 - 8;
  return (
    <svg width={size} height={size} className="opacity-90">
      {[0.33, 0.66, 1].map((f, i) => (
        <circle key={i} cx={cx} cy={cy} r={r * f} fill="none" stroke={color} strokeOpacity="0.15" strokeWidth="1" />
      ))}
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={color} strokeOpacity="0.1" strokeWidth="1" />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={color} strokeOpacity="0.1" strokeWidth="1" />
      {detections.map((d, i) => {
        const rad = (d.angle * Math.PI) / 180;
        const dist = (d.distance / 100) * r;
        const x = cx + dist * Math.cos(rad - Math.PI / 2);
        const y = cy + dist * Math.sin(rad - Math.PI / 2);
        const c = TYPE_COLORS[d.type] || '#fff';
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3.5} fill={c} opacity="0.9" />
            <circle cx={x} cy={y} r={6} fill={c} opacity="0.15" />
          </g>
        );
      })}
    </svg>
  );
}

function SnapshotCard({ snap, color, onDelete, isComparing, onToggleCompare, onOpenNotes, noteCount, me }) {
  let detections = [];
  try { detections = JSON.parse(snap.detections_json || '[]'); } catch {}

  const humanCount = detections.filter(d => d.type === 'human').length;
  const movingCount = detections.filter(d => d.moving).length;
  const modeColor = MODE_COLORS[snap.scan_mode] || color;
  const isMine = !me || snap.created_by_id === me?.id;
  const sharedBy = !isMine ? (snap.created_by || 'teammate') : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl border overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        borderColor: isComparing ? `${modeColor}60` : '#ffffff12',
        background: isComparing ? `${modeColor}08` : 'rgba(3,14,9,0.6)',
        boxShadow: isComparing ? `0 0 16px ${modeColor}20` : 'none',
      }}
    >
      {/* Radar preview */}
      <div className="flex items-center justify-center py-3"
        style={{ background: `${modeColor}06`, borderBottom: `1px solid ${modeColor}15` }}>
        <MiniRadar detections={detections} color={modeColor} />
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <div>
            <div className="font-display text-[10px] tracking-wider text-foreground leading-tight truncate max-w-[130px]">
              {snap.label}
            </div>
            <div className="font-mono text-[8px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {new Date(snap.created_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0"
            style={{ color: modeColor, background: `${modeColor}15`, border: `1px solid ${modeColor}30` }}>
            {snap.scan_mode.toUpperCase()}
          </span>
        </div>
        {sharedBy && (
          <div className="flex items-center gap-1 font-mono text-[8px]" style={{ color: '#00ccff' }}>
            <Share2 className="w-2.5 h-2.5" /> SHARED BY {sharedBy}
          </div>
        )}

        <div className="grid grid-cols-3 gap-1">
          {[
            { label: 'TARGETS', val: snap.detection_count ?? detections.length, icon: Radio },
            { label: 'HUMANS', val: humanCount, icon: Users },
            { label: 'MOVING', val: movingCount, icon: Eye },
          ].map(({ label, val, icon: Icon }) => (
            <div key={label} className="text-center py-1.5 rounded-md bg-white/5 border border-white/5">
              <div className="font-display text-xs font-bold" style={{ color: modeColor }}>{val}</div>
              <div className="font-mono text-[7px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {snap.notes && (
          <p className="font-mono text-[8px] text-muted-foreground italic truncate">{snap.notes}</p>
        )}

        <div className="flex gap-1.5 pt-1">
          <button
            onClick={() => onToggleCompare(snap)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border text-[9px] font-mono transition-all"
            style={{
              borderColor: isComparing ? `${modeColor}50` : '#ffffff15',
              color: isComparing ? modeColor : '#ffffff50',
              background: isComparing ? `${modeColor}12` : 'transparent',
            }}
          >
            <GitCompare className="w-3 h-3" />
            {isComparing ? 'SELECTED' : 'COMPARE'}
          </button>
          <button
            onClick={() => onOpenNotes(snap)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border text-[9px] font-mono transition-all"
            style={{ borderColor: '#ffffff15', color: '#ffffff50' }}
            title="Discuss this snapshot"
          >
            <MessageSquare className="w-3 h-3" />
            NOTES{noteCount ? ` ${noteCount}` : ''}
          </button>
          {isMine && (
            <button
              onClick={() => onDelete(snap.id)}
              className="p-1.5 rounded-md border border-white/10 text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ComparePanel({ snapshots, color, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${color}25`, background: 'rgba(3,14,9,0.9)' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: `${color}15` }}>
        <div className="flex items-center gap-2">
          <GitCompare className="w-3.5 h-3.5" style={{ color }} />
          <span className="font-display text-[10px] tracking-wider" style={{ color }}>COMPARISON VIEW</span>
          <span className="font-mono text-[9px] text-muted-foreground">· {snapshots.length} scans</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid gap-4 p-4" style={{ gridTemplateColumns: `repeat(${snapshots.length}, minmax(0, 1fr))` }}>
        {snapshots.map(snap => {
          let detections = [];
          try { detections = JSON.parse(snap.detections_json || '[]'); } catch {}
          const modeColor = MODE_COLORS[snap.scan_mode] || color;
          return (
            <div key={snap.id} className="space-y-3">
              <div className="text-center">
                <div className="font-display text-[11px] tracking-wider" style={{ color: modeColor }}>{snap.label}</div>
                <div className="font-mono text-[8px] text-muted-foreground">
                  {new Date(snap.created_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="flex justify-center">
                <MiniRadar detections={detections} color={modeColor} />
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
        })}
      </div>
    </motion.div>
  );
}

export default function SnapshotGallery({ color }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [compareSet, setCompareSet] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [me, setMe] = useState(null);
  const [notesFor, setNotesFor] = useState(null);
  const [noteCounts, setNoteCounts] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [data, u] = await Promise.all([
        base44.entities.Snapshot.list('-created_date', 50),
        base44.auth.me().catch(() => null),
      ]);
      setSnapshots(data);
      setMe(u);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Real-time: a teammate saving a shared snapshot pushes it here live.
  useEffect(() => {
    const unsub = base44.entities.Snapshot.subscribe(() => { load(); });
    return unsub;
  }, []);

  // Live note counts per snapshot — refreshes when a note is posted anywhere.
  const loadNoteCounts = async () => {
    try {
      const all = await base44.entities.SnapshotNote.list('-created_date', 200);
      const counts = {};
      all.forEach(n => { counts[n.snapshot_id] = (counts[n.snapshot_id] || 0) + 1; });
      setNoteCounts(counts);
    } catch {}
  };
  useEffect(() => { loadNoteCounts(); }, []);
  useEffect(() => {
    const unsub = base44.entities.SnapshotNote.subscribe(() => { loadNoteCounts(); });
    return unsub;
  }, []);

  const generate = () => {
    setGenerating(true);
    try { generateReport(snapshots); } catch {}
    setTimeout(() => setGenerating(false), 600);
  };

  const handleDelete = async (id) => {
    await base44.entities.Snapshot.delete(id);
    setSnapshots(prev => prev.filter(s => s.id !== id));
    setCompareSet(prev => prev.filter(s => s.id !== id));
  };

  const toggleCompare = (snap) => {
    setCompareSet(prev => {
      const exists = prev.find(s => s.id === snap.id);
      if (exists) return prev.filter(s => s.id !== snap.id);
      if (prev.length >= 4) return prev; // max 4 in compare
      return [...prev, snap];
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xs tracking-wider text-foreground flex items-center gap-2">
            SCAN GALLERY
            <span className="flex items-center gap-1 font-mono text-[8px]" style={{ color }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} /> LIVE
            </span>
          </h3>
          <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{snapshots.length} snapshots · shared in real time</p>
        </div>
        <div className="flex items-center gap-2">
          {snapshots.length >= 2 && (
            <button
              onClick={() => setShowSplit(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-mono transition-all"
              style={{
                borderColor: showSplit ? `${color}50` : '#ffffff15',
                color: showSplit ? color : '#ffffff50',
                background: showSplit ? `${color}12` : 'transparent',
              }}
            >
              <Columns2 className="w-3 h-3" />
              SPLIT VIEW
            </button>
          )}
          {compareSet.length >= 2 && (
            <button
              onClick={() => setShowCompare(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-mono transition-all"
              style={{ borderColor: `${color}50`, color, background: `${color}12` }}
            >
              <GitCompare className="w-3 h-3" />
              COMPARE {compareSet.length}
            </button>
          )}
          {snapshots.length > 0 && (
            <button onClick={generate} disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-mono transition-all"
              style={{ borderColor: `${color}50`, color, background: `${color}12`, opacity: generating ? 0.6 : 1 }}>
              <FileText className="w-3 h-3" /> {generating ? 'BUILDING…' : 'PDF REPORT'}
            </button>
          )}
          <button onClick={load} className="px-2 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground font-mono text-[9px] transition-all">
            REFRESH
          </button>
        </div>
      </div>

      {/* Split-screen compare */}
      <AnimatePresence>
        {showSplit && snapshots.length >= 2 && (
          <SnapshotSplitCompare snapshots={snapshots} color={color} />
        )}
      </AnimatePresence>

      {/* Compare panel */}
      <AnimatePresence>
        {showCompare && compareSet.length >= 2 && (
          <ComparePanel snapshots={compareSet} color={color} onClose={() => setShowCompare(false)} />
        )}
      </AnimatePresence>

      {/* Notes discussion modal */}
      <AnimatePresence>
        {notesFor && (
          <SnapshotNotes
            snapshot={notesFor}
            me={me}
            color={color}
            onClose={() => setNotesFor(null)}
          />
        )}
      </AnimatePresence>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
          <ImageOff className="w-10 h-10 text-muted-foreground opacity-40" />
          <div className="font-display text-[11px] tracking-wider text-muted-foreground">NO SNAPSHOTS YET</div>
          <div className="font-mono text-[9px] text-muted-foreground max-w-xs">
            Use the TAKE SNAPSHOT button in any view to save a scan for later comparison.
          </div>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence>
            {snapshots.map(snap => (
              <SnapshotCard
                key={snap.id}
                snap={snap}
                color={color}
                onDelete={handleDelete}
                isComparing={!!compareSet.find(s => s.id === snap.id)}
                onToggleCompare={toggleCompare}
                onOpenNotes={setNotesFor}
                noteCount={noteCounts[snap.id]}
                me={me}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}