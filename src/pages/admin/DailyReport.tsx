import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
  Calendar, 
  Download, 
  TrendingUp, 
  AlertCircle,
  Loader2,
  Banknote,
  Trophy,
  Clock,
  RotateCcw,
  ArrowRight, // ✅ เพิ่มไอคอนลูกศร
  RefreshCw   // ✅ เพิ่มไอคอนรีเฟรช
} from 'lucide-react';

export default function DailyReport() {
  // ฟังก์ชันหาวันปัจจุบัน (Local Timezone)
  const getToday = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() - offset);
    return d.toISOString().split('T')[0];
  };

  // ✅ 1. เปลี่ยน State เป็นช่วงเวลา
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ 2. โหลดเมื่อเปลี่ยนวันที่ทั้งคู่
  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // ✅ ส่ง start_date และ end_date
      const res = await client.get(`/play/stats/members?start_date=${startDate}&end_date=${endDate}`);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // คำนวณยอดรวมทั้งหมด
  const grandTotal = stats.reduce((acc, curr) => ({
    bet: acc.bet + Number(curr.total_bet),
    win: acc.win + Number(curr.total_win),
    pending: acc.pending + Number(curr.pending_amount),
    cancelled: acc.cancelled + Number(curr.cancelled_amount),
    bills: acc.bills + curr.bill_count
  }), { bet: 0, win: 0, pending: 0, cancelled: 0, bills: 0 });

  // ✅ Logic คำนวณกำไรสุทธิ (ยอดขาย - จ่ายรางวัล - รอผล) *ตามสูตรใหม่ที่คุณแจ้ง
  const totalProfit = grandTotal.bet - grandTotal.win - grandTotal.pending;

  return (
    <div className="animate-fade-in p-4 md:p-6 pb-24 md:pb-8">
      
      {/* --- Header & Filter --- */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
           <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
              <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200">
                  <TrendingUp size={24} />
              </div>
              รายงานสรุปยอดสมาชิก
           </h2>
           <p className="text-sm text-slate-500 mt-1 ml-1">วิเคราะห์ยอดขายและกำไรรายบุคคล</p>
        </div>
        
        {/* ✅ Date Range Picker (ยกมาจาก Dashboard) */}
        <div className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full xl:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full sm:w-auto pl-10 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <span className="text-slate-400"><ArrowRight size={16}/></span>
                <div className="relative w-full sm:w-auto">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-full sm:w-auto pl-10 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
                <button 
                    onClick={fetchStats} 
                    className="flex-1 sm:flex-none p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
                <button className="flex-1 sm:flex-none bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-transform active:scale-95 flex items-center justify-center gap-2" title="Export Excel">
                    <Download size={20} /> <span className="sm:hidden text-xs font-bold">Export</span>
                </button>
            </div>
        </div>
      </div>

      {/* --- Dashboard Cards (Summary) --- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-2 text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                  <Banknote size={14} /> ยอดขายรวม
              </div>
              <div className="text-lg md:text-xl font-black text-blue-600 truncate">
                  {grandTotal.bet.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">฿</span>
              </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-2 text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                  <Trophy size={14} /> จ่ายรางวัล
              </div>
              <div className="text-lg md:text-xl font-black text-red-500 truncate">
                  {grandTotal.win.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">฿</span>
              </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-2 text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                  <Clock size={14} /> รอผลรางวัล
              </div>
              <div className="text-lg md:text-xl font-black text-orange-500 truncate">
                  {grandTotal.pending.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">฿</span>
              </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-2 text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                  <RotateCcw size={14} /> ยกเลิก/คืน
              </div>
              <div className="text-lg md:text-xl font-black text-slate-500 truncate">
                  {grandTotal.cancelled.toLocaleString()} <span className="text-[10px] font-medium text-slate-300">฿</span>
              </div>
          </div>

          <div className={`p-4 rounded-2xl shadow-sm border col-span-2 lg:col-span-1 ${totalProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <div className={`flex items-center gap-2 mb-2 text-[10px] md:text-xs font-bold uppercase tracking-wider ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  <TrendingUp size={14} /> {totalProfit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'}
              </div>
              <div className={`text-xl md:text-2xl font-black truncate ${totalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {totalProfit > 0 ? '+' : ''}{totalProfit.toLocaleString()} <span className="text-xs font-medium opacity-60">฿</span>
              </div>
          </div>
      </div>

      {/* --- Desktop Table View (Hidden on Mobile) --- */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative min-h-75">
        
        {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-indigo-600">
                <Loader2 size={48} className="animate-spin mb-2" />
                <span className="font-bold">กำลังประมวลผลข้อมูล...</span>
            </div>
        )}

        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider">
                    <tr>
                        <th className="p-4 w-12 text-center">#</th>
                        <th className="p-4">สมาชิก</th>
                        <th className="p-4 text-center">บิล</th>
                        <th className="p-4 text-right text-blue-700">ยอดแทง</th>
                        <th className="p-4 text-right text-red-500">จ่ายรางวัล</th>
                        <th className="p-4 text-right text-orange-600">รอผล</th>
                        <th className="p-4 text-right text-slate-500">ยกเลิก/คืน</th>
                        <th className="p-4 text-right">กำไร/ขาดทุน</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                    {!loading && stats.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="p-12 text-center text-slate-400">
                                <div className="flex flex-col items-center">
                                    <AlertCircle size={40} className="mb-2 opacity-30" />
                                    ไม่มีรายการซื้อขายในช่วงเวลานี้
                                </div>
                            </td>
                        </tr>
                    ) : (
                        stats.map((m, index) => {
                            // คำนวณกำไรรายบุคคล (ยอดขาย - จ่าย - รอผล)
                            const profit = Number(m.total_bet) - Number(m.total_win) - Number(m.pending_amount);
                            return (
                                <tr key={m.user_id} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="p-4 text-center text-slate-400">{index + 1}</td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                {m.username.charAt(0).toUpperCase()}
                                            </div>
                                            {m.username}
                                        </div>
                                        <div className="text-xs text-slate-500 pl-10">{m.full_name || '-'}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-slate-100 px-2 py-1 rounded-md text-xs font-bold text-slate-600">
                                            {m.bill_count}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-blue-700 text-base">
                                        {Number(m.total_bet).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right font-bold text-red-500">
                                        {Number(m.total_win) > 0 ? Number(m.total_win).toLocaleString() : '-'}
                                    </td>
                                    <td className="p-4 text-right font-medium text-orange-600">
                                        {Number(m.pending_amount) > 0 ? Number(m.pending_amount).toLocaleString() : '-'}
                                    </td>
                                    <td className="p-4 text-right text-slate-500">
                                        {Number(m.cancelled_amount) > 0 ? Number(m.cancelled_amount).toLocaleString() : '-'}
                                    </td>
                                    <td className={`p-4 text-right font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {profit > 0 ? '+' : ''}{profit.toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- Mobile Card View --- */}
      <div className="md:hidden space-y-4">
          {loading && <div className="text-center py-10 text-slate-400">กำลังโหลด...</div>}
          {!loading && stats.length === 0 && (
              <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
                  ไม่พบข้อมูล
              </div>
          )}

          {stats.map((m) => {
              const profit = Number(m.total_bet) - Number(m.total_win) - Number(m.pending_amount);
              return (
                  <div key={m.user_id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-3 pb-2 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                  {m.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                  <h3 className="font-bold text-slate-800">{m.username}</h3>
                                  <p className="text-xs text-slate-500">{m.full_name || 'Member'}</p>
                              </div>
                          </div>
                          <span className="bg-slate-100 px-2 py-1 rounded-md text-xs font-bold text-slate-500">
                              {m.bill_count} บิล
                          </span>
                      </div>

                      {/* Row 1: Bet & Win */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-blue-50 p-2 rounded-xl text-center">
                              <div className="text-[10px] text-blue-400 font-bold uppercase">ยอดซื้อ</div>
                              <div className="font-bold text-blue-700">{Number(m.total_bet).toLocaleString()}</div>
                          </div>
                          <div className="bg-red-50 p-2 rounded-xl text-center">
                              <div className="text-[10px] text-red-400 font-bold uppercase">จ่ายรางวัล</div>
                              <div className="font-bold text-red-600">{Number(m.total_win).toLocaleString()}</div>
                          </div>
                      </div>

                      {/* Row 2: Pending & Cancelled */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-orange-50 p-2 rounded-xl text-center">
                              <div className="text-[10px] text-orange-400 font-bold uppercase">รอผล</div>
                              <div className="font-bold text-orange-600">{Number(m.pending_amount).toLocaleString()}</div>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl text-center">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">ยกเลิก/คืน</div>
                              <div className="font-bold text-slate-600">{Number(m.cancelled_amount).toLocaleString()}</div>
                          </div>
                      </div>

                      {/* Footer Profit */}
                      <div className="flex justify-between items-center text-xs px-1 pt-1 border-t border-slate-50">
                          <span className="text-slate-400 font-bold">สรุปกำไร/ขาดทุน</span>
                          <span className={`font-bold text-sm ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {profit > 0 ? '+' : ''}{profit.toLocaleString()} ฿
                          </span>
                      </div>
                  </div>
              );
          })}
      </div>

    </div>
  );
}