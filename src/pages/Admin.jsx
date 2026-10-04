import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Crown, Shield, User, Radio, History, ShieldAlert, Repeat, GraduationCap, Flame, Handshake, Sparkles } from 'lucide-react';
import TeamForm from '@/components/admin/TeamForm';
import MemberManager from '@/components/admin/MemberManager';
import MemberFeeds from '@/components/admin/MemberFeeds';
import SnapshotArchive from '@/components/admin/SnapshotArchive';
import ThreatAssessment from '@/components/admin/ThreatAssessment';
import QuickSwitchView from '@/components/admin/QuickSwitchView';
import Tutorials from '@/components/admin/Tutorials';
import ActivityHeatmap from '@/components/admin/ActivityHeatmap';
import InvestorConsole from '@/components/admin/InvestorConsole';
import OutreachConsole from '@/components/admin/OutreachConsole';

const COLOR = '#00ff88';

export default function Admin() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [me, setMe] = useState(null);
  const [consoleView, setConsoleView] = useState('teams');
  const [archiveTeamId, setArchiveTeamId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([
        base44.entities.Team.list('-created_date', 50),
        base44.auth.me().catch(() => null),
      ]);
      setTeams(t);
      setMe(u);
    } catch {
      /* bubble */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createTeam = async (name, description) => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const team = await base44.entities.Team.create({
      name,
      description,
      share_code: code,
      member_emails: me?.email ? [me.email] : [],
      admin_emails: me?.email ? [me.email] : [],
    });
    setTeams((prev) => [team, ...prev]);
    setSelected(team);
  };

  const refreshTeam = async (id) => {
    const t = await base44.entities.Team.get(id);
    setTeams((prev) => prev.map((x) => (x.id === id ? t : x)));
    setSelected(t);
  };

  const deleteTeam = async (id) => {
    await base44.entities.Team.delete(id);
    setTeams((prev) => prev.filter((x) => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 relative">
      <div className="fixed inset-0 hud-grid-bg opacity-100 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />

      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        {/* header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/"
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-border hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-4 h-4" style={{ color: COLOR }} />
            </Link>
            <div>
              <h1 className="font-display text-xl tracking-widest" style={{ color: COLOR, textShadow: `0 0 12px ${COLOR}` }}>TEAM CONSOLE</h1>
              <p className="font-mono text-[10px] text-muted-foreground">Create teams · invite members · manage roles & sharing</p>
            </div>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]" title={me?.email}>{me?.email}</div>
        </div>

        {/* primary nav — one click between teams, live feeds, and the archive */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'quick', label: 'QUICK SWITCH', icon: Repeat },
            { id: 'teams', label: 'TEAMS', icon: Users },
            { id: 'feeds', label: 'LIVE FEEDS', icon: Radio },
            { id: 'threat', label: 'THREAT', icon: ShieldAlert },
            { id: 'archive', label: 'ARCHIVE', icon: History },
            { id: 'activity', label: 'ACTIVITY', icon: Flame },
            { id: 'investors', label: 'INVESTORS', icon: Handshake },
            { id: 'outreach', label: 'OUTREACH', icon: Sparkles },
            { id: 'tutorials', label: 'TUTORIALS', icon: GraduationCap },
          ].map((t) => {
            const active = consoleView === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id}
                onClick={() => {
                  if (t.id === 'archive') setArchiveTeamId(null);
                  setConsoleView(t.id);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[10px] tracking-wider transition-all"
                style={{
                  border: `1px solid ${active ? COLOR + '60' : 'rgba(255,255,255,0.12)'}`,
                  background: active ? COLOR + '14' : 'transparent',
                  color: active ? COLOR : 'rgba(255,255,255,0.6)',
                }}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {consoleView === 'teams' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* left column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-panel rounded-2xl p-4 relative corner-decoration">
              <h2 className="font-display text-xs tracking-wider mb-3" style={{ color: COLOR }}>NEW TEAM</h2>
              <TeamForm onCreate={createTeam} color={COLOR} />
            </div>

            <div className="glass-panel rounded-2xl p-4 relative corner-decoration">
              <h2 className="font-display text-xs tracking-wider mb-3" style={{ color: COLOR }}>
                YOUR TEAMS ({teams.length})
              </h2>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
                </div>
              ) : teams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <Users className="w-8 h-8 text-muted-foreground opacity-30" />
                  <div className="font-mono text-[10px] text-muted-foreground">No teams yet — create one above.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {teams.map((t) => {
                      const active = selected?.id === t.id;
                      const isOwner = t.created_by_id === me?.id;
                      return (
                        <motion.button
                          key={t.id}
                          layout
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          onClick={() => setSelected(t)}
                          className="w-full text-left p-3 rounded-xl transition-all"
                          style={{
                            border: `1px solid ${active ? COLOR + '60' : 'rgba(255,255,255,0.1)'}`,
                            background: active ? `${COLOR}12` : 'rgba(0,0,0,0.3)',
                          }}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-foreground truncate">{t.name}</span>
                            {isOwner ? <Crown className="w-3 h-3 flex-shrink-0" style={{ color: COLOR }} /> : <User className="w-3 h-3 flex-shrink-0 text-muted-foreground" />}
                          </div>
                          <div className="font-mono text-[8px] text-muted-foreground mt-1">
                            {(t.member_emails || []).length} members · {(t.admin_emails || []).length} admins
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* right column */}
          <div className="lg:col-span-2">
            <div className="glass-panel rounded-2xl p-4 relative corner-decoration min-h-[420px]">
              {selected ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-xs tracking-wider" style={{ color: COLOR }}>MEMBERS & SHARING</h2>
                    <button
                      onClick={() => { setArchiveTeamId(selected.id); setConsoleView('archive'); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-wider transition-all"
                      style={{ border: `1px solid ${COLOR}40`, background: `${COLOR}10`, color: COLOR }}>
                      <History className="w-3 h-3" /> VIEW SNAPSHOTS
                    </button>
                  </div>
                  <MemberManager team={selected} me={me} onRefresh={refreshTeam} onDelete={deleteTeam} color={COLOR} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-16">
                  <Shield className="w-12 h-12 text-muted-foreground opacity-20" />
                  <div className="font-display text-sm tracking-wider text-muted-foreground">SELECT A TEAM</div>
                  <div className="font-mono text-[10px] text-muted-foreground max-w-xs">
                    Choose a team from the left to manage its members and sharing — or create a new one. Snapshots live in the Archive.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        ) : consoleView === 'quick' ? (
          <QuickSwitchView teams={teams} me={me} color={COLOR} />
        ) : consoleView === 'feeds' ? (
          <MemberFeeds teams={teams} me={me} color={COLOR} />
        ) : consoleView === 'threat' ? (
          <ThreatAssessment color={COLOR} />
        ) : consoleView === 'tutorials' ? (
          <Tutorials color={COLOR} />
        ) : consoleView === 'activity' ? (
          <ActivityHeatmap color={COLOR} />
        ) : consoleView === 'investors' ? (
          <InvestorConsole color={COLOR} />
        ) : consoleView === 'outreach' ? (
          <OutreachConsole color={COLOR} />
        ) : (
          <SnapshotArchive teams={teams} me={me} color={COLOR} initialTeamId={archiveTeamId} />
        )}
      </div>
    </div>
  );
}