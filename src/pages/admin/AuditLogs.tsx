import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
    ShieldAlert, RefreshCw, Clock, User, 
    Monitor, ChevronDown, ChevronUp, Search 
} from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

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

  const getActionColor = (action: string) => {
      if (action.includes('LOGIN')) return 'bg-blue-50 text-blue-600 border-blue-200';
      if (action.includes('DELETE') || action.includes('CANCEL')) return 'bg-red-50 text-red-600 border-red-200';
      if (action.includes('CREATE') || action.includes('ADD')) return 'bg-green-50 text-green-600 border-green-200';
      if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-orange-50 text-orange-600 border-orange-200';
      return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  return (
    <div className="animate-fade-in">
        {/* Header Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Search size={18} className="text-slate-400 ml-2" />
                <select 
                    className="bg-transparent outline-none text-sm text-slate-600 font-bold w-full"
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                >
                    <option value="">ทั้งหมด</option>
                    <option value="LOGIN">เข้าสู่ระบบ (LOGIN)</option>
                    <option value="CREATE_TICKET">สร้างโพย (CREATE_TICKET)</option>
                    <option value="CANCEL_TICKET">ยกเลิกโพย (CANCEL_TICKET)</option>
                    <option value="ADJUST_CREDIT">ปรับเครดิต (ADJUST_CREDIT)</option>
                    <option value="APPROVE_TOPUP">อนุมัติเติมเงิน (APPROVE_TOPUP)</option>
                </select>
            </div>
            <button onClick={fetchLogs} className="p-2.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>
            </button>
        </div>

        {/* Timeline Logs */}
        <div className="space-y-3">
            {logs.map((log) => (
                <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                        {/* Left Info */}
                        <div className="flex items-start gap-3">
                            <div className="mt-1">
                                <span className={`text-[10px] font-black px-2 py-1 rounded border ${getActionColor(log.action)}`}>
                                    {log.action}
                                </span>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <User size={14} className="text-slate-400"/>
                                    {log.username || 'System'}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                    <Clock size={12}/> {new Date(log.created_at).toLocaleString('th-TH')}
                                </div>
                            </div>
                        </div>

                        {/* Right Details */}
                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                            <div className="text-right hidden md:block">
                                <p className="text-[10px] text-slate-400 font-mono flex items-center justify-end gap-1">
                                    <Monitor size={10} /> {log.ip_address}
                                </p>
                            </div>
                            <button 
                                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                {expandedLogId === log.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Expanded Detail View */}
                    {expandedLogId === log.id && (
                        <div className="mt-3 pt-3 border-t border-slate-50 animate-slide-up">
                            <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-600 break-all border border-slate-100">
                                <div className="font-bold text-slate-400 mb-1">DATA PAYLOAD:</div>
                                {JSON.stringify(log.details, null, 2)}
                            </div>
                            <div className="mt-2 text-[10px] text-slate-400">
                                User Agent: {log.user_agent}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {logs.length === 0 && !loading && (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-100">
                    <ShieldAlert className="mx-auto mb-2 opacity-20" size={32}/>
                    ยังไม่มีประวัติการทำงาน
                </div>
            )}
        </div>
    </div>
  );
}