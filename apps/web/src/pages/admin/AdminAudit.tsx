import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { api } from '../../lib/api';

const AdminAudit: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs]         = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    (async () => {
      setLoading(true);
      const res = await api.getAdminAuditLogs(page, 40);
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
      }
      setLoading(false);
    })();
  }, [navigate, page, token]);

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span>📋</span> Immutable Security Audit Ledger
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Cryptographically timestamped record of administrative actions, draws, quota adjustments, and compliance.
            </p>
          </div>
          <div className="px-3.5 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-xl text-xs font-bold">
            Audit Records: {total || logs.length} Logged Events
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3">📋</div>
            <h3 className="text-lg font-bold text-white mb-1">No Audit Logs Found</h3>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/40 border-b border-white/10 text-white/50 uppercase font-semibold">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Operator User</th>
                    <th className="p-4">IP Address</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-white/50 text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-yellow-400">
                        {log.action}
                      </td>
                      <td className="p-4 text-white/70">
                        {log.entity}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-white/80">
                          {log.role || 'ADMIN'}
                        </span>
                      </td>
                      <td className="p-4 text-white/80 text-[11px]">
                        {log.user?.email || log.userId?.slice(0, 10) || 'system'}
                      </td>
                      <td className="p-4 text-white/40 text-[11px]">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                          {log.result || 'SUCCESS'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <span>Page {page} of {Math.max(1, Math.ceil(total / 40))}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-30"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={logs.length < 40}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminAudit;
