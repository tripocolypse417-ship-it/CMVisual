import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ImageOff, Clock, Radio, Share2, User, Camera, MessageSquare } from 'lucide-react';
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

export default function TeamSnapshots({ team, me, color = '#00ff88' }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('team');
  const [notesFor, setNotesFor] = useState(null);
  const [noteCounts, setNoteCounts] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Snapshot.list('-created_date', 100);
      setSnapshots(data);
    } catch {
      /* bubble */
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Live: a teammate sharing a new snapshot appears here instantly.
  useEffect(() => {
    const unsub = base44.entities.Snapshot.subscribe(() => { load(); });
    return unsub;
  }, []);

  // Live note counts per snapshot.
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

  if (!team) return null;

  const mine = snapshots.filter((s) => s.created_by_id === me?.id);
  const teamSnaps = snapshots.filter((s) => s.team_id === team.id && s.created_by_id !== me?.id);
  const list = view === 'mine' ? mine : teamSnaps;

  const handleDelete = async (id) => {
    await base44.entities.Snapshot.delete(id);
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  const canDelete = (snap) =>
    snap.created_by_id === me?.id ||
    (snap.team_admin_emails || []).includes(me?.email) ||
    me?.role === 'admin';

  return (
    <div className="space-y-3">
      {/* My / Team toggle */}
      <div className="flex items-center gap-2">
        {[
          { id: 'mine', label: 'MY CAPTURES', count: mine.length, icon: Camera },
          { id: 'team', label: 'TEAM SHARED', count: teamSnaps.length, icon: Share2 },
        ].map((t) => {
          const active = view === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] tracking-wider transition-all"
              style={{
                border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.12)'}`,
                background: active ? color + '14' : 'transparent',
                color: active ? color : 'rgba(255,255,255,0.6)',
              }}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label} <span className="opacity-70">{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <ImageOff className="w-9 h-9 text-muted-foreground opacity-30" />
          <div className="font-mono text-[10px] text-muted-foreground max-w-xs">
            {view === 'mine'
              ? 'You have not saved any snapshots yet — take one from the radar dashboard.'
              : 'No snapshots shared with this team yet. Select a team in the dashboard share picker and capture a scan.'}
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
          <AnimatePresence>
            {list.map((snap) => {
              let detections = [];
              try { detections = JSON.parse(snap.detections_json || '[]'); } catch {}
              const modeColor = MODE_COLORS[snap.scan_mode] || color;
              const isMine = snap.created_by_id === me?.id;
              return (
                <motion.div
                  key={snap.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${modeColor}20` }}
                >
                  <div className="flex items-center justify-center flex-shrink-0 rounded-lg"
                    style={{ background: `${modeColor}08` }}>
                    <MiniRadar detections={detections} color={modeColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground truncate">{snap.label}</span>
                      <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ color: modeColor, background: `${modeColor}15`, border: `1px solid ${modeColor}30` }}>
                        {snap.scan_mode.toUpperCase()}
                      </span>
                    </div>
                    <div className="font-mono text-[8px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        {isMine ? <Camera className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                        {isMine ? 'YOU' : (snap.created_by || 'teammate')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(snap.created_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5" /> {snap.detection_count ?? detections.length} targets
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotesFor(snap)}
                    className="relative p-1.5 rounded-md border transition-colors flex-shrink-0"
                    style={{ borderColor: `${color}30`, color }}
                    title="Discuss this snapshot"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {!!noteCounts[snap.id] && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center font-mono text-[7px] font-bold"
                        style={{ background: color, color: '#001a0d' }}>
                        {noteCounts[snap.id]}
                      </span>
                    )}
                  </button>
                  {canDelete(snap) && (
                    <button
                      onClick={() => handleDelete(snap.id)}
                      className="p-1.5 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                      title={isMine ? 'Delete your snapshot' : 'Remove this shared snapshot'}
                    >
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
          <SnapshotNotes
            snapshot={notesFor}
            me={me}
            color={color}
            onClose={() => setNotesFor(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}