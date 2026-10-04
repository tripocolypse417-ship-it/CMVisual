import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ImageOff, Clock, Radio, Camera, Users, Search, Layers } from 'lucide-react';

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

function initials(email) {
  if (!email) return '?';
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

export default function MemberFeeds({ teams, me, color = '#00ff88' }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('all');
  const [query, setQuery] = useState('');

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

  // Aggregate every member across all teams + every snapshot author.
  const roster = useMemo(() => {
    const map = new Map();
    const add = (email, teamName) => {
      if (!email) return;
      const em = email.toLowerCase();
      if (!map.has(em)) map.set(em, { email: em, teamNames: new Set(), snapshotCount: 0, lastDate: null });
      const m = map.get(em);
      if (teamName) m.teamNames.add(teamName);
    };
    teams.forEach((t) => {
      (t.member_emails || []).forEach((e) => add(e, t.name));
      (t.admin_emails || []).forEach((e) => add(e, t.name));
    });
    snapshots.forEach((s) => {
      add(s.created_by, null);
      const team = teams.find((t) => t.id === s.team_id);
      if (team) add(s.created_by, team.name);
      const m = map.get((s.created_by || '').toLowerCase());
      if (m) {
        m.snapshotCount += 1;
        if (!m.lastDate || new Date(s.created_date) > new Date(m.lastDate)) m.lastDate = s.created_date;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.snapshotCount - a.snapshotCount || a.email.localeCompare(b.email));
  }, [teams, snapshots]);

  const filteredRoster = roster.filter((m) =>
    !query || m.email.includes(query.toLowerCase())
  );

  const teamNameFor = (snap) => teams.find((t) => t.id === snap.team_id)?.name;

  const feed = selected === 'all'
    ? snapshots
    : snapshots.filter((s) => (s.created_by || '').toLowerCase() === selected);

  const canDelete = (snap) =>
    snap.created_by_id === me?.id ||
    (snap.team_admin_emails || []).includes(me?.email) ||
    me?.role === 'admin';

  const handleDelete = async (id) => {
    await base44.entities.Snapshot.delete(id);
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  const totalSnaps = snapshots.length;
  const activeMembers = roster.filter((m) => m.snapshotCount > 0).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* left: member roster */}
      <div className="lg:col-span-1 space-y-3">
        <div className="glass-panel rounded-2xl p-4 relative corner-decoration">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xs tracking-wider" style={{ color }}>MEMBER FEEDS</h2>
            <span className="font-mono text-[9px] text-muted-foreground">{roster.length} members</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg p-2 text-center" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
              <div className="font-mono text-lg font-bold" style={{ color }}>{totalSnaps}</div>
              <div className="font-mono text-[8px] text-muted-foreground tracking-wider">SNAPSHOTS</div>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
              <div className="font-mono text-lg font-bold" style={{ color }}>{activeMembers}</div>
              <div className="font-mono text-[8px] text-muted-foreground tracking-wider">ACTIVE</div>
            </div>
          </div>

          {/* search */}
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-black/40 border border-border mb-3">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="filter members…"
              className="flex-1 bg-transparent font-mono text-[10px] text-foreground focus:outline-none" />
          </div>

          {/* all feed */}
          <button onClick={() => setSelected('all')}
            className="w-full text-left p-2.5 rounded-xl transition-all mb-2"
            style={{
              border: `1px solid ${selected === 'all' ? color + '60' : 'rgba(255,255,255,0.1)'}`,
              background: selected === 'all' ? `${color}12` : 'rgba(0,0,0,0.3)',
            }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                <Layers className="w-4 h-4" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs font-bold text-foreground">ALL FEEDS</div>
                <div className="font-mono text-[8px] text-muted-foreground">{totalSnaps} snapshots · {roster.length} members</div>
              </div>
            </div>
          </button>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            <AnimatePresence>
              {filteredRoster.map((m) => {
                const active = selected === m.email;
                return (
                  <motion.button key={m.email} layout
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                    onClick={() => setSelected(m.email)}
                    className="w-full text-left p-2.5 rounded-xl transition-all"
                    style={{
                      border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.1)'}`,
                      background: active ? `${color}12` : 'rgba(0,0,0,0.3)',
                    }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-[10px] font-bold"
                        style={{ background: `${color}12`, border: `1px solid ${color}30`, color }}>
                        {initials(m.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[11px] font-bold text-foreground truncate">{m.email}</div>
                        <div className="font-mono text-[8px] text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{m.teamNames.size} teams</span>
                          <span className="flex items-center gap-1"><Camera className="w-2.5 h-2.5" />{m.snapshotCount} snaps</span>
                        </div>
                      </div>
                      {m.snapshotCount > 0 && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
            {filteredRoster.length === 0 && (
              <div className="font-mono text-[9px] text-muted-foreground text-center py-4">No members match.</div>
            )}
          </div>
        </div>
      </div>

      {/* right: selected feed */}
      <div className="lg:col-span-2">
        <div className="glass-panel rounded-2xl p-4 relative corner-decoration min-h-[480px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {selected === 'all' ? (
                <Layers className="w-4 h-4" style={{ color }} />
              ) : (
                <div className="w-6 h-6 rounded-md flex items-center justify-center font-mono text-[9px] font-bold"
                  style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
                  {initials(selected)}
                </div>
              )}
              <h2 className="font-display text-xs tracking-wider" style={{ color }}>
                {selected === 'all' ? 'ALL MEMBER FEEDS' : selected.toUpperCase()}
              </h2>
            </div>
            <span className="font-mono text-[9px] text-muted-foreground">{feed.length} snapshots</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <ImageOff className="w-10 h-10 text-muted-foreground opacity-30" />
              <div className="font-mono text-[10px] text-muted-foreground max-w-xs">
                {selected === 'all'
                  ? 'No snapshots have been shared yet.'
                  : 'This member has not shared any snapshots.'}
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              <AnimatePresence>
                {feed.map((snap) => {
                  let detections = [];
                  try { detections = JSON.parse(snap.detections_json || '[]'); } catch {}
                  const modeColor = MODE_COLORS[snap.scan_mode] || color;
                  const author = snap.created_by || 'unknown';
                  const tn = teamNameFor(snap);
                  return (
                    <motion.div key={snap.id} layout
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${modeColor}20` }}>
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
                          {tn && (
                            <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0 text-muted-foreground"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {tn}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[8px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{author}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(snap.created_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1"><Radio className="w-2.5 h-2.5" />{snap.detection_count ?? detections.length} targets</span>
                        </div>
                      </div>
                      {canDelete(snap) && (
                        <button onClick={() => handleDelete(snap.id)}
                          className="p-1.5 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                          title="Remove this shared snapshot">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}