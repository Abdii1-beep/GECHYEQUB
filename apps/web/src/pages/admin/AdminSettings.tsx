import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { api } from '../../lib/api';

const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings]   = useState<any>({
    platformName: 'GECHO YEMKINA EQUB',
    systemDescription: 'Official Ethiopian Commercial Truck & Vehicle Digital Equb Platform',
    currency: 'ETB',
    vatPercentage: 15,
    minTicketPrice: 50,
    maxTicketsPerPurchase: 100,
    supportPhone: '+251 11 551 2233',
    supportEmail: 'support@gechoyemkinaequb.com',
    telebirrMerchantId: 'TELEBIRR-ET-884920',
    cbeMerchantId: 'CBE-BIRR-100293',
    chapaEnabled: true,
    autoDrawCountdownSeconds: 6,
    maintenanceMode: false,
  });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    (async () => {
      setLoading(true);
      const res = await api.getAdminSettings();
      if (res.success && res.data) setSettings(res.data);
      setLoading(false);
    })();
  }, [navigate, token]);

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await api.updateAdminSettings(settings);
    setSaving(false);
    if (res.success) {
      flash('ok', 'Platform settings updated successfully!');
    } else {
      flash('err', res.error || 'Failed to update settings');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span>⚙️</span> Platform Settings & National Lottery Config
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Configure national Ethiopian currency rules, payment gateway credentials, and live spin parameters.
            </p>
          </div>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl text-sm font-semibold mb-6 animate-fade-in ${
            msg.type === 'ok' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}>
            {msg.text}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
            {/* 1. General Info */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                <span>🏛️</span> General Lottery Platform Identity
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Platform Name</label>
                  <input
                    type="text"
                    value={settings.platformName}
                    onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">National Currency Code</label>
                  <input
                    type="text"
                    value={settings.currency}
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-yellow-300 font-mono font-bold text-sm"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">Default: Ethiopian Birr (ETB)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">System Description</label>
                <textarea
                  rows={2}
                  value={settings.systemDescription}
                  onChange={(e) => setSettings({ ...settings, systemDescription: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>
            </div>

            {/* 2. Lottery Quotas & Financial Config */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span>💰</span> Financial & Quota Rules
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Minimum Ticket Price (ETB)</label>
                  <input
                    type="number"
                    value={settings.minTicketPrice}
                    onChange={(e) => setSettings({ ...settings, minTicketPrice: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Max Tickets Per Single Order</label>
                  <input
                    type="number"
                    value={settings.maxTicketsPerPurchase}
                    onChange={(e) => setSettings({ ...settings, maxTicketsPerPurchase: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Ethiopian VAT / Tax Rate (%)</label>
                  <input
                    type="number"
                    value={settings.vatPercentage}
                    onChange={(e) => setSettings({ ...settings, vatPercentage: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            </div>

            {/* 3. Payment Gateway Integrations */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <span>💳</span> Ethiopian Payment Integrations
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Telebirr Merchant App ID</label>
                  <input
                    type="text"
                    value={settings.telebirrMerchantId}
                    onChange={(e) => setSettings({ ...settings, telebirrMerchantId: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Commercial Bank of Ethiopia (CBE Birr) ID</label>
                  <input
                    type="text"
                    value={settings.cbeMerchantId}
                    onChange={(e) => setSettings({ ...settings, cbeMerchantId: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            </div>

            {/* 4. Live Spin Parameters */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <span>🎰</span> Live Fortune Drum Spin Dynamics
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Spin Duration & Reveal (Seconds)</label>
                  <input
                    type="number"
                    value={settings.autoDrawCountdownSeconds}
                    onChange={(e) => setSettings({ ...settings, autoDrawCountdownSeconds: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">Standard: 6 seconds (12-16 full revolutions)</span>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Support Contact Phone</label>
                  <input
                    type="text"
                    value={settings.supportPhone}
                    onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-extrabold text-sm rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                {saving ? 'Saving Platform Settings...' : 'Save Configuration Changes'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default AdminSettings;
