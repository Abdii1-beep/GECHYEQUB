import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { api } from '../../lib/api';

const AdminWinners: React.FC = () => {
  const navigate = useNavigate();
  const [winners, setWinners]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    (async () => {
      setLoading(true);
      const res = await api.getAdminWinners();
      if (res.success && res.data) setWinners(res.data);
      setLoading(false);
    })();
  }, [navigate, token]);

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span>🏆</span> Certified Grand Prize Winners Registry
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Official records of verified car lottery winners, awarded vehicle prizes, and vehicle handover delivery status.
            </p>
          </div>
          <div className="px-3.5 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-xl text-xs font-bold">
            Total Winners Awarded: {winners.length}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : winners.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="text-lg font-bold text-white mb-1">No Winners Recorded Yet</h3>
            <p className="text-white/40 text-xs mb-4">
              When a lottery due date arrives and the live spin concludes, the winning participant will be recorded here.
            </p>
            <button onClick={() => navigate('/admin/draws')} className="btn-primary">
              View Live Draws
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {winners.map((w: any) => (
              <div
                key={w.id}
                className="bg-white/5 border border-yellow-500/30 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚗</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {w.customer?.fullName || 'Winner Citizen'}
                      </h3>
                      <p className="text-xs text-yellow-400 font-semibold">
                        Winning Ticket: <span className="font-mono text-sm">{w.ticket?.verificationHash?.slice(0, 16) || w.ticketId}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-white/60 pt-2">
                    <div>
                      <span className="text-white/30 block text-[10px]">Contact Phone</span>
                      <span className="font-mono text-white/90">{w.customer?.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-white/30 block text-[10px]">Claim Status</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        {w.claimStatus || 'CLAIMED'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/30 block text-[10px]">Draw Date</span>
                      <span>{w.verificationTimestamp ? new Date(w.verificationTimestamp).toLocaleDateString() : 'Official Certified Draw'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] text-white/40 block">Handover Verification</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                    Handover In Progress
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminWinners;
