import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Facebook, Send, RefreshCw, Loader2, CheckCircle2, AlertTriangle, XCircle, Power, Clock, Repeat, Sparkles } from 'lucide-react';

const INTERVALS = [
  { label: 'Every 2 hours', hours: 2 },
  { label: 'Every 4 hours', hours: 4 },
  { label: 'Every 6 hours', hours: 6 },
  { label: 'Every 8 hours', hours: 8 },
  { label: 'Every 12 hours', hours: 12 },
  { label: 'Every 24 hours', hours: 24 },
];

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function FacebookPromo({ color = '#00ff88' }) {
  const [pages, setPages] = useState([]);
  const [pageId, setPageId] = useState('');
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [message, setMessage] = useState('');
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [posting, setPosting] = useState(false);
  const [status, setStatus] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [intervalHours, setIntervalHours] = useState(6);

  const campaign = campaigns.find(c => c.page_id === pageId);

  const loadPages = useCallback(async () => {
    setLoadingPages(true);
    setStatus(null);
    try {
      const res = await base44.functions.invoke('facebookPromo', { action: 'list' });
      const list = res.data?.pages || [];
      setPages(list);
      if (list.length === 0) {
        setStatus({ type: 'warn', text: 'No Facebook Pages found on your connected account.' });
      } else if (!pageId) {
        setPageId(list[0].id);
      }
    } catch (e) {
      setStatus({ type: 'error', text: e.response?.data?.error || 'Failed to load Pages.' });
    }
    setLoadingPages(false);
  }, [pageId]);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const res = await base44.functions.invoke('facebookPromo', { action: 'listPosts' });
      const list = res.data?.posts || [];
      setPosts(list);
      if (list[0]) { setSelectedPost(list[0]); setMessage(list[0].message); }
    } catch {
      setPosts([]);
    }
    setLoadingPosts(false);
  }, []);

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const list = await base44.entities.PromoCampaign.list('-updated_date', 50);
      setCampaigns(list);
    } catch {
      setCampaigns([]);
    }
    setLoadingCampaigns(false);
  }, []);

  useEffect(() => {
    loadPages();
    loadPosts();
    loadCampaigns();
  }, [loadPages, loadPosts, loadCampaigns]);

  // Sync the interval selector with the selected page's campaign.
  useEffect(() => {
    const c = campaigns.find(c => c.page_id === pageId);
    if (c) setIntervalHours(c.interval_hours || 6);
  }, [pageId, campaigns]);

  const selectPost = (p) => {
    setSelectedPost(p);
    setMessage(p.message);
  };

  const post = async () => {
    if (!pageId || !message.trim()) return;
    setPosting(true);
    setStatus(null);
    try {
      const res = await base44.functions.invoke('facebookPromo', {
        action: 'post', pageId, message: message.trim()
      });
      if (res.data?.success) {
        setStatus({ type: 'ok', text: 'Promo published to your Page!' });
      } else {
        setStatus({ type: 'error', text: res.data?.error || 'Publish failed.' });
      }
    } catch (e) {
      setStatus({ type: 'error', text: e.response?.data?.error || 'Publish failed.' });
    }
    setPosting(false);
  };

  const toggleCampaign = async () => {
    if (!pageId) return;
    setCampaignSaving(true);
    setStatus(null);
    try {
      const page = pages.find(p => p.id === pageId);
      if (campaign) {
        await base44.entities.PromoCampaign.update(campaign.id, {
          enabled: !campaign.enabled,
          interval_hours: intervalHours,
        });
        setStatus({ type: 'ok', text: campaign.enabled ? 'Auto-campaign paused.' : 'Auto-campaign enabled — posts will publish on schedule.' });
      } else {
        await base44.entities.PromoCampaign.create({
          page_id: pageId,
          page_name: page?.name || '',
          enabled: true,
          interval_hours: intervalHours,
          last_index: -1,
          post_count: 0,
        });
        setStatus({ type: 'ok', text: 'Auto-campaign enabled — posts will publish on schedule.' });
      }
      await loadCampaigns();
    } catch (e) {
      setStatus({ type: 'error', text: e.response?.data?.error || e.message || 'Failed to update campaign.' });
    }
    setCampaignSaving(false);
  };

  const changeInterval = async (h) => {
    setIntervalHours(h);
    if (campaign) {
      try {
        await base44.entities.PromoCampaign.update(campaign.id, { interval_hours: h });
        await loadCampaigns();
      } catch {}
    }
  };

  const postNowFromLibrary = async () => {
    if (!pageId || !selectedPost) return;
    setPosting(true);
    setStatus(null);
    try {
      const res = await base44.functions.invoke('facebookPromo', {
        action: 'post', pageId, message: selectedPost.message
      });
      if (res.data?.success) {
        setStatus({ type: 'ok', text: `"${selectedPost.title}" published!` });
      } else {
        setStatus({ type: 'error', text: res.data?.error || 'Publish failed.' });
      }
    } catch (e) {
      setStatus({ type: 'error', text: e.response?.data?.error || 'Publish failed.' });
    }
    setPosting(false);
  };

  const nextEta = campaign?.last_posted_at
    ? new Date(new Date(campaign.last_posted_at).getTime() + (campaign.interval_hours || 6) * 3600 * 1000)
    : null;
  const due = nextEta && Date.now() >= nextEta.getTime();

  const StatusIcon = status?.type === 'ok' ? CheckCircle2
    : status?.type === 'warn' ? AlertTriangle : XCircle;
  const statusColor = status?.type === 'ok' ? '#00ff88'
    : status?.type === 'warn' ? '#ffcc00' : '#ff4466';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: '#1877F215', border: '1px solid #1877F240' }}>
            <Facebook className="w-4 h-4" style={{ color: '#1877F2' }} />
          </div>
          <h3 className="font-display text-xs tracking-wider text-foreground">FACEBOOK CAMPAIGN</h3>
        </div>
        <button onClick={loadPages} disabled={loadingPages}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md border font-mono text-[9px] transition-all"
          style={{ borderColor: `${color}40`, color, background: `${color}10` }}>
          {loadingPages ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          PAGES
        </button>
      </div>

      <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
        A rotating library of crafted promo posts. Publish one now, or enable the always-on auto-campaign to post them on schedule — 24/7.
      </p>

      {pages.length > 0 && (
        <div className="space-y-1.5">
          <label className="font-mono text-[9px] tracking-wider text-muted-foreground">TARGET PAGE</label>
          <select value={pageId} onChange={e => setPageId(e.target.value)}
            className="w-full px-2.5 py-2 rounded-lg bg-black/40 border font-mono text-[10px] text-foreground outline-none"
            style={{ borderColor: `${color}30` }}>
            {pages.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name}</option>)}
          </select>
        </div>
      )}

      {/* Post library */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" style={{ color }} />
          <label className="font-mono text-[9px] tracking-wider text-muted-foreground">PROMO LIBRARY {posts.length > 0 && `· ${posts.length} POSTS`}</label>
        </div>
        {loadingPosts ? (
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="font-mono text-[9px]">Loading posts…</span>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
            {posts.map((p, i) => {
              const active = selectedPost?.title === p.title;
              return (
                <button key={i} onClick={() => selectPost(p)}
                  className="w-full text-left px-2.5 py-2 rounded-lg border transition-all"
                  style={{
                    borderColor: active ? `${color}80` : 'rgba(255,255,255,0.08)',
                    background: active ? `${color}12` : 'rgba(0,0,0,0.25)',
                  }}>
                  <div className="font-mono text-[10px] font-semibold" style={{ color: active ? color : '#ffffffcc' }}>{p.title}</div>
                  <div className="font-mono text-[8px] text-muted-foreground line-clamp-2 mt-0.5">{p.message.replace(/[#\n].*/s, '').slice(0, 80)}…</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="space-y-1.5">
        <label className="font-mono text-[9px] tracking-wider text-muted-foreground">MESSAGE (EDITABLE)</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={7}
          className="w-full px-2.5 py-2 rounded-lg bg-black/40 border font-mono text-[10px] leading-relaxed text-foreground outline-none resize-none"
          style={{ borderColor: `${color}30` }} />
        <div className="font-mono text-[8px] text-muted-foreground text-right">{message.length} chars</div>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
            style={{ background: `${statusColor}12`, border: `1px solid ${statusColor}40` }}>
            <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: statusColor }} />
            <span className="font-mono text-[9px]" style={{ color: statusColor }}>{status.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={postNowFromLibrary} disabled={posting || !pageId || !selectedPost}
          className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg font-display text-[10px] tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `${color}12`, border: `1px solid ${color}40`, color }}>
          {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          POST SELECTED
        </button>
        <button onClick={post} disabled={posting || !pageId || !message.trim()}
          className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg font-display text-[10px] tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#1877F218', border: '1px solid #1877F245', color: '#1877F2' }}>
          {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          POST EDITED
        </button>
      </div>

      {/* Auto-campaign */}
      <div className="pt-2 mt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5" style={{ color }} />
            <span className="font-display text-[11px] tracking-wider" style={{ color }}>AUTO-CAMPAIGN</span>
          </div>
          <button onClick={toggleCampaign} disabled={campaignSaving || !pageId}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] tracking-wider transition-all disabled:opacity-40"
            style={{
              border: `1px solid ${campaign?.enabled ? color + '60' : 'rgba(255,255,255,0.15)'}`,
              background: campaign?.enabled ? color + '14' : 'transparent',
              color: campaign?.enabled ? color : 'rgba(255,255,255,0.6)',
            }}>
            {campaignSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Power className="w-3 h-3" />}
            {campaign?.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <select value={intervalHours} onChange={e => changeInterval(Number(e.target.value))}
              className="flex-1 px-2 py-1.5 rounded-lg bg-black/40 border font-mono text-[9px] text-foreground outline-none disabled:opacity-50"
              style={{ borderColor: `${color}30` }} disabled={!campaign?.enabled}>
              {INTERVALS.map(o => <option key={o.hours} value={o.hours} className="bg-black">{o.label}</option>)}
            </select>
          </div>

          {campaign && (
            <div className="grid grid-cols-3 gap-1.5">
              <div className="text-center py-1.5 rounded-md" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="font-mono text-[10px] font-bold" style={{ color }}>{campaign.post_count || 0}</div>
                <div className="font-mono text-[7px] text-muted-foreground">POSTED</div>
              </div>
              <div className="text-center py-1.5 rounded-md" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="font-mono text-[8px] font-bold" style={{ color }}>{fmtTime(campaign.last_posted_at)}</div>
                <div className="font-mono text-[7px] text-muted-foreground">LAST</div>
              </div>
              <div className="text-center py-1.5 rounded-md" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="font-mono text-[8px] font-bold" style={{ color: due ? '#ffcc00' : color }}>
                  {nextEta ? (due ? 'DUE' : fmtTime(nextEta.toISOString())) : '—'}
                </div>
                <div className="font-mono text-[7px] text-muted-foreground">NEXT</div>
              </div>
            </div>
          )}

          {campaign?.enabled && (
            <p className="font-mono text-[8px] text-muted-foreground leading-relaxed">
              ✓ Active — the next promo auto-publishes {due ? 'any moment' : `at ${fmtTime(nextEta.toISOString())}`}. Rotates through all {posts.length || 11} posts so content never repeats back-to-back.
            </p>
          )}
          {!campaign?.enabled && pageId && (
            <p className="font-mono text-[8px] text-muted-foreground leading-relaxed">
              Turn on to auto-post the rotating library {intervalHours ? `every ${intervalHours}h` : 'on schedule'} — runs 24/7, even when this app is closed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}