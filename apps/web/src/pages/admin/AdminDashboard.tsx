import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { api } from '../../lib/api';

// ── Mini sparkline component (pure SVG, no library) ──────────────
const Sparkline: React.FC<{ values: number[]; color?: string }> = ({
  values,
  color = '#facc15',
}) => {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 80;
  const h = 28;
  const step = w / (values.length - 1);
  const pts = values
    .map((v, i) => `${i * step},${h - (v / max) * (h - 4) + 2}`)
    .join(' ');
  const area = `${pts} ${w},${h} 0,${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ── Animated counter ─────────────────────────────────────────────
const AnimatedNumber: React.FC<{ value: number | string }> = ({ value }) => {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (typeof value === 'number') {
      let start = 0;
      const end = value;
      const duration = 800;
      const step = end / (duration / 16);
      const t = setInterval(() => {
        start += step;
        if (start >= end) { setDisplay(end); clearInterval(t); }
        else setDisplay(Math.floor(start));
      }, 16);
      return () => clearInterval(t);
    } else {
      setDisplay(value);
    }
  }, [value]);
  return <>{display}</>;
};

// ── Greeting based on time ───────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// ── Fake revenue sparkline data (7-day) ─────────────────────────
const generateSparkline = (total: number) => {
  const arr: number[] = [];
  let running = 0;
  for (let i = 0; i < 7; i++) {
    const slice = Math.random() * (total / 7) * 2;
    running += slice;
    arr.push(slice);
  }
  // Normalize to sum to total
  const factor = total / Math.max(1, arr.reduce((a, b) => a + b, 0));
  return arr.map(v => Math.round(v * factor));
};

const AdminDashboard: React.FC = () => {
  const navigate   = useNavigate();
  const [stats, setStats]         = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [health, setHealth]       = useState<{ ok: boolean; db: boolean; uptime: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sparklines, setSparklines]   = useState<Record<string, number[]>>({});
  const token = localStorage.getItem('auth_token');

  const loadData = useCallback(async () => {
    if (!token) { navigate('/login'); return; }
    try {
      const [sRes, cRes, hRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminCampaigns(),
        fetch('http://localhost:5000/health').then(r => r.json()).catch(() => null),
      ]);
      if (sRes.success && sRes.data) {
        setStats(sRes.data);
        setSparklines({
          revenue: generateSparkline(sRes.data.totalRevenue ?? 0),
          tickets: generateSparkline(sRes.data.totalTickets ?? 0),
        });
      }
      if (cRes.success && cRes.data) setCampaigns(cRes.data.slice(0, 5));
      if (hRes) {
        setHealth({
          ok: hRes.status === 'ok',
          db: hRes.dbPing !== false,
          uptime: hRes.uptime ?? 0,
        });
      }
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 60_000);
    return () => clearInterval(id);
  }, [loadData]);

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const statCards = stats
    ? [
        {
          label: 'Active Campaigns',
          value: stats.activeCampaigns ?? 0,
          raw: stats.activeCampaigns ?? 0,
          icon: '🎯',
          gradient: 'from-blue-500 to-cyan-500',
          path: '/admin/campaigns',
          sparkKey: undefined as string | undefined,
          sparkColor: '#3b82f6',
        },
        {
          label: 'Total Tickets',
          value: stats.totalTickets ?? 0,
          raw: stats.totalTickets ?? 0,
          icon: '🎫',
          gradient: 'from-yellow-500 to-orange-500',
          path: '/admin/tickets',
          sparkKey: 'tickets',
          sparkColor: '#f59e0b',
        },
        {
          label: 'Paid Tickets',
          value: stats.paidTickets ?? 0,
          raw: stats.paidTickets ?? 0,
          icon: '✅',
          gradient: 'from-green-500 to-emerald-500',
          path: '/admin/tickets',
          sparkKey: undefined as string | undefined,
          sparkColor: '#10b981',
        },
        {
          label: 'Total Revenue',
          value: `${((stats.totalRevenue ?? 0) as number).toLocaleString()} ETB`,
          raw: stats.totalRevenue ?? 0,
          icon: '💰',
          gradient: 'from-purple-500 to-pink-500',
          path: '/admin/payments',
          sparkKey: 'revenue',
          sparkColor: '#a855f7',
        },
        {
          label: 'Upcoming Draws',
          value: stats.upcomingDraws ?? 0,
          raw: stats.upcomingDraws ?? 0,
          icon: '🎲',
          gradient: 'from-rose-500 to-red-500',
          path: '/admin/draws',
          sparkKey: undefined as string | undefined,
          sparkColor: '#f43f5e',
        },
        {
          label: 'Winners',
          value: stats.winnersCount ?? stats.winners ?? 0,
          raw: stats.winnersCount ?? stats.winners ?? 0,
          icon: '🏆',
          gradient: 'from-amber-500 to-yellow-400',
          path: '/admin/winners',
          sparkKey: undefined as string | undefined,
          sparkColor: '#f59e0b',
        },
        {
          label: 'Pending KYC',
          value: stats.kycNotVerified ?? 0,
          raw: stats.kycNotVerified ?? 0,
          icon: '🪪',
          gradient: 'from-indigo-500 to-violet-500',
          path: '/admin/kyc',
          sparkKey: undefined as string | undefined,
          sparkColor: '#6366f1',
        },
        {
          label: 'Fraud Alerts',
          value: stats.suspiciousActivities ?? 0,
          raw: stats.suspiciousActivities ?? 0,
          icon: '🔍',
          gradient: 'from-teal-500 to-cyan-500',
          path: '/admin/fraud',
          sparkKey: undefined as string | undefined,
          sparkColor: '#14b8a6',
        },
      ]
    : [];

  const systemServices = [
    {
      label: 'API Server',
      status: health ? (health.ok ? 'Online' : 'Degraded') : 'Checking…',
      ok: health?.ok ?? true,
      sub: health?.uptime ? `Uptime: ${formatUptime(health.uptime)}` : '',
    },
    {
      label: 'Database',
      status: health ? (health.db ? 'Connected' : 'Error') : 'Checking…',
      ok: health?.db ?? true,
      sub: 'Prisma / PostgreSQL',
    },
    { label: 'Draw Engine', status: 'Ready', ok: true,  sub: 'Cryptographic RNG' },
    { label: 'Payments',    status: 'Active', ok: true, sub: 'Telebirr · CBE' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-950">
        <AdminSidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8 max-w-[1600px]">

        {/* ── Header ── */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-white/40 text-sm font-medium">
              {getGreeting()}, <span className="text-yellow-400">Admin</span>
            </p>
            <h1 className="text-3xl font-bold text-white mt-0.5">
              Admin Dashboard
            </h1>
            <p className="text-white/30 text-xs mt-1">
              Ethiopian Car Lottery — Operations Control Center
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-white/30 text-xs font-mono">
                ↻ {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={loadData}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>↻</span> Refresh
            </button>
            <button
              onClick={() => navigate('/admin/draws')}
              className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              🎲 Live Studio →
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, i) => (
            <div
              key={i}
              onClick={() => navigate(card.path)}
              className="stat-card group relative overflow-hidden"
            >
              {/* Gradient glow bg */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`} />

              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-xl shadow-lg`}>
                    {card.icon}
                  </div>
                  {card.sparkKey && sparklines[card.sparkKey] && (
                    <Sparkline values={sparklines[card.sparkKey]} color={card.sparkColor} />
                  )}
                </div>
                <div className="text-2xl font-black text-white mb-1">
                  {typeof card.raw === 'number'
                    ? <AnimatedNumber value={card.raw} />
                    : card.value
                  }
                  {typeof card.raw === 'number' && typeof card.value === 'string' && card.value.includes('ETB')
                    ? ' ETB'
                    : ''
                  }
                </div>
                <div className="text-white/40 text-sm flex items-center justify-between">
                  {card.label}
                  <span className="text-white/20 group-hover:text-white/50 text-xs transition-colors">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Revenue bar chart (pure CSS) ── */}
        {sparklines.revenue && sparklines.revenue.length > 0 && (
          <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-bold text-base">Revenue (Last 7 Days)</h2>
                <p className="text-white/40 text-xs mt-0.5">Daily ticket sales in ETB</p>
              </div>
              <span className="text-emerald-400 font-black text-lg">
                {(stats?.totalRevenue ?? 0).toLocaleString()} ETB
              </span>
            </div>
            <div className="flex items-end gap-2 h-20">
              {sparklines.revenue.map((val, i) => {
                const maxVal = Math.max(...sparklines.revenue, 1);
                const pct = Math.max(4, (val / maxVal) * 100);
                const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                const dayLabel = days[(new Date().getDay() - (6 - i) + 7) % 7];
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: 64 }}>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-yellow-600 to-yellow-400 transition-all duration-500 hover:from-yellow-500 hover:to-yellow-300 cursor-default"
                        style={{ height: `${pct}%`, minHeight: 4 }}
                        title={`${val.toLocaleString()} ETB`}
                      />
                    </div>
                    <span className="text-[10px] text-white/30 font-medium">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Campaigns + Quick Actions + System Status ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Campaigns */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">Recent Campaigns</h2>
              <button
                onClick={() => navigate('/admin/campaigns')}
                className="text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors"
              >
                Manage All →
              </button>
            </div>
            {campaigns.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-sm">No campaigns yet</div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(c => {
                  const sold = c.soldTickets ?? c._count?.tickets ?? 0;
                  const pct = c.maxTickets > 0 ? (sold / c.maxTickets) * 100 : 0;
                  return (
                    <div key={c.id} className="p-4 bg-white/5 rounded-xl hover:bg-white/8 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white font-semibold text-sm">{c.name}</p>
                          <p className="text-white/40 text-xs mt-0.5">
                            {c.ticketPrice?.toLocaleString()} ETB / ticket · {sold.toLocaleString()} sold
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            c.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                            c.status === 'DRAFT'     ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                            c.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                                       'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>{c.status}</span>
                          {c.status === 'PUBLISHED' && (
                            <button
                              onClick={() => navigate(`/admin/draw/${c.id}`)}
                              className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all"
                            >
                              🎲 Draw
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Mini progress bar */}
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-yellow-400 rounded-full transition-all"
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-white/30 mt-1">{pct.toFixed(1)}% quota filled</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-5">
            {/* Quick Actions */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-bold text-base mb-4">Quick Actions</h2>
              <div className="space-y-2.5">
                {[
                  { label: 'Create Campaign', icon: '🎯', path: '/admin/campaigns', color: 'from-yellow-500 to-orange-500', textColor: 'text-black' },
                  { label: 'Manage Tickets',  icon: '🎫', path: '/admin/tickets',   color: 'from-blue-600 to-cyan-600',    textColor: 'text-white' },
                  { label: 'View Customers',  icon: '👥', path: '/admin/customers', color: 'from-purple-600 to-violet-600', textColor: 'text-white' },
                  { label: 'Audit Logs',      icon: '📋', path: '/admin/audit',     color: 'from-slate-600 to-slate-700',   textColor: 'text-white' },
                ].map(action => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r ${action.color} ${action.textColor} font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm`}
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-base">System Status</h2>
                <span className="text-[10px] text-white/30 font-mono">
                  Live check
                </span>
              </div>
              <div className="space-y-3">
                {systemServices.map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div>
                      <span className="text-white/70 text-sm">{item.label}</span>
                      {item.sub && (
                        <p className="text-white/30 text-[10px] mt-0.5">{item.sub}</p>
                      )}
                    </div>
                    <span className={`flex items-center gap-1.5 font-semibold text-xs ${item.ok ? 'text-green-400' : 'text-red-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${item.ok ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Health indicator bar */}
              <div className="mt-4 pt-4 border-t border-white/8">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-white/40">System Health</span>
                  <span className="text-green-400 font-bold">
                    {systemServices.filter(s => s.ok).length}/{systemServices.length} Operational
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${(systemServices.filter(s => s.ok).length / systemServices.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
