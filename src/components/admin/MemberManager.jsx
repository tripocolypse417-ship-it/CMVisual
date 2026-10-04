import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Shield, User, Trash2, UserPlus, Copy, Check, RefreshCw, Link2 } from 'lucide-react';

export default function MemberManager({ team, me, onRefresh, onDelete, color = '#00ff88' }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!team) return null;
  const ownerEmail = team.created_by;
  const isOwner = team.created_by_id === me?.id;
  const isAdmin = isOwner || (team.admin_emails || []).includes(me?.email);
  const members = team.member_emails || [];
  const admins = team.admin_emails || [];

  const addMember = async (e) => {
    e?.preventDefault();
    if (busy) return;
    // Accept comma, space, or newline separated emails — paste a whole list.
    const emails = email.split(/[\s,]+/).map(x => x.trim().toLowerCase()).filter(x => x.includes('@'));
    const fresh = emails.filter(x => !members.includes(x));
    if (fresh.length === 0) return;
    setBusy(true);
    try {
      await base44.entities.Team.update(team.id, { member_emails: [...members, ...fresh] });
      setEmail('');
      onRefresh(team.id);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (em) => {
    if (em === ownerEmail || busy) return;
    setBusy(true);
    try {
      await base44.entities.Team.update(team.id, {
        member_emails: members.filter((x) => x !== em),
        admin_emails: admins.filter((x) => x !== em),
      });
      onRefresh(team.id);
    } finally {
      setBusy(false);
    }
  };

  const toggleAdmin = async (em) => {
    if (em === ownerEmail || busy) return;
    const next = admins.includes(em) ? admins.filter((x) => x !== em) : [...admins, em];
    setBusy(true);
    try {
      await base44.entities.Team.update(team.id, { admin_emails: next });
      onRefresh(team.id);
    } finally {
      setBusy(false);
    }
  };

  const regenCode = async () => {
    if (busy) return;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    setBusy(true);
    try {
      await base44.entities.Team.update(team.id, { share_code: code });
      onRefresh(team.id);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/admin?join=${team.share_code}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg tracking-wider" style={{ color }}>{team.name}</h2>
          {team.description && (
            <p className="font-mono text-[10px] text-muted-foreground mt-1">{team.description}</p>
          )}
        </div>
        {isOwner && (
          <button
            onClick={() => onDelete(team.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> DELETE
          </button>
        )}
      </div>

      {/* share code */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-black/30 border border-border">
        <Link2 className="w-4 h-4" style={{ color }} />
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[8px] text-muted-foreground tracking-wider">SHARE CODE</div>
          <div className="font-mono text-sm font-bold tracking-widest" style={{ color }}>{team.share_code}</div>
        </div>
        <button onClick={copyLink} className="p-2 rounded-lg border border-border hover:bg-white/5 transition-colors" title="Copy invite link">
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" style={{ color }} />}
        </button>
        {isAdmin && (
          <button onClick={regenCode} disabled={busy} className="p-2 rounded-lg border border-border hover:bg-white/5 transition-colors disabled:opacity-40" title="Regenerate code">
            <RefreshCw className="w-4 h-4" style={{ color }} />
          </button>
        )}
      </div>

      {/* add member — paste one or many emails */}
      {isAdmin && (
        <form onSubmit={addMember} className="p-3 rounded-xl border" style={{ borderColor: `${color}30`, background: `${color}08` }}>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
              <UserPlus className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <div className="font-display text-xs tracking-wider" style={{ color }}>ADD MEMBERS</div>
              <div className="font-mono text-[8px] text-muted-foreground">Paste emails — comma, space, or newline separated</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@email.com, another@email.com"
              className="flex-1 px-3 py-2.5 rounded-lg bg-black/40 border text-sm font-mono text-foreground focus:outline-none transition-colors"
              style={{ borderColor: `${color}30` }}
            />
            <button
              type="submit"
              disabled={busy || !email.includes('@')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-mono text-[10px] tracking-wider transition-all disabled:opacity-40 hover:scale-[1.02]"
              style={{ background: `${color}22`, border: `1px solid ${color}50`, color }}
            >
              <UserPlus className="w-4 h-4" /> {busy ? 'ADDING…' : 'ADD'}
            </button>
          </div>
        </form>
      )}

      {/* member list */}
      <div className="space-y-2">
        <div className="font-mono text-[9px] text-muted-foreground tracking-wider">MEMBERS ({members.length})</div>
        <AnimatePresence>
          {members.map((em) => {
            const isAdm = em === ownerEmail || admins.includes(em);
            const isMe = em === me?.email;
            return (
              <motion.div
                key={em}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-black/30 border border-border"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                  {em === ownerEmail ? <Crown className="w-4 h-4" style={{ color }} /> : isAdm ? <Shield className="w-4 h-4" style={{ color }} /> : <User className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-foreground truncate">{em} {isMe && <span className="text-muted-foreground">(you)</span>}</div>
                  <div className="font-mono text-[8px] tracking-wider" style={{ color: isAdm ? color : '#ffffff60' }}>
                    {em === ownerEmail ? 'OWNER' : isAdm ? 'ADMIN' : 'MEMBER'}
                  </div>
                </div>
                {isAdmin && em !== ownerEmail && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleAdmin(em)} disabled={busy}
                      className="px-2 py-1 rounded-md font-mono text-[8px] border border-border hover:bg-white/5 transition-colors disabled:opacity-40"
                      style={{ color: isAdm ? color : '#ffffff80' }}>
                      {isAdm ? 'DEMOTE' : 'PROMOTE'}
                    </button>
                    <button onClick={() => removeMember(em)} disabled={busy}
                      className="p-1.5 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}