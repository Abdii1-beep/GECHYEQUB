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
            // Ease-out cubic
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
  { name: 'Abebe T.',    initials: 'AT', vehicle: 'Sinotruk HOWO 371',     amount: '18.5M ETB', date: 'Aug 2026', location: 'Addis Ababa',  color: 'from-yellow-500 to-orange-500' },
  { name: 'Tigist M.',   initials: 'TM', vehicle: 'BYD Han EV (Luxury)',    amount: '4.2M ETB',  date: 'Jul 2026', location: 'Dire Dawa',    color: 'from-blue-500 to-cyan-500'    },
  { name: 'Henok G.',    initials: 'HG', vehicle: 'Sinotruk 8x4 Mining',   amount: '22.5M ETB', date: 'Jun 2026', location: 'Mekelle',      color: 'from-emerald-500 to-teal-500' },
  { name: 'Selam W.',    initials: 'SW', vehicle: 'Toyota Land Cruiser LC300', amount: '7.8M ETB', date: 'May 2026', location: 'Bahir Dar',  color: 'from-purple-500 to-pink-500'  },
  { name: 'Dawit K.',    initials: 'DK', vehicle: 'BYD Seal Sport',         amount: '5.1M ETB',  date: 'Apr 2026', location: 'Hawassa',     color: 'from-rose-500 to-red-500'     },
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
    q: 'Is the draw process truly transparent and fair?',
    a: 'Yes. Every draw uses a cryptographic RNG (random number generator) with a publicly verifiable hash. The draw result, winning ticket, and full audit trail are published on our transparency portal immediately after each draw.',
  },
  {
    q: 'How do I pay for my ticket?',
    a: 'We support Telebirr, CBE Birr, and bank transfer. All payments are processed securely and you receive an OTP-verified ticket confirmation immediately.',
  },
  {
    q: 'When do draws happen?',
    a: 'Each campaign has a scheduled live draw date that is publicly announced. You can watch the live draw in real-time from our platform. Draw times are set by admin and visible on each campaign page.',
  },
  {
    q: 'How do I claim my prize if I win?',
    a: 'Winners are notified instantly via SMS and email. Our team contacts you within 24 hours to arrange vehicle transfer, documentation, and handover at a certified location.',
  },
  {
    q: 'Can I buy multiple tickets for the same campaign?',
    a: 'Yes, you can purchase multiple tickets to increase your chances. Each ticket is independently numbered and eligible for the draw.',
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

  return (
    <PageWrapper>
      <Navbar authenticated={!!token} />

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-24 lg:pt-16 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* Left: Text & CTAs */}
            <div className="lg:col-span-7 text-left space-y-8">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary-950/60 border border-primary-500/30 text-primary-300 backdrop-blur-md shadow-[0_0_15px_rgba(14,165,233,0.2)]">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-400" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-accent-300">
                  Exclusive 2026 Car Draws Live
                </span>
              </div>

              <h1 className="text-5xl sm:text-6xl xl:text-7xl font-display font-extrabold text-white tracking-tight leading-[1.05]">
                Drive Away in a{' '}
                <span className="bg-gradient-to-r from-primary-400 via-sky-300 to-accent-400 bg-clip-text text-transparent drop-shadow-sm">
                  Dream Supercar.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-white/60 font-normal leading-relaxed max-w-2xl">
                Ethiopia's premier transparent vehicle equb &amp; digital lottery platform. Buy your official ticket starting at just 500 ETB and participate in fully audited, transparent vehicle equb draws.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                {token ? (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500 hover:from-primary-400 hover:to-accent-400 text-white font-extrabold text-base shadow-[0_0_25px_rgba(14,165,233,0.45)] hover:shadow-[0_0_35px_rgba(14,165,233,0.65)] hover:scale-[1.02] active:scale-100 transition-all flex items-center gap-2.5"
                  >
                    <span>Go to Dashboard</span>
                    <span className="text-lg">→</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('/register')}
                      className="px-8 py-4 rounded-2xl bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500 hover:from-primary-400 hover:to-accent-400 text-white font-extrabold text-base shadow-[0_0_25px_rgba(14,165,233,0.45)] hover:shadow-[0_0_35px_rgba(14,165,233,0.65)] hover:scale-[1.02] active:scale-100 transition-all flex items-center gap-2.5"
                    >
                      <span>Claim Your Ticket Now</span>
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
                {['National Lottery Licensed', 'Instant Telebirr & CBE Payment', 'Cryptographic Fair Draw'].map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-accent-400 text-sm">✓</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Hero card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-primary-400/40 via-white/10 to-accent-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
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
                      GRAND PRIZE CAMPAIGN
                    </div>
                    <div className="absolute top-4 right-4 bg-primary-500/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold shadow-lg">
                      {featuredCampaign ? `${featuredCampaign.ticketPrice.toLocaleString()} ETB` : '500 ETB'}
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-display font-extrabold text-white">
                          {featuredCampaign ? featuredCampaign.name : 'Rimac Nevera Hypercar'}
                        </h2>
                        <p className="text-sm text-white/50 mt-0.5">
                          {featuredCampaign?.vehicles?.[0]
                            ? `${featuredCampaign.vehicles[0].make} ${featuredCampaign.vehicles[0].model} (${featuredCampaign.vehicles[0].year})`
                            : 'Brand New • 2026 Edition • Custom Luxury Spec'}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {featuredCampaign?.status || 'Active Draw'}
                      </span>
                    </div>

                    {featuredCampaign && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-white/60">Tickets Remaining</span>
                          <span className="text-emerald-400 font-bold">
                            {(featuredCampaign.remainingTickets ?? Math.max(0, featuredCampaign.maxTickets - (featuredCampaign.soldTickets ?? featuredCampaign._count?.tickets ?? 0))).toLocaleString()}{' '}
                            <span className="text-white/40 font-normal">/ {featuredCampaign.maxTickets.toLocaleString()} Total</span>
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-sky-400 to-accent-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                            style={{
                              width: `${Math.max(2, Math.min(100, (((featuredCampaign.soldTickets ?? featuredCampaign._count?.tickets ?? 0) / (featuredCampaign.maxTickets || 1)) * 100)))}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => navigate(featuredCampaign ? `/campaign/${featuredCampaign.id}` : '/register')}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all flex items-center justify-center gap-2"
                    >
                      <span>Participate in this Draw</span>
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
            <StatCounter value="100%"    numericPart={100}   suffix="%" label="On-Chain Proof" icon="🛡️" />
          </div>
        </div>
      </section>

      {/* ── WINNER SHOWCASE STRIP ──────────────────────────────── */}
      <section className="py-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-xs font-extrabold uppercase tracking-widest text-yellow-400 bg-yellow-500/10 px-3.5 py-1.5 rounded-full border border-yellow-500/20">
              🏆 Recent Winners
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white mt-3">
              Real People, Real Prizes
            </h2>
          </div>

          <div className="relative">
            {/* Gradient masks */}
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
                  <div className="text-white/30 text-[10px] mt-1">Prize Value</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots nav */}
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

      {/* ── ACTIVE LOTTERIES ───────────────────────────────────── */}
      {allCampaigns.length > 0 && (
        <section className="py-20 relative bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                Live Lotteries
              </span>
              <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white">
                Active Vehicle Draws &amp; Ticket Availability
              </h2>
              <p className="text-white/60 text-sm">
                Choose your dream vehicle. Inspect ticket prices, total tickets available, and real-time tickets remaining.
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
                      <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {c.status}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="text-lg font-display font-bold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                          {c.name}
                        </h3>
                        {car && (
                          <p className="text-xs text-white/50 mt-1">
                            🚗 {car.make} {car.model} ({car.year}) • {car.declaredValue ? `${car.declaredValue.toLocaleString()} ETB Value` : ''}
                          </p>
                        )}
                      </div>

                      <div className="bg-white/5 border border-white/8 rounded-2xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">Tickets Remaining</span>
                          <span className="text-emerald-400 font-black text-sm">
                            {remainingCount.toLocaleString()} <span className="text-[10px] text-white/40 font-normal">/ {totalTickets.toLocaleString()}</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(3, Math.min(100, percentSold))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
                          <span>{soldCount.toLocaleString()} Tickets Sold</span>
                          <span className="text-yellow-400 font-bold">{c.ticketPrice.toLocaleString()} ETB</span>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/campaign/${c.id}`)}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <span>Buy Ticket ({c.ticketPrice} ETB)</span>
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
              { step: '02', title: 'Buy Your Tickets',   desc: 'Pick your lucky numbers or let the system auto-generate. Pay instantly via Telebirr or CBE.', icon: '💳' },
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

      {/* ── WHY GECHO EQUB ─────────────────────────────────────── */}
      <section className="py-16 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-extrabold text-white">Why GECHO YEMKINA EQUB?</h2>
            <p className="text-white/50 text-sm mt-2">Built for trust. Designed for winners.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🛡️', title: 'Government Licensed',  desc: 'Fully registered under the Ethiopian National Lottery Authority with annual compliance audits.' },
              { icon: '🔗', title: 'Blockchain Verified',  desc: 'Every draw result is hash-locked and publicly verifiable on our transparency portal.' },
              { icon: '⚡', title: 'Instant Payments',     desc: 'Telebirr, CBE Birr, and bank transfers processed in seconds with full transaction receipt.' },
              { icon: '🎥', title: 'Live Draw Broadcast',  desc: 'Watch every spin in real-time. Our certified lottery drum is streamed live for all participants.' },
            ].map(f => (
              <div key={f.title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all group">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{f.icon}</div>
                <h3 className="text-white font-bold mb-2 text-sm">{f.title}</h3>
                <p className="text-white/50 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-white/40 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10">
              FAQ
            </span>
            <h2 className="text-3xl font-display font-extrabold text-white mt-3">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(faq => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      {!token && (
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 via-accent-500/15 to-primary-600/20" />
          <div className="relative max-w-3xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-4xl font-display font-extrabold text-white">
              Ready to Win Your Dream Vehicle?
            </h2>
            <p className="text-white/60">
              Join thousands of Ethiopians who participate in certified, transparent vehicle draws every month.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-extrabold text-lg shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:shadow-[0_0_45px_rgba(234,179,8,0.6)] hover:scale-[1.03] active:scale-100 transition-all"
            >
              Get Started — It's Free 🎟️
            </button>
          </div>
        </section>
      )}
    </PageWrapper>
  );
}