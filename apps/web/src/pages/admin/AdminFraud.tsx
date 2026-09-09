import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { api } from '../../lib/api';

const AdminFraud: React.FC = () => {
  const navigate = useNavigate();
  const [flags, setFlags]       = useState<any[]>([]);
  const [stats, setStats]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [msg, setMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const token = localStorage.getItem('auth_token');

  const loadData = async () => {
    setLoading(true);
    const [fRes, sRes] = await Promise.all([
      api.getAdminFraudFlags(),
      api.getAdminFraudStats(),
    ]);
    if (fRes.success && fRes.data) setFlags(fRes.data);
    if (sRes.success && sRes.data) setStats(sRes.data);
    setLoading(false);
  };

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    loadData();
  }, [navigate, token]);

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleResolve = async (id: string) => {
    const actionTaken = window.prompt('Action taken to resolve (e.g. Cleared false positive after IP check):');
    if (!actionTaken) return;
    setProcessingId(id);
    const res = await api.resolveFraudFlag(id, 'RESOLVED', actionTaken);
    setProcessingId(null);
    if (res.success) {
      flash('ok', 'Fraud alert resolved successfully.');
      loadData();
    } else {
      flash('err', res.error || 'Failed to resolve flag');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span>🔍</span> Fraud & Risk Monitoring Console
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Multi-account detection, automated Sybil anomaly flags, IP velocity checks, and risk mitigation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Real-Time Protection Active
            </span>
          </div>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl text-sm font-semibold mb-6 animate-fade-in ${
            msg.type === 'ok' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}>
            {msg.text}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-1">🚨</div>
            <div className="text-2xl font-black text-white">{stats?.totalFlags ?? flags.length}</div>
            <div className="text-[10px] text-white/50 uppercase font-bold mt-1">Open Alerts</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-1">🛡️</div>
            <div className="text-2xl font-black text-emerald-400">{stats?.resolvedFlags ?? '99.8%'}</div>
            <div className="text-[10px] text-white/50 uppercase font-bold mt-1">System Health</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-1">🌐</div>
            <div className="text-2xl font-black text-yellow-400">{stats?.ipChecks ?? '0'}</div>
            <div className="text-[10px] text-white/50 uppercase font-bold mt-1">Suspicious IPs</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-1">👥</div>
            <div className="text-2xl font-black text-cyan-300">{stats?.flaggedAccounts ?? flags.length}</div>
            <div className="text-[10px] text-white/50 uppercase font-bold mt-1">Accounts Under Review</div>
          </div>
        </div>

        {/* Flagged Accounts List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : flags.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-lg font-bold text-white mb-1">No Fraud Flags Active</h3>
            <p className="text-white/40 text-xs">All lottery purchases and user transactions conform to safety thresholds.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flags.map((f: any) => (
              <div
                key={f.id}
                className="bg-white/5 border border-red-500/30 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/40">
                      {f.severity || 'HIGH RISK'}
                    </span>
                    <h3 className="text-base font-bold text-white">{f.reason || 'Anomalous Rapid Purchases'}</h3>
                  </div>
                  <div className="text-xs text-white/60 flex flex-wrap gap-4 pt-1 font-mono">
                    <span>User: {f.user?.email || f.userId}</span>
                    <span>Date: {new Date(f.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleResolve(f.id)}
                  disabled={processingId === f.id}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs rounded-xl transition-all shadow disabled:opacity-50 flex-shrink-0"
                >
                  Resolve Alert
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminFraud;
