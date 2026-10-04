import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ImageOff, Clock, Radio, Users, Search, History, MessageSquare } from 'lucide-react';
import SnapshotNotes from '@/components/snapshots/SnapshotNotes';

const MODE_COLORS = { sonar: '#00ff88', thermal: '#ff6633', motion: '#00ccff' };
const TYPE_COLORS = { human: '#00ff88', animal: '#00ccff', object: '#ffaa00', unknown: '#ff4466' };

function MiniRadar({ detections, color }) {
  const size = 64;
  const cx = size / 2, cy = size / 2, r = size / 2 - 6;
  return (
    <svg width={size} height={size} className="opacity-90">
      {[0.33, 0.66, 1].map((f, i) => (
        <circle key={i} cx={cx} cy={cy} r={r * f} fill="none" stroke={color} strokeOpacity="0.18" strokeWidth="1" />
      ))}
      {detections.map((d, i) => {
        const rad = (d.angle * Math.PI) / 180;
        const dist = (d.distance / 100) * r;
        const x = cx + dist * Math.cos(rad - Math.PI / 2);
        const y = cy + dist * Math.sin(rad - Math.PI / 2);
        const c = TYPE_COLORS[d.type] || '#fff';
        return <circle key={i} cx={x} cy={y} r="2.5" fill={c} opacity="0.9" />;
      })}
    </svg>
  );
}

export default function SnapshotArchive({ teams, me, color = '#00ff88', initialTeamId = null }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState(initialTeamId || 'all');
  const [mode, setMode] = useState('all');
  const [query, setQuery] = useState('');
  const [notesFor, setNotesFor] = useState(null);
  const [noteCounts, setNoteCounts] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Snapshot.list('-created_date', 200);
      setSnapshots(data);
    } catch {
      /* bubble */
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const unsub = base44.entities.Snapshot.subscribe(() => { load(); });
    return unsub;
  }, []);

  // Jump to a team when opened from the Teams view ("VIEW SNAPSHOTS").
  useEffect(() => { setTeamId(initialTeamId || 'all'); }, [initialTeamId]);

  const loadNoteCounts = async () => {
    try {
      const all = await base44.entities.SnapshotNote.list('-created_date', 200);
      const counts = {};
      all.forEach((n) => { counts[n.snapshot_id] = (counts[n.snapshot_id] || 0) + 1; });
      setNoteCounts(counts);
    } catch {
      /* bubble */
    }
  };
  useEffect(() => { loadNoteCounts(); }, []);
  useEffect(() => {
    const unsub = base44.entities.SnapshotNote.subscribe(() => { loadNoteCounts(); });
    return unsub;
  }, []);

  const filtered = useMemo(() => snapshots.filter((s) => {
    if (teamId !== 'all' && s.team_id !== teamId) return false;
    if (mode !== 'all' && s.scan_mode !== mode) return false;
    if (query) {
      const q = query.toLowerCase();
      const hay = `${s.label || ''} ${s.created_by || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [snapshots, teamId, mode, query]);

  const teamNameFor = (snap) => teams.find((t) => t.id === snap.team_id)?.name;

  const canDelete = (snap) =>
    snap.created_by_id === me?.id ||
    (snap.team_admin_emails || []).includes(me?.email) ||
    me?.role === 'admin';

  const handleDelete = async (id) => {
    await base44.entities.Snapshot.delete(id);
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="glass-panel rounded-2xl p-4 relative corner-decoration">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" style={{ color }} />
          <h2 className="font-display text-xs tracking-wider" style={{ color }}>SNAPSHOT ARCHIVE</h2>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground">{filtered.length} of {snapshots.length}</span>
      </div>

      {/* filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-black/40 border border-border font-mono text-[10px] text-foreground focus:outline-none focus:border-primary">
          <option value="all">ALL TEAMS</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)}
          className="px-3 py-2 rounded-lg bg-black/40 border border-border font-mono text-[10px] text-foreground focus:outline-none focus:border-primary">
          <option value="all">ALL MODES</option>
          <option value="sonar">SONAR</option>
          <option value="thermal">THERMAL</option>
          <option value="motion">MOTION</option>
        </select>
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-black/40 border border-border">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search label or author…"
            className="flex-1 bg-transparent font-mono text-[10px] text-foreground focus:outline-none" />
        </div>
      </div>

      {/* list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <ImageOff className="w-10 h-10 text-muted-foreground opacity-30" />
          <div className="font-mono text-[10px] text-muted-foreground max-w-xs">No snapshots match these filters.</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          <AnimatePresence>
            {filtered.map((snap) => {
              let detections = [];
              try { detections = JSON.parse(snap.detections_json || '[]'); } catch {}
              const modeColor = MODE_COLORS[snap.scan_mode] || color;
              const tn = teamNameFor(snap);
              return (
                <motion.div key={snap.id} layout
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${modeColor}20` }}>
                  <div className="flex items-center justify-center flex-shrink-0 rounded-lg" style={{ background: `${modeColor}08` }}>
                    <MiniRadar detections={detections} color={modeColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground truncate">{snap.label}</span>
                      <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ color: modeColor, background: `${modeColor}15`, border: `1px solid ${modeColor}30` }}>
                        {snap.scan_mode.toUpperCase()}
                      </span>
                      {tn && (
                        <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0 text-muted-foreground"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>{tn}</span>
                      )}
                    </div>
                    <div className="font-mono text-[8px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{snap.created_by || 'unknown'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />
                        {new Date(snap.created_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1"><Radio className="w-2.5 h-2.5" />{snap.detection_count ?? detections.length} targets</span>
                    </div>
                  </div>
                  <button onClick={() => setNotesFor(snap)} className="relative p-1.5 rounded-md border flex-shrink-0"
                    style={{ borderColor: `${color}30`, color }} title="Discuss this snapshot">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {!!noteCounts[snap.id] && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center font-mono text-[7px] font-bold"
                        style={{ background: color, color: '#001a0d' }}>{noteCounts[snap.id]}</span>
                    )}
                  </button>
                  {canDelete(snap) && (
                    <button onClick={() => handleDelete(snap.id)}
                      className="p-1.5 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                      title="Remove this snapshot">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {notesFor && (
          <SnapshotNotes snapshot={notesFor} me={me} color={color} onClose={() => setNotesFor(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}