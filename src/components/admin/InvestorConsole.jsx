import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Mail, Loader2, Send, Inbox, CheckCircle2, XCircle, Clock } from 'lucide-react';

const STATUS_CFG = {
  new: { color: '#00ff88', icon: Clock, label: 'NEW' },
  contacted: { color: '#00ccff', icon: Send, label: 'CONTACTED' },
  interested: { color: '#ffaa00', icon: CheckCircle2, label: 'INTERESTED' },
  passed: { color: '#ff4466', icon: XCircle, label: 'PASSED' },
};

const TEMPLATE = (name) => `Hi ${name || 'there'},

Thank you for your interest in WaveRadar. We're building a software-only radar vision platform that turns any phone into a real-time occupancy and movement sensor — no dedicated hardware.

We'd love to share our vision, traction, and the opportunity in more detail. Would you be open to a brief call next week?

Best,
The WaveRadar Team`;

export default function InvestorConsole({ color = '#00ff88' }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [outreach, setOutreach] = useState({ to: '', subject: 'Following up — WaveRadar', body: '' });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const l = await base44.entities.InvestorLead.list('-created_date', 100);
      setLeads(l);
    } catch { /* bubble */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectLead = (lead) => {
    setSelected(lead);
    setResult(null);
    setOutreach({
      to: lead.email,
      subject: 'Following up — WaveRadar',
      body: TEMPLATE(lead.name),
    });
  };

  const sendOutreach = async () => {
    if (!outreach.to || !outreach.subject || !outreach.body) return;
    setSending(true); setResult(null);
    try {
      await base44.functions.invoke('investorLead', {
        action: 'outreach',
        to: outreach.to,
        subject: outreach.subject,
        body: outreach.body,
        leadId: selected?.id,
      });
      setResult({ ok: true });
      load();
    } catch (err) {
      setResult({ ok: false, error: err?.response?.data?.error || 'Send failed. Delivery to non-registered emails may require a paid plan.' });
    }
    setSending(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await base44.entities.InvestorLead.update(id, { status });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      if (selected?.id === id) setSelected((s) => ({ ...s, status }));
    } catch { /* bubble */ }
  };

  const newCount = leads.filter((l) => l.status === 'new').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* leads list */}
      <div className="glass-panel rounded-2xl p-4 relative corner-decoration">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4" style={{ color }} />
            <h2 className="font-display text-xs tracking-wider" style={{ color }}>INVESTOR LEADS</h2>
          </div>
          <span className="font-mono text-[9px] text-muted-foreground">{leads.length} total · {newCount} new</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <Inbox className="w-10 h-10 text-muted-foreground opacity-20" />
            <div className="font-mono text-[10px] text-muted-foreground">No leads yet — share your /investors link.</div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {leads.map((lead) => {
                const cfg = STATUS_CFG[lead.status] || STATUS_CFG.new;
                const active = selected?.id === lead.id;
                const Icon = cfg.icon;
                return (
                  <motion.button key={lead.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    onClick={() => selectLead(lead)}
                    className="w-full text-left p-3 rounded-xl transition-all"
                    style={{ border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.1)'}`, background: active ? `${color}12` : 'rgba(0,0,0,0.3)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-foreground truncate">{lead.name}</span>
                      <span className="flex items-center gap-1 font-mono text-[8px] shrink-0" style={{ color: cfg.color }}>
                        <Icon className="w-2.5 h-2.5" /> {cfg.label}
                      </span>
                    </div>
                    <div className="font-mono text-[9px] text-muted-foreground truncate mt-0.5">{lead.email}</div>
                    <div className="font-mono text-[8px] text-muted-foreground mt-0.5">
                      {lead.firm || '—'}{lead.role ? ` · ${lead.role}` : ''}{lead.check_size ? ` · ${lead.check_size}` : ''}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* outreach composer */}
      <div className="glass-panel rounded-2xl p-4 relative corner-decoration">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4" style={{ color }} />
          <h2 className="font-display text-xs tracking-wider" style={{ color }}>OUTREACH</h2>
        </div>

        {!selected ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Mail className="w-10 h-10 text-muted-foreground opacity-20" />
            <div className="font-mono text-[10px] text-muted-foreground max-w-xs">
              Select a lead to pre-fill an outreach email — or compose one below for any investor contact you supply.
            </div>
          </div>
        ) : (
          <div className="mb-3 p-2.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}20` }}>
            <div className="font-mono text-[9px] text-muted-foreground">TO: <span className="text-foreground">{outreach.to}</span></div>
            {selected?.message && (
              <div className="font-mono text-[8px] text-muted-foreground mt-1">NOTE: {selected.message}</div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="block">
            <span className="font-mono text-[8px] text-muted-foreground tracking-wider block mb-1">RECIPIENT EMAIL</span>
            <input value={outreach.to} onChange={(e) => setOutreach((o) => ({ ...o, to: e.target.value }))}
              placeholder="investor@example.com"
              className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="font-mono text-[8px] text-muted-foreground tracking-wider block mb-1">SUBJECT</span>
            <input value={outreach.subject} onChange={(e) => setOutreach((o) => ({ ...o, subject: e.target.value }))}
              className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="font-mono text-[8px] text-muted-foreground tracking-wider block mb-1">BODY</span>
            <textarea value={outreach.body} onChange={(e) => setOutreach((o) => ({ ...o, body: e.target.value }))}
              rows={8}
              className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-[10px] text-foreground focus:outline-none focus:border-primary resize-y" />
          </label>

          <p className="font-mono text-[8px] text-muted-foreground leading-relaxed">
            Note: delivery to emails that aren't registered app users may require a paid plan. Replies go to your app's sender.
          </p>

          {result && (
            <div className="font-mono text-[9px] px-2 py-1.5 rounded-md"
              style={{ color: result.ok ? color : '#ff4466', background: result.ok ? `${color}10` : '#ff446610', border: `1px solid ${result.ok ? color + '40' : '#ff446640'}` }}>
              {result.ok ? '✓ Sent — lead marked contacted.' : `✕ ${result.error}`}
            </div>
          )}

          <button onClick={sendOutreach} disabled={sending || !outreach.to}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-display text-[11px] tracking-widest transition-all hover:scale-[1.01] disabled:opacity-50"
            style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'SENDING…' : 'SEND OUTREACH'}
          </button>
        </div>

        {/* status controls */}
        {selected && (
          <div className="mt-4 pt-3 border-t border-white/5">
            <span className="font-mono text-[8px] text-muted-foreground tracking-wider">UPDATE STAGE</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {Object.entries(STATUS_CFG).map(([k, cfg]) => {
                const active = selected.status === k;
                return (
                  <button key={k} onClick={() => updateStatus(selected.id, k)}
                    className="px-2.5 py-1 rounded-md font-mono text-[9px] transition-all"
                    style={{
                      border: `1px solid ${active ? cfg.color + '60' : 'rgba(255,255,255,0.1)'}`,
                      background: active ? cfg.color + '14' : 'transparent',
                      color: active ? cfg.color : 'rgba(255,255,255,0.5)',
                    }}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}