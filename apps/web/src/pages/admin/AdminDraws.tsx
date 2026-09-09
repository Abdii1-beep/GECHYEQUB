import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { api, Campaign } from '../../lib/api';

// ── Live countdown hook ──────────────────────────────────────────
function useCountdown(targetDate?: string) {
  const calc = useCallback(() => {
    if (!targetDate) return null;
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: diff };
    const days    = Math.floor(diff / 86_400_000);
    const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const seconds = Math.floor((diff % 60_000) / 1_000);
    return { days, hours, minutes, seconds, total: diff };
  }, [targetDate]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    setTime(calc());
    const id = setInterval(() => setTime(calc()), 1_000);
    return () => clearInterval(id);
  }, [calc]);

  return time;
}

// ── Single draw card with its own countdown ──────────────────────
const DrawCard: React.FC<{
  c: Campaign;
  onLaunch: (id: string) => void;
  onViewRoom: (id: string) => void;
}> = ({ c, onLaunch, onViewRoom }) => {
  const countdown = useCountdown(c.drawDate);
  const car       = c.vehicles?.[0];
  const sold      = c.soldTickets ?? c._count?.tickets ?? 0;
  const remaining = c.remainingTickets ?? Math.max(0, c.maxTickets - sold);
  const percent   = c.maxTickets > 0 ? (sold / c.maxTickets) * 100 : 0;
  const totalMs   = countdown?.total ?? 0;

  // Urgency level based on time remaining
  const urgency =
    totalMs <= 0
      ? 'critical'           // draw overdue
      : totalMs < 86_400_000
      ? 'critical'           // <24h
      : totalMs < 259_200_000
      ? 'warning'            // <72h
      : 'safe';

  const urgencyClasses = {
    critical: 'border-red-500/50 bg-gradient-to-b from-red-900/10 to-transparent',
    warning:  'border-amber-500/50 bg-gradient-to-b from-amber-900/10 to-transparent',
    safe:     'border-white/10 bg-white/5',
  }[urgency];

  const urgencyTag = {
    critical: <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">🔴 Urgent</span>,
    warning:  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">🟡 Soon</span>,
    safe:     <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🟢 Scheduled</span>,
  }[urgency];

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className={`border rounded-3xl p-6 transition-all shadow-xl flex flex-col justify-between group hover:scale-[1.01] ${urgencyClasses}`}>
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                {c.status}
              </span>
              {urgencyTag}
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-yellow-300 transition-colors truncate">
              {c.name}
            </h3>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs text-white/40 block">Ticket Price</span>
            <span className="text-base font-black text-emerald-400">{c.ticketPrice.toLocaleString()} ETB</span>
          </div>
        </div>

        {/* Vehicle info */}
        {car && (
          <div className="text-xs text-white/60 mb-4 flex items-center gap-2 flex-wrap">
            <span>🚛 {car.make} {car.model} ({car.year})</span>
            {car.declaredValue && (
              <span className="text-yellow-400 font-bold">• {car.declaredValue.toLocaleString()} ETB Value</span>
            )}
          </div>
        )}

        {/* Countdown timer */}
        <div className={`p-4 rounded-2xl mb-4 ${
          urgency === 'critical' ? 'bg-red-950/60 border border-red-500/30' :
          urgency === 'warning'  ? 'bg-amber-950/60 border border-amber-500/30' :
                                   'bg-black/40 border border-white/10'
        }`}>
          <div className="text-[10px] text-white/50 uppercase font-semibold mb-2 flex items-center gap-1.5">
            <span>⏰</span> Time Until Draw
          </div>
          {!c.drawDate ? (
            <div className="text-white/40 italic text-sm">Not Scheduled Yet</div>
          ) : countdown && countdown.total > 0 ? (
            <div className="flex items-center gap-3">
              {[
                { v: countdown.days,    l: 'Days' },
                { v: countdown.hours,   l: 'Hrs' },
                { v: countdown.minutes, l: 'Min' },
                { v: countdown.seconds, l: 'Sec' },
              ].map(({ v, l }) => (
                <div key={l} className="text-center">
                  <div className={`text-2xl font-black font-mono tabular-nums leading-none ${
                    urgency === 'critical' ? 'text-red-300' :
                    urgency === 'warning'  ? 'text-amber-300' :
                                            'text-yellow-300'
                  }`}>
                    {pad(v)}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-white/40 font-semibold mt-0.5">{l}</div>
                </div>
              ))}
              <div className="ml-auto text-right">
                <div className="text-[10px] text-white/40">Scheduled</div>
                <div className="text-xs font-mono text-white/70">
                  {new Date(c.drawDate).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-red-400 font-bold text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block" />
              Draw Time Reached — Ready to Launch!
            </div>
          )}
        </div>

        {/* Quota progress */}
        <div className="space-y-1.5 mb-5">
          <div className="flex justify-between text-xs">
            <span className="text-white/60">Ticket Pool</span>
            <span className="text-white font-mono font-bold">
              {sold.toLocaleString()} / {c.maxTickets.toLocaleString()} ({percent.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-yellow-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.max(3, percent)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-white/40">{sold.toLocaleString()} sold</span>
            <span className="text-emerald-400 font-semibold">{remaining.toLocaleString()} remaining</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-white/10">
        <button
          onClick={() => onLaunch(c.id)}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
        >
          🎲 Launch Live Studio
        </button>
        <button
          onClick={() => onViewRoom(c.id)}
          className="py-3 px-4 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 border border-yellow-500/30 font-bold text-sm rounded-xl transition-colors flex items-center gap-1.5 active:scale-95"
        >
          🎥 User Room ↗
        </button>
      </div>
    </div>
  );
};

// ── Main AdminDraws page ─────────────────────────────────────────
const AdminDraws: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<'all' | 'PUBLISHED' | 'DRAFT' | 'COMPLETED'>('all');
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    (async () => {
      setLoading(true);
      const res = await api.getAdminCampaigns();
      if (res.success && res.data) setCampaigns(res.data);
      setLoading(false);
    })();
  }, [navigate, token]);

  const filtered = campaigns.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const active    = campaigns.filter(c => c.status === 'PUBLISHED');
  const completed = campaigns.filter(c => c.status === 'COMPLETED');

  const filterTabs: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all',       label: 'All Draws',  count: campaigns.length },
    { key: 'PUBLISHED', label: 'Published',  count: active.length },
    { key: 'DRAFT',     label: 'Draft',      count: campaigns.filter(c => c.status === 'DRAFT').length },
    { key: 'COMPLETED', label: 'Completed',  count: completed.length },
  ];

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span>🎲</span> Live Draws &amp; Lottery Drum Studio
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Monitor active draw rooms · inspect schedules · launch certified live draws
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/campaigns')}
            className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-all shadow-md flex-shrink-0"
          >
            + Manage Campaigns &amp; Quotas
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Active Draws',    value: active.length,    color: 'text-emerald-400', bg: 'from-emerald-500/10 to-transparent border-emerald-500/20' },
            { label: 'Scheduled Soon',  value: active.filter(c => c.drawDate && new Date(c.drawDate).getTime() - Date.now() < 259_200_000).length, color: 'text-amber-400', bg: 'from-amber-500/10 to-transparent border-amber-500/20' },
            { label: 'Completed Draws', value: completed.length, color: 'text-blue-400',    bg: 'from-blue-500/10 to-transparent border-blue-500/20' },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-r ${s.bg} border rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-white/50 text-xs font-semibold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 flex-wrap">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filter === tab.key
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  filter === tab.key ? 'bg-yellow-500/30' : 'bg-white/10'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search campaigns…"
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/30 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-sm"
              >✕</button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
          </div>

        ) : filtered.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3">🎲</div>
            <h3 className="text-lg font-bold text-white mb-1">
              {search || filter !== 'all' ? 'No Matching Draws' : 'No Active Draws Yet'}
            </h3>
            <p className="text-white/40 text-sm mb-4">
              {search ? `No campaigns match "${search}"` : 'Create and publish a vehicle campaign to schedule its live draw.'}
            </p>
            <button onClick={() => navigate('/admin/campaigns')} className="btn-primary">
              Go to Campaigns
            </button>
          </div>

        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(c => (
              <DrawCard
                key={c.id}
                c={c}
                onLaunch={id => navigate(`/admin/draw/${id}`)}
                onViewRoom={id => window.open(`/live/${id}`, '_blank')}
              />
            ))}
          </div>
        )}

        {/* Completed Draws History */}
        {completed.length > 0 && filter !== 'DRAFT' && filter !== 'PUBLISHED' && (
          <div className="mt-10">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>🏁</span> Completed Draw History
            </h2>
            <div className="space-y-2">
              {completed.map(c => {
                const sold = c.soldTickets ?? c._count?.tickets ?? 0;
                return (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/8 rounded-xl hover:bg-white/8 transition-colors">
                    <div>
                      <p className="text-white font-semibold text-sm">{c.name}</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {sold.toLocaleString()} tickets sold · {c.ticketPrice.toLocaleString()} ETB each
                        {c.drawDate && ` · Drawn ${new Date(c.drawDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      ✓ Completed
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDraws;
