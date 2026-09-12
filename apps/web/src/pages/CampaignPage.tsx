import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, Campaign } from '../lib/api';
import Navbar from '../components/Navbar';
import PageWrapper from '../components/PageWrapper';

type PayMethod = 'TELEBIRR' | 'CBE' | 'AWASH' | 'CARD';

const PAY_OPTIONS: { id: PayMethod; label: string; icon: string; desc: string }[] = [
  { id: 'TELEBIRR', label: 'Telebirr', icon: '📱', desc: 'Pay with Ethiopian Telebirr mobile wallet' },
  { id: 'CBE',      label: 'CBE Birr', icon: '🏦', desc: 'Commercial Bank of Ethiopia mobile banking' },
  { id: 'AWASH',    label: 'Awash Bank', icon: '💳', desc: 'Awash Bank mobile banking app' },
  { id: 'CARD',     label: 'Debit/Credit Card', icon: '💰', desc: 'Visa / Mastercard international card' },
];

const extractImages = (images: any): string[] => {
  if (!images) return ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1200&auto=format&fit=crop'];
  if (Array.isArray(images) && images.length > 0) return images.filter(Boolean);
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter(Boolean);
      if (parsed) return [parsed];
    } catch {
      if (images.includes(',')) return images.split(',').map(s => s.trim()).filter(Boolean);
      return [images];
    }
  }
  return ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1200&auto=format&fit=crop'];
};

// ── Real-Time Live Draw Countdown Timer Component ─────────────────────────────
const DrawCountdownTimer: React.FC<{ targetDate?: string }> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isPassed: boolean } | null>(null);

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft(null);
      return;
    }

    const update = () => {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = target - now;

      if (isNaN(target)) {
        setTimeLeft(null);
        return;
      }

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPassed: false });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) {
    return (
      <div className="flex items-center gap-2 text-yellow-300/80 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-xl text-xs">
        <span>⏰</span>
        <span className="font-semibold">Draw Date: Scheduled upon final ticket milestone</span>
      </div>
    );
  }

  if (!timeLeft) return null;

  if (timeLeft.isPassed) {
    return (
      <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-2 rounded-xl text-xs font-bold animate-pulse">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        <span>DRAW IN PROGRESS OR COMPLETED! Check Live Studio.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 bg-black/60 border border-yellow-500/30 px-3.5 py-2 rounded-2xl shadow-glow">
      <span className="text-yellow-400 text-sm hidden sm:inline">⏱️</span>
      <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-center">
        <div className="bg-yellow-500/15 border border-yellow-500/30 rounded-lg px-2 py-1">
          <span className="text-sm sm:text-base font-black text-yellow-400">{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="block text-[8px] text-white/50 uppercase font-sans">Days</span>
        </div>
        <span className="text-yellow-400 font-black text-xs">:</span>
        <div className="bg-yellow-500/15 border border-yellow-500/30 rounded-lg px-2 py-1">
          <span className="text-sm sm:text-base font-black text-yellow-400">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="block text-[8px] text-white/50 uppercase font-sans">Hrs</span>
        </div>
        <span className="text-yellow-400 font-black text-xs">:</span>
        <div className="bg-yellow-500/15 border border-yellow-500/30 rounded-lg px-2 py-1">
          <span className="text-sm sm:text-base font-black text-yellow-400">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="block text-[8px] text-white/50 uppercase font-sans">Min</span>
        </div>
        <span className="text-yellow-400 font-black text-xs">:</span>
        <div className="bg-yellow-500/15 border border-yellow-500/30 rounded-lg px-2 py-1">
          <span className="text-sm sm:text-base font-black text-yellow-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="block text-[8px] text-white/50 uppercase font-sans">Sec</span>
        </div>
      </div>
    </div>
  );
};

const CampaignPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'navigation', 'campaign', 'vehicle']);
  const [campaign, setCampaign]   = useState<Campaign | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [quantity, setQuantity]   = useState(1);
  const [buying, setBuying]       = useState(false);
  const [success, setSuccess]     = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('TELEBIRR');
  const [phone, setPhone]         = useState('');
  const [showModal, setShowModal] = useState(false);
  const [purchasedTickets, setPurchasedTickets] = useState<any[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [availableTickets, setAvailableTickets] = useState<string[]>([]);
  const [selectedTicketNumbers, setSelectedTicketNumbers] = useState<string[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [searchTicketQuery, setSearchTicketQuery] = useState('');
  const [numberFilter, setNumberFilter] = useState<'ALL' | 'UNDER_100' | 'LUCKY_7' | 'EVEN' | 'ODD'>('ALL');
  const [showAllNumbersModal, setShowAllNumbersModal] = useState(false);

  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!id) return;
    api.getCampaign(id)
      .then((res) => {
        if (res.success && res.data) {
          setCampaign(res.data);
          loadAvailableTickets(id);
        } else {
          setError(t('campaign:campaignNotFound'));
        }
      })
      .catch(() => setError(t('common:error')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const loadAvailableTickets = async (campaignId: string) => {
    setLoadingTickets(true);
    try {
      const res = await api.getAvailableTickets(campaignId);
      if (res.success && res.data) {
        setAvailableTickets(res.data.availableNumbers || []);
      }
    } catch (err) {
      console.error('Failed to load available tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleBuy = async () => {
    if (!campaign) return;
    if (!token) { navigate('/login'); return; }
    setError(''); setSuccess(''); setBuying(true);
    try {
      const ticketNumbersToUse = selectedTicketNumbers.length > 0 ? selectedTicketNumbers : undefined;
      const quantityToUse = selectedTicketNumbers.length > 0 ? selectedTicketNumbers.length : quantity;

      const res = await api.checkout(campaign.id, quantityToUse, payMethod, phone || undefined, ticketNumbersToUse);
      if (res.success && res.data) {
        setPurchasedTickets(res.data.tickets || []);
        setSuccess(t('campaign:purchaseSuccess', { count: quantityToUse }));
        setShowModal(false);
        setQuantity(1);
        setSelectedTicketNumbers([]);
        loadAvailableTickets(campaign.id);
      } else {
        setError(t('campaign:purchaseFailed'));
      }
    } catch (e) {
      setError(t('campaign:purchaseFailed'));
    } finally {
      setBuying(false);
    }
  };

  const toggleTicketSelection = (ticketNumber: string) => {
    setSelectedTicketNumbers(prev => {
      if (prev.includes(ticketNumber)) {
        return prev.filter(t => t !== ticketNumber);
      } else {
        if (prev.length >= 20) {
          return prev; // Maximum 20 tickets per order
        }
        return [...prev, ticketNumber];
      }
    });
  };

  // Lucky Dip generator (BOTB / UK Car Raffle style)
  const handleLuckyDip = (count: number) => {
    if (availableTickets.length === 0) return;
    // Filter out already selected tickets
    const unselected = availableTickets.filter(t => !selectedTicketNumbers.includes(t));
    if (unselected.length === 0) return;

    // Shuffle and pick
    const shuffled = [...unselected].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, Math.min(count, 20 - selectedTicketNumbers.length));
    setSelectedTicketNumbers(prev => [...prev, ...picked]);
  };

  const clearSelectedTickets = () => {
    setSelectedTicketNumbers([]);
  };

  // Filtered available tickets list for the search & filter UI
  const filteredAvailableTickets = useMemo(() => {
    let list = availableTickets;
    if (searchTicketQuery.trim()) {
      const q = searchTicketQuery.trim().toLowerCase();
      list = list.filter(num => num.toLowerCase().includes(q));
    }

    if (numberFilter === 'UNDER_100') {
      list = list.filter(num => {
        const parts = num.split('-');
        const n = parseInt(parts[parts.length - 1], 10);
        return !isNaN(n) && n <= 100;
      });
    } else if (numberFilter === 'LUCKY_7') {
      list = list.filter(num => num.includes('7'));
    } else if (numberFilter === 'EVEN') {
      list = list.filter(num => {
        const parts = num.split('-');
        const n = parseInt(parts[parts.length - 1], 10);
        return !isNaN(n) && n % 2 === 0;
      });
    } else if (numberFilter === 'ODD') {
      list = list.filter(num => {
        const parts = num.split('-');
        const n = parseInt(parts[parts.length - 1], 10);
        return !isNaN(n) && n % 2 !== 0;
      });
    }

    return list;
  }, [availableTickets, searchTicketQuery, numberFilter]);

  if (loading) {
    return (
      <PageWrapper>
        <Navbar authenticated={!!token} />
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-14 h-14 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4" />
          <p className="text-white/50 text-sm">{t('common:loading')}</p>
        </div>
      </PageWrapper>
    );
  }

  if (!campaign) {
    return (
      <PageWrapper>
        <Navbar authenticated={!!token} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-display font-bold text-white mb-2">{t('campaign:campaignNotFound')}</h2>
          <button onClick={() => navigate('/dashboard')} className="btn-ghost mt-5 text-sm">
            ← {t('campaign:backToDashboard')}
          </button>
        </div>
      </PageWrapper>
    );
  }

  const effectiveQuantity = selectedTicketNumbers.length > 0 ? selectedTicketNumbers.length : quantity;
  const total = (campaign.ticketPrice * effectiveQuantity).toLocaleString();
  const canBuy = campaign.status === 'PUBLISHED';
  const soldTicketsCount = campaign.soldTickets ?? campaign._count?.tickets ?? 0;
  const remainingTicketsCount = campaign.remainingTickets ?? Math.max(0, campaign.maxTickets - soldTicketsCount);
  const percentSold = campaign.maxTickets > 0 ? (soldTicketsCount / campaign.maxTickets) * 100 : 0;
  const isUrgent = percentSold >= 70 || remainingTicketsCount <= 50;

  // Car specs extraction
  const vehicle = campaign.vehicles?.[0];
  const cashAlternative = vehicle?.declaredValue ? Math.round(vehicle.declaredValue * 0.85) : Math.round(campaign.ticketPrice * campaign.maxTickets * 0.7);

  return (
    <PageWrapper>
      <Navbar authenticated={!!token} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-white/50 hover:text-primary-400 text-sm font-medium transition-colors group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            {t('campaign:backToDashboard')}
          </button>

          {/* Guaranteed Draw Date Badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 flex items-center gap-1.5">
              <span>🎯</span>
              <span>Guaranteed Live Draw</span>
            </span>
          </div>
        </div>

        {/* ── HIGH PRIORITY URGENCY ALERT BANNER ── */}
        <div className={`mb-6 rounded-2xl p-4 sm:p-5 border transition-all ${
          isUrgent
            ? 'bg-gradient-to-r from-red-950/80 via-amber-950/70 to-red-950/80 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.25)] animate-pulse-glow'
            : 'bg-gradient-to-r from-emerald-950/60 via-dark-900 to-primary-950/60 border-emerald-500/30'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <span className="text-3xl sm:text-4xl animate-bounce">🔥</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-display font-extrabold text-base sm:text-lg">
                    {isUrgent ? 'LIMITED TICKETS ALERT: CLOSING SOON!' : 'OFFICIAL VEHICLE LOTTERY DRAW ACTIVE'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-500/30 text-red-300 border border-red-500/40">
                    {remainingTicketsCount.toLocaleString()} NUMBERS LEFT
                  </span>
                </div>
                <p className="text-white/60 text-xs sm:text-sm mt-0.5">
                  {campaign.drawDate
                    ? `Live draw scheduled for ${new Date(campaign.drawDate).toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (EAT). Once all numbers sell out, the drum spins immediately!`
                    : 'Draw date scheduled upon reaching minimum quota. Pick your lucky numbers before pool sells out!'}
                </p>
              </div>
            </div>

            {/* Countdown Clock */}
            <DrawCountdownTimer targetDate={campaign.drawDate} />
          </div>
        </div>

        {/* ── TITLE & CASH ALTERNATIVE HEADLINE ── */}
        <div className="mb-8 animate-slide-up">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-display font-black text-white">{campaign.name}</h1>
                <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                  campaign.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  campaign.status === 'DRAFT'     ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                                    'bg-white/10 text-white/50'
                }`}>{campaign.status}</span>
              </div>
              {campaign.description && (
                <p className="text-white/50 text-sm max-w-3xl leading-relaxed">{campaign.description}</p>
              )}
            </div>

            {/* Cash Alternative Callout (Key BOTB / Omaze feature) */}
            <div className="flex-shrink-0 bg-gradient-to-br from-yellow-500/15 via-amber-500/10 to-orange-500/15 border border-yellow-500/40 rounded-2xl p-4 shadow-lg flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-xl shadow-md">
                💰
              </div>
              <div>
                <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-wider block">Winner Choice Perk</span>
                <p className="text-white font-display font-black text-lg sm:text-xl">
                  {cashAlternative.toLocaleString()} ETB <span className="text-xs text-white/60 font-medium">Cash Alt.</span>
                </p>
                <span className="text-[10px] text-white/40 block">Take the car or receive full cash wire transfer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && <div className="mb-6 p-4 bg-red-500/15 border border-red-500/30 text-red-300 rounded-2xl text-sm animate-fade-in">{error}</div>}
        {success && (
          <div className="mb-6 p-5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl text-sm animate-fade-in">
            <div className="font-extrabold text-base mb-2">✓ {success}</div>
            <p className="text-xs text-emerald-300/80 mb-3">Your lucky lottery numbers are registered into the tamper-proof cryptographic ledger:</p>
            {purchasedTickets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {purchasedTickets.map(tk => (
                  <span key={tk.id} className="font-mono text-xs bg-emerald-500/25 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold">
                    🎫 {tk.purchaseId}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MAIN CONTENT GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Left Column: Vehicle Gallery & Specs ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Vehicle Gallery Card */}
            {campaign.vehicles && campaign.vehicles.length > 0 && (
              <div className="bg-dark-900/80 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl">
                {campaign.vehicles.map((v) => {
                  const carImages = extractImages(v.images);
                  const activeIdx = Math.min(selectedImageIndex, carImages.length - 1);
                  const currentImg = carImages[activeIdx] || carImages[0];

                  return (
                    <div key={v.id}>
                      {/* Car Main Photo Viewport */}
                      <div className="relative rounded-2xl overflow-hidden mb-4 bg-black/80 border border-white/10 group aspect-video sm:h-84 w-full flex items-center justify-center">
                        <img
                          src={currentImg}
                          alt={`${v.make} ${v.model} photo`}
                          className="w-full h-full object-cover transition-all duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1200&auto=format&fit=crop';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-black text-yellow-400 border border-yellow-500/40 flex items-center gap-1.5 shadow-lg">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                          GRAND PRIZE VEHICLE
                        </div>

                        <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white/90 border border-white/20">
                          📷 {activeIdx + 1} / {carImages.length}
                        </div>

                        {/* Bottom Market Value */}
                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-white/60 uppercase tracking-wider font-semibold">Official Declared Value</span>
                            <div className="font-display font-black text-white text-xl sm:text-2xl drop-shadow-md">
                              {v.declaredValue.toLocaleString()} <span className="text-yellow-400 text-sm font-bold">ETB</span>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold">
                            Condition: {v.vehicleCondition || 'Brand New'}
                          </span>
                        </div>

                        {/* Arrows */}
                        {carImages.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : carImages.length - 1))}
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity text-xl font-bold"
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedImageIndex(prev => (prev < carImages.length - 1 ? prev + 1 : 0))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity text-xl font-bold"
                            >
                              ›
                            </button>
                          </>
                        )}
                      </div>

                      {/* Thumbnail strip */}
                      {carImages.length > 1 && (
                        <div className="flex gap-2.5 mb-6 overflow-x-auto pb-2 scrollbar-thin">
                          {carImages.map((img, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() => setSelectedImageIndex(imgIdx)}
                              className={`w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all relative ${
                                activeIdx === imgIdx
                                  ? 'border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)] scale-105'
                                  : 'border-white/20 hover:border-white/50 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img src={img} alt={`Thumb ${imgIdx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Vehicle Spec Sheet (Like top online car raffles) */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <h2 className="text-xl font-display font-extrabold text-white">
                            {v.year} {v.make} {v.model}
                          </h2>
                          <span className="text-xs text-white/50 font-medium">📍 {v.location || 'Addis Ababa'}</span>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
                            <span className="text-lg mb-1 block">🏎️</span>
                            <span className="text-[10px] text-white/40 uppercase font-semibold block">Condition</span>
                            <span className="text-white font-bold text-xs">{v.vehicleCondition}</span>
                          </div>
                          <div className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
                            <span className="text-lg mb-1 block">⚙️</span>
                            <span className="text-[10px] text-white/40 uppercase font-semibold block">Transmission</span>
                            <span className="text-white font-bold text-xs">{v.transmission || 'Automatic'}</span>
                          </div>
                          <div className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
                            <span className="text-lg mb-1 block">⛽</span>
                            <span className="text-[10px] text-white/40 uppercase font-semibold block">Fuel / EV</span>
                            <span className="text-white font-bold text-xs">{v.fuelType || 'Electric/Diesel'}</span>
                          </div>
                          <div className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
                            <span className="text-lg mb-1 block">🎨</span>
                            <span className="text-[10px] text-white/40 uppercase font-semibold block">Color</span>
                            <span className="text-white font-bold text-xs">{v.color}</span>
                          </div>
                        </div>

                        {/* Engine details if available */}
                        {v.engineInfo && (
                          <div className="bg-white/5 border border-white/8 rounded-2xl p-3.5 text-xs text-white/70">
                            <span className="text-white/40 block text-[10px] uppercase font-bold mb-1">Engine & Powertrain</span>
                            {v.engineInfo}
                          </div>
                        )}

                        {/* Included Grand Perks Ribbon */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-primary-500/10 border border-emerald-500/30">
                          <span className="text-xs font-bold text-emerald-400 block mb-2">🎁 Winner Package Perks Included:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-white/75">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400">✓</span> Free Doorstep Delivery
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400">✓</span> 1-Yr Full Insurance
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400">✓</span> All Transfer Taxes Paid
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Live Drum Access Quick Card */}
            <div className="bg-gradient-to-r from-yellow-500/15 via-orange-500/15 to-transparent border border-yellow-500/30 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-2xl shadow-lg">
                  🎰
                </div>
                <div>
                  <h3 className="text-white font-display font-extrabold text-sm sm:text-base">Live Interactive Spin Room</h3>
                  <p className="text-white/50 text-xs">Watch ticket balls roll in the physical/cryptographic 3D drum in real-time.</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/live/${campaign.id}`)}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>🎥</span> Enter Live Studio →
              </button>
            </div>
          </div>

          {/* ── Right Column: Ticket Selector & Live Lottery Number Explorer ── */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-dark-900/95 border-2 border-primary-500/30 rounded-3xl p-6 sticky top-20 shadow-2xl space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🎟️</span>
                  <div>
                    <h2 className="text-lg font-display font-black text-white">Choose Your Numbers</h2>
                    <p className="text-white/40 text-xs">Pick specific numbers or generate lucky dips</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-display font-black text-yellow-400">{campaign.ticketPrice.toLocaleString()}</span>
                  <span className="text-xs text-white/50 block font-semibold">ETB / ticket</span>
                </div>
              </div>

              {/* ── Scarcity & Remaining Numbers Progress Bar ── */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/70 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Remaining Numbers Pool
                  </span>
                  <span className="text-emerald-400 font-mono font-black text-sm">
                    {remainingTicketsCount.toLocaleString()}{' '}
                    <span className="text-[10px] text-white/40 font-normal">/ {campaign.maxTickets.toLocaleString()}</span>
                  </span>
                </div>

                <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 rounded-full transition-all duration-700 shadow-glow"
                    style={{ width: `${Math.max(4, Math.min(100, percentSold))}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-white/40 pt-0.5">
                  <span>{percentSold.toFixed(1)}% Sold</span>
                  <span className={isUrgent ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {remainingTicketsCount} Tickets Left
                  </span>
                </div>
              </div>

              {/* ── Quick Pick Lucky Dip Buttons (BOTB / UK Raffle feature) ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/60">Quick Lucky Dip</span>
                  <span className="text-[11px] text-primary-400 font-semibold">Instant Random Pick</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '+1 Pick', count: 1 },
                    { label: '+5 Dip', count: 5 },
                    { label: '+10 Dip', count: 10 },
                    { label: '+20 Max', count: 20 },
                  ].map(b => (
                    <button
                      key={b.count}
                      type="button"
                      onClick={() => handleLuckyDip(b.count)}
                      disabled={remainingTicketsCount === 0 || selectedTicketNumbers.length >= 20}
                      className="py-2.5 px-2 rounded-xl bg-white/5 hover:bg-primary-500/20 border border-white/10 hover:border-primary-500/40 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-center"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Interactive Ticket Number Selector & Filter ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/60">
                    Pick Specific Lucky Numbers ({selectedTicketNumbers.length}/20)
                  </label>
                  {selectedTicketNumbers.length > 0 && (
                    <button
                      type="button"
                      onClick={clearSelectedTickets}
                      className="text-[11px] text-red-400 hover:text-red-300 transition-colors font-semibold"
                    >
                      Clear ({selectedTicketNumbers.length})
                    </button>
                  )}
                </div>

                {/* Search Bar for Ticket Numbers */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search ticket # (e.g. 77, 007)..."
                      value={searchTicketQuery}
                      onChange={(e) => setSearchTicketQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 font-mono"
                    />
                    {searchTicketQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchTicketQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter by category */}
                  <select
                    value={numberFilter}
                    onChange={(e: any) => setNumberFilter(e.target.value)}
                    className="bg-dark-950 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white/80 focus:outline-none focus:border-primary-500"
                  >
                    <option value="ALL">All Numbers</option>
                    <option value="UNDER_100">1 to 100</option>
                    <option value="LUCKY_7">Contains 7</option>
                    <option value="EVEN">Even Numbers</option>
                    <option value="ODD">Odd Numbers</option>
                  </select>
                </div>

                {/* Selected Tickets Chips Tray */}
                {selectedTicketNumbers.length > 0 && (
                  <div className="bg-primary-500/10 border border-primary-500/30 rounded-2xl p-3">
                    <span className="text-[10px] text-primary-300 font-bold uppercase tracking-wider block mb-1.5">
                      Your Selected Numbers ({selectedTicketNumbers.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {selectedTicketNumbers.map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => toggleTicketSelection(num)}
                          className="px-2.5 py-1 bg-primary-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 hover:bg-red-500 transition-colors group"
                          title="Click to remove"
                        >
                          <span>{num.split('-').pop()}</span>
                          <span className="text-[10px] opacity-60 group-hover:opacity-100">✕</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Ticket Numbers Grid */}
                {loadingTickets ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="bg-black/50 border border-white/10 rounded-2xl p-3 max-h-52 overflow-y-auto">
                    {filteredAvailableTickets.length === 0 ? (
                      <div className="text-center py-6 text-white/40 text-xs">
                        No numbers found matching your query
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                        {filteredAvailableTickets.slice(0, 150).map((ticketNum) => {
                          const isSelected = selectedTicketNumbers.includes(ticketNum);
                          const shortNum = ticketNum.split('-').pop();

                          return (
                            <button
                              key={ticketNum}
                              type="button"
                              onClick={() => toggleTicketSelection(ticketNum)}
                              disabled={selectedTicketNumbers.length >= 20 && !isSelected}
                              className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all text-center ${
                                isSelected
                                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-glow font-black scale-105'
                                  : 'bg-white/5 hover:bg-white/15 text-white/80 border border-white/10'
                              } ${selectedTicketNumbers.length >= 20 && !isSelected ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              #{shortNum}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {filteredAvailableTickets.length > 150 && (
                      <div className="text-center pt-3 border-t border-white/10 mt-3">
                        <button
                          type="button"
                          onClick={() => setShowAllNumbersModal(true)}
                          className="text-xs text-primary-400 hover:text-primary-300 font-bold"
                        >
                          View all {filteredAvailableTickets.length} available numbers →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Fallback quantity selector if no specific number picked */}
                {selectedTicketNumbers.length === 0 && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                      <span>Or specify quantity (Auto-Assigned):</span>
                      <span className="text-white font-bold">{quantity} Tickets</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-xl bg-white/8 border border-white/15 text-white hover:bg-white/15 transition-colors text-base font-bold flex items-center justify-center"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="flex-1 bg-white/5 border border-white/15 rounded-xl py-2 text-center font-mono font-black text-white text-base focus:outline-none focus:border-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                        className="w-10 h-10 rounded-xl bg-white/8 border border-white/15 text-white hover:bg-white/15 transition-colors text-base font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Total Cost & Odds Estimator ── */}
              <div className="bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/25 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-white/60">Total Tickets</span>
                  <span className="text-white font-bold text-sm">{effectiveQuantity} Tickets</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-white/60">Calculated Odds</span>
                  <span className="text-emerald-400 font-mono font-bold text-xs">
                    {effectiveQuantity} in {campaign.maxTickets} ({( (effectiveQuantity / (campaign.maxTickets || 1)) * 100 ).toFixed(2)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-sm font-bold text-white">Total Amount</span>
                  <span className="text-2xl font-display font-black text-yellow-400">
                    {total} <span className="text-xs text-white/60 font-medium">ETB</span>
                  </span>
                </div>
              </div>

              {/* Purchase Button */}
              {token ? (
                <button
                  type="button"
                  onClick={() => canBuy && setShowModal(true)}
                  disabled={!canBuy || remainingTicketsCount === 0}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500 hover:from-primary-400 hover:to-accent-400 text-white font-black text-base uppercase tracking-wider shadow-glow hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>🎫</span>
                  <span>Confirm &amp; Purchase ({effectiveQuantity} Tickets)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-black text-base uppercase tracking-wider shadow-glow"
                >
                  Login to Buy Tickets
                </button>
              )}

              <div className="flex items-center justify-center gap-4 text-[11px] text-white/40">
                <span>🔒 Cryptographic RNG</span>
                <span>•</span>
                <span>⚡ Instant Ticket Issuance</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ALL NUMBERS BROWSER MODAL ── */}
      {showAllNumbersModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-white/20 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-scale-in">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">All Remaining Numbers ({availableTickets.length})</h3>
                <p className="text-xs text-white/40">Select up to 20 numbers for your entry</p>
              </div>
              <button
                onClick={() => setShowAllNumbersModal(false)}
                className="text-white/40 hover:text-white text-2xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {availableTickets.map(num => {
                  const isSelected = selectedTicketNumbers.includes(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => toggleTicketSelection(num)}
                      className={`p-2.5 rounded-xl text-xs font-mono font-bold transition-all text-center ${
                        isSelected
                          ? 'bg-yellow-500 text-black font-black'
                          : 'bg-white/5 hover:bg-white/15 text-white/80 border border-white/10'
                      }`}
                    >
                      #{num.split('-').pop()}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
              <span className="text-xs text-white/60">{selectedTicketNumbers.length} numbers selected</span>
              <button
                type="button"
                onClick={() => setShowAllNumbersModal(false)}
                className="px-5 py-2 bg-primary-500 hover:bg-primary-400 text-white font-bold text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/15 rounded-3xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">💳</span>
                <h2 className="text-lg font-bold text-white">Payment Checkout</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-white/60">Choose Payment Provider</label>
                {PAY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setPayMethod(opt.id)}
                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left ${
                      payMethod === opt.id
                        ? 'border-yellow-400 bg-yellow-400/10 shadow-glow'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{opt.label}</p>
                      <p className="text-white/40 text-xs">{opt.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      payMethod === opt.id ? 'border-yellow-400 bg-yellow-400' : 'border-white/30'
                    }`}>
                      {payMethod === opt.id && <div className="w-2 h-2 rounded-full bg-black" />}
                    </div>
                  </button>
                ))}
              </div>

              {(payMethod === 'TELEBIRR' || payMethod === 'CBE' || payMethod === 'AWASH') && (
                <div>
                  <label className="block text-white/60 text-xs mb-1.5 font-semibold">Account / Mobile Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+251 9XX XXX XXX"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary-500 font-mono"
                  />
                </div>
              )}

              {/* Summary */}
              <div className="bg-white/5 border border-white/8 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between text-white/60">
                  <span>Campaign</span>
                  <span className="text-white font-bold truncate max-w-[60%] text-right">{campaign.name}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Tickets Count</span>
                  <span className="text-white font-bold">{effectiveQuantity} Numbers</span>
                </div>
                {selectedTicketNumbers.length > 0 && (
                  <div>
                    <span className="text-white/40 block mb-1">Numbers:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedTicketNumbers.map(n => (
                        <span key={n} className="bg-white/10 text-yellow-300 font-mono px-1.5 py-0.5 rounded text-[10px]">
                          #{n.split('-').pop()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-2 text-white">
                  <span>Total Due:</span>
                  <span className="text-yellow-400 text-base">{total} ETB</span>
                </div>
              </div>

              {error && <p className="text-red-400 text-xs text-center">{error}</p>}

              <button
                onClick={handleBuy}
                disabled={buying}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-black font-black text-sm uppercase tracking-wider rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 shadow-glow"
              >
                {buying ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Processing Order...
                  </span>
                ) : `✓ Confirm & Pay ${total} ETB`}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

export default CampaignPage;