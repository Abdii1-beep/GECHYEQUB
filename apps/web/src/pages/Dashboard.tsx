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

// ── Live Countdown Clock Component ───────────────────────────────
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
  const isImminent = time && time.total > 0 && time.total < 3_600_000;

  if (!drawDate) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
        <div className="text-white/50 text-xs flex items-center gap-2 font-medium">
          <span>⏰</span> Draw date scheduled upon final ticket milestone
        </div>
      </div>
    );
  }

  if (!time || time.total <= 0) {
    return (
      <div className="bg-red-950/60 border border-red-500/40 rounded-2xl p-3.5">
        <div className="text-red-300 font-bold text-xs flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
          Draw time has arrived! Watch the live spinning drum.
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-4 transition-all ${
      isImminent
        ? 'bg-gradient-to-r from-red-950/70 to-amber-950/70 border border-red-500/50 shadow-glow'
        : 'bg-black/50 border border-yellow-500/30'
    }`}>
      <div className="text-[10px] text-white/60 uppercase font-black tracking-wider mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-yellow-400">
          <span>⏱️</span> Time Until Guaranteed Draw
        </span>
        {isImminent && <span className="text-red-400 font-black animate-pulse">CLOSING SOON!</span>}
      </div>
      <div className="flex items-center gap-3">
        {[
          { v: time.days, l: 'Days' },
          { v: time.hours, l: 'Hrs' },
          { v: time.minutes, l: 'Min' },
          { v: time.seconds, l: 'Sec' },
        ].map(({ v, l }) => (
          <div key={l} className="text-center bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 min-w-[48px]">
            <div className={`text-xl font-black font-mono tabular-nums leading-none ${
              isImminent ? 'text-red-300' : 'text-yellow-400'
            }`}>{pad(v)}</div>
            <div className="text-[8px] uppercase tracking-wider text-white/40 font-bold mt-0.5">{l}</div>
          </div>
        ))}
        <div className="ml-auto text-right">
          <div className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Scheduled (EAT)</div>
          <div className="text-xs font-mono font-semibold text-white/80 mt-0.5">
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
  const [user, setUser]             = useState<User | null>(null);
  const [campaigns, setCampaigns]   = useState<Campaign[]>([]);
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'PAID' | 'WINNING'>('ALL');

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

  // Group user's tickets by campaign
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

  const filteredTickets = useMemo(() => {
    return tickets.filter((tk: any) => {
      if (ticketFilter === 'WINNING' && !(tk.status === 'WINNING' || tk.status === 'WON')) return false;
      if (ticketFilter === 'PAID' && tk.status !== 'PAID' && tk.status !== 'ACTIVE') return false;
      if (ticketSearch.trim()) {
        const q = ticketSearch.trim().toLowerCase();
        const pid = (tk.purchaseId || '').toLowerCase();
        const cName = (tk.LotteryCampaign?.name || '').toLowerCase();
        return pid.includes(q) || cName.includes(q);
      }
      return true;
    });
  }, [tickets, ticketFilter, ticketSearch]);

  if (loading) {
    return (
      <PageWrapper>
        <Navbar authenticated onLogout={handleLogout} />
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-14 h-14 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4" />
          <p className="text-white/50 text-sm">{t('common:loading')}</p>
        </div>
      </PageWrapper>
    );
  }

  const statusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'PAID' || s === 'ACTIVE') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    if (s === 'WINNING' || s === 'WON') return 'bg-yellow-500/25 text-yellow-300 border border-yellow-500/50 animate-pulse font-black';
    return 'bg-white/10 text-white/60 border border-white/10';
  };

  const totalInvested = userPaidCampaigns.reduce((sum, c) => sum + c.totalPaidETB, 0);

  return (
    <PageWrapper>
      <Navbar authenticated onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── LUXURY HEADER BANNER ── */}
        <div className="relative rounded-3xl bg-gradient-to-r from-dark-900 via-dark-950 to-dark-900 border border-white/10 p-6 sm:p-8 shadow-2xl overflow-hidden animate-slide-up">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 via-amber-500 to-yellow-600 flex items-center justify-center text-black font-black text-2xl shadow-glow">
                {user?.customerProfile?.fullName ? user.customerProfile.fullName.charAt(0).toUpperCase() : 'P'}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
                    {user?.customerProfile?.fullName || 'Valued Participant'}
                  </h1>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Verified ID
                  </span>
                </div>
                <p className="text-white/50 text-xs sm:text-sm mt-1">
                  National Equb Lottery Member • {user?.customerProfile?.phone || user?.email || 'Logged in'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-all flex items-center gap-2"
              >
                <span>👤</span> Account Settings
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('explore-campaigns');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-glow transition-all"
              >
                + Buy New Tickets
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/15 border border-red-500/30 text-red-300 rounded-2xl text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* ── 4 STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Registered Tickets', value: tickets.length, icon: '🎫', color: 'from-yellow-500 to-amber-600', sub: 'Cryptographically Signed' },
            { label: 'Active Entered Draws', value: userPaidCampaigns.length, icon: '🚗', color: 'from-blue-500 to-cyan-600', sub: 'Live Drum Access' },
            { label: 'Total Invested', value: `${totalInvested.toLocaleString()} ETB`, icon: '💎', color: 'from-emerald-500 to-teal-600', sub: 'Audited Pool Ledger' },
            { label: 'Verification Level', value: 'TIER-1 VERIFIED', icon: '🛡️', color: 'from-purple-500 to-indigo-600', sub: 'Prize Handover Ready' },
          ].map((stat, i) => (
            <div key={i} className="bg-dark-900/80 border border-white/10 hover:border-yellow-500/40 rounded-3xl p-5 transition-all group shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center text-xl shadow-lg`}>
                  {stat.icon}
                </div>
                <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider">Live</span>
              </div>
              <div className="text-2xl font-display font-black text-white mb-0.5 group-hover:text-yellow-400 transition-colors">
                {stat.value}
              </div>
              <div className="text-white/60 text-xs font-semibold">{stat.label}</div>
              <div className="text-white/30 text-[10px] mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* ── 🌟 FEATURED: MY PAID EQUB LOTTERY CAMPAIGNS ── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏆</span>
                <h2 className="text-2xl font-display font-black text-white">
                  My Entered Car Lotteries ({userPaidCampaigns.length})
                </h2>
              </div>
              <p className="text-white/40 text-xs mt-0.5">
                Live countdowns, your lucky numbers, and guaranteed draw dates for campaigns you entered
              </p>
            </div>

            {userPaidCampaigns.length > 0 && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Spin Room Access Unlocked
              </span>
            )}
          </div>

          {userPaidCampaigns.length === 0 ? (
            <div className="bg-dark-900/60 border border-white/10 rounded-3xl p-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mx-auto">
                🎟️
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-bold text-white mb-1">No Active Tickets Purchased Yet</h3>
                <p className="text-white/40 text-xs">
                  You haven't participated in any vehicle lottery draws yet. Choose your lucky numbers from active campaigns below to enter the live spinning drum.
                </p>
              </div>
              <button
                onClick={() => {
                  const target = document.getElementById('explore-campaigns');
                  target?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-glow hover:opacity-95"
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
                const hasWon = item.tickets.some((tk: any) => tk.status === 'WINNING' || tk.status === 'WON');
                const cashAlt = vehicle?.declaredValue ? Math.round(vehicle.declaredValue * 0.85) : Math.round(c.ticketPrice * c.maxTickets * 0.7);

                return (
                  <div
                    key={item.campaignId}
                    className={`bg-dark-900/90 border-2 rounded-3xl overflow-hidden shadow-2xl transition-all flex flex-col justify-between ${
                      hasWon
                        ? 'border-yellow-400 shadow-[0_0_40px_rgba(234,179,8,0.35)]'
                        : 'border-yellow-500/30 hover:border-yellow-400/60'
                    }`}
                  >
                    {hasWon && (
                      <div className="bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 px-4 py-2 text-center">
                        <span className="text-black font-black text-xs uppercase tracking-wider">
                          🏆 CONGRATULATIONS! YOU WON THIS DRAW! Contact us to claim your vehicle or cash! 🏆
                        </span>
                      </div>
                    )}

                    {/* Vehicle Photo Top */}
                    <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-black/60">
                      <img
                        src={carImg}
                        alt={c?.name || 'Vehicle'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/40 to-transparent" />

                      <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-yellow-400 border border-yellow-500/30">
                        🎟️ {item.tickets.length} Ticket{item.tickets.length > 1 ? 's' : ''} Owned
                      </div>

                      <div className="absolute top-3 right-3 bg-red-600/90 text-white font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        Exclusive Live Draw
                      </div>

                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-xl font-display font-black text-white leading-tight drop-shadow-md">
                          {c?.name}
                        </h3>
                        {vehicle.make && (
                          <p className="text-yellow-400 text-xs font-bold mt-0.5">
                            {vehicle.year} {vehicle.make} {vehicle.model} • {vehicle.color}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Body Info */}
                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="grid grid-cols-2 gap-3 bg-white/5 border border-white/8 rounded-2xl p-3.5 text-xs">
                        <div>
                          <span className="text-white/40 block text-[10px] uppercase font-bold">Real Car Value</span>
                          <span className="text-emerald-400 font-extrabold text-sm font-mono">
                            {vehicle.declaredValue ? `${Number(vehicle.declaredValue).toLocaleString()} ETB` : 'Market Price'}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/40 block text-[10px] uppercase font-bold">Or Cash Alternative</span>
                          <span className="text-yellow-400 font-extrabold text-sm font-mono">
                            {cashAlt.toLocaleString()} ETB
                          </span>
                        </div>
                      </div>

                      {/* Live Ticking Countdown Clock */}
                      <LiveCountdown drawDate={c?.drawDate} />

                      {/* Your Lucky Ticket Numbers */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider">
                            Your Registered Ticket Numbers:
                          </span>
                          <span className="text-emerald-400 text-[10px] font-mono font-bold">
                            Verified Ledger
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {item.tickets.map((tk: any) => (
                            <span
                              key={tk.id}
                              className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-white font-mono text-xs font-black tracking-wide"
                            >
                              🎫 {tk.purchaseId || tk.id.slice(0, 10)}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Button: Enter Live Room */}
                      <div className="pt-2">
                        <button
                          onClick={() => navigate(`/live/${item.campaignId}`)}
                          className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider shadow-glow hover:scale-[1.02] active:scale-100 transition-all flex items-center justify-center gap-2"
                        >
                          <span>🎥</span>
                          <span>ENTER LIVE SPIN ROOM (TICKET VERIFIED)</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── MY TICKETS LEDGER TABLE ── */}
        <div className="bg-dark-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🎟️</span>
                <h2 className="text-xl font-display font-black text-white">{t('dashboard:myTickets')}</h2>
              </div>
              <p className="text-white/40 text-xs mt-0.5">
                Verifiable cryptographic ledger of every lottery number issued under your account
              </p>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search ticket #..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-500 font-mono"
              />
              <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
                {(['ALL', 'PAID', 'WINNING'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTicketFilter(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      ticketFilter === tab
                        ? 'bg-yellow-500 text-black'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-xs">
              No matching tickets found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">Ticket #</th>
                    <th className="pb-3">Prize Vehicle &amp; Campaign</th>
                    <th className="pb-3">Draw Schedule</th>
                    <th className="pb-3">Ticket Price</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Live Broadcast</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTickets.map((tk: any) => {
                    const camp = tk.LotteryCampaign;
                    const campId = tk.campaignId || camp?.id;
                    const spinInfo = formatSpinDate(camp?.drawDate);

                    return (
                      <tr key={tk.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 pl-2 font-mono font-bold text-yellow-400">
                          🎫 {tk.purchaseId || tk.id.slice(0, 12)}
                        </td>
                        <td className="py-3.5 text-white font-semibold">
                          {camp?.name || 'National Vehicle Lottery'}
                        </td>
                        <td className="py-3.5 font-mono text-white/60">
                          {spinInfo.formatted}
                        </td>
                        <td className="py-3.5 font-mono font-bold text-emerald-400">
                          {camp?.ticketPrice ? `${camp.ticketPrice.toLocaleString()} ETB` : '500 ETB'}
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge(tk.status)}`}>
                            {tk.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <button
                            onClick={() => navigate(`/live/${campId}`)}
                            className="px-3 py-1.5 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/30 text-yellow-400 font-bold text-xs border border-yellow-500/30 transition-all"
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

        {/* ── BROWSE ACTIVE CAR LOTTERIES ── */}
        <div id="explore-campaigns" className="space-y-4 pt-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🚗</span>
              <h2 className="text-2xl font-display font-black text-white">
                Active Vehicle Equb Lotteries
              </h2>
            </div>
            <p className="text-white/40 text-xs mt-0.5">
              Sinotruk "Obama" Tippers, BYD Electric, and Heavy Commercial Trucks available for participation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((c: any) => {
              const soldCount = c.soldTickets ?? c._count?.tickets ?? 0;
              const remaining = c.remainingTickets ?? Math.max(0, c.maxTickets - soldCount);
              const pctSold = c.maxTickets > 0 ? (soldCount / c.maxTickets) * 100 : 0;
              const carImg = getCarImage(c.vehicles?.[0]?.images || c.images);
              const vehicle = c.vehicles?.[0];
              const cashAlt = vehicle?.declaredValue ? Math.round(vehicle.declaredValue * 0.85) : 3500000;

              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/campaign/${c.id}`)}
                  className="bg-dark-900/80 border border-white/10 hover:border-yellow-500/40 rounded-3xl overflow-hidden shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="relative h-44 w-full overflow-hidden bg-black/60">
                      <img
                        src={carImg}
                        alt={c.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-black/30" />
                      
                      <div className="absolute top-3 right-3 bg-yellow-500 px-3 py-1 rounded-full text-black font-black text-xs shadow-lg">
                        {c.ticketPrice.toLocaleString()} ETB
                      </div>

                      <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                        {remaining} Numbers Left
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <h3 className="font-display font-bold text-white text-base leading-snug line-clamp-1 group-hover:text-yellow-400 transition-colors">
                        {c.name}
                      </h3>

                      <span className="text-[11px] text-yellow-400/90 font-medium block">
                        💰 Or {cashAlt.toLocaleString()} ETB Cash Option
                      </span>

                      {/* Quota Progress */}
                      <div className="bg-white/5 border border-white/8 rounded-2xl p-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/50 text-[10px]">Quota Remaining</span>
                          <span className="text-emerald-400 font-mono font-bold text-xs">
                            {remaining.toLocaleString()} <span className="text-white/30 text-[10px]">/ {c.maxTickets.toLocaleString()}</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-yellow-400 rounded-full transition-all"
                            style={{ width: `${Math.max(3, Math.min(100, pctSold))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/campaign/${c.id}`);
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <span>Pick Lucky Numbers</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Dashboard;