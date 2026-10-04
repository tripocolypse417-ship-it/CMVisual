import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Loader2, Send, Sparkles, Search, Mail, CheckCircle2, ExternalLink, AlertTriangle, RefreshCw, Wand2 } from 'lucide-react';

const STAGES = [
  { id: 'researched', label: 'RESEARCHED', color: '#00ccff' },
  { id: 'drafted', label: 'DRAFTED', color: '#ffaa00' },
  { id: 'emailed', label: 'EMAILED', color: '#00ff88' },
  { id: 'replied', label: 'REPLIED', color: '#a855f7' },
  { id: 'meeting', label: 'MEETING', color: '#ff6633' },
  { id: 'passed', label: 'PASSED', color: '#ff4466' },
  { id: 'invested', label: 'INVESTED', color: '#00ff88' },
];

const PRIORITY_CFG = {
  high: { color: '#00ff88', label: 'HIGH' },
  medium: { color: '#ffaa00', label: 'MED' },
  low: { color: '#ff4466', label: 'LOW' },
};

export default function OutreachConsole({ color = '#00ff88' }) {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [researching, setResearching] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftingAll, setDraftingAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [draft, setDraft] = useState({ subject: '', body: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.InvestorTarget.list('-priority,-created_date', 200);
      setTargets(list);
    } catch { /* bubble */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const select = (t) => {
    setSelected(t);
    setDraft({ subject: t.drafted_subject || '', body: t.drafted_body || '' });
    setStatus(null);
  };

  const research = async () => {
    setResearching(true); setStatus(null);
    try {
      const res = await base44.functions.invoke('investorOutreach', { action: 'research', count: 8 });
      if (res.data?.created != null) {
        setStatus({ ok: true, text: `Found ${res.data.found} investors · ${res.data.created} new targets added.` });
        await load();
      } else {
        setStatus({ ok: false, text: res.data?.error || 'Research failed.' });
      }
    } catch (e) {
      setStatus({ ok: false, text: e?.response?.data?.error || 'Research failed.' });
    }
    setResearching(false);
  };

  const draftOne = async () => {
    if (!selected) return;
    setDrafting(true); setStatus(null);
    try {
      const res = await base44.functions.invoke('investorOutreach', { action: 'draft', targetId: selected.id });
      if (res.data?.ok) {
        setDraft({ subject: res.data.subject, body: res.data.body });
        setStatus({ ok: true, text: 'Email drafted by AI — review and send.' });
        await load();
        setSelected((s) => s ? { ...s, drafted_subject: res.data.subject, drafted_body: res.data.body, stage: 'drafted' } : s);
      } else {
        setStatus({ ok: false, text: res.data?.error || 'Draft failed.' });
      }
    } catch (e) {
      setStatus({ ok: false, text: e?.response?.data?.error || 'Draft failed.' });
    }
    setDrafting(false);
  };

  const draftAll = async () => {
    setDraftingAll(true); setStatus(null);
    try {
      const res = await base44.functions.invoke('investorOutreach', { action: 'draftAll' });
      if (res.data?.ok) {
        setStatus({ ok: true, text: `Drafted ${res.data.drafted} of ${res.data.total} emails.` });
        await load();
      } else {
        setStatus({ ok: false, text: res.data?.error || 'Batch draft failed.' });
      }
    } catch (e) {
      setStatus({ ok: false, text: e?.response?.data?.error || 'Batch draft failed.' });
    }
    setDraftingAll(false);
  };

  const saveDraft = async () => {
    if (!selected) return;
    try {
      await base44.entities.InvestorTarget.update(selected.id, {
        drafted_subject: draft.subject,
        drafted_body: draft.body,
      });
      setStatus({ ok: true, text: 'Draft saved.' });
    } catch (e) {
      setStatus({ ok: false, text: 'Save failed.' });
    }
  };

  const send = async () => {
    if (!selected) return;
    if (!selected.email && !draft.email) {
      setStatus({ ok: false, text: 'No email on file — add the investor\'s email first.' });
      return;
    }
    setSending(true); setStatus(null);
    try {
      await saveDraft();
      const res = await base44.functions.invoke('investorOutreach', { action: 'send', targetId: selected.id });
      if (res.data?.ok) {
        setStatus({ ok: true, text: '✓ Sent — target marked emailed.' });
        await load();
        setSelected((s) => s ? { ...s, stage: 'emailed', last_contacted_at: new Date().toISOString() } : s);
      } else {
        setStatus({ ok: false, text: res.data?.error || 'Send failed.' });
      }
    } catch (e) {
      setStatus({ ok: false, text: e?.response?.data?.error || 'Send failed. Delivery to non-registered emails may require a paid plan.' });
    }
    setSending(false);
  };

  const updateStage = async (id, stage) => {
    try {
      await base44.entities.InvestorTarget.update(id, { stage });
      setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, stage } : t)));
      if (selected?.id === id) setSelected((s) => ({ ...s, stage }));
    } catch {}
  };

  const updateEmail = async (email) => {
    if (!selected) return;
    try {
      await base44.entities.InvestorTarget.update(selected.id, { email });
      setSelected((s) => ({ ...s, email }));
      setTargets((prev) => prev.map((t) => (t.id === selected.id ? { ...t, email } : t)));
    } catch {}
  };

  const stageCounts = STAGES.reduce((acc, s) => ({ ...acc, [s.id]: targets.filter((t) => t.stage === s.id).length }), {});
  const researchedCount = targets.filter((t) => t.stage === 'researched').length;

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="glass-panel rounded-2xl p-4 relative corner-decoration">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color }} />
            <h2 className="font-display text-xs tracking-wider" style={{ color }}>AI INVESTOR OUTREACH</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={research} disabled={researching}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[9px] tracking-wider transition-all disabled:opacity-50"
              style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}>
              {researching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              {researching ? 'RESEARCHING…' : 'FIND NEW INVESTORS'}
            </button>
            {researchedCount > 0 && (
              <button onClick={draftAll} disabled={draftingAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[9px] tracking-wider transition-all disabled:opacity-50"
                style={{ background: '#ffaa0018', border: '1px solid #ffaa0040', color: '#ffaa00' }}>
                {draftingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {draftingAll ? 'DRAFTING ALL…' : `DRAFT ALL (${researchedCount})`}
              </button>
            )}
          </div>
        </div>
        <p className="font-mono text-[9px] text-muted-foreground mt-2 leading-relaxed">
          AI researches best-fit investors, drafts a personalized email for each, and you just review + approve. Emails send under your name — you stay the human in the loop.
        </p>
        {/* Stage pipeline summary */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          {STAGES.map((s) => (
            <div key={s.id} className="flex items-center gap-1 px-2 py-1 rounded-md"
              style={{ background: `${s.color}10`, border: `1px solid ${s.color}30` }}>
              <span className="font-mono text-[8px] font-bold" style={{ color: s.color }}>{stageCounts[s.id] || 0}</span>
              <span className="font-mono text-[7px] tracking-wider" style={{ color: `${s.color}cc` }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Target list */}
        <div className="glass-panel rounded-2xl p-4 relative corner-decoration">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-[11px] tracking-wider" style={{ color }}>PIPELINE ({targets.length})</h3>
            <button onClick={load} className="text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : targets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <Search className="w-10 h-10 text-muted-foreground opacity-20" />
              <div className="font-mono text-[10px] text-muted-foreground max-w-xs">
                No targets yet. Click <span style={{ color }}>FIND NEW INVESTORS</span> to have AI research the best-fit VCs and angels for WaveRadar.
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {targets.map((t) => {
                  const stage = STAGES.find((s) => s.id === t.stage) || STAGES[0];
                  const pri = PRIORITY_CFG[t.priority] || PRIORITY_CFG.medium;
                  const active = selected?.id === t.id;
                  return (
                    <motion.button key={t.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      onClick={() => select(t)}
                      className="w-full text-left p-3 rounded-xl transition-all"
                      style={{ border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.1)'}`, background: active ? `${color}12` : 'rgba(0,0,0,0.3)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[8px] px-1 py-0.5 rounded" style={{ background: `${pri.color}18`, color: pri.color }}>{pri.label}</span>
                          <span className="font-mono text-xs font-bold text-foreground truncate">{t.name}</span>
                        </div>
                        <span className="font-mono text-[8px] shrink-0" style={{ color: stage.color }}>{stage.label}</span>
                      </div>
                      <div className="font-mono text-[9px] text-muted-foreground truncate mt-0.5">{t.firm}{t.role ? ` · ${t.role}` : ''}</div>
                      <div className="font-mono text-[8px] text-muted-foreground mt-0.5 truncate">{t.fit_rationale}</div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Detail + email composer */}
        <div className="glass-panel rounded-2xl p-4 relative corner-decoration">
          {!selected ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Mail className="w-10 h-10 text-muted-foreground opacity-20" />
              <div className="font-mono text-[10px] text-muted-foreground max-w-xs">
                Select a target to see the AI's fit analysis and drafted outreach email.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Investor profile */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-sm tracking-wide" style={{ color }}>{selected.name}</h3>
                    <div className="font-mono text-[10px] text-muted-foreground">{selected.firm} · {selected.role || 'investor'}</div>
                  </div>
                  {selected.linkedin && (
                    <a href={selected.linkedin} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded-md font-mono text-[8px] transition-all"
                      style={{ border: `1px solid ${color}40`, color }}>
                      <ExternalLink className="w-3 h-3" /> LINKEDIN
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {selected.focus_areas && (
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}15` }}>
                    <div className="font-mono text-[7px] text-muted-foreground tracking-wider">FOCUS</div>
                    <div className="font-mono text-[9px] text-foreground mt-0.5">{selected.focus_areas}</div>
                  </div>
                )}
                {selected.check_size && (
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}15` }}>
                    <div className="font-mono text-[7px] text-muted-foreground tracking-wider">CHECK SIZE</div>
                    <div className="font-mono text-[9px] text-foreground mt-0.5">{selected.check_size}</div>
                  </div>
                )}
                {selected.portfolio && (
                  <div className="p-2 rounded-lg col-span-2" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}15` }}>
                    <div className="font-mono text-[7px] text-muted-foreground tracking-wider">PORTFOLIO</div>
                    <div className="font-mono text-[9px] text-foreground mt-0.5">{selected.portfolio}</div>
                  </div>
                )}
                <div className="p-2 rounded-lg col-span-2" style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
                  <div className="font-mono text-[7px] tracking-wider" style={{ color }}>WHY THEY FIT</div>
                  <div className="font-mono text-[9px] text-foreground mt-0.5 leading-relaxed">{selected.fit_rationale}</div>
                </div>
              </div>

              {/* Email editor */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[8px] text-muted-foreground tracking-wider">OUTREACH EMAIL</span>
                  <button onClick={draftOne} disabled={drafting}
                    className="flex items-center gap-1 px-2 py-1 rounded-md font-mono text-[8px] transition-all disabled:opacity-50"
                    style={{ border: `1px solid ${color}40`, color, background: `${color}10` }}>
                    {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    {drafting ? 'DRAFTING…' : 'AI DRAFT'}
                  </button>
                </div>

                <label className="block">
                  <span className="font-mono text-[7px] text-muted-foreground tracking-wider block mb-1">RECIPIENT EMAIL {selected.email ? '' : '(add before sending)'}</span>
                  <input value={selected.email || ''} onChange={(e) => updateEmail(e.target.value)}
                    placeholder="investor@firm.com"
                    className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-[10px] text-foreground focus:outline-none focus:border-primary" />
                </label>
                <label className="block">
                  <span className="font-mono text-[7px] text-muted-foreground tracking-wider block mb-1">SUBJECT</span>
                  <input value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                    className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-[10px] text-foreground focus:outline-none focus:border-primary" />
                </label>
                <label className="block">
                  <span className="font-mono text-[7px] text-muted-foreground tracking-wider block mb-1">BODY</span>
                  <textarea value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} rows={8}
                    className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-[10px] text-foreground leading-relaxed focus:outline-none focus:border-primary resize-y" />
                </label>

                {status && (
                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg font-mono text-[9px]"
                    style={{ background: status.ok ? `${color}10` : '#ff446610', border: `1px solid ${status.ok ? color + '40' : '#ff446640'}`, color: status.ok ? color : '#ff4466' }}>
                    {status.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                    {status.text}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={saveDraft} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-[9px] tracking-wider transition-all"
                    style={{ border: `1px solid ${color}30`, color, background: 'transparent' }}>
                    SAVE DRAFT
                  </button>
                  <button onClick={send} disabled={sending || !draft.subject || !draft.body}
                    className="flex-[2] flex items-center justify-center gap-1.5 py-2 rounded-lg font-display text-[10px] tracking-widest transition-all disabled:opacity-50"
                    style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sending ? 'SENDING…' : 'APPROVE & SEND'}
                  </button>
                </div>
              </div>

              {/* Stage controls */}
              <div className="pt-2 border-t border-white/5">
                <span className="font-mono text-[7px] text-muted-foreground tracking-wider">MOVE STAGE</span>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {STAGES.map((s) => {
                    const active = selected.stage === s.id;
                    return (
                      <button key={s.id} onClick={() => updateStage(selected.id, s.id)}
                        className="px-2 py-1 rounded-md font-mono text-[8px] transition-all"
                        style={{ border: `1px solid ${active ? s.color + '60' : 'rgba(255,255,255,0.1)'}`, background: active ? s.color + '14' : 'transparent', color: active ? s.color : 'rgba(255,255,255,0.5)' }}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}