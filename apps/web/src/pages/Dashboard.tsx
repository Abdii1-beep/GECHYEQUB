import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, User, Campaign, Ticket } from '../lib/api';
import Navbar from '../components/Navbar';
import PageWrapper from '../components/PageWrapper';

const getCarImage = (images: any): string => {
  if (!images) return '/hero-car.jpg';
  if (Array.isArray(images) && images.length > 0) return images[0];
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      return parsed || images;
    } catch {
      return images;
    }
  }
  return '/hero-car.jpg';
};

const formatSpinDate = (dateStr?: string): { formatted: string; isPast: boolean; diffMs: number } => {
  if (!dateStr) return { formatted: 'To Be Announced by Admin', isPast: false, diffMs: 0 };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { formatted: 'To Be Announced', isPast: false, diffMs: 0 };
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const formatted = d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return { formatted, isPast: diffMs <= 0, diffMs };
};

// ── Live Countdown Component ─────────────────────────────────────
const LiveCountdown: React.FC<{ drawDate?: string }> = ({ drawDate }) => {
  const calc = useCallback(() => {
    if (!drawDate) return null;
    const diff = new Date(drawDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: diff };
    return {
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1_000),
      total:   diff,
    };
  }, [drawDate]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    setTime(calc());
    const id = setInterval(() => setTime(calc()), 1_000);
    return () => clearInterval(id);
  }, [calc]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const isImminent = time && time.total > 0 && time.total < 3_600_000; // <1h

  if (!drawDate) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
        <div className="text-white/40 italic text-xs flex items-center gap-1.5">⏰ Draw date not yet set</div>
      </div>
    );
  }

  if (!time || time.total <= 0) {
    return (
      <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-3.5">
        <div className="text-red-300 font-bold text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          Draw time has arrived! Watch the live room.
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-3.5 ${
      isImminent
        ? 'bg-red-950/60 border border-red-500/40'
        : time.total < 86_400_000
        ? 'bg-amber-950/50 border border-amber-500/30'
        : 'bg-yellow-500/8 border border-yellow-500/25'
    }`}>
      <div className="text-[10px] text-white/50 uppercase font-semibold mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1">⏰ Time Until Draw</span>
        {isImminent && <span className="text-red-400 font-black animate-pulse">STARTING SOON!</span>}
      </div>
      <div className="flex items-center gap-3">
        {[{ v: time.days, l: 'Days' }, { v: time.hours, l: 'Hrs' }, { v: time.minutes, l: 'Min' }, { v: time.seconds, l: 'Sec' }].map(({ v, l }) => (
          <div key={l} className="text-center">
            <div className={`text-xl font-black font-mono tabular-nums leading-none ${
              isImminent ? 'text-red-300' : time.total < 86_400_000 ? 'text-amber-300' : 'text-yellow-300'
            }`}>{pad(v)}</div>
            <div className="text-[9px] uppercase tracking-wider text-white/40 font-semibold mt-0.5">{l}</div>
          </div>
        ))}
        <div className="ml-auto text-right">
          <div className="text-[10px] text-white/30 font-semibold uppercase">Scheduled</div>
          <div className="text-xs font-mono text-white/60 mt-0.5">
            {new Date(drawDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'navigation', 'dashboard', 'profile', 'campaign']);
  const [user, setUser]         = useState<User | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) { navigate('/login'); return; }
      try {
        const [uRes, cRes, tRes] = await Promise.all([
          api.getCurrentUser(),
          api.getCampaigns(),
          api.getMyTickets(),
        ]);
        if (uRes.success && uRes.data) setUser(uRes.data);
        if (cRes.success && cRes.data) {
          setCampaigns(Array.isArray(cRes.data) ? cRes.data : []);
        }
        if (tRes.success && tRes.data) {
          setTickets(Array.isArray(tRes.data) ? tRes.data : []);
        }
      } catch {
        setError(t('common:error'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate, t]);

  // Group user's paid tickets by campaign to show all details and spin date/time
  const userPaidCampaigns = useMemo(() => {
    if (!Array.isArray(tickets)) return [];
    const map = new Map<string, {
      campaignId: string;
      campaign: any;
      tickets: any[];
      totalPaidETB: number;
    }>();

    tickets.forEach((tk: any) => {
      const camp = tk.LotteryCampaign;
      const campId = tk.campaignId || camp?.id;
      if (!campId) return;

      if (!map.has(campId)) {
        const fullCamp = campaigns.find(c => c.id === campId) || camp || {
          id: campId,
          name: 'National Vehicle Equb Lottery',
          ticketPrice: 500,
        };
        map.set(campId, {
          campaignId: campId,
          campaign: fullCamp,
          tickets: [],
          totalPaidETB: 0,
        });
      }

      const item = map.get(campId)!;
      item.tickets.push(tk);
      item.totalPaidETB += (item.campaign?.ticketPrice || tk.LotteryCampaign?.ticketPrice || 0);
    });

    return Array.from(map.values());
  }, [tickets, campaigns]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) {
    return (
      <PageWrapper>
        <Navbar authenticated onLogout={handleLogout} />
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-14 h-14 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4" />
          <p className="text-white/50 text-sm">{t('common:loading')}</p>
        </div>
      </PageWrapper>
    );
  }

  const statusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'PAID' || s === 'ACTIVE') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    if (s === 'WINNING' || s === 'WON') return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 animate-pulse';
    return 'bg-white/10 text-white/60 border border-white/10';
  };

  return (
    <PageWrapper>
      <Navbar authenticated onLogout={handleLogout} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ── Page header ── */}
        <div className="mb-8 animate-slide-up flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-1">
              {t('dashboard:title')}
            </h1>
            <p className="text-white/45 text-sm">
              Welcome back,{' '}
              <span className="text-primary-400 font-semibold">{user?.customerProfile?.fullName || 'Participant'}</span>
              {user?.customerProfile?.phone && (
                <span className="text-white/30 ml-2 font-mono">({user.customerProfile.phone})</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>👤</span> Edit Profile
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('dashboard:myTickets'),       value: Array.isArray(tickets) ? tickets.length : 0,   icon: '🎟️', color: 'from-primary-500 to-primary-700' },
            { label: 'Paid Campaigns',                value: userPaidCampaigns.length,                       icon: '🚗', color: 'from-accent-500 to-accent-700' },
            { label: 'Total Invested',                value: `${userPaidCampaigns.reduce((sum, c) => sum + c.totalPaidETB, 0).toLocaleString()} ETB`, icon: '💎', color: 'from-emerald-500 to-teal-700' },
            { label: 'Verified Status',               value: user?.emailVerified ? 'VERIFIED' : 'ACTIVE', icon: '🛡️', color: 'from-violet-500 to-indigo-700' },
          ].map((stat, i) => (
            <div key={i} className="glass glass-hover rounded-2xl p-5 animate-scale-in" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-xl mb-3 shadow-glow`}>
                {stat.icon}
              </div>
              <div className="text-2xl font-display font-bold gradient-text mb-0.5">{stat.value}</div>
              <div className="text-white/45 text-xs font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── 🌟 FEATURED: MY PAID EQUB CAMPAIGNS (EXCLUSIVE CAR LOTTERIES) ── */}
        <div className="mb-10 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-black font-black text-lg shadow-glow">
                🚗
              </div>
              <div>
                <h2 className="text-2xl font-display font-extrabold text-white">
                  My Entered Equb Campaigns <span className="text-yellow-400 text-sm font-semibold">({userPaidCampaigns.length} Paid)</span>
                </h2>
                <p className="text-white/40 text-xs">
                  All vehicle lotteries you have purchased tickets for. Only ticket holders can enter the live spinning drum.
                </p>
              </div>
            </div>
            {userPaidCampaigns.length > 0 && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                ✓ Live Draw Room Access Unlocked
              </span>
            )}
          </div>

          {userPaidCampaigns.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center border border-white/10">
              <div className="text-5xl mb-3">🎟️</div>
              <h3 className="text-lg font-bold text-white mb-1">No Active Tickets Purchased Yet</h3>
              <p className="text-white/40 text-xs max-w-md mx-auto mb-5">
                You haven't bought lottery tickets for any vehicle equb yet. Explore our live campaigns below to claim your ticket and join the live spinning drum.
              </p>
              <button
                onClick={() => {
                  const target = document.getElementById('explore-campaigns');
                  target?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold text-xs shadow-glow hover:scale-105 transition-transform"
              >
                Browse Available Vehicles ↓
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userPaidCampaigns.map((item) => {
                const c = item.campaign;
                const vehicle = c?.vehicles?.[0] || {};
                const carImg = getCarImage(vehicle.images || c?.images);
                const spinInfo = formatSpinDate(c?.drawDate);
                const isImminentDraw = c?.drawDate && (new Date(c.drawDate).getTime() - Date.now()) < 3_600_000 && (new Date(c.drawDate).getTime() - Date.now()) > 0;
                const hasWon = item.tickets.some((tk: any) => tk.status === 'WINNING' || tk.status === 'WON');

                return (
                  <div
                    key={item.campaignId}
                    className={`bg-gradient-to-b from-gray-900 via-gray-950 to-black rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 group flex flex-col justify-between ${
                      hasWon
                        ? 'border-2 border-yellow-400 shadow-[0_0_40px_rgba(234,179,8,0.3)]'
                        : isImminentDraw
                        ? 'border-2 border-red-500/70 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                        : 'border-2 border-yellow-500/30 hover:border-yellow-400/60'
                    }`}
                  >
                    {/* Winner Banner */}
                    {hasWon && (
                      <div className="bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 px-4 py-2 text-center">
                        <span className="text-black font-black text-sm tracking-wide">🏆 YOU WON THIS DRAW! Contact support to claim your prize. 🏆</span>
                      </div>
                    )}

                    {/* Draw imminent banner */}
                    {isImminentDraw && !hasWon && (
                      <div className="bg-red-600/90 px-4 py-2 text-center animate-pulse">
                        <span className="text-white font-black text-xs tracking-wide">🔴 DRAW STARTING IN LESS THAN 1 HOUR — Enter the Live Room Now!</span>
                      </div>
                    )}

                    {/* Vehicle Header Banner */}
                    <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-black/40">
                      <img
                        src={carImg}
                        alt={c?.name || 'Vehicle'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />

                      {/* Live Badge */}
                      <div className="absolute top-3 right-3">
                        <span className="px-3 py-1 rounded-full bg-red-600/90 text-white font-black text-[10px] tracking-wider uppercase shadow-lg flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          Exclusive Live Draw
                        </span>
                      </div>

                      {/* Ticket Count Badge */}
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-yellow-300 font-bold text-xs flex items-center gap-1.5">
                          🎟️ {item.tickets.length} Ticket{item.tickets.length > 1 ? 's' : ''} Owned
                        </span>
                      </div>

                      {/* Bottom Info on Image */}
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-lg sm:text-xl font-display font-black text-white leading-tight drop-shadow-md">
                          {c?.name}
                        </h3>
                        {vehicle.make && (
                          <p className="text-yellow-400 text-xs font-semibold mt-0.5">
                            {vehicle.year || '2025'} {vehicle.make} {vehicle.model}
                            {vehicle.color ? ` • ${vehicle.color}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Details Body */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      {/* Vehicle Value & Quota details */}
                      <div className="grid grid-cols-2 gap-3 bg-white/5 border border-white/8 rounded-2xl p-3.5 text-xs">
                        <div>
                          <span className="text-white/40 block text-[10px] uppercase font-semibold">Real Car Value</span>
                          <span className="text-emerald-400 font-extrabold text-sm font-mono">
                            {vehicle.declaredValue ? `${Number(vehicle.declaredValue).toLocaleString()} ETB` : 'Market Price'}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/40 block text-[10px] uppercase font-semibold">Total Paid</span>
                          <span className="text-yellow-400 font-extrabold text-sm font-mono">
                            {item.totalPaidETB.toLocaleString()} ETB
                          </span>
                        </div>
                      </div>

                      {/* Live Countdown Clock */}
                      <LiveCountdown drawDate={c?.drawDate} />

                      {/* User's Ticket Numbers List */}
                      <div>
                        <span className="text-white/50 text-[11px] font-semibold uppercase block mb-1.5">
                          Your Official Ticket Numbers:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                          {item.tickets.map((tk: any) => (
                            <span
                              key={tk.id}
                              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg text-white font-mono text-[11px] font-bold tracking-wide"
                            >
                              {tk.purchaseId || tk.id.slice(0, 10)}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Button: ENTER LIVE SPIN ROOM */}
                      <div className="pt-2">
                        <button
                          onClick={() => navigate(`/live/${item.campaignId}`)}
                          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-sm shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] hover:scale-[1.02] active:scale-100 transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-base">🎥</span>
                          <span>ENTER LIVE SPIN ROOM (TICKET VERIFIED)</span>
                          <span className="text-base">→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── My All Tickets Portfolio ── */}
        <div className="glass glass-hover rounded-2xl p-6 mb-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="section-icon bg-gradient-to-br from-accent-500 to-accent-700 shadow-glow-accent">🎟️</div>
              <div>
                <h2 className="text-xl font-display font-bold text-white">{t('dashboard:myTickets')}</h2>
                <p className="text-white/40 text-xs">Complete cryptographic ledger of your issued vehicle lottery tickets</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-white/50 px-3 py-1 bg-white/5 rounded-xl">
              {tickets.length} Registered Tickets
            </span>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <div className="text-5xl mb-3">🎫</div>
              <p>{t('dashboard:noTickets')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-white/40 uppercase font-semibold">
                    <th className="py-3 px-3 text-left">Ticket Number</th>
                    <th className="py-3 px-3 text-left">Prize Vehicle & Campaign</th>
                    <th className="py-3 px-3 text-left">Scheduled Spin Date</th>
                    <th className="py-3 px-3 text-left">Price Paid</th>
                    <th className="py-3 px-3 text-left">Ticket Status</th>
                    <th className="py-3 px-3 text-right">Live Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tickets.map((tk: any) => {
                    const camp = tk.LotteryCampaign;
                    const campId = tk.campaignId || camp?.id;
                    const spinInfo = formatSpinDate(camp?.drawDate);

                    return (
                      <tr key={tk.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-yellow-400">
                          {tk.purchaseId || tk.id.slice(0, 12)}
                        </td>
                        <td className="py-3 px-3 text-white font-medium max-w-xs truncate">
                          {camp?.name || 'National Vehicle Lottery'}
                        </td>
                        <td className="py-3 px-3 text-white/60 font-mono">
                          {spinInfo.formatted}
                        </td>
                        <td className="py-3 px-3 text-emerald-400 font-bold font-mono">
                          {camp?.ticketPrice ? `${camp.ticketPrice.toLocaleString()} ETB` : '500 ETB'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge(tk.status)}`}>
                            {tk.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => navigate(`/live/${campId}`)}
                            className="px-3 py-1 bg-yellow-500/15 hover:bg-yellow-500/30 text-yellow-300 font-bold text-xs rounded-lg border border-yellow-500/30 transition-colors"
                          >
                            Watch Live 🎥
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Browse All Available Car Lotteries ── */}
        <div id="explore-campaigns" className="glass glass-hover rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="section-icon bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow">🎯</div>
            <div>
              <h2 className="text-xl font-display font-bold text-white">All Active Commercial Vehicle Lotteries</h2>
              <p className="text-white/40 text-xs">Sinotruk "Obama" Tippers, BYD Electric, and Heavy Commercial Trucks</p>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <div className="text-5xl mb-3">🎫</div>
              <p>{t('dashboard:noActiveCampaigns')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((c: any) => {
                const soldCount = c.soldTickets ?? c._count?.tickets ?? 0;
                const remaining = c.remainingTickets ?? Math.max(0, c.maxTickets - soldCount);
                const pctSold = c.maxTickets > 0 ? (soldCount / c.maxTickets) * 100 : 0;
                const spinInfo = formatSpinDate(c.drawDate);
                const carImg = getCarImage(c.vehicles?.[0]?.images || c.images);

                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/campaign/${c.id}`)}
                    className="bg-white/5 border border-white/8 rounded-xl p-4 cursor-pointer hover:bg-white/10 hover:border-primary-500/30 hover:shadow-glow transition-all duration-200 group flex flex-col justify-between"
                  >
                    <div>
                      {/* Mini Thumbnail */}
                      <div className="h-32 w-full rounded-lg overflow-hidden mb-3 bg-black/40 relative">
                        <img src={carImg} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] font-bold text-yellow-300">
                          {c.ticketPrice} ETB
                        </div>
                      </div>

                      <h3 className="font-display font-bold text-white group-hover:text-primary-300 transition-colors text-sm leading-snug line-clamp-2 mb-2">
                        {c.name}
                      </h3>

                      {/* Remaining Quota Bar */}
                      <div className="bg-black/30 border border-white/5 rounded-lg p-2.5 mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/50 text-[10px]">Quota Remaining</span>
                          <span className="text-emerald-400 font-bold text-xs">{remaining.toLocaleString()} <span className="text-white/30 text-[10px]">/ {c.maxTickets?.toLocaleString()}</span></span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(3, Math.min(100, pctSold))}%` }}
                          />
                        </div>
                      </div>

                      {/* Scheduled Spin Date */}
                      <div className="text-[11px] text-white/50 mb-3 flex items-center gap-1.5">
                        <span>🕒</span>
                        <span>Spin Due: <strong className="text-white/80">{spinInfo.formatted}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/campaign/${c.id}`);
                        }}
                        className="text-xs font-bold text-yellow-400 hover:text-yellow-300"
                      >
                        Buy Ticket 🎟️
                      </button>
                      <span className="text-primary-400 text-xs font-medium group-hover:translate-x-0.5 transition-transform">
                        Details →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default Dashboard;