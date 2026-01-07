import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
    ShieldAlert, RefreshCw, Clock, User, 
    Monitor, Globe, ChevronDown, ChevronUp 
} from 'lucide-react';

export default function SuperAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null); // สำหรับ Mobile Accordion

  useEffect(() => {
    fetchLogs();
  }, [filterAction]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = filterAction 
        ? `/audit/?action=${filterAction}` 
        : '/audit/';
      const res = await client.get(url);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper สำหรับเลือกสี Badge
  const getActionColor = (action: string) => {
      if (action.includes('LOGIN')) return 'bg-blue-50 text-blue-600 border-blue-200';
      if (action.includes('DELETE') || action.includes('CANCEL')) return 'bg-red-50 text-red-600 border-red-200';
      if (action.includes('CREATE') || action.includes('ADD')) return 'bg-green-50 text-green-600 border-green-200';
      if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-amber-50 text-amber-600 border-amber-200';
      return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in text-slate-800 pb-24 md:pb-8">
      
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-linear-to-br from-amber-400 to-yellow-500 rounded-xl shadow-lg shadow-amber-200 text-white">
                <ShieldAlert size={24} />
              </div>
              Audit Logs
           </h1>
           <p className="text-sm text-slate-500 mt-2 ml-1">บันทึกกิจกรรมความปลอดภัยและการใช้งานระบบ</p>
        </div>
        
        <button 
          onClick={fetchLogs} 
          className={`p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-amber-300 text-slate-500 hover:text-amber-600 transition-all shadow-sm ${loading ? 'animate-spin text-amber-500' : ''}`}
          title="Refresh Data"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* --- Filters --- */}
      <div className="flex flex-wrap gap-2 mb-6">
          {['', 'LOGIN', 'ADJUST_CREDIT', 'CANCEL_TICKET', 'ISSUE_REWARD', 'CREATE_USER'].map(action => (
              <button
                key={action}
                onClick={() => setFilterAction(action)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                    filterAction === action 
                    ? 'bg-slate-800 text-white border-slate-800 scale-105' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                  {action || 'ALL ACTIONS'}
              </button>
          ))}
      </div>

      {/* --- Desktop Table View (Hidden on Mobile) --- */}
      <div className="hidden md:block bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th className="p-5">Timestamp</th>
              <th className="p-5">User / Actor</th>
              <th className="p-5">Action</th>
              <th className="p-5 w-1/3">Details (JSON)</th>
              <th className="p-5">Device info</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-amber-50/30 transition-colors group">
                <td className="p-5 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-slate-600 font-mono">
                        <Clock size={14} className="text-slate-400"/>
                        {new Date(log.created_at).toLocaleString('th-TH')}
                    </div>
                </td>
                <td className="p-5">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <User size={14} />
                        </div>
                        {log.user_id?.split('-')[0]}...
                    </div>
                </td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-5">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 font-mono text-xs text-slate-600 max-h-20 overflow-y-auto custom-scrollbar">
                        {JSON.stringify(log.details)}
                    </div>
                </td>
                <td className="p-5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 mb-1 text-slate-700 font-bold">
                      <Globe size={12} className="text-blue-400" /> {log.ip_address}
                  </div>
                  <div className="flex items-center gap-1.5 opacity-70 truncate w-40" title={log.user_agent}>
                      <Monitor size={12} /> {log.user_agent}
                  </div>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400">No logs found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Mobile Card View (Show on Mobile) --- */}
      <div className="md:hidden space-y-4">
          {logs.map(log => (
              <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 relative">
                  {/* Header Row */}
                  <div className="flex justify-between items-start mb-3">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(log.created_at).toLocaleString('th-TH')}
                      </span>
                  </div>

                  {/* Main Info */}
                  <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User size={18} />
                      </div>
                      <div>
                          <p className="text-sm font-bold text-slate-800">User: {log.user_id?.split('-')[0]}...</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Globe size={10} /> {log.ip_address}
                          </p>
                      </div>
                  </div>

                  {/* Expandable Details */}
                  <div className="border-t border-slate-100 pt-2">
                      <button 
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        className="w-full flex justify-between items-center text-xs text-slate-500 hover:text-amber-600 transition-colors"
                      >
                          <span>View Details</span>
                          {expandedLogId === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      
                      {expandedLogId === log.id && (
                          <div className="mt-2 bg-slate-50 rounded-lg p-3 text-[10px] font-mono text-slate-600 break-all animate-fade-in border border-slate-100">
                              {JSON.stringify(log.details, null, 2)}
                              <div className="mt-2 pt-2 border-t border-slate-200 text-slate-400 italic">
                                  Agent: {log.user_agent}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          ))}
          {logs.length === 0 && <div className="text-center py-10 text-slate-400">ไม่พบข้อมูล</div>}
      </div>

    </div>
  );
}