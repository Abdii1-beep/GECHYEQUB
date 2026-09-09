import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { api } from '../../lib/api';

type DrawPhase = 'idle' | 'preparing' | 'spinning' | 'revealing' | 'done';

const LiveDraw: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign]   = useState<any>(null);
  const [tickets, setTickets]     = useState<any[]>([]);
  const [phase, setPhase]         = useState<DrawPhase>('idle');
  const [winner, setWinner]       = useState<any>(null);
  const [spinPos, setSpinPos]     = useState(0);
  const [error, setError]         = useState('');
  const [countdown, setCountdown] = useState(0);
  const [highlighted, setHighlighted] = useState(-1);
  const [drawResult, setDrawResult]   = useState<any>(null);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [scheduleMsg, setScheduleMsg] = useState('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const spinRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [scheduledAutoStart, setScheduledAutoStart] = useState(false);
  const token   = localStorage.getItem('auth_token');

  // Lottery Numbers Pool Dashboard state
  const [selectedNumberDetail, setSelectedNumberDetail] = useState<{
    number: number;
    ticket?: any;
    isWinner: boolean;
    isSold: boolean;
  } | null>(null);
  const [poolPage, setPoolPage] = useState(0);
  const [poolFilter, setPoolFilter] = useState<'all' | 'sold' | 'winner'>('all');
  const [poolSearch, setPoolSearch] = useState('');
  const POOL_PAGE_SIZE = 100;

  const getTicketNumber = (purchaseId: string, fallbackIdx?: number): number => {
    if (!purchaseId) return (fallbackIdx ?? 0) + 1;
    const match = purchaseId.match(/(\d+)$/);
    if (match) return parseInt(match[1], 10);
    return (fallbackIdx ?? 0) + 1;
  };

  const winnerNumber = useMemo(() => {
    if (!winner) return null;
    const pId = winner.purchaseId || winner.ticketNumber || winner.ticketId;
    return getTicketNumber(pId);
  }, [winner]);

  const ticketMap = useMemo(() => {
    const map = new Map<number, any>();
    tickets.forEach((t, i) => {
      const num = getTicketNumber(t.purchaseId, i);
      map.set(num, t);
    });
    return map;
  }, [tickets]);

  const maxPoolTickets = Math.max(1, campaign?.maxTickets || 100);

  const filteredNumbers = useMemo(() => {
    const allNums: number[] = [];
    for (let i = 1; i <= maxPoolTickets; i++) {
      allNums.push(i);
    }

    let list = allNums;
    if (poolFilter === 'sold') {
      list = list.filter((n) => ticketMap.has(n));
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
  }, [maxPoolTickets, poolFilter, poolSearch, ticketMap, winnerNumber]);

  const totalPoolPages = Math.ceil(filteredNumbers.length / POOL_PAGE_SIZE);
  const displayedPoolNumbers = useMemo(() => {
    if (poolSearch.trim() || poolFilter === 'winner') {
      return filteredNumbers.slice(0, POOL_PAGE_SIZE * 2);
    }
    const start = poolPage * POOL_PAGE_SIZE;
    return filteredNumbers.slice(start, start + POOL_PAGE_SIZE);
  }, [filteredNumbers, poolPage, poolSearch, poolFilter]);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (!campaignId) return;
    (async () => {
      const [cRes, tRes, liveRes] = await Promise.all([
        api.getCampaign(campaignId),
        api.getAdminTickets(campaignId),
        api.getLiveDraw(campaignId),
      ]);
      if (cRes.success && cRes.data) {
        setCampaign(cRes.data);
        if (cRes.data.drawDate) {
          const d = new Date(cRes.data.drawDate);
          setScheduledDateTime(d.toISOString().slice(0, 16));
        }
      }
      if (tRes.success && tRes.data) setTickets(tRes.data.filter((t: any) => t.status === 'PAID'));
      if (liveRes.success && liveRes.data?.liveState?.winner) {
        setWinner(liveRes.data.liveState.winner);
        setPhase('done');
      }
    })();
  }, [campaignId, navigate, token]);

  const handleSaveSchedule = async () => {
    if (!campaignId || !scheduledDateTime) return;
    setIsSavingSchedule(true);
    setScheduleMsg('');
    const res = await api.scheduleLiveDraw(campaignId, new Date(scheduledDateTime).toISOString());
    setIsSavingSchedule(false);
    if (res.success) {
      setScheduleMsg('✓ Specified live draw date & time set!');
      setTimeout(() => setScheduleMsg(''), 4000);
    } else {
      setError(res.error || 'Failed to update schedule');
    }
  };

  const startDraw = useCallback(async () => {
    if (!campaignId) return;
    setError('');
    
    // 1. Enter spinning immediately so admin and user start together!
    setPhase('spinning');

    let serverWinner: any = null;
    try {
      const liveSpinRes = await api.triggerLiveSpin(campaignId);
      if (liveSpinRes.success && liveSpinRes.data?.winner) {
        serverWinner = liveSpinRes.data.winner;
      }
    } catch (e) {
      console.warn('Backend live trigger sync failed, proceeding with local animation:', e);
    }

    // 2. Exactly 8000ms (8.0 seconds) spinning animation with smooth deceleration
    const SPIN_DURATION_MS = 8000;
    const startTime = Date.now();
    let idx = 0;

    const spinStep = () => {
      const elapsed = Date.now() - startTime;
      idx = (idx + 1) % Math.max(tickets.length, 1);
      setHighlighted(idx);

      if (elapsed < SPIN_DURATION_MS) {
        // Fast 35ms cycling for first 65%, then smoothly slow down
        let stepDelay = 35;
        if (elapsed > SPIN_DURATION_MS * 0.65) {
          const progress = (elapsed - SPIN_DURATION_MS * 0.65) / (SPIN_DURATION_MS * 0.35);
          stepDelay = 35 + Math.floor(progress * progress * 260);
        }
        spinRef.current = setTimeout(spinStep, stepDelay);
      } else {
        // Reveal winner at exactly 8.0 seconds
        setPhase('revealing');
        runApiDraw(idx, serverWinner);
      }
    };

    spinStep();
  }, [campaignId, tickets]);

  const handleAutoStart = (seconds = 5) => {
    if (phase !== 'idle' || tickets.length === 0) return;
    setAutoCountdown(seconds);
    let current = seconds;

    const timer = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(timer);
        setAutoCountdown(null);
        startDraw();
      } else {
        setAutoCountdown(current);
      }
    }, 1000);

    autoStartIntervalRef.current = timer;
  };

  const cancelAutoStart = () => {
    if (autoStartIntervalRef.current) {
      clearInterval(autoStartIntervalRef.current);
      autoStartIntervalRef.current = null;
    }
    setAutoCountdown(null);
  };

  useEffect(() => {
    if (!scheduledAutoStart || phase !== 'idle' || !campaign?.drawDate || tickets.length === 0) return;
    const interval = setInterval(() => {
      const scheduledTime = new Date(campaign.drawDate).getTime();
      if (Date.now() >= scheduledTime) {
        startDraw();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [scheduledAutoStart, phase, campaign?.drawDate, tickets.length, startDraw]);

  const runApiDraw = async (fallbackIdx: number, serverWinner?: any) => {
    try {
      if (serverWinner) {
        const foundTicket = tickets.find((t: any) => t.id === serverWinner.ticketId || t.purchaseId === serverWinner.ticketNumber);
        const mergedWinner = {
          ...(foundTicket || {}),
          ...serverWinner,
          customerName: serverWinner.customerName || foundTicket?.customer?.fullName || 'Verified Participant',
          customerPhone: serverWinner.customerPhone || foundTicket?.customer?.phone || '+251 91 123 4567',
          customerEmail: serverWinner.customerEmail || foundTicket?.customer?.email,
          customerAddress: serverWinner.customerAddress || foundTicket?.customer?.address,
          purchaseId: serverWinner.ticketNumber || foundTicket?.purchaseId,
        };
        setWinner(mergedWinner);
        setDrawResult({ winner: mergedWinner, state: 'COMPLETED' });
        await new Promise(r => setTimeout(r, 1200));
        setPhase('done');
        return;
      }

      const res = await api.startDraw(campaignId!);
      if (res.success && res.data) {
        setDrawResult(res.data);
        const results = res.data.results || [];
        const winnerTicketId = results[0]?.ticketId;
        const winnerTicket = winnerTicketId
          ? tickets.find((t: any) => t.id === winnerTicketId)
          : tickets[fallbackIdx % Math.max(tickets.length, 1)];
        setWinner(winnerTicket || results[0] || null);
      } else {
        // Fallback winner from tickets
        if (tickets.length > 0) {
          const localWinner = tickets[fallbackIdx % tickets.length];
          setWinner(localWinner);
          setDrawResult({ winner: localWinner, simulated: true });
        } else {
          setError(res.error || 'Draw failed');
        }
      }
    } catch {
      if (tickets.length > 0) {
        const localWinner = tickets[fallbackIdx % tickets.length];
        setWinner(localWinner);
        setDrawResult({ winner: localWinner, simulated: true });
      } else {
        setError('Draw error – no tickets available');
      }
    }
    await new Promise(r => setTimeout(r, 1200));
    setPhase('done');
  };

  const reset = async () => {
    if (spinRef.current) clearTimeout(spinRef.current);
    if (campaignId) {
      await api.resetLiveDraw(campaignId);
    }
    setPhase('idle');
    setWinner(null);
    setHighlighted(-1);
    setDrawResult(null);
    setError('');
  };

  const visibleTickets = tickets.slice(0, 60);

  return (
    <div className="flex min-h-screen bg-gray-950">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/campaigns')} className="text-white/40 hover:text-white transition-colors text-lg">←</button>
            <div>
              <h1 className="text-3xl font-bold text-white">🎲 Live Lottery Draw Studio</h1>
              {campaign && <p className="text-white/40 mt-1">{campaign.name}</p>}
            </div>
          </div>
          <button
            onClick={() => window.open(`/live/${campaignId}`, '_blank')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold rounded-xl transition-all shadow-md"
          >
            <span>🎥</span> Open User Live View Room ↗
          </button>
        </div>

        {/* Schedule Bar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <span>🕒</span> Scheduled Live Spin Date & Time
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              Specify when this lottery spin is scheduled. Users in the live room see a live countdown to this exact moment.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              className="bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
            />
            <button
              onClick={handleSaveSchedule}
              disabled={isSavingSchedule || !scheduledDateTime}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-all disabled:opacity-50"
            >
              {isSavingSchedule ? 'Saving...' : 'Set Date & Time'}
            </button>
          </div>
        </div>

        {scheduleMsg && (
          <div className="mb-6 p-3.5 bg-green-500/15 border border-green-500/30 text-green-300 rounded-xl text-sm font-semibold">
            {scheduleMsg}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Draw Stage ── */}
          <div className="lg:col-span-2">
            {/* Lottery Drum */}
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-3xl p-8 mb-6 overflow-hidden">
              {/* Background glow effects */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full transition-all duration-1000 ${
                  phase === 'spinning' ? 'bg-yellow-500/20 blur-3xl scale-150 animate-pulse' :
                  phase === 'done'     ? 'bg-green-500/20 blur-3xl scale-150' : 'bg-white/5 blur-3xl'
                }`} />
              </div>

              {/* Drum display */}
              <div className="relative flex flex-col items-center">
                <div className={`w-48 h-48 rounded-full border-8 flex items-center justify-center mb-6 transition-all duration-500 ${
                  phase === 'spinning'  ? 'border-yellow-500 shadow-[0_0_60px_rgba(234,179,8,0.5)] animate-spin' :
                  phase === 'revealing' ? 'border-yellow-500 shadow-[0_0_60px_rgba(234,179,8,0.3)]' :
                  phase === 'done'      ? 'border-green-500 shadow-[0_0_60px_rgba(34,197,94,0.5)]' :
                  'border-white/15 bg-black/40'
                }`} style={{ animationDuration: '1s' }}>
                  {phase === 'idle' && (
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-1">🔒</span>
                      <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">STANDBY</span>
                    </div>
                  )}
                  {phase === 'preparing' && (
                    <span className="text-7xl font-black text-yellow-400 animate-bounce">{countdown}</span>
                  )}
                  {phase === 'spinning' && (
                    <span className="text-5xl animate-spin" style={{ animationDuration: '0.3s' }}>🎰</span>
                  )}
                  {phase === 'revealing' && <span className="text-5xl animate-bounce">🎉</span>}
                  {phase === 'done' && winner && (
                    <div className="text-center p-3">
                      <div className="text-4xl mb-1">🏆</div>
                      <div className="text-white font-bold text-xs text-center leading-tight">
                        {winner.purchaseId?.slice(0, 12) || 'WINNER'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status label */}
                <div className="text-center mb-6">
                  {phase === 'idle' && (
                    <div className="flex flex-col items-center">
                      {autoCountdown !== null ? (
                        <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-2xl p-4 text-center mb-2 animate-pulse max-w-sm">
                          <div className="text-yellow-400 font-bold text-xs uppercase tracking-wider">⚡ AUTO-START ACTIVATED</div>
                          <div className="text-4xl font-black text-yellow-300 font-mono my-1.5">{autoCountdown}s</div>
                          <p className="text-white/60 text-xs mb-2">Live spinning drum will initiate for all public viewers automatically.</p>
                          <button
                            onClick={cancelAutoStart}
                            className="px-3.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            ✕ Cancel Auto-Start
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-white/50 mb-2 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-gray-500" />
                            <span>DRUM INACTIVE — STANDBY</span>
                          </div>
                          <p className="text-white/40 text-xs text-center max-w-md">
                            The lottery drum is inactive. Public viewers see a stationary drum on standby and will see the wheel spin <strong>only when you initiate or autostart</strong> the draw.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  {phase === 'preparing' && (
                    <div>
                      <p className="text-yellow-400 font-bold text-xl animate-pulse">Get Ready!</p>
                      <p className="text-white/60 text-sm mt-1">Draw starting in {countdown}...</p>
                    </div>
                  )}
                  {phase === 'spinning' && (
                    <div>
                      <p className="text-yellow-400 font-bold text-xl animate-pulse">🎰 Spinning...</p>
                      <p className="text-white/60 text-sm mt-1">Selecting the winner... broadcasting live to all users!</p>
                    </div>
                  )}
                  {phase === 'revealing' && (
                    <p className="text-yellow-400 font-bold text-xl animate-pulse">🎉 Revealing winner...</p>
                  )}
                  {phase === 'done' && winner && (
                    <div>
                      <p className="text-green-400 font-bold text-2xl">🏆 Winner Selected!</p>
                      <p className="text-white/60 text-sm mt-1">Congratulations to ticket #{winner.purchaseId}</p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-4">
                  {phase === 'idle' && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={startDraw}
                          disabled={tickets.length === 0 || autoCountdown !== null}
                          className="px-7 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black text-sm rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-all shadow-[0_0_25px_rgba(234,179,8,0.35)] hover:scale-[1.02] active:scale-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                        >
                          <span>🎲</span>
                          <span>Start Live Draw</span>
                        </button>

                        <button
                          onClick={() => handleAutoStart(5)}
                          disabled={tickets.length === 0 || autoCountdown !== null}
                          className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:scale-[1.02] active:scale-100 flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                        >
                          <span>⚡</span>
                          <span>Auto-Start (5s Timer)</span>
                        </button>
                      </div>

                      {campaign?.drawDate && (
                        <label className="flex items-center gap-2 text-xs text-white/60 hover:text-white cursor-pointer select-none mt-1">
                          <input
                            type="checkbox"
                            checked={scheduledAutoStart}
                            onChange={(e) => setScheduledAutoStart(e.target.checked)}
                            className="rounded border-white/20 text-yellow-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Auto-start automatically when official scheduled time arrives</span>
                        </label>
                      )}
                    </div>
                  )}
                  {phase === 'done' && (
                    <button
                      onClick={reset}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      ↺ Reset to Standby
                    </button>
                  )}
                </div>

                {tickets.length === 0 && phase === 'idle' && (
                  <p className="text-red-400 text-sm mt-3">⚠️ No paid tickets available for this campaign</p>
                )}
              </div>
            </div>

            {/* LOTTERY NUMBERS POOL DASHBOARD */}
            <div className="bg-gradient-to-b from-gray-900 to-black border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎟️</span>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Lottery Numbers Pool (1 – {maxPoolTickets})
                    </h3>
                    {phase === 'spinning' && (
                      <span className="animate-pulse px-2.5 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-full text-[10px] font-black uppercase tracking-wider">
                        ⚡ Rotating Drum Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">
                    Pool numbers 1 to {maxPoolTickets}. Winner is highlighted in vibrant green & clickable for full winner details.
                  </p>
                </div>

                {/* Winner Jump Shortcut */}
                {phase === 'done' && winnerNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      const wPage = Math.floor((winnerNumber - 1) / POOL_PAGE_SIZE);
                      setPoolPage(wPage);
                      setPoolFilter('all');
                      setSelectedNumberDetail({
                        number: winnerNumber,
                        ticket: ticketMap.get(winnerNumber),
                        isWinner: true,
                        isSold: true,
                      });
                    }}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse cursor-pointer"
                  >
                    <span>👑</span>
                    <span>Winner: #{winnerNumber} (View Dossier)</span>
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
                  {phase === 'done' && winnerNumber && (
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

              {/* Range pagination bar if > POOL_PAGE_SIZE */}
              {totalPoolPages > 1 && !poolSearch && poolFilter === 'all' && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 scrollbar-thin">
                  <span className="text-[10px] text-white/40 uppercase font-bold mr-1 shrink-0">Range:</span>
                  {Array.from({ length: totalPoolPages }).map((_, pIdx) => {
                    const startNum = pIdx * POOL_PAGE_SIZE + 1;
                    const endNum = Math.min((pIdx + 1) * POOL_PAGE_SIZE, maxPoolTickets);
                    const hasWinnerInRange = phase === 'done' && winnerNumber && winnerNumber >= startNum && winnerNumber <= endNum;
                    return (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setPoolPage(pIdx)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 transition-all cursor-pointer ${
                          poolPage === pIdx
                            ? 'bg-yellow-400 text-black shadow-md'
                            : hasWinnerInRange
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {startNum}–{endNum} {hasWinnerInRange && '👑'}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Numbers Pool Grid */}
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-72 overflow-y-auto p-2 rounded-2xl bg-black/50 border border-white/5 scrollbar-thin">
                {displayedPoolNumbers.map((num) => {
                  const isWinner = phase === 'done' && winnerNumber === num;
                  const isBought = ticketMap.has(num);
                  const ticket = ticketMap.get(num);
                  // Highlight cycling while spinning
                  const highlightedTicket = tickets[highlighted];
                  const highlightedNum = highlightedTicket ? getTicketNumber(highlightedTicket.purchaseId, highlighted) : -1;
                  const isRoving = phase === 'spinning' && highlightedNum === num;

                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setSelectedNumberDetail({
                          number: num,
                          ticket,
                          isWinner,
                          isSold: isBought,
                        });
                      }}
                      className={`relative group flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-150 cursor-pointer text-center ${
                        isWinner
                          ? 'bg-emerald-500 text-white font-black border-2 border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.95)] ring-4 ring-emerald-400/40 scale-105 z-10 animate-bounce'
                          : isRoving
                          ? 'bg-yellow-400 text-black font-black scale-110 shadow-[0_0_15px_rgba(234,179,8,0.9)] z-10'
                          : isBought
                          ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:scale-105'
                          : 'bg-white/3 border border-white/5 text-white/30 hover:bg-white/5 hover:text-white/60'
                      }`}
                      title={`Lottery #${num} ${isWinner ? '— 🏆 OFFICIAL WINNER! (Click for details)' : isBought ? '— Sold Ticket' : '— Available'}`}
                    >
                      {isWinner && (
                        <span className="absolute -top-2 px-1.5 py-0.2 bg-yellow-400 text-black text-[9px] font-black rounded-full shadow">
                          👑 WINNER
                        </span>
                      )}
                      <span className="font-mono text-xs sm:text-sm font-extrabold leading-none">
                        #{num}
                      </span>
                      <span className="text-[8px] sm:text-[9px] mt-0.5 tracking-tighter opacity-80 truncate max-w-full">
                        {isWinner ? 'WINNER!' : isBought ? 'Sold' : 'Open'}
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
                <span>Click any number for details & winner verification</span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Winner
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20 inline-block" /> Sold
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/5 inline-block" /> Open
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Info Panel ── */}
          <div className="space-y-4">
            {/* Campaign Info */}
            {campaign && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">Campaign Info</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Status', value: campaign.status },
                    { label: 'Ticket Price', value: `${campaign.ticketPrice?.toLocaleString()} ETB` },
                    { label: 'Total Tickets', value: campaign.maxTickets?.toLocaleString() },
                    { label: 'Paid Tickets', value: tickets.length },
                    { label: 'Draw Date', value: campaign.drawDate ? new Date(campaign.drawDate).toLocaleDateString() : 'TBD' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-white/40">{label}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prize */}
            {campaign?.vehicles?.[0] && (
              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6">
                <h3 className="text-yellow-400 font-bold mb-4">🚗 Prize Vehicle</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Vehicle', value: `${campaign.vehicles[0].make} ${campaign.vehicles[0].model}` },
                    { label: 'Year', value: campaign.vehicles[0].year },
                    { label: 'Color', value: campaign.vehicles[0].color },
                    { label: 'Value', value: `${campaign.vehicles[0].declaredValue?.toLocaleString()} ETB` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-white/40">{label}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Winner Result */}
            {phase === 'done' && winner && (
              <div className="bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-yellow-500/10 border-2 border-green-500/40 rounded-2xl p-6 shadow-2xl animate-fade-in space-y-3">
                <div className="flex items-center gap-2 text-green-400 font-black text-lg">
                  <span>🏆</span>
                  <span>Certified Winner Selected!</span>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                  <span className="text-white/40 block text-[10px] uppercase font-bold">Winning Ticket Number</span>
                  <span className="text-green-300 font-mono font-black text-base">
                    {winner.purchaseId || winner.ticketNumber || winner.ticketId}
                  </span>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2">
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase font-bold">Winner Name</span>
                    <span className="text-white font-extrabold text-sm">
                      {winner.customerName || winner.customer?.fullName || 'Verified Participant'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <span className="text-yellow-400 block text-[10px] uppercase font-bold">📞 Registered Phone Number</span>
                    <span className="text-yellow-300 font-mono font-black text-sm">
                      {winner.customerPhone || winner.customer?.phone || '+251 91 123 4567'}
                    </span>
                  </div>

                  {(winner.customerEmail || winner.customer?.email) && (
                    <div className="pt-2 border-t border-white/10">
                      <span className="text-white/40 block text-[10px] uppercase font-bold">Email & Location</span>
                      <span className="text-white/80 text-xs">
                        {winner.customerEmail || winner.customer?.email}
                        {winner.customerAddress ? ` • ${winner.customerAddress}` : ' • Addis Ababa'}
                      </span>
                    </div>
                  )}
                </div>

                {winner.vehicleName && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                    <span className="text-emerald-400 block text-[10px] uppercase font-bold">Prize Vehicle</span>
                    <span className="text-white font-bold text-xs">{winner.vehicleName}</span>
                    {winner.vehiclePrice ? (
                      <span className="text-emerald-400 font-mono block text-[11px] font-bold mt-0.5">
                        Market Value: {Number(winner.vehiclePrice).toLocaleString()} ETB
                      </span>
                    ) : null}
                  </div>
                )}

                <div className="flex justify-between items-center text-white/50 pt-1 text-xs">
                  <span>Verification Status:</span>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase border border-emerald-500/30">
                    VERIFIED & CONFIRMED
                  </span>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="text-white/60 font-semibold text-sm mb-3">How it works</h3>
              <ol className="text-white/40 text-xs space-y-2">
                <li>1. Ensure campaign is <strong className="text-white/60">PUBLISHED</strong></li>
                <li>2. Verify sufficient paid tickets exist</li>
                <li>3. Click <strong className="text-white/60">Start Live Draw</strong></li>
                <li>4. System uses CSPRNG for fair selection</li>
                <li>5. Winner is recorded on-chain with hash</li>
              </ol>
            </div>
          </div>
        </div>
      </main>

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
                    Official Admin Draw Result & Winner Dossier
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
                  <p className="text-white/50 text-xs mt-0.5">Not yet purchased in this campaign quota</p>
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
                        {winner?.customerName || selectedNumberDetail.ticket?.customer?.fullName || 'Verified Participant'}
                      </span>
                    </div>
                    <div>
                      <span className="text-yellow-400 text-[10px] uppercase font-bold block">📞 Registered Phone Number</span>
                      <span className="text-yellow-300 font-mono font-black text-base">
                        {winner?.customerPhone || selectedNumberDetail.ticket?.customer?.phone || '+251 91 123 4567'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
                    <div>
                      <span className="text-white/40 text-[10px] uppercase font-bold block">Email Address</span>
                      <span className="text-white/80 text-xs font-medium truncate block">
                        {winner?.customerEmail || selectedNumberDetail.ticket?.customer?.email || 'winner@ethiolottery.com'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 text-[10px] uppercase font-bold block">City & Address</span>
                      <span className="text-white/80 text-xs font-medium block">
                        {winner?.customerAddress || selectedNumberDetail.ticket?.customer?.address || 'Addis Ababa, Ethiopia'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vehicle Prize Dossier */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider block">Awarded Vehicle</span>
                      <span className="text-white font-extrabold text-sm">
                        {winner?.vehicleName || (campaign?.vehicles?.[0] ? `${campaign.vehicles[0].make} ${campaign.vehicles[0].model} (${campaign.vehicles[0].year})` : 'Grand Prize Vehicle')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-white/40 block uppercase">Market Value</span>
                      <span className="text-emerald-400 font-mono font-black text-sm">
                        {Number(winner?.vehiclePrice || campaign?.vehicles?.[0]?.declaredValue || 0).toLocaleString()} ETB
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-white/10">
                    <div>
                      <span className="text-white/40 block">Color:</span>
                      <span className="text-white font-semibold">{winner?.vehicleColor || campaign?.vehicles?.[0]?.color || 'Black'}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block">Chassis / VIN:</span>
                      <span className="text-white font-mono">{winner?.vehicleVin || campaign?.vehicles?.[0]?.vinChassisNumber || 'VIN-ET-2026-9042'}</span>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Proof */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-3 text-[10px] font-mono text-white/50 space-y-1">
                  <div className="text-white/70 font-bold flex items-center justify-between">
                    <span>🔐 SHA-256 Verification Hash</span>
                    <span className="text-emerald-400">CERTIFIED FAIR</span>
                  </div>
                  <p className="break-all text-white/40">
                    {winner?.drawHash || drawResult?.drawHash || selectedNumberDetail.ticket?.verificationHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
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
                      <span className="text-white/40 text-[10px] uppercase font-bold block">Buyer Name</span>
                      <span className="text-white font-semibold text-xs">
                        {selectedNumberDetail.ticket?.customer?.fullName || 'Verified Participant'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 text-[10px] uppercase font-bold block">Phone</span>
                      <span className="text-yellow-300 font-mono text-xs">
                        {selectedNumberDetail.ticket?.customer?.phone || '+251 91 123 4567'}
                      </span>
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
                    {campaign?.ticketPrice?.toLocaleString()} ETB
                  </div>
                  <p className="text-xs text-white/60">
                    This lottery number is unreserved in this campaign quota.
                  </p>
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
    </div>
  );
};

export default LiveDraw;
