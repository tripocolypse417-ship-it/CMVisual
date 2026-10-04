import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Send, Loader2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function PinCommentPanel({ pin, color, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('Team member');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        const me = await base44.auth.me();
        if (me?.full_name) setAuthor(me.full_name);
        else if (me?.email) setAuthor(me.email);
      } catch {}
      try {
        const list = await base44.entities.PinComment.filter({ pin_id: pin.id }, '-created_date', 200);
        setComments(list || []);
      } catch {}
      setLoading(false);
      try {
        unsub = base44.entities.PinComment.subscribe((ev) => {
          setComments((prev) => {
            if (ev.type === 'delete') return prev.filter((c) => c.id !== ev.id);
            if (ev.type === 'create' && ev.data?.pin_id === pin.id) {
              const without = prev.filter((c) => c.id !== ev.id);
              return [ev.data, ...without];
            }
            if (ev.type === 'update') {
              const updated = prev.find((c) => c.id === ev.id);
              const without = prev.filter((c) => c.id !== ev.id);
              return updated ? [ev.data, ...without] : prev;
            }
            return prev;
          });
        });
      } catch {}
    })();
    return () => { try { unsub(); } catch {} };
  }, [pin.id]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [comments]);

  const post = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await base44.entities.PinComment.create({ pin_id: pin.id, text: t, author });
      setText('');
    } catch {}
    setSending(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-2 left-2 right-2 max-w-sm mx-auto rounded-xl z-40 flex flex-col"
        style={{ background: 'rgba(1,8,5,0.96)', backdropFilter: 'blur(14px)', border: `1px solid ${color}40`, maxHeight: '70%' }}>
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${color}25` }}>
          <MessageSquare className="w-3.5 h-3.5" style={{ color }} />
          <div className="flex-1 min-w-0">
            <div className="font-display text-[10px] tracking-wider" style={{ color }}>PIN DISCUSSION</div>
            <div className="font-mono text-[8px] text-muted-foreground truncate">{pin.summary}</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[80px]">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" style={{ color }} /></div>
          ) : comments.length === 0 ? (
            <p className="font-mono text-[9px] text-muted-foreground text-center py-3">No comments yet — start the discussion.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-lg px-2 py-1.5" style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[8px] font-bold" style={{ color }}>{c.author || 'Team member'}</span>
                  <span className="font-mono text-[7px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_date), { addSuffix: true })}</span>
                </div>
                <p className="font-mono text-[9px] text-foreground/90 mt-0.5 leading-snug break-words">{c.text}</p>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-1.5 px-2 py-2" style={{ borderTop: `1px solid ${color}25` }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') post(); }}
            placeholder="Add a comment…"
            className="flex-1 px-2 py-1.5 rounded-md bg-black/40 border font-mono text-[10px] outline-none"
            style={{ borderColor: `${color}30`, color: '#ffffffcc' }}
          />
          <button onClick={post} disabled={sending || !text.trim()}
            className="flex items-center justify-center w-8 h-8 rounded-md border transition-all disabled:opacity-50"
            style={{ borderColor: `${color}50`, color, background: `${color}12` }}>
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}