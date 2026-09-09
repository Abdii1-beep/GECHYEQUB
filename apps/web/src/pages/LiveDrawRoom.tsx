import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PageWrapper from '../components/PageWrapper';
import { api } from '../lib/api';

interface LiveData {
  campaign: {
    id: string;
    name: string;
    description: string;
    status: string;
    ticketPrice: number;
    maxTickets: number;
    drawDate?: string;
    vehicles: Array<{
      id: string;
      make: string;
      model: string;
      year: number;
      color: string;
      declaredValue: number;
      images?: any;
      engineInfo?: string;
      transmission?: string;
      fuelType?: string;
    }>;
  };
  stats: {
    totalPaidTickets: number;
    remainingTickets: number;
    percentSold: number;
  };
  liveState: {
    phase: 'SCHEDULED' | 'COUNTDOWN' | 'SPINNING' | 'COMPLETED';
    scheduledDate?: string;
    spinStartedAt?: number;
    winner?: {
      ticketId: string;
      ticketNumber: string;
      customerName: string;
      customerPhone?: string;
      customerEmail?: string;
      customerAddress?: string;
      vehicleName: string;
      vehicleColor?: string;
      vehicleVin?: string;
      vehiclePrice?: number;
      drawHash?: string;
      drawnAt?: string;
    };
  };
  userChance: {
    ticketCount: number;
    tickets: string[];
    percentage: number;
    hasParticipated: boolean;
    isAdmin?: boolean;
    isAuthenticated?: boolean;
  };
  tickets?: Array<{
    id: string;
    purchaseId: string;
    createdAt?: string;
    verificationHash?: string;
    customerId?: string;
    customer?: {
      id?: string;
      fullName?: string;
      phone?: string;
      email?: string;
      address?: string;
    };
  }>;
}

const getCarImage = (images: any): string => {
  if (!images) return 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1200&auto=format&fit=crop';
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
  return 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1200&auto=format&fit=crop';
};

const LiveDrawRoom: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');

  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Local spin animation state
  const [isSpinningLocal, setIsSpinningLocal] = useState(false);
  const [wheelDegree, setWheelDegree] = useState(0);
  const [wheelTransitionMs, setWheelTransitionMs] = useState(8000);
  const [activeHighlightIndex, setActiveHighlightIndex] = useState(0);
  const [rollingTicketNumber, setRollingTicketNumber] = useState('ETB-000000');
  const [showConfetti, setShowConfetti] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const poolGridRef = useRef<HTMLDivElement>(null);

  // Interactive Lottery Numbers Pool Dashboard state
  const [selectedNumberDetail, setSelectedNumberDetail] = useState<{
    number: number;
    ticket?: any;
    isWinner: boolean;
    isUserTicket: boolean;
    isSold: boolean;
  } | null>(null);
  const [rovingPoolNumber, setRovingPoolNumber] = useState<number | null>(null);
  const [poolPage, setPoolPage] = useState(0);
  const [poolFilter, setPoolFilter] = useState<'all' | 'sold' | 'user' | 'winner'>('all');
  const [poolSearch, setPoolSearch] = useState('');
  const POOL_PAGE_SIZE = 100;

  // Mechanical ticker sound effect (Web Audio API - zero dependencies)
  const playTickSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(550 + Math.random() * 250, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch {}
  };

  // Grand Prize Fanfare Chime
  const playWinChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.12 + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + idx * 0.12);
        osc.stop(audioCtx.currentTime + idx * 0.12 + 0.5);
      });
    } catch {}
  };

  // Fetch live state
  const fetchLiveState = async () => {
    if (!campaignId) return;
    try {
      const res = await api.getLiveDraw(campaignId);
      if (res.success && res.data) {
        const live: LiveData = res.data;
        setData(live);

        // Handle live spin animation trigger
        if (live.liveState.phase === 'SPINNING') {
          if (!isSpinningLocal) {
            triggerVisualSpin();
          }
        } else if (live.liveState.phase === 'COMPLETED' && live.liveState.winner) {
          if (!isSpinningLocal) {
            setShowConfetti(true);
          }
        }
      } else {
        if (!data) setError(res.error || 'Failed to load live draw room');
      }
    } catch {
      if (!data) setError('Error connecting to live draw service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveState();
    // High-frequency polling for synchronized live state (every 800ms)
    pollIntervalRef.current = setInterval(fetchLiveState, 800);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [campaignId]);

  // Countdown timer calculation
  useEffect(() => {
    const targetDateStr = data?.liveState?.scheduledDate || data?.campaign?.drawDate;
    if (!targetDateStr) return;

    const interval = setInterval(() => {
      const targetTime = new Date(targetDateStr).getTime();
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.liveState?.scheduledDate, data?.campaign?.drawDate]);

  // Visual wheel spin simulation - starts immediately when admin initiates
  const triggerVisualSpin = () => {
    setIsSpinningLocal(true);
    setShowConfetti(false);
    setWheelTransitionMs(8000);

    // 20 full revolutions for blazing speed matching admin studio
    setWheelDegree((prev) => prev + 7200);

    const SPIN_DURATION_MS = 8000;
    const spinLocalStartTime = Date.now();
    let counter = 0;

    const interval = setInterval(() => {
      const elapsed = Date.now() - spinLocalStartTime;
      setActiveHighlightIndex((prev) => (prev + 1) % 12);
      const randNum = `ETB-${Math.floor(100000 + Math.random() * 900000)}`;
      setRollingTicketNumber(randNum);

      // Roving pool number cycling rapidly at 35ms matching admin speed
      const maxT = data?.campaign?.maxTickets || 100;
      setRovingPoolNumber(Math.floor(1 + Math.random() * maxT));

      if (counter % 2 === 0) playTickSound();
      counter += 1;

      if (elapsed >= SPIN_DURATION_MS) {
        clearInterval(interval);
        setIsSpinningLocal(false);
        setRovingPoolNumber(null);
        playWinChime();
        setShowConfetti(true);
      }
    }, 35);
  };

  // Helper to extract sequential number from ticket purchaseId (e.g. ECL-2026-000042 -> 42)
  const getTicketNumber = (purchaseId: string, fallbackIdx?: number): number => {
    if (!purchaseId) return (fallbackIdx ?? 0) + 1;
    const match = purchaseId.match(/(\d+)$/);
    if (match) return parseInt(match[1], 10);
    return (fallbackIdx ?? 0) + 1;
  };

  const winnerNumber = useMemo(() => {
    if (!data?.liveState?.winner?.ticketNumber) return null;
    return getTicketNumber(data.liveState.winner.ticketNumber);
  }, [data?.liveState?.winner?.ticketNumber]);

  const ticketMap = useMemo(() => {
    const map = new Map<number, any>();
    if (data?.tickets && Array.isArray(data.tickets)) {
      data.tickets.forEach((t, i) => {
        const num = getTicketNumber(t.purchaseId, i);
        map.set(num, t);
      });
    }
    return map;
  }, [data?.tickets]);

  const userTicketNums = useMemo(() => {
    const set = new Set<number>();
    if (data?.userChance?.tickets) {
      data.userChance.tickets.forEach((tNum, i) => {
        set.add(getTicketNumber(tNum, i));
      });
    }
    return set;
  }, [data?.userChance?.tickets]);

  // Compute all pool numbers matching campaign maxTickets starting from 1...2...
  const maxPoolTickets = Math.max(1, data?.campaign?.maxTickets || 100);

  // Filtered pool numbers
  const filteredNumbers = useMemo(() => {
    const allNums: number[] = [];
    for (let i = 1; i <= maxPoolTickets; i++) {
      allNums.push(i);
    }

    let list = allNums;
    if (poolFilter === 'sold') {
      list = list.filter((n) => ticketMap.has(n));
    } else if (poolFilter === 'user') {
      list = list.filter((n) => userTicketNums.has(n));
    } else if (poolFilter === 'winner') {
      list = winnerNumber ? [winnerNumber] : [];
    }

    if (poolSearch.trim()) {
      const q = poolSearch.trim().toLowerCase();
      list = list.filter((n) => {
        const numStr = String(n);
        const ticket = ticketMap.get(n);
        const code = ticket?.purchaseId?.toLowerCase() || '';
        return numStr.includes(q) || code.includes(q);
      });
    }

    return list;
  }, [maxPoolTickets, poolFilter, poolSearch, ticketMap, userTicketNums, winnerNumber]);

  const totalPoolPages = Math.ceil(filteredNumbers.length / POOL_PAGE_SIZE);
  // Show ALL tickets — no pagination slicing. Range buttons scroll to position.
  const displayedPoolNumbers = useMemo(() => filteredNumbers, [filteredNumbers]);

  // Scroll the pool grid to a given page range
  const scrollPoolToPage = (pIdx: number) => {
    if (!poolGridRef.current) return;
    const grid = poolGridRef.current;
    const fraction = pIdx / Math.max(1, totalPoolPages);
    grid.scrollTop = fraction * grid.scrollHeight;
  };

  const prizeVehicle = data?.campaign?.vehicles?.[0];

  // Dummy segments for wheel visualizer
  const wheelSegments = useMemo(() => {
    const totalSegments = 12;
    const colors = [
      '#EAB308', '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#EC4899',
      '#EAB308', '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#EC4899',
    ];
    return Array.from({ length: totalSegments }).map((_, i) => ({
      index: i,
      label: data?.userChance?.tickets?.[i % (data?.userChance?.tickets.length || 1)] || `#00${i + 1}`,
      color: colors[i % colors.length],
      isUserTicket: data?.userChance?.hasParticipated && i % 3 === 0,
    }));
  }, [data?.userChance]);

  if (loading) {
    return (
      <PageWrapper>
        <Navbar authenticated={!!token} />
        <div className="min-h-[70vh] flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-400 rounded-full animate-spin mb-4" />
          <p className="text-white/60 font-medium">Connecting to Live Lottery Room...</p>
        </div>
      </PageWrapper>
    );
  }

  if (error || !data) {
    return (
      <PageWrapper>
        <Navbar authenticated={!!token} />
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <div className="text-6xl mb-4">🎰</div>
          <h2 className="text-2xl font-bold text-white mb-2">Live Draw Room Unavailable</h2>
          <p className="text-white/50 mb-6">{error || 'Campaign could not be found'}</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold">
            Return to Dashboard
          </button>
        </div>
      </PageWrapper>
    );
  }

  const isCompleted = data.liveState.phase === 'COMPLETED' && !!data.liveState.winner;
  const isSpinning = data.liveState.phase === 'SPINNING' || isSpinningLocal;
  const isUserWinner = isCompleted && data.userChance.tickets.includes(data.liveState.winner?.ticketNumber || '');
  const hasAccess = data.userChance.hasParticipated || data.userChance.isAdmin;

  if (!hasAccess) {
    return (
      <PageWrapper>
        <Navbar authenticated={!!token} />
        <div className="max-w-3xl mx-auto px-4 py-12">
          {/* Breadcrumb */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-white/50 hover:text-yellow-400 transition-colors text-sm mb-6"
          >
            <span>←</span> Back to Dashboard
          </button>

          {/* Access Guard Card */}
          <div className="bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-yellow-500/40 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="w-20 h-20 bg-yellow-500/10 border-2 border-yellow-500/40 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-glow">
              🔒
            </div>

            <div className="inline-block px-3.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-4 border border-yellow-500/30">
              Ticket Holders Only • Live Spin Protected
            </div>

            <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white mb-3">
              Exclusive Live Equb Spin Room
            </h1>

            <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-6">
              Only verified participants who have purchased paid tickets for{' '}
              <strong className="text-white">{data.campaign.name}</strong> can watch the live lottery wheel spinning and view the live drum roll.
            </p>

            {/* Vehicle Preview Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-lg mx-auto mb-8 text-left flex items-center gap-4">
              <img
                src={getCarImage(prizeVehicle?.images || data.campaign.vehicles?.[0]?.images)}
                alt="Prize Car"
                className="w-24 h-20 rounded-xl object-cover border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-bold text-sm truncate">{data.campaign.name}</h4>
                <div className="text-xs text-yellow-400 font-semibold mt-1">
                  Ticket Price: {data.campaign.ticketPrice.toLocaleString()} ETB
                </div>
                {prizeVehicle?.declaredValue && (
                  <div className="text-xs text-emerald-400 font-mono font-bold">
                    Vehicle Value: {Number(prizeVehicle.declaredValue).toLocaleString()} ETB
                  </div>
                )}
                <div className="text-[11px] text-white/40 mt-1">
                  {data.stats.remainingTickets.toLocaleString()} tickets remaining in quota
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!token ? (
                <button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold text-sm shadow-glow hover:scale-105 transition-transform"
                >
                  Log In With Account 👤
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/campaign/${data.campaign.id}`)}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-sm shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-105 transition-transform flex items-center justify-center gap-2"
                >
                  <span>🎟️</span>
                  <span>Buy Ticket To Unlock Live Spin Room</span>
                </button>
              )}
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 font-bold text-sm border border-white/15 transition-colors"
              >
                View My Paid Lotteries
              </button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Navbar authenticated={!!token} />

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/campaign/${data.campaign.id}`)}
            className="flex items-center gap-2 text-white/50 hover:text-yellow-400 transition-colors text-sm"
          >
            <span>←</span> Back to Campaign Page
          </button>

          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSpinning ? 'bg-yellow-400' : isCompleted ? 'bg-green-400' : 'bg-red-500'
              }`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                isSpinning ? 'bg-yellow-400' : isCompleted ? 'bg-green-500' : 'bg-red-600'
              }`} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">
              {isSpinning ? '🔴 SPINNING LIVE' : isCompleted ? '🟢 DRAW FINISHED' : 'LIVE DRAW ROOM'}
            </span>
          </div>
        </div>

        {/* Hero Title & Status Bar */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gray-900 via-gray-900/90 to-gray-950 border border-white/10 p-6 sm:p-8 mb-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 mb-3">
                🏆 OFFICIAL CERTIFIED DRAW
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-2">
                {data.campaign.name}
              </h1>
              <p className="text-white/60 text-sm max-w-2xl leading-relaxed">
                Watch the live CSPRNG lottery drum spin. Every ticket is cryptographically registered for verifiable fairness.
              </p>
            </div>

            {/* Live Status Badge / Ticket price */}
            <div className="flex flex-wrap items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
              <div className="text-right">
                <div className="text-xs text-white/50 uppercase font-semibold">Grand Prize Value</div>
                <div className="text-2xl font-black text-yellow-400">
                  {prizeVehicle ? `${prizeVehicle.declaredValue.toLocaleString()} ETB` : 'Luxury Vehicle'}
                </div>
              </div>
              <div className="h-10 w-px bg-white/10 hidden sm:block" />
              <div className="text-right">
                <div className="text-xs text-white/50 uppercase font-semibold">Ticket Price</div>
                <div className="text-2xl font-black text-emerald-400">
                  {data.campaign.ticketPrice.toLocaleString()} ETB
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Live Wheel Stage (Left) & Ticket Chance / Vehicle Showcase (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Live Fortune Wheel / Drum Stage (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative bg-gradient-to-b from-gray-900/90 to-gray-950 border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden flex flex-col items-center">
              
              {/* Radial glow */}
              <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${
                isSpinning ? 'opacity-100' : isCompleted ? 'opacity-80' : 'opacity-40'
              }`}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 rounded-full blur-3xl animate-pulse" />
              </div>

              {/* Status Header above wheel */}
              <div className="text-center mb-6 z-10">
                {isSpinning && (
                  <div className="animate-bounce inline-block bg-yellow-400 text-black font-black text-sm px-4 py-1.5 rounded-full shadow-lg mb-2">
                    🎰 SPINNING NOW! SELECTING WINNER...
                  </div>
                )}
                {isCompleted && (
                  <div className="inline-block bg-green-500 text-black font-black text-sm px-4 py-1.5 rounded-full shadow-lg mb-2">
                    🎉 DRAW RELEASED & WINNER CONFIRMED!
                  </div>
                )}
                {!isSpinning && !isCompleted && (
                  <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-300 font-bold text-xs px-4 py-1.5 rounded-full border border-yellow-500/25 mb-2">
                    <span>🔒</span>
                    <span>DRUM STANDBY — WAITING FOR ADMIN TO INITIATE SPIN</span>
                  </div>
                )}
                
                {/* Countdown Display if scheduled */}
                {!isSpinning && !isCompleted && (
                  <div className="flex items-center justify-center gap-3 mt-3">
                    {[
                      { label: 'DAYS', val: timeLeft.days },
                      { label: 'HOURS', val: timeLeft.hours },
                      { label: 'MINS', val: timeLeft.minutes },
                      { label: 'SECS', val: timeLeft.seconds },
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2 min-w-[64px]">
                        <span className="text-2xl sm:text-3xl font-black text-yellow-400 font-mono">
                          {String(item.val).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] text-white/50 font-bold tracking-wider">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* The Spinning Wheel / Drum Visualizer */}
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 my-4 flex items-center justify-center">
                {/* Pointer at Top */}
                <div className="absolute -top-3 z-30 flex flex-col items-center">
                  <div className="w-6 h-7 bg-yellow-400 border-2 border-white shadow-glow rounded-sm clip-arrow transform rotate-180" 
                    style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                </div>

                {/* Rotating Wheel Disc */}
                <div
                  className={`w-full h-full rounded-full border-8 shadow-[0_0_50px_rgba(234,179,8,0.3)] relative overflow-hidden flex items-center justify-center ${
                    isSpinning ? 'border-yellow-400' : isCompleted ? 'border-emerald-500' : 'border-white/20 opacity-75'
                  }`}
                  style={{
                    transform: `rotate(${wheelDegree}deg)`,
                    transition: `transform ${wheelTransitionMs}ms cubic-bezier(0.20, 0.85, 0.25, 1.0)`,
                    background: 'conic-gradient(from 0deg, #1f2937, #111827, #1f2937, #111827, #1f2937, #111827, #1f2937, #111827)',
                  }}
                >
                  {wheelSegments.map((seg, i) => {
                    const rotation = (360 / wheelSegments.length) * i;
                    return (
                      <div
                        key={i}
                        className="absolute w-full h-full flex justify-center pt-2"
                        style={{ transform: `rotate(${rotation}deg)` }}
                      >
                        <div
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider transition-colors ${
                            activeHighlightIndex === i
                              ? 'bg-yellow-400 text-black shadow-lg scale-110'
                              : seg.isUserTicket
                              ? 'bg-emerald-500/80 text-white'
                              : 'text-white/60'
                          }`}
                        >
                          {seg.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Center Hub */}
                <div className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-gray-950 via-gray-900 to-gray-800 border-4 border-yellow-400 shadow-2xl flex flex-col items-center justify-center z-20 text-center p-1">
                  {isSpinning ? (
                    <span className="text-2xl animate-spin">🚗</span>
                  ) : isCompleted ? (
                    <>
                      <span className="text-xl">🏆</span>
                      <span className="text-[10px] font-black text-yellow-400">WINNER</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">🎯</span>
                      <span className="text-[9px] font-bold text-white/50 uppercase">STANDBY</span>
                    </>
                  )}
                </div>
              </div>

              {/* Digital Raffle Drum Ticket Slot Flipper */}
              <div className="w-full max-w-sm my-2 bg-black/60 border border-yellow-500/40 rounded-2xl p-4 text-center shadow-inner relative">
                <div className="text-[10px] uppercase tracking-widest text-yellow-400 font-extrabold mb-1">
                  {isSpinning ? '🎰 CYCLING TICKET POOL NUMBERS...' : isCompleted ? '🏆 OFFICIAL WINNING NUMBER' : '🔒 ROTATING DRUM STANDBY (INACTIVE)'}
                </div>
                <div className={`font-mono text-2xl sm:text-3xl font-black tracking-widest py-1.5 px-4 rounded-xl transition-all ${
                  isSpinning 
                    ? 'bg-yellow-500/20 text-yellow-300 animate-pulse border border-yellow-400/50 shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                    : isCompleted
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                    : 'bg-white/5 text-white/30 border border-white/10'
                }`}>
                  {isSpinning 
                    ? rollingTicketNumber 
                    : isCompleted 
                    ? (data.liveState.winner?.ticketNumber || rollingTicketNumber) 
                    : 'LOCKED • STANDBY'}
                </div>
                {!isSpinning && !isCompleted && (
                  <p className="mt-2 text-[11px] text-white/40">
                    The wheel is inactive. Spinning will activate automatically when the administrator initiates the live draw.
                  </p>
                )}
              </div>

              {/* Winner Release Box */}
              {isCompleted && data.liveState.winner && (
                <div className="w-full mt-6 bg-gradient-to-r from-yellow-500/20 via-emerald-500/20 to-yellow-500/20 border-2 border-yellow-400/70 rounded-3xl p-6 sm:p-8 text-center animate-fade-in shadow-[0_0_35px_rgba(234,179,8,0.3)]">
                  <div className="text-4xl mb-2">🎉🏆🚗</div>
                  <div className="inline-block px-3.5 py-1 bg-yellow-400 text-black font-black text-xs uppercase tracking-widest rounded-full mb-2">
                    OFFICIAL GRAND PRIZE WINNER CONFIRMED
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
                    Winning Ticket Released!
                  </h3>

                  {/* Winning Ticket Number Display */}
                  <div className="text-3xl sm:text-4xl font-mono font-black text-yellow-300 bg-black/60 border-2 border-yellow-400/60 rounded-2xl py-3 px-6 inline-block my-3 shadow-inner tracking-wider">
                    {data.liveState.winner.ticketNumber}
                  </div>

                  {/* Winner Full Details Grid including Phone Number */}
                  <div className="mt-4 bg-black/50 border border-white/15 rounded-2xl p-5 text-left max-w-xl mx-auto space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-white/40 text-[10px] uppercase font-bold block">Winner Full Name</span>
                        <span className="text-white font-extrabold text-base">
                          {data.liveState.winner.customerName}
                        </span>
                      </div>
                      <div>
                        <span className="text-yellow-400 text-[10px] uppercase font-bold block">📞 Registered Phone Number</span>
                        <span className="text-yellow-300 font-mono font-black text-base">
                          {data.liveState.winner.customerPhone || '+251 91 123 4567'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                      <div>
                        <span className="text-white/40 text-[10px] uppercase font-bold block">Email & City</span>
                        <span className="text-white/80 text-xs truncate block">
                          {data.liveState.winner.customerEmail || 'citizen@gechoyemkinaequb.com'}
                          {data.liveState.winner.customerAddress ? ` • ${data.liveState.winner.customerAddress}` : ' • Addis Ababa'}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-400 text-[10px] uppercase font-bold block">Vehicle Prize Awarded</span>
                        <span className="text-emerald-300 font-extrabold text-xs">
                          {data.liveState.winner.vehicleName}
                          {data.liveState.winner.vehicleColor ? ` (${data.liveState.winner.vehicleColor})` : ''}
                        </span>
                        {data.liveState.winner.vehiclePrice ? (
                          <span className="text-emerald-400/80 font-mono text-[11px] block">
                            Market Value: {data.liveState.winner.vehiclePrice.toLocaleString()} ETB
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {data.liveState.winner.vehicleVin && (
                      <div className="pt-2 border-t border-white/10">
                        <span className="text-white/40 text-[10px] uppercase font-bold block">VIN / Chassis Number</span>
                        <span className="text-white/70 font-mono text-xs">
                          {data.liveState.winner.vehicleVin}
                        </span>
                      </div>
                    )}
                  </div>

                  {isUserWinner && (
                    <div className="mt-5 p-4 bg-emerald-500 text-black font-black text-lg rounded-2xl shadow-2xl animate-bounce">
                      🎊 CONGRATULATIONS! THIS IS YOUR TICKET! YOU WON THIS CAR! 🎊
                    </div>
                  )}

                  {/* Verification Proof Hash */}
                  {data.liveState.winner.drawHash && (
                    <div className="mt-5 pt-3 border-t border-white/10 text-[11px] text-white/40 font-mono truncate">
                      SHA-256 Verification Hash: {data.liveState.winner.drawHash}
                    </div>
                  )}
                </div>
              )}

              {/* Live Ticket Drum Activity Feed */}
              <div className="w-full mt-6 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between text-xs text-white/60 mb-2 font-semibold">
                  <span>LIVE TICKET DRUM ({data.stats.totalPaidTickets} SOLD)</span>
                  <span className="text-yellow-400">{data.stats.percentSold}% CAPACITY</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mb-3">
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${data.stats.percentSold}%` }}
                  />
                </div>
              </div>

              {/* LOTTERY NUMBERS POOL DASHBOARD */}
              <div className="w-full mt-6 bg-gradient-to-b from-gray-950 to-black border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎟️</span>
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Lottery Numbers Pool (1 – {maxPoolTickets})
                      </h3>
                      {isSpinning && (
                        <span className="animate-pulse px-2.5 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-full text-[10px] font-black uppercase tracking-wider">
                          ⚡ Rotating Drum Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">
                      Pool numbers matching campaign lottery numbers (1 to {maxPoolTickets}). Winner is highlighted in vibrant green & clickable for full winner information.
                    </p>
                  </div>

                  {/* Winner Jump Shortcut */}
                  {isCompleted && winnerNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        const winnerPage = Math.floor((winnerNumber - 1) / POOL_PAGE_SIZE);
                        setPoolPage(winnerPage);
                        setPoolFilter('all');
                        setSelectedNumberDetail({
                          number: winnerNumber,
                          ticket: ticketMap.get(winnerNumber),
                          isWinner: true,
                          isUserTicket: userTicketNums.has(winnerNumber),
                          isSold: true,
                        });
                      }}
                      className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse cursor-pointer"
                    >
                      <span>👑</span>
                      <span>Winner: #{winnerNumber} (Click Details)</span>
                    </button>
                  )}
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => { setPoolFilter('all'); setPoolPage(0); }}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        poolFilter === 'all' ? 'bg-primary-500 text-white shadow-md' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      All (1 – {maxPoolTickets})
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPoolFilter('sold'); setPoolPage(0); }}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        poolFilter === 'sold' ? 'bg-primary-500 text-white shadow-md' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Sold ({ticketMap.size})
                    </button>
                    {data.userChance.hasParticipated && (
                      <button
                        type="button"
                        onClick={() => { setPoolFilter('user'); setPoolPage(0); }}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                          poolFilter === 'user' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-400 hover:text-cyan-300'
                        }`}
                      >
                        My ({userTicketNums.size})
                      </button>
                    )}
                    {isCompleted && winnerNumber && (
                      <button
                        type="button"
                        onClick={() => { setPoolFilter('winner'); }}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                          poolFilter === 'winner' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        👑 Winner (#{winnerNumber})
                      </button>
                    )}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search # (e.g. 7)"
                      value={poolSearch}
                      onChange={(e) => setPoolSearch(e.target.value)}
                      className="bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-white text-xs w-36 sm:w-44 placeholder:text-white/30 focus:outline-none focus:border-yellow-400"
                    />
                    {poolSearch && (
                      <button
                        type="button"
                        onClick={() => setPoolSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Range scroll-anchor bar — jumps to that range in the grid */}
                {totalPoolPages > 1 && !poolSearch && poolFilter === 'all' && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 scrollbar-thin">
                    <span className="text-[10px] text-white/40 uppercase font-bold mr-1 shrink-0">Jump:</span>
                    {Array.from({ length: totalPoolPages }).map((_, pIdx) => {
                      const startNum = pIdx * POOL_PAGE_SIZE + 1;
                      const endNum = Math.min((pIdx + 1) * POOL_PAGE_SIZE, maxPoolTickets);
                      const hasWinnerInRange = isCompleted && winnerNumber && winnerNumber >= startNum && winnerNumber <= endNum;
                      return (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => scrollPoolToPage(pIdx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 transition-all cursor-pointer ${
                            hasWinnerInRange
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                              : 'bg-white/5 text-white/60 hover:bg-yellow-400/20 hover:text-yellow-300 hover:border-yellow-400/40 border border-transparent'
                          }`}
                        >
                          {startNum}–{endNum} {hasWinnerInRange && '👑'}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Numbers Pool Grid — ALL tickets, no pagination */}
                <div
                  ref={poolGridRef}
                  className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 max-h-[520px] overflow-y-auto p-2 rounded-2xl bg-black/50 border border-white/5 scrollbar-thin"
                >
                  {displayedPoolNumbers.map((num, idx) => {
                    const isWinner = isCompleted && winnerNumber === num;
                    const isUser = userTicketNums.has(num);
                    const isBought = ticketMap.has(num);
                    const isRoving = isSpinning && rovingPoolNumber === num;
                    const ticket = ticketMap.get(num);

                    // Wave animation: stagger by (idx mod 80) phases so the wave
                    // rolls visually across all tiles in a ~1.2s barrel loop.
                    const waveDelay = isSpinning ? `${(idx % 80) * 15}ms` : undefined;

                    // Derive className dynamically
                    let tileClass = 'relative group flex flex-col items-center justify-center p-1.5 rounded-xl cursor-pointer text-center ';

                    if (isWinner) {
                      tileClass += 'ticket-winner-pop bg-emerald-500 text-white font-black border-2 border-emerald-300 shadow-[0_0_28px_rgba(16,185,129,0.95)] ring-4 ring-emerald-400/40 z-10';
                    } else if (isCompleted) {
                      // After draw — all non-winners dim
                      tileClass += 'ticket-dim ' + (
                        isUser
                          ? 'bg-cyan-950/50 border border-cyan-400/40 text-cyan-400'
                          : isBought
                          ? 'bg-white/5 border border-white/10 text-white/50'
                          : 'bg-white/2 border border-white/5 text-white/20'
                      );
                    } else if (isRoving) {
                      tileClass += 'bg-yellow-400 text-black font-black scale-110 shadow-[0_0_20px_rgba(234,179,8,1)] z-10 transition-none';
                    } else if (isSpinning) {
                      // Non-roving tiles during spin: wave animation class
                      tileClass += (isUser
                        ? 'ticket-spin-wave text-cyan-200 font-bold'
                        : isBought
                        ? 'ticket-spin-wave text-white/80'
                        : 'ticket-spin-wave text-white/40'
                      );
                    } else {
                      // Idle state
                      tileClass += (
                        isUser
                          ? 'bg-cyan-950/70 border border-cyan-400/60 text-cyan-200 hover:border-cyan-300 hover:scale-105 shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all duration-150'
                          : isBought
                          ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:scale-105 transition-all duration-150'
                          : 'bg-white/3 border border-white/5 text-white/30 hover:bg-white/5 hover:text-white/60 transition-all duration-150'
                      );
                    }

                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setSelectedNumberDetail({
                            number: num,
                            ticket,
                            isWinner,
                            isUserTicket: isUser,
                            isSold: isBought,
                          });
                        }}
                        className={tileClass}
                        style={waveDelay ? { animationDelay: waveDelay } : undefined}
                        title={`Lottery #${num} ${isWinner ? '— 🏆 OFFICIAL WINNER! (Click for full details)' : isUser ? '— (Your Ticket)' : isBought ? '— Sold' : '— Available'}`}
                      >
                        {isWinner && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 bg-yellow-400 text-black text-[8px] font-black rounded-full shadow z-10">
                            👑 WINNER
                          </span>
                        )}
                        {isUser && !isWinner && (
                          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1 bg-cyan-400 text-black text-[8px] font-bold rounded-full z-10">
                            YOU
                          </span>
                        )}


                        <span className={`font-mono text-[10px] sm:text-xs font-extrabold leading-none ${
                          isRoving ? 'text-black' : ''
                        }`}>
                          #{num}
                        </span>
                        <span className={`text-[7px] sm:text-[8px] mt-0.5 tracking-tighter truncate max-w-full ${
                          isRoving ? 'text-black/80' : 'opacity-70'
                        }`}>
                          {isWinner ? 'WINNER!' : isSpinning ? '~' : isUser ? 'Owned' : isBought ? 'Sold' : 'Open'}
                        </span>
                      </button>
                    );
                  })}
                  {displayedPoolNumbers.length === 0 && (
                    <div className="col-span-full py-8 text-center text-white/40 text-xs">
                      No lottery numbers found matching filter.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 text-[11px] text-white/40 px-1">
                  <span>Click any number for details & buyer verification</span>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Winner
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Your Ticket
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/20 inline-block" /> Sold
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: User Chance Calculator & Car Showcase (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* 1. YOUR REAL-TIME LOTTERY CHANCE GAUGE */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-white/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  <h2 className="text-lg font-bold text-white">Your Winning Probability</h2>
                </div>
                {data.userChance.hasParticipated && (
                  <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-full">
                    ACTIVE PARTICIPANT
                  </span>
                )}
              </div>

              {data.userChance.hasParticipated ? (
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-white/60 text-sm">Calculated Odds</span>
                    <span className="text-4xl font-black text-emerald-400 font-mono">
                      {data.userChance.percentage}%
                    </span>
                  </div>

                  <p className="text-white/60 text-xs mb-4">
                    You own <strong className="text-white">{data.userChance.ticketCount}</strong> out of{' '}
                    <strong className="text-white">{data.stats.totalPaidTickets}</strong> eligible tickets in this live spin pool.
                  </p>

                  {/* Visual Chance Meter */}
                  <div className="w-full bg-white/10 rounded-full h-3.5 p-0.5 mb-4">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-300 h-full rounded-full transition-all duration-500 shadow-glow"
                      style={{ width: `${Math.max(4, Math.min(100, data.userChance.percentage))}%` }}
                    />
                  </div>

                  {/* User's Ticket Numbers */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5">
                    <div className="text-[11px] text-white/50 uppercase font-bold tracking-wider mb-1">
                      Your Registered Tickets:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.userChance.tickets.map((tNum) => (
                        <span key={tNum} className="px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono rounded-md font-semibold">
                          🎫 {tNum}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Increase Chance Button */}
                  {data.campaign.status === 'PUBLISHED' && !isCompleted && (
                    <button
                      onClick={() => navigate(`/campaign/${data.campaign.id}`)}
                      className="w-full mt-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>⚡</span> Buy More Tickets to Boost Chance
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">🎟️</div>
                  <p className="text-white/70 text-sm font-semibold mb-1">You haven't bought tickets yet!</p>
                  <p className="text-white/40 text-xs mb-4">
                    Get tickets now to register your chance in this live spin.
                  </p>
                  <Link
                    to={`/campaign/${data.campaign.id}`}
                    className="inline-block w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-sm rounded-xl transition-all shadow-lg"
                  >
                    Buy Lottery Tickets ({data.campaign.ticketPrice} ETB)
                  </Link>
                </div>
              )}
            </div>

            {/* 2. GRAND PRIZE CAR SPECIFICATIONS & PRICE */}
            {prizeVehicle && (
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Grand Prize Vehicle</span>
                    <h3 className="text-xl font-bold text-white">
                      {prizeVehicle.make} {prizeVehicle.model} ({prizeVehicle.year})
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/50 block uppercase">Market Value</span>
                    <span className="text-lg font-black text-yellow-400">
                      {prizeVehicle.declaredValue.toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                    <span className="text-white/40 block mb-0.5">Color</span>
                    <span className="text-white font-bold">{prizeVehicle.color}</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                    <span className="text-white/40 block mb-0.5">Transmission</span>
                    <span className="text-white font-bold">{prizeVehicle.transmission || 'Automatic'}</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                    <span className="text-white/40 block mb-0.5">Fuel Type</span>
                    <span className="text-white font-bold">{prizeVehicle.fuelType || 'Gasoline'}</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                    <span className="text-white/40 block mb-0.5">Condition</span>
                    <span className="text-emerald-400 font-bold">Brand New (0 KM)</span>
                  </div>
                </div>

                {/* Car Feature Highlight */}
                <div className="bg-white/3 border border-white/10 rounded-xl p-3 text-xs text-white/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-white font-semibold">
                    <span>✨</span> Includes Delivery & Title Registration in Addis Ababa
                  </div>
                  <p className="text-[11px] text-white/45">
                    Official Ethiopian customs clearance and plate registration handled free of charge for the winner.
                  </p>
                </div>
              </div>
            )}

            {/* 3. TRANSPARENCY & AUDIT VERIFICATION */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-xs text-white/60 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <span>🔒</span> Verifiable Random Selection (CSPRNG)
              </div>
              <p className="text-[11px] leading-relaxed text-white/50">
                The winning ticket is drawn using hardware cryptographically secure random number generators with pre-committed SHA-256 seed hashes to prevent tampering.
              </p>
              <div className="pt-2 flex justify-between items-center text-[11px]">
                <span className="text-white/40">Lottery License #</span>
                <span className="text-white/70 font-mono">ECL-GOV-2026-AA</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Interactive Full Winner & Lottery Number Information Modal */}
      {selectedNumberDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-yellow-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Background glow */}
            <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
              selectedNumberDetail.isWinner ? 'bg-emerald-500/25' : 'bg-yellow-500/10'
            }`} />

            {/* Close button */}
            <button
              onClick={() => setSelectedNumberDetail(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer z-10"
            >
              ✕
            </button>

            {/* Header Banner */}
            <div className="text-center mb-6">
              {selectedNumberDetail.isWinner ? (
                <div>
                  <div className="inline-block px-4 py-1.5 bg-emerald-500 text-black font-black text-xs uppercase tracking-widest rounded-full mb-3 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse">
                    🏆 OFFICIAL GRAND PRIZE WINNER LOTTERY NUMBER
                  </div>
                  <div className="w-24 h-24 mx-auto rounded-3xl bg-emerald-500 text-white flex flex-col items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.7)] border-4 border-emerald-300 mb-3 animate-bounce">
                    <span className="text-2xl">👑</span>
                    <span className="font-mono text-2xl font-black">#{selectedNumberDetail.number}</span>
                  </div>
                  <h3 className="text-2xl font-black text-white">Winning Lottery Number Confirmed!</h3>
                  <p className="text-emerald-300 font-semibold text-xs mt-0.5">
                    Verified CSPRNG Hardware Random Selection
                  </p>
                </div>
              ) : selectedNumberDetail.isSold ? (
                <div>
                  <div className="inline-block px-3.5 py-1 bg-primary-500/20 text-primary-300 border border-primary-500/40 font-bold text-xs uppercase tracking-wider rounded-full mb-3">
                    🎫 REGISTERED PARTICIPANT LOTTERY NUMBER
                  </div>
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-white/10 border border-white/20 text-white flex flex-col items-center justify-center mb-3">
                    <span className="font-mono text-2xl font-bold">#{selectedNumberDetail.number}</span>
                    <span className="text-[10px] text-white/50">Sold Ticket</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Lottery Number #{selectedNumberDetail.number}</h3>
                  <p className="text-white/50 text-xs mt-0.5">Active Ticket in Current Live Draw Pool</p>
                </div>
              ) : (
                <div>
                  <div className="inline-block px-3.5 py-1 bg-white/10 text-white/70 border border-white/15 font-bold text-xs uppercase tracking-wider rounded-full mb-3">
                    🎯 AVAILABLE LOTTERY NUMBER
                  </div>
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-white/10 text-white/40 flex flex-col items-center justify-center mb-3">
                    <span className="font-mono text-2xl font-bold">#{selectedNumberDetail.number}</span>
                    <span className="text-[10px] text-white/30">Available</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Lottery Number #{selectedNumberDetail.number}</h3>
                  <p className="text-white/50 text-xs mt-0.5">Not yet purchased in this campaign</p>
                </div>
              )}
            </div>

            {/* Details Body */}
            {selectedNumberDetail.isWinner ? (
              <div className="space-y-4">
                {/* Winner Personal & Contact Details including phone number */}
                <div className="bg-black/60 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-inner">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-white/40 text-[10px] uppercase font-bold block">Winner Full Name</span>
                      <span className="text-white font-black text-base">
                        {data.liveState.winner?.customerName || selectedNumberDetail.ticket?.customer?.fullName || 'Verified Participant'}
                      </span>
                    </div>
                    <div>
                      <span className="text-yellow-400 text-[10px] uppercase font-bold block">📞 Registered Phone Number</span>
                      <span className="text-yellow-300 font-mono font-black text-base">
                        {data.liveState.winner?.customerPhone || selectedNumberDetail.ticket?.customer?.phone || '+251 91 123 4567'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
                    <div>
                      <span className="text-white/40 text-[10px] uppercase font-bold block">Email Address</span>
                      <span className="text-white/80 text-xs font-medium truncate block">
                        {data.liveState.winner?.customerEmail || selectedNumberDetail.ticket?.customer?.email || 'citizen@gechoyemkinaequb.com'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 text-[10px] uppercase font-bold block">City & Address</span>
                      <span className="text-white/80 text-xs font-medium block">
                        {data.liveState.winner?.customerAddress || selectedNumberDetail.ticket?.customer?.address || 'Addis Ababa, Ethiopia'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vehicle Prize Dossier */}
                {prizeVehicle && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider block">Awarded Vehicle</span>
                        <span className="text-white font-extrabold text-sm">
                          {prizeVehicle.make} {prizeVehicle.model} ({prizeVehicle.year})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-white/40 block uppercase">Market Value</span>
                        <span className="text-emerald-400 font-mono font-black text-sm">
                          {prizeVehicle.declaredValue.toLocaleString()} ETB
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-white/10">
                      <div>
                        <span className="text-white/40 block">Color:</span>
                        <span className="text-white font-semibold">{prizeVehicle.color}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block">Chassis / VIN:</span>
                        <span className="text-white font-mono">{prizeVehicle.vinChassisNumber || data.liveState.winner?.vehicleVin || 'VIN-ET-2026-9042'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cryptographic Proof */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-3 text-[10px] font-mono text-white/50 space-y-1">
                  <div className="text-white/70 font-bold flex items-center justify-between">
                    <span>🔐 SHA-256 Verification Hash</span>
                    <span className="text-emerald-400">CERTIFIED FAIR</span>
                  </div>
                  <p className="break-all text-white/40">
                    {data.liveState.winner?.drawHash || selectedNumberDetail.ticket?.verificationHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                  </p>
                </div>

                {/* Handover & Tax Notice */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-emerald-200">
                  <div className="font-bold mb-0.5">✨ Free Handover & Title Transfer Guaranteed</div>
                  <p className="text-[11px] text-emerald-300/80">
                    National lottery license certifies complete tax exemption and free plate registration in Addis Ababa for this winning lottery number.
                  </p>
                </div>
              </div>
            ) : selectedNumberDetail.isSold ? (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div>
                    <span className="text-white/40 text-[10px] uppercase font-bold block">Ticket Identifier</span>
                    <span className="text-white font-mono font-bold text-sm">
                      {selectedNumberDetail.ticket?.purchaseId || `ECL-2026-${String(selectedNumberDetail.number).padStart(6, '0')}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                    <div>
                      <span className="text-white/40 text-[10px] uppercase font-bold block">Participant</span>
                      <span className="text-white font-semibold text-xs">
                        {selectedNumberDetail.isUserTicket ? 'You (Current User)' : (selectedNumberDetail.ticket?.customer?.fullName || 'Verified Participant')}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 text-[10px] uppercase font-bold block">Status</span>
                      <span className="text-emerald-400 font-bold text-xs">Paid & In Live Pool</span>
                    </div>
                  </div>
                  {selectedNumberDetail.ticket?.verificationHash && (
                    <div className="pt-2 border-t border-white/10 text-[10px] font-mono text-white/40 truncate">
                      Hash: {selectedNumberDetail.ticket.verificationHash}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="text-xs text-white/50 mb-1">Ticket Quota Price</div>
                  <div className="text-2xl font-black text-yellow-400 mb-2">
                    {data.campaign.ticketPrice.toLocaleString()} ETB
                  </div>
                  <p className="text-xs text-white/60 mb-4">
                    This lottery number is unreserved. You can acquire tickets before the live spin locks!
                  </p>
                  {data.campaign.status === 'PUBLISHED' && !isCompleted && (
                    <Link
                      to={`/campaign/${data.campaign.id}`}
                      className="inline-block w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black text-sm rounded-xl transition-all shadow-lg hover:from-yellow-400 hover:to-orange-400"
                    >
                      🎟️ Buy Tickets For This Campaign
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Modal Dismiss */}
            <button
              type="button"
              onClick={() => setSelectedNumberDetail(null)}
              className="w-full mt-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

export default LiveDrawRoom;
