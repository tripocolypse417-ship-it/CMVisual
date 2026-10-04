import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Trash2, X, Loader2, User } from 'lucide-react';

function initials(email) {
  if (!email) return '?';
  const name = email.split('@')[0];
  return name.slice(0, 2).toUpperCase();
}

export default function SnapshotNotes({ snapshot, me, color = '#00ff88', onClose }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!snapshot?.id) return;
    setLoading(true);
    try {
      const data = await base44.entities.SnapshotNote.filter({ snapshot_id: snapshot.id }, '-created_date', 100);
      setNotes(data);
    } catch {
      /* bubble */
    }
    setLoading(false);
  }, [snapshot?.id]);

  useEffect(() => { load(); }, [load]);

  // Real-time: a teammate's note appears the moment it's posted.
  useEffect(() => {
    if (!snapshot?.id) return;
    const unsub = base44.entities.SnapshotNote.subscribe(() => { load(); });
    return unsub;
  }, [snapshot?.id, load]);

  const submit = async () => {
    const body = text.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      await base44.entities.SnapshotNote.create({
        snapshot_id: snapshot.id,
        text: body,
        shared_emails: snapshot.shared_emails || [],
        team_admin_emails: snapshot.team_admin_emails || [],
      });
      setText('');
      load();
    } catch {
      /* bubble */
    }
    setPosting(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.SnapshotNote.delete(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const canDelete = (n) =>
    n.created_by_id === me?.id ||
    (snapshot.team_admin_emails || []).includes(me?.email) ||
    me?.role === 'admin';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl overflow-hidden glass-panel relative corner-decoration"
        style={{ maxHeight: '85vh' }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: `${color}20` }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
              <MessageSquare className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[11px] tracking-wider truncate" style={{ color }}>SNAPSHOT DISCUSSION</div>
              <div className="font-mono text-[8px] text-muted-foreground truncate">{snapshot.label}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* notes list */}
        <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: '52vh' }}>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color }} />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground opacity-30" />
              <div className="font-mono text-[9px] text-muted-foreground max-w-xs">
                No notes yet. Start the discussion — describe a movement event, flag a target, or ask a teammate.
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {notes.map(n => {
                const mine = n.created_by_id === me?.id;
                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-mono text-[8px] font-bold"
                      style={{ background: mine ? `${color}20` : 'rgba(255,255,255,0.06)', color: mine ? color : '#cbd5e1', border: `1px solid ${mine ? color + '40' : 'rgba(255,255,255,0.1)'}` }}>
                      {mine ? 'ME' : initials(n.created_by)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="rounded-xl px-3 py-2"
                        style={{ background: mine ? `${color}10` : 'rgba(255,255,255,0.04)', border: `1px solid ${mine ? color + '25' : 'rgba(255,255,255,0.08)'}` }}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-[8px] tracking-wider flex items-center gap-1"
                            style={{ color: mine ? color : '#94a3b8' }}>
                            <User className="w-2.5 h-2.5" />
                            {mine ? 'YOU' : (n.created_by || 'teammate')}
                          </span>
                          <span className="font-mono text-[7px] text-muted-foreground">
                            {new Date(n.created_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] leading-relaxed text-foreground whitespace-pre-wrap break-words">{n.text}</p>
                      </div>
                      {canDelete(n) && (
                        <button onClick={() => handleDelete(n.id)}
                          className="mt-1 flex items-center gap-1 font-mono text-[8px] text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-2.5 h-2.5" /> DELETE
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* composer */}
        <div className="border-t p-3" style={{ borderColor: `${color}20` }}>
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
              rows={2}
              placeholder="Add a note about this scan…"
              className="flex-1 px-3 py-2 rounded-xl bg-black/40 border font-mono text-[10px] leading-relaxed text-foreground outline-none resize-none"
              style={{ borderColor: `${color}30` }}
            />
            <button onClick={submit} disabled={posting || !text.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-display text-[10px] tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02]"
              style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}>
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              POST
            </button>
          </div>
          <div className="font-mono text-[7px] text-muted-foreground mt-1.5 text-right">⌘/Ctrl + Enter to post · shared with the snapshot's team</div>
        </div>
      </motion.div>
    </motion.div>
  );
}