import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { api } from '../../lib/api';

const AdminKYC: React.FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [msg, setMsg]             = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const token = localStorage.getItem('auth_token');

  const loadQueue = async () => {
    setLoading(true);
    const res = await api.getAdminKYCQueue();
    if (res.success && res.data) setQueue(res.data);
    setLoading(false);
  };

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    loadQueue();
  }, [navigate, token]);

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const res = await api.approveKYC(id, 'Identity verified against Ethiopian National Registry.');
    setProcessingId(null);
    if (res.success) {
      flash('ok', 'KYC Document Verified and Approved!');
      loadQueue();
    } else {
      flash('err', res.error || 'Failed to approve KYC');
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Please provide rejection reason (e.g. Unreadable ID document photo):');
    if (!reason) return;
    setProcessingId(id);
    const res = await api.rejectKYC(id, reason, 'Document rejected by compliance officer.');
    setProcessingId(null);
    if (res.success) {
      flash('ok', 'KYC Document marked as rejected.');
      loadQueue();
    } else {
      flash('err', res.error || 'Failed to reject KYC');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span>✅</span> KYC Compliance & Identity Review
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Review pending customer national IDs, passports, and driver's licenses for car lottery eligibility.
            </p>
          </div>
          <div className="px-3.5 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-xl text-xs font-bold">
            Pending Queue: {queue.length} Verification Requests
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
        ) : queue.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3">🛡️</div>
            <h3 className="text-lg font-bold text-white mb-1">Queue Clear - No Pending KYC</h3>
            <p className="text-white/40 text-xs">All participant identities have been verified and processed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((item) => (
              <div
                key={item.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-yellow-500/30 transition-all shadow-lg"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">
                      {item.fullName || 'Citizen Participant'}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      PENDING REVIEW
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-white/60">
                    <div>
                      <span className="text-white/30 block text-[10px]">Email</span>
                      <span className="font-mono text-white/80">{item.user?.email || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-white/30 block text-[10px]">National ID / Passport</span>
                      <span className="font-mono text-white/80 font-bold">{item.nationalId || 'ETH-ID-XXXX'}</span>
                    </div>
                    <div>
                      <span className="text-white/30 block text-[10px]">Submitted Date</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-white/30 block text-[10px]">Document Image</span>
                      {item.idDocumentUrl ? (
                        <a
                          href={item.idDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline font-semibold"
                        >
                          👁 View ID Photo ↗
                        </a>
                      ) : (
                        <span className="text-white/40">Uploaded File</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={processingId === item.id}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>✓</span> Approve
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    disabled={processingId === item.id}
                    className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 font-bold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>✕</span> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminKYC;
