import { History, Settings2, Trash2, FileText } from 'lucide-react';
import { getStatusBadge } from '../../utils/bettingHelpers';

export default function BettingSidebar({ lotto, lottoStats, risks, history, handleCancelTicket }: any) {
    if (!lotto) return null;

    return (
        <div className="hidden lg:flex w-80 bg-[#1e293b] text-white border-l border-gray-700 flex-col shadow-xl z-10 overflow-y-auto">
            {/* Header สถิติ */}
            <div className="p-4 bg-[#0f172a] border-b border-gray-700">
                <h3 className="font-bold text-lg text-amber-400 flex items-center gap-2">
                    <History size={18}/> สถิติผลรางวัล
                </h3>
                <p className="text-xs text-slate-400 mt-1">{lotto.name} (5 งวดล่าสุด)</p>
            </div>

            <div className="p-3 space-y-6">
                {/* ตารางสถิติ */}
                <div className="bg-[#1e293b] rounded-lg overflow-hidden border border-gray-700">
                    <table className="w-full text-xs text-center">
                        <thead className="bg-[#334155] text-white font-bold">
                            <tr>
                                <th className="p-2 text-left pl-3">งวดวันที่</th>
                                <th className="p-2 text-yellow-400">3 บน</th>
                                <th className="p-2 text-blue-300">2 บน</th>
                                <th className="p-2 text-green-400">2 ล่าง</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {lottoStats?.map((stat: any, idx: number) => {
                                const twoTop = stat.top_3 ? stat.top_3.slice(-2) : '-';
                                return (
                                    <tr key={idx} className="hover:bg-gray-800 transition-colors">
                                        <td className="p-2 text-left pl-3 text-gray-300 font-mono">
                                            {new Date(stat.round_date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' })}
                                        </td>
                                        <td className="p-2 text-yellow-400 font-bold tracking-wider">{stat.top_3}</td>
                                        <td className="p-2 text-blue-300 font-bold tracking-wider">{twoTop}</td>
                                        <td className="p-2 text-green-400 font-bold tracking-wider">{stat.bottom_2}</td>
                                    </tr>
                                );
                            })}
                            {(!lottoStats || lottoStats.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-gray-500">
                                        ยังไม่มีผลรางวัล
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ส่วนเลขอั้น/ปิดรับ */}
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1 mt-4">
                    <Settings2 size={12}/> เลขอั้น / ปิดรับ
                </h4>
                <div className="bg-[#0f172a] rounded-lg border border-gray-700 p-3 min-h-25 custom-scrollbar overflow-y-auto max-h-100">
                    {!risks || risks.length === 0 ? (
                        <div className="text-center text-gray-500 text-xs py-4">✅ ไม่มีเลขอั้น</div>
                    ) : (
                        <div className="space-y-4">
                            {risks.some((r: any) => r.risk_type === 'CLOSE') && (
                                <div className="relative">
                                    <div className="sticky top-0 bg-[#0f172a] z-10 pb-1 mb-1 border-b border-red-500/20">
                                        <div className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                                            ⛔ ปิดรับ (ห้ามแทง)
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {['ALL', '2up', '2down', '3top', '3tod', 'run_up', 'run_down'].map(typeKey => {
                                            const items = risks.filter((r: any) => r.risk_type === 'CLOSE' && (r.specific_bet_type || 'ALL') === typeKey);
                                            if (items.length === 0) return null;
                                            const typeName: Record<string, string> = {
                                                'ALL': '⛔ เหมา(ทุกประเภท)', '2up': '2 ตัวบน', '2down': '2 ตัวล่าง',
                                                '3top': '3 ตัวบน', '3tod': '3 ตัวโต๊ด', 'run_up': 'วิ่งบน', 'run_down': 'วิ่งล่าง'
                                            };
                                            return (
                                                <div key={typeKey} className="pl-1">
                                                    <div className="text-[13px] text-white mb-0.5 font-medium">{typeName[typeKey] || typeKey}</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {items.map((r: any) => (
                                                            <span key={r.id} className="bg-red-500/10 text-red-500 border border-red-500/20 px-0.5 py-0.2 rounded text-[13.5px] font-mono font-bold">
                                                                {r.number}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {risks.some((r: any) => r.risk_type === 'HALF') && (
                                <div className="relative pt-2">
                                    <div className="sticky top-0 bg-[#0f172a] z-10 pb-1 mb-1 border-b border-orange-500/20">
                                        <div className="text-[10px] font-bold text-orange-400 flex items-center gap-1">
                                            ⚠️ จ่ายครึ่ง (อั้น)
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {['ALL', '2up', '2down', '3top', '3tod', 'run_up', 'run_down'].map(typeKey => {
                                            const items = risks.filter((r: any) => r.risk_type !== 'CLOSE' && (r.specific_bet_type || 'ALL') === typeKey);
                                            if (items.length === 0) return null;
                                            const typeName: Record<string, string> = {
                                                'ALL': '⚠️ เหมา(ทุกประเภท)', '2up': '2 ตัวบน', '2down': '2 ตัวล่าง',
                                                '3top': '3 ตัวบน', '3tod': '3 ตัวโต๊ด', 'run_up': 'วิ่งบน', 'run_down': 'วิ่งล่าง'
                                            };
                                            return (
                                                <div key={typeKey} className="pl-1">
                                                    <div className="text-[9px] text-gray-400 mb-0.5 font-medium">{typeName[typeKey] || typeKey}</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {items.map((r: any) => (
                                                            <span key={r.id} className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                                                                {r.number}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ประวัติโพยล่าสุด */}
                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1 mt-4">
                        <History size={12}/> ประวัติโพยล่าสุด
                    </h4>
                    <div className="bg-[#0f172a] rounded-lg border border-gray-700 overflow-hidden">
                        {!history || history.length === 0 ? (
                            <div className="text-center text-gray-500 text-xs py-4">ยังไม่มีประวัติ</div>
                        ) : (
                            <div className="divide-y divide-gray-800">
                                {history.map((ticket: any) => (
                                    <div key={ticket.id} className="p-3 hover:bg-gray-800/50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <div className="text-[10px] text-gray-400">
                                                    {new Date(ticket.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })} {new Date(ticket.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit' })}
                                                </div>
                                                <div className="text-xs font-bold text-blue-300 truncate w-32">
                                                    {ticket.lotto_type?.name || 'หวย'}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-white">{Number(ticket.total_amount).toLocaleString()} บาท</div>
                                                <div>
                                                    {getStatusBadge(ticket.status)}
                                                    {ticket.status === 'PENDING' && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation(); 
                                                                handleCancelTicket(ticket.id);
                                                            }}
                                                            className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-1 rounded transition-colors ml-1"
                                                            title="ยกเลิกโพยนี้"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {ticket.note && (
                                            <div className="text-[15px] text-white flex items-center gap-1 mt-1 bg-gray-800/50 p-1 rounded">
                                                <FileText size={8} /> <b> {ticket.note} </b>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}