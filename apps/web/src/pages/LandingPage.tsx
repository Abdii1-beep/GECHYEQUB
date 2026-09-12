import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, Campaign } from '../lib/api';
import Navbar from '../components/Navbar';
import PageWrapper from '../components/PageWrapper';

// ── Animated count-up on intersection ───────────────────────────
function useCountUp(target: number, duration = 1600) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !done.current) {
          done.current = true;
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

// ── Stat counter card ────────────────────────────────────────────
const StatCounter: React.FC<{
  value: string;
  numericPart: number;
  suffix?: string;
  label: string;
  icon: string;
}> = ({ value, numericPart, suffix = '', label, icon }) => {
  const { count, ref } = useCountUp(numericPart);
  const display = numericPart > 1000
    ? count.toLocaleString() + suffix
    : count + suffix;

  return (
    <div
      ref={ref}
      className="relative rounded-2xl bg-dark-900/60 border border-white/10 p-6 text-center hover:border-primary-500/40 transition-all duration-300 group shadow-lg"
    >
      <div className="text-3xl mb-2.5 group-hover:scale-110 transition-transform duration-200">{icon}</div>
      <div className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight group-hover:text-primary-300 transition-colors">
        {display}
      </div>
      <div className="text-xs uppercase tracking-widest text-white/50 font-semibold mt-1">{label}</div>
    </div>
  );
};

// ── Live Countdown Pill Component for Campaigns ───────────────────
const LiveCountdownPill: React.FC<{ drawDate?: string }> = ({ drawDate }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number; ended: boolean } | null>(null);

  useEffect(() => {
    if (!drawDate) return;
    const update = () => {
      const diff = new Date(drawDate).getTime() - Date.now();
      if (isNaN(diff)) return;
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0, ended: true });
        return;
      }
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000),
        ended: false,
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [drawDate]);

  if (!drawDate) {
    return (
      <span className="text-[10px] font-semibold text-yellow-300/80 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
        ⏰ Scheduled soon
      </span>
    );
  }

  if (!timeLeft) return null;

  if (timeLeft.ended) {
    return (
      <span className="text-[10px] font-bold text-red-300 bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded-full animate-pulse">
        🔴 Draw in Progress!
      </span>
    );
  }

  return (
    <span className="text-[11px] font-mono font-bold text-yellow-400 bg-black/80 border border-yellow-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
      <span>⏱️</span>
      <span>{timeLeft.d}d {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s</span>
    </span>
  );
};

// ── Winner showcase card ─────────────────────────────────────────
interface MockWinner {
  name: string;
  initials: string;
  vehicle: string;
  amount: string;
  date: string;
  location: string;
  color: string;
}

const MOCK_WINNERS: MockWinner[] = [
  { name: 'Abebe T.',    initials: 'AT', vehicle: 'Sinotruk HOWO 371 ("Obama")', amount: '18.5M ETB', date: 'Aug 2026', location: 'Addis Ababa',  color: 'from-yellow-500 to-orange-500' },
  { name: 'Tigist M.',   initials: 'TM', vehicle: 'BYD Seal AWD (Electric)',     amount: '7.5M ETB',  date: 'Jul 2026', location: 'Dire Dawa',    color: 'from-blue-500 to-cyan-500'    },
  { name: 'Henok G.',    initials: 'HG', vehicle: 'Sinotruk 8x4 Mining Tipper',  amount: '22.5M ETB', date: 'Jun 2026', location: 'Mekelle',      color: 'from-emerald-500 to-teal-500' },
  { name: 'Selam W.',    initials: 'SW', vehicle: 'Toyota Land Cruiser LC300',   amount: '16.8M ETB', date: 'May 2026', location: 'Bahir Dar',  color: 'from-purple-500 to-pink-500'  },
  { name: 'Dawit K.',    initials: 'DK', vehicle: 'BYD Song Plus Luxury SUV',    amount: '4.8M ETB',  date: 'Apr 2026', location: 'Hawassa',     color: 'from-rose-500 to-red-500'     },
];

const getCoverImage = (images: any): string => {
  if (!images) return '/hero-car.jpg';
  if (Array.isArray(images) && images.length > 0) return images[0];
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      if (parsed) return parsed;
    } catch {
      return images;
    }
  }
  return '/hero-car.jpg';
};

// ── FAQ item ─────────────────────────────────────────────────────
const FAQItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
        open ? 'border-primary-500/30 bg-primary-500/5' : 'border-white/10 bg-white/[0.03] hover:border-white/20'
      }`}
    >
      <button
        className="w-full flex items-center justify-between p-5 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-white font-semibold text-sm pr-4">{q}</span>
        <span className={`text-primary-400 text-lg flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-white/60 text-sm leading-relaxed animate-fade-in-up">
          {a}
        </div>
      )}
    </div>
  );
};

const FAQS = [
  {
    q: 'How does the remaining lottery numbers and draw alert work?',
    a: 'Every car lottery campaign has a fixed quota of numbered tickets (e.g. #001 to #1000). You can pick your specific lucky numbers or generate a Lucky Dip. Real-time counters alert you how many numbers are remaining, and a live countdown timer displays the guaranteed draw date and time.',
  },
  {
    q: 'Can the winner choose a cash alternative instead of the car?',
    a: 'Yes! All major vehicle equb draws feature a guaranteed Cash Alternative option. If you win and prefer cash, the funds are wired directly to your verified Ethiopian bank account (CBE, Awash, Dashen, etc.) within 24 hours.',
  },
  {
    q: 'Is the draw process truly transparent and fair?',
    a: 'Yes. Every draw uses a cryptographic RNG (random number generator) with a publicly verifiable SHA-256 seed. The draw result, winning ticket, and full audit trail are published on our transparency portal immediately after each draw.',
  },
  {
    q: 'How do I pay for my ticket?',
    a: 'We support Telebirr, CBE Birr, Awash Bank, and international debit/credit cards. All payments are processed securely and you receive an official verified ticket confirmation immediately.',
  },
  {
    q: 'When do draws happen?',
    a: 'Each campaign has a scheduled live draw date that is publicly announced with a live countdown clock. Once all ticket numbers are claimed, or when the timer hits zero, the live spinning drum triggers.',
  },
];

// ── Main LandingPage ─────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'navigation', 'auth', 'campaign']);
  const token = localStorage.getItem('auth_token');
  const [featuredCampaign, setFeaturedCampaign] = useState<Campaign | null>(null);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [winnerIdx, setWinnerIdx] = useState(0);

  useEffect(() => {
    api.getCampaigns().then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setAllCampaigns(res.data);
        setFeaturedCampaign(res.data[0]);
      }
    }).catch(() => {});
  }, []);

  // Auto-scroll winner strip
  useEffect(() => {
    const id = setInterval(() => {
      setWinnerIdx(i => (i + 1) % MOCK_WINNERS.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const featuredCar = featuredCampaign?.vehicles?.[0];
  const featuredCashAlt = featuredCar?.declaredValue ? Math.round(featuredCar.declaredValue * 0.85) : 3500000;
  const featuredSold = featuredCampaign?.soldTickets ?? featuredCampaign?._count?.tickets ?? 0;
  const featuredMax = featuredCampaign?.maxTickets ?? 1000;
  const featuredRemaining = featuredCampaign?.remainingTickets ?? Math.max(0, featuredMax - featuredSold);
  const featuredPercent = featuredMax > 0 ? (featuredSold / featuredMax) * 100 : 0;

  return (
    <PageWrapper>
      <Navbar authenticated={!!token} />

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative pt-10 pb-20 lg:pt-16 lg:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* Left: Text & CTAs */}
            <div className="lg:col-span-7 text-left space-y-7">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary-950/60 border border-primary-500/30 text-primary-300 backdrop-blur-md shadow-[0_0_15px_rgba(14,165,233,0.2)]">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-400" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-accent-300">
                  Official 2026 Car Lottery Draws Live
                </span>
              </div>

              <h1 className="text-5xl sm:text-6xl xl:text-7xl font-display font-extrabold text-white tracking-tight leading-[1.05]">
                Drive Away in a{' '}
                <span className="bg-gradient-to-r from-primary-400 via-sky-300 to-accent-400 bg-clip-text text-transparent drop-shadow-sm">
                  Dream Supercar.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-white/65 font-normal leading-relaxed max-w-2xl">
                Ethiopia's premier transparent vehicle equb &amp; digital car lottery. Choose your lucky numbers from remaining pool tickets, watch live countdowns to guaranteed draw dates, or take the multi-million Birr cash alternative!
              </p>

              {/* URGENCY ALERT TICKER */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-yellow-500/15 via-orange-500/10 to-transparent border border-yellow-500/30 flex items-center gap-3">
                <span className="text-2xl animate-pulse">⚡</span>
                <div className="text-xs text-white/80">
                  <span className="font-bold text-yellow-400">Guaranteed Draws Scheduled:</span> Real-time ticket scarcity alert active. Once numbers reach zero, live spinning drum triggers automatically.
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                {token ? (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500 hover:from-primary-400 hover:to-accent-400 text-white font-extrabold text-base shadow-[0_0_25px_rgba(14,165,233,0.45)] hover:shadow-[0_0_35px_rgba(14,165,233,0.65)] hover:scale-[1.02] active:scale-100 transition-all flex items-center gap-2.5"
                  >
                    <span>My Entered Draws &amp; Tickets</span>
                    <span className="text-lg">→</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('/register')}
                      className="px-8 py-4 rounded-2xl bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500 hover:from-primary-400 hover:to-accent-400 text-white font-extrabold text-base shadow-[0_0_25px_rgba(14,165,233,0.45)] hover:shadow-[0_0_35px_rgba(14,165,233,0.65)] hover:scale-[1.02] active:scale-100 transition-all flex items-center gap-2.5"
                    >
                      <span>Claim Your Lucky Numbers</span>
                      <span className="text-lg">🎟️</span>
                    </button>
                    <button
                      onClick={() => navigate('/login')}
                      className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/90 font-bold text-base hover:border-white/30 transition-all"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-white/50">
                {['National Lottery Licensed', 'Instant Telebirr & CBE Payment', 'Cryptographic Provably Fair RNG'].map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-accent-400 text-sm">✓</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Featured Hero Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-primary-400/40 via-yellow-400/20 to-accent-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                <div className="relative rounded-[23px] bg-dark-900/90 backdrop-blur-2xl overflow-hidden">
                  <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-black">
                    <img
                      src={getCoverImage(featuredCampaign?.vehicles?.[0]?.images)}
                      alt="Luxury Grand Prize Vehicle"
                      className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-black/30" />
                    
                    <div className="absolute top-4 left-4 bg-dark-950/80 backdrop-blur-md border border-accent-400/40 px-3 py-1 rounded-full text-accent-300 text-xs font-extrabold flex items-center gap-1.5 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
                      FEATURED GRAND PRIZE
                    </div>

                    <div className="absolute top-4 right-4 bg-yellow-500/90 backdrop-blur-md px-3 py-1 rounded-full text-black font-black text-xs shadow-lg">
                      {featuredCampaign ? `${featuredCampaign.ticketPrice.toLocaleString()} ETB` : '500 ETB'}
                    </div>

                    {/* Live Draw Date countdown pill on image */}
                    <div className="absolute bottom-3 left-4">
                      <LiveCountdownPill drawDate={featuredCampaign?.drawDate} />
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-display font-extrabold text-white">
                          {featuredCampaign ? featuredCampaign.name : 'Rimac Nevera Hypercar'}
                        </h2>
                        <p className="text-sm text-white/50 mt-0.5">
                          {featuredCar
                            ? `${featuredCar.make} ${featuredCar.model} (${featuredCar.year})`
                            : 'Brand New Edition • Custom Luxury Spec'}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {featuredCampaign?.status || 'Active Draw'}
                      </span>
                    </div>

                    {/* Cash Alternative Callout */}
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs">
                      <span className="text-white/60 flex items-center gap-1.5">
                        <span>💰</span> Winner Choice Perk:
                      </span>
                      <span className="font-bold text-yellow-400">
                        Or {featuredCashAlt.toLocaleString()} ETB Cash
                      </span>
                    </div>

                    {/* Scarcity & Progress bar */}
                    {featuredCampaign && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-white/60">Tickets Remaining</span>
                          <span className="text-emerald-400 font-bold">
                            {featuredRemaining.toLocaleString()}{' '}
                            <span className="text-white/40 font-normal">/ {featuredMax.toLocaleString()} Total</span>
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-sky-400 to-yellow-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                            style={{ width: `${Math.max(2, Math.min(100, featuredPercent))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => navigate(featuredCampaign ? `/campaign/${featuredCampaign.id}` : '/register')}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all flex items-center justify-center gap-2"
                    >
                      <span>Pick Your Lucky Numbers</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ANIMATED STATS ─────────────────────────────────────── */}
      <section className="relative py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCounter value="10,000+" numericPart={10000} suffix="+" label="Verified Tickets" icon="🎫" />
            <StatCounter value="48+"     numericPart={48}    suffix="+"  label="Luxury Winners"  icon="🏆" />
            <StatCounter value="25M ETB" numericPart={25}    suffix="M ETB" label="Prizes Awarded" icon="💎" />
            <StatCounter value="100%"    numericPart={100}   suffix="%" label="Verifiable Fair Draw" icon="🛡️" />
          </div>
        </div>
      </section>

      {/* ── WINNER SHOWCASE STRIP ──────────────────────────────── */}
      <section className="py-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-xs font-extrabold uppercase tracking-widest text-yellow-400 bg-yellow-500/10 px-3.5 py-1.5 rounded-full border border-yellow-500/20">
              🏆 Recent Handover Ceremonies
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white mt-3">
              Real Winners, Verified Handover
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-dark-950 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-dark-950 to-transparent z-10 pointer-events-none" />

            <div className="flex gap-4 overflow-hidden">
              {[...MOCK_WINNERS, ...MOCK_WINNERS].map((w, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-64 bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-yellow-500/30 transition-all"
                  style={{
                    transform: `translateX(calc(-${winnerIdx * 272}px))`,
                    transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${w.color} flex items-center justify-center text-white font-black text-sm shadow-lg`}>
                      {w.initials}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{w.name}</p>
                      <p className="text-white/40 text-xs">{w.location} · {w.date}</p>
                    </div>
                  </div>
                  <p className="text-white/70 text-xs font-medium mb-2 line-clamp-1">🚛 {w.vehicle}</p>
                  <div className="text-emerald-400 font-black text-lg">{w.amount}</div>
                  <div className="text-white/30 text-[10px] mt-1">Prize / Cash Alt Value</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {MOCK_WINNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setWinnerIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === winnerIdx % MOCK_WINNERS.length ? 'bg-yellow-400 w-6' : 'bg-white/20'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── ACTIVE LOTTERIES & REMAINING NUMBERS GRID ─────────────── */}
      {allCampaigns.length > 0 && (
        <section className="py-20 relative bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                Live Lotteries &amp; Ticket Pools
              </span>
              <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white">
                Active Vehicle Draws &amp; Ticket Scarcity
              </h2>
              <p className="text-white/60 text-sm">
                Pick your specific lucky numbers before each pool closes. Real-time ticket scarcity and draw schedules updated live.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCampaigns.map((c) => {
                const soldCount = c.soldTickets ?? c._count?.tickets ?? 0;
                const totalTickets = c.maxTickets;
                const remainingCount = c.remainingTickets ?? Math.max(0, totalTickets - soldCount);
                const percentSold = totalTickets > 0 ? (soldCount / totalTickets) * 100 : 0;
                const car = c.vehicles && c.vehicles.length > 0 ? c.vehicles[0] : null;
                const carImg = getCoverImage(car?.images);
                const isLowStock = percentSold >= 70 || remainingCount <= 100;
                const cashAlt = car?.declaredValue ? Math.round(car.declaredValue * 0.85) : 3500000;

                return (
                  <div
                    key={c.id}
                    className="relative rounded-3xl bg-dark-900/80 border border-white/10 hover:border-primary-500/40 transition-all duration-300 overflow-hidden flex flex-col group shadow-xl hover:-translate-y-1"
                  >
                    <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-black/60">
                      <img
                        src={carImg}
                        alt={c.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1200&auto=format&fit=crop';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-black/30" />
                      
                      <div className="absolute top-3 right-3 bg-yellow-500/90 backdrop-blur-md px-3 py-1 rounded-full text-black font-black text-xs shadow-lg">
                        {c.ticketPrice.toLocaleString()} ETB / ticket
                      </div>

                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/75 backdrop-blur-md text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {c.status}
                        </span>
                        {isLowStock && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/80 text-white shadow-md animate-pulse">
                            🔥 Closing Soon!
                          </span>
                        )}
                      </div>

                      {/* Live Countdown Pill */}
                      <div className="absolute bottom-3 left-3">
                        <LiveCountdownPill drawDate={c.drawDate} />
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="text-lg font-display font-bold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                          {c.name}
                        </h3>
                        {car && (
                          <p className="text-xs text-white/50 mt-1">
                            🚗 {car.make} {car.model} ({car.year}) • {car.declaredValue ? `${car.declaredValue.toLocaleString()} ETB` : ''}
                          </p>
                        )}
                        <span className="text-[11px] text-yellow-400/90 font-medium block mt-1">
                          💰 Or {cashAlt.toLocaleString()} ETB Cash Option
                        </span>
                      </div>

                      <div className="bg-white/5 border border-white/8 rounded-2xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">Remaining Numbers</span>
                          <span className="text-emerald-400 font-black text-sm font-mono">
                            {remainingCount.toLocaleString()} <span className="text-[10px] text-white/40 font-normal">/ {totalTickets.toLocaleString()}</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-yellow-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(3, Math.min(100, percentSold))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
                          <span>{soldCount.toLocaleString()} Tickets Sold</span>
                          <span className="text-emerald-400 font-bold">{remainingCount} Left</span>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/campaign/${c.id}`)}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <span>Select Lucky Numbers ({c.ticketPrice} ETB)</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary-400 bg-primary-500/10 px-3.5 py-1.5 rounded-full border border-primary-500/20">
              Simple 3-Step Process
            </span>
            <h2 className="text-4xl sm:text-5xl font-display font-extrabold text-white">
              How To Win Your Vehicle
            </h2>
            <p className="text-white/60 text-base">
              Participating is quick, 100% digital, and protected by tamper-proof cryptographic audit trails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Choose a Campaign',  desc: 'Browse our list of verified car lottery campaigns and select the vehicle you want to drive.', icon: '🏎️' },
              { step: '02', title: 'Pick Your Numbers',   desc: 'Select your specific lucky numbers or generate Lucky Dips. Pay instantly via Telebirr or CBE.', icon: '💳' },
              { step: '03', title: 'Watch Live Draw',    desc: 'Tune into our live broadcast. Every draw is cryptographically certified for total transparency.', icon: '🎉' },
            ].map((item, index) => (
              <div
                key={index}
                className="relative rounded-3xl bg-dark-900/50 border border-white/10 p-8 hover:border-primary-400/40 transition-all duration-300 hover:-translate-y-1 shadow-card"
              >
                <div className="flex justify-between items-center mb-6">
                  <span className="text-4xl">{item.icon}</span>
                  <span className="text-4xl font-display font-black text-white/15">{item.step}</span>
                </div>
                <h3 className="text-xl font-display font-bold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQS ───────────────────────────────────────────────── */}
      <section className="py-20 relative border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center mb-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary-400 bg-primary-500/10 px-3.5 py-1.5 rounded-full border border-primary-500/20">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl font-display font-extrabold text-white mt-3">
              Clear, Audited &amp; Transparent Rules
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

    </PageWrapper>
  );
}