import React, { useState, useEffect } from 'react';
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
  // OTP flow removed
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!id) return;
    api.getCampaign(id)
      .then((res) => {
        if (res.success && res.data) {
          setCampaign(res.data);
          // Load available tickets for the campaign
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
        // Direct purchase success handling
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
          return prev; // Max 20 tickets
        }
        return [...prev, ticketNumber];
      }
    });
  };

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

  const total = (campaign.ticketPrice * (selectedTicketNumbers.length > 0 ? selectedTicketNumbers.length : quantity)).toLocaleString();
  const canBuy = campaign.status === 'PUBLISHED';

  return (
    <PageWrapper>
      <Navbar authenticated={!!token} />

      <div className="max-w-5xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-white/45 hover:text-primary-400 text-sm font-medium mb-6 transition-colors group animate-fade-in"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          {t('campaign:backToDashboard')}
        </button>

        {/* Title */}
        <div className="mb-8 animate-slide-up">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-4xl font-display font-bold text-white">{campaign.name}</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-semibold ${
              campaign.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
              campaign.status === 'DRAFT'     ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                                'bg-white/10 text-white/40'
            }`}>{campaign.status}</span>
          </div>
          {campaign.description && (
            <p className="text-white/45 max-w-2xl leading-relaxed">{campaign.description}</p>
          )}

          {/* Live Room Quick Access Banner */}
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-yellow-500/15 via-orange-500/10 to-transparent border border-yellow-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-pulse">🎰</span>
              <div>
                <div className="text-white font-bold text-sm">Live Lottery Draw & Chances Room</div>
                <div className="text-white/50 text-xs">Watch the drum spin in real-time and check your live winning probability.</div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/live/${campaign.id}`)}
              className="px-5 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>🎥</span> Enter Live Room →
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error   && <div className="mb-5 p-4 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-sm animate-fade-in">{error}</div>}
        {success && (
          <div className="mb-5 p-4 bg-green-500/15 border border-green-500/30 text-green-300 rounded-xl text-sm animate-fade-in">
            <div className="font-bold mb-2">✓ {success}</div>
            {purchasedTickets.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {purchasedTickets.map(tk => (
                  <span key={tk.id} className="font-mono text-xs bg-green-500/20 px-2 py-1 rounded">
                    🎫 {tk.purchaseId}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tickets summary and details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: details + vehicles ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign details */}
            <div className="glass glass-hover rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="section-icon bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow">🎯</div>
                  <h2 className="text-lg font-display font-bold text-white">{t('campaign:campaignDetails')}</h2>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold">
                  {(campaign.remainingTickets ?? Math.max(0, campaign.maxTickets - (campaign.soldTickets ?? campaign._count?.tickets ?? 0))).toLocaleString()} Tickets Remaining
                </span>
              </div>

              {/* High-Impact 4-Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-white/5 border border-white/8 rounded-xl p-3.5">
                  <span className="text-white/40 text-xs block mb-1">Ticket Price</span>
                  <p className="font-display font-black text-yellow-400 text-lg">{campaign.ticketPrice.toLocaleString()} {t('common:currency')}</p>
                </div>
                <div className="bg-white/5 border border-white/8 rounded-xl p-3.5">
                  <span className="text-white/40 text-xs block mb-1">Total Tickets</span>
                  <p className="font-bold text-white text-lg">{campaign.maxTickets.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 border border-white/8 rounded-xl p-3.5">
                  <span className="text-white/40 text-xs block mb-1">Tickets Sold</span>
                  <p className="font-bold text-white text-lg">
                    {(campaign.soldTickets ?? campaign._count?.tickets ?? 0).toLocaleString()}{' '}
                    <span className="text-xs text-white/40">
                      ({(((campaign.soldTickets ?? campaign._count?.tickets ?? 0) / (campaign.maxTickets || 1)) * 100).toFixed(1)}%)
                    </span>
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/30 rounded-xl p-3.5">
                  <span className="text-emerald-400 text-xs block mb-1 font-semibold">Tickets Left</span>
                  <p className="font-display font-black text-emerald-300 text-lg">
                    {(campaign.remainingTickets ?? Math.max(0, campaign.maxTickets - (campaign.soldTickets ?? campaign._count?.tickets ?? 0))).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-black/30 border border-white/10 rounded-xl p-3.5 mb-4">
                <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                  <span className="text-white/60">Tickets Availability Pool</span>
                  <span className="text-emerald-400 font-bold">
                    {(campaign.remainingTickets ?? Math.max(0, campaign.maxTickets - (campaign.soldTickets ?? campaign._count?.tickets ?? 0))).toLocaleString()} Left of {campaign.maxTickets.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-yellow-400 rounded-full transition-all duration-500 shadow-glow"
                    style={{
                      width: `${Math.max(2, Math.min(100, (((campaign.soldTickets ?? campaign._count?.tickets ?? 0) / (campaign.maxTickets || 1)) * 100)))}%`
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white/5 rounded-lg p-3">
                  <span className="text-white/40 text-xs block mb-1">{t('common:status')}</span>
                  <p className="text-white font-semibold">{campaign.status}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <span className="text-white/40 text-xs block mb-1">{t('campaign:startDate')}</span>
                  <p className="text-white font-medium">{new Date(campaign.startDate).toLocaleDateString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <span className="text-white/40 text-xs block mb-1">{t('campaign:endDate')}</span>
                  <p className="text-white font-medium">{new Date(campaign.endDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Vehicles */}
            {campaign.vehicles && campaign.vehicles.length > 0 && (
              <div className="glass glass-hover rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="section-icon bg-gradient-to-br from-accent-500 to-accent-700 shadow-glow-accent">🚗</div>
                  <h2 className="text-lg font-display font-bold text-white">{t('vehicle:vehicleDetails')}</h2>
                </div>
                <div className="space-y-6">
                  {campaign.vehicles.map((v, i) => {
                    const carImages = extractImages(v.images);
                    const activeIdx = Math.min(selectedImageIndex, carImages.length - 1);
                    const currentImg = carImages[activeIdx] || carImages[0];

                    return (
                      <div key={v.id} className="bg-white/5 border border-white/8 rounded-xl p-5 animate-scale-in" style={{ animationDelay: `${0.25 + i * 0.07}s` }}>
                        {/* Car Photo Gallery */}
                        <div className="relative rounded-2xl overflow-hidden mb-4 bg-black/60 border border-white/15 group aspect-video sm:h-80 w-full flex items-center justify-center">
                          <img
                            src={currentImg}
                            alt={`${v.make} ${v.model} view ${activeIdx + 1}`}
                            className="w-full h-full object-cover transition-all duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1200&auto=format&fit=crop';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                          
                          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-yellow-400 border border-yellow-500/30">
                            ✨ GRAND PRIZE CAR
                          </div>

                          <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-white/90 border border-white/20">
                            📸 Photo {activeIdx + 1} of {carImages.length}
                          </div>

                          <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-black text-yellow-400 border border-yellow-500/30">
                            Market Value: {v.declaredValue.toLocaleString()} {t('common:currency')}
                          </div>

                          {/* Left / Right Nav Arrows if multiple images */}
                          {carImages.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : carImages.length - 1))}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity text-xl font-bold"
                                title="Previous photo"
                              >
                                ‹
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedImageIndex(prev => (prev < carImages.length - 1 ? prev + 1 : 0))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity text-xl font-bold"
                                title="Next photo"
                              >
                                ›
                              </button>
                            </>
                          )}
                        </div>

                        {/* Interactive Thumbnail Selector Strip */}
                        {carImages.length > 1 && (
                          <div className="flex gap-2.5 mb-5 overflow-x-auto pb-2 scrollbar-thin">
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
                                <img src={img} alt={`View ${imgIdx + 1}`} className="w-full h-full object-cover" />
                                {activeIdx === imgIdx && (
                                  <span className="absolute bottom-0.5 right-0.5 bg-yellow-400 text-black text-[8px] font-black px-1 rounded">
                                    Active
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                        <h3 className="font-display font-bold text-white mb-4 text-xl flex items-center justify-between">
                          <span>{v.make} {v.model} <span className="text-primary-400 font-normal">({v.year})</span></span>
                          <span className="text-sm font-semibold text-white/50">📍 {v.location || 'Addis Ababa'}</span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          {[
                            { label: t('vehicle:color'),        value: v.color },
                            { label: t('vehicle:condition'),    value: v.vehicleCondition },
                            { label: t('vehicle:transmission'), value: v.transmission || 'N/A' },
                            { label: t('vehicle:fuelType'),     value: v.fuelType || 'N/A' },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-white/5 rounded-lg p-3">
                              <span className="text-white/40 text-xs block mb-1">{label}</span>
                              <p className="text-white font-semibold">{value}</p>
                            </div>
                          ))}
                          <div className="bg-white/5 rounded-lg p-3">
                            <span className="text-white/40 text-xs block mb-1">{t('vehicle:vehicleValue')}</span>
                            <p className="font-display font-bold gradient-text">{v.declaredValue.toLocaleString()} {t('common:currency')}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Buy ticket ── */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 sticky top-24 animate-slide-up shadow-card-lg border-primary-500/20" style={{ animationDelay: '0.15s' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="section-icon bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow">🎫</div>
                <h2 className="text-lg font-display font-bold text-white">{t('campaign:buyTicket')}</h2>
              </div>

              {/* Price display */}
              <div className="bg-white/5 border border-white/8 rounded-xl p-4 mb-3 text-center">
                <p className="text-white/40 text-xs mb-1">{t('campaign:ticketPrice')}</p>
                <p className="text-3xl font-display font-black gradient-text">{campaign.ticketPrice.toLocaleString()}</p>
                <p className="text-white/40 text-xs">{t('common:currency')} / ticket</p>
              </div>

              {/* Tickets Remaining Display Badge */}
              <div className="flex items-center justify-between text-xs py-2.5 px-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-5">
                <span className="text-white/60">Tickets Remaining</span>
                <span className="text-emerald-300 font-black">
                  {(campaign.remainingTickets ?? Math.max(0, campaign.maxTickets - (campaign.soldTickets ?? campaign._count?.tickets ?? 0))).toLocaleString()} Left
                </span>
              </div>

              {/* Ticket Selection */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-white/70 text-sm font-semibold">Select Your Tickets</label>
                  <span className="text-xs text-white/40">{selectedTicketNumbers.length} selected</span>
                </div>
                
                {loadingTickets ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/8 rounded-xl p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-2">
                      {availableTickets.slice(0, 100).map((ticketNum) => (
                        <button
                          key={ticketNum}
                          type="button"
                          onClick={() => toggleTicketSelection(ticketNum)}
                          disabled={selectedTicketNumbers.length >= 20 && !selectedTicketNumbers.includes(ticketNum)}
                          className={`px-2 py-2 rounded-lg text-xs font-mono transition-all ${
                            selectedTicketNumbers.includes(ticketNum)
                              ? 'bg-primary-500 text-white border-primary-500'
                              : 'bg-white/10 text-white/70 hover:bg-white/20 border-white/10'
                          } ${selectedTicketNumbers.length >= 20 && !selectedTicketNumbers.includes(ticketNum) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {ticketNum.split('-').pop()}
                        </button>
                      ))}
                    </div>
                    {availableTickets.length > 100 && (
                      <p className="text-xs text-white/40 text-center mt-2">
                        Showing 100 of {availableTickets.length} available tickets
                      </p>
                    )}
                  </div>
                )}
                
                {/* Fallback quantity input if no tickets selected */}
                {selectedTicketNumbers.length === 0 && (
                  <div className="mt-3">
                    <label className="block text-white/50 text-xs mb-2">Or select quantity (random assignment)</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 text-white hover:bg-white/15 transition-colors text-sm font-bold flex items-center justify-center"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="flex-1 input text-center font-bold text-sm"
                      />
                      <button
                        onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                        className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 text-white hover:bg-white/15 transition-colors text-sm font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center mb-6 p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                <span className="text-white/60 text-sm">Total</span>
                <span className="text-primary-300 font-bold">{total} {t('common:currency')}</span>
              </div>

              {!canBuy && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-300 text-xs text-center">
                  This campaign is not currently open for ticket purchases
                </div>
              )}

              {token ? (
                <button
                  onClick={() => canBuy && setShowModal(true)}
                  disabled={!canBuy}
                  className="btn-primary w-full py-4 text-base"
                >
                  {`🎫 ${t('campaign:buyTicket')} (${quantity})`}
                </button>
              ) : (
                <button onClick={() => navigate('/login')} className="btn-primary w-full py-4 text-base">
                  Login to Buy Tickets
                </button>
              )}

              <button
                onClick={() => navigate(`/live/${campaign.id}`)}
                className="w-full mt-3 py-3 bg-white/5 hover:bg-white/10 text-yellow-400 hover:text-yellow-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-yellow-500/30 transition-all flex items-center justify-center gap-2"
              >
                <span>🎥</span> Watch Live Spin Room ↗
              </button>

              <p className="text-white/25 text-xs text-center mt-3">🔒 Secured & Verified Draw</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Choose Payment Method</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Payment Options */}
              <div className="space-y-3">
                {PAY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setPayMethod(opt.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                      payMethod === opt.id
                        ? 'border-primary-500 bg-primary-500/15'
                        : 'border-white/10 bg-white/5 hover:border-white/25'
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{opt.label}</p>
                      <p className="text-white/40 text-xs mt-0.5">{opt.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      payMethod === opt.id ? 'border-primary-500 bg-primary-500' : 'border-white/30'
                    }`}>
                      {payMethod === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Phone field - optional now since OTP is sent via email */}
              {(payMethod === 'TELEBIRR' || payMethod === 'CBE' || payMethod === 'AWASH') && (
                <div>
                  <label className="block text-white/60 text-sm mb-2">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+251 9XX XXX XXX"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              )}

              {/* Summary */}
              <div className="bg-white/5 border border-white/8 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/50">Campaign</span>
                  <span className="text-white font-medium truncate ml-4 max-w-[60%] text-right">{campaign.name}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/50">Tickets</span>
                  <span className="text-white font-medium">{selectedTicketNumbers.length > 0 ? selectedTicketNumbers.length : quantity}</span>
                </div>
                {selectedTicketNumbers.length > 0 && (
                  <div className="mb-2">
                    <span className="text-white/50 text-xs block mb-1">Selected Numbers:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedTicketNumbers.map(tn => (
                        <span key={tn} className="text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded font-mono">
                          {tn.split('-').pop()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-white/8 pt-2 mt-2">
                  <span className="text-white/70">Total</span>
                  <span className="text-primary-300 text-lg">{total} ETB</span>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                onClick={handleBuy}
                disabled={buying}
                className="w-full py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-black text-base rounded-xl hover:from-primary-400 hover:to-accent-400 transition-all disabled:opacity-50 shadow-glow"
              >
                {buying ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : `✓ Pay ${total} ETB`}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

export default CampaignPage;