import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
  Banknote, 
  TrendingUp, 
  Ticket,
  BarChart3,
  Calendar as CalendarIcon,
  RefreshCw,
  ArrowRight,
  Clock,
  RotateCcw,
  Percent
} from 'lucide-react';
import QuickDateFilters from '../../components/common/QuickDateFilters';


export default function Dashboard() {
  const getToday = () => {
     const d = new Date();
     const offset = d.getTimezoneOffset();
     d.setMinutes(d.getMinutes() - offset);
     return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());

  const [stats, setStats] = useState({
    total_sales: 0,
    total_tickets: 0,
    total_payout: 0,
    total_pending: 0,
    total_cancelled: 0,
    total_commission: 0,
    profit: 0
  });
  
  const [topNumbers, setTopNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchTopNumbers();
    
    const interval = setInterval(() => {
        const today = getToday();
        if (startDate === today && endDate === today) {
            fetchStats();
            fetchTopNumbers();
        }
    }, 60000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await client.get(`/play/stats/range?start_date=${startDate}&end_date=${endDate}`);
      setStats(res.data);
    } catch (err) { 
        console.error("Fetch Stats Error:", err); 
    } finally {
        setLoading(false);
    }
  };

  const fetchTopNumbers = async () => {
    try {
        const res = await client.get(`/play/stats/top_numbers?start_date=${startDate}&end_date=${endDate}&limit=200`);
        setTopNumbers(res.data);
    } catch(err) { console.error(err); }
  };

  // StatCard Component
  const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-4 transition-all hover:shadow-md min-h-30">
        <div className="flex-1 min-w-0">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2 truncate">{title}</p>
            <h3 className={`text-3xl font-black truncate ${color}`} title={String(value)}>
                {loading ? '...' : value}
            </h3>
            {subValue && <p className="text-xs text-slate-400 mt-1 truncate">{subValue}</p>}
        </div>
        
        <div className={`shrink-0 p-4 rounded-2xl ${color.replace('text-', 'bg-').replace('600', '50').replace('500', '50').replace('700', '50')} ${color}`}>
            <Icon size={28} />
        </div>
    </div>
  );
  // ✅ แยกข้อมูลเป็นเลข 2 ตัว และ 3 ตัว (จำกัดอย่างละ 50 อันดับ)
  const top2Numbers = topNumbers.filter(item => item.number.length === 2).slice(0, 50);
  const top3Numbers = topNumbers.filter(item => item.number.length === 3).slice(0, 50);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* --- Header & Date Picker --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">แดชบอร์ดภาพรวม</h1>
            <p className="text-slate-500 text-sm">สรุปยอดขายและกำไรตามช่วงเวลา</p>
          </div>
          
          {/* ✅ ชุด Date Picker + Quick Filters (ปรับชิดขวา) */}
          <div className="flex flex-col items-end gap-2 w-full md:w-auto">
              <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 w-full sm:w-auto">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-auto">
                          <CalendarIcon className="absolute left-3 top-2.5 text-slate-400" size={16} />
                          <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full sm:w-auto pl-10 pr-2 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                      </div>
                      <span className="text-slate-400"><ArrowRight size={16}/></span>
                      <div className="relative w-full sm:w-auto">
                          <CalendarIcon className="absolute left-3 top-2.5 text-slate-400" size={16} />
                          <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            className="w-full sm:w-auto pl-10 pr-2 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                      </div>
                  </div>
                  
                  <button 
                    onClick={() => { fetchStats(); fetchTopNumbers(); }} 
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm w-full sm:w-auto flex justify-center"
                  >
                      <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                  </button>
              </div>

              {/* 🌟 ปุ่มกดเลือกวันที่ด่วน (ชิดขวา) */}
              <div className="w-full flex justify-end">
                  <QuickDateFilters setStartDate={setStartDate} setEndDate={setEndDate} />
              </div>
          </div>
      </div>

      {/* --- Stats Grid (ปรับเป็น 3 คอลัมน์ตามต้องการ) --- */}
      {/* grid-cols-1 = มือถือ
          md:grid-cols-2 = แท็บเล็ต
          lg:grid-cols-3 = จอคอม (แถวละ 3 การ์ด กว้างๆ) 
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
            title="ยอดขายทั้งหมด" 
            value={`${Number(stats.total_sales).toLocaleString()} ฿`} 
            icon={Banknote} 
            color="text-indigo-600" 
        />

        <StatCard 
            title="จ่ายค่าคอมมิชชั่น" 
            value={`${Number(stats.total_commission).toLocaleString()} ฿`} 
            icon={Percent} 
            color="text-purple-600"
        />
        
        <StatCard 
            title="ยอดจ่ายรางวัล" 
            value={`${Number(stats.total_payout).toLocaleString()} ฿`} 
            icon={Ticket} 
            color="text-red-500"
        />
        <StatCard 
            title="รอผลรางวัล" 
            value={`${Number(stats.total_pending).toLocaleString()} ฿`} 
            icon={Clock} 
            color="text-orange-500" 
        />
        <StatCard 
            title="จำนวนบิล" 
            value={stats.total_tickets.toLocaleString()} 
            icon={BarChart3} 
            color="text-blue-500"

        />
        {/* ✅ เพิ่มการ์ดบิลที่ยกเลิก */}
        <StatCard 
            title="บิลที่ยกเลิก" 
            value={stats.total_cancelled.toLocaleString()} 
            icon={RotateCcw} 
            color="text-slate-500"

        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6">
        <StatCard 
            title="กำไรสุทธิ" 
            value={`${Number(stats.profit).toLocaleString()} ฿`} 
            icon={TrendingUp} 
            color={stats.profit >= 0 ? "text-emerald-600" : "text-red-600"} 
        />
      </div>

        {/* --- Top Numbers Tables (2 Columns) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* คอลัมน์ที่ 1: เลข 2 ตัว */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="p-5 border-b border-gray-100 bg-white rounded-t-2xl flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <TrendingUp className="text-blue-500" size={20} /> 
                        เลข 2 ตัว (ยอดฮิต)
                    </h3>
                    <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">50 อันดับ</span>
                </div>
                <div className="flex-1">
                    <table className="w-full text-sm text-left relative">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs shadow-sm">
                            <tr>
                                <th className="p-3 pl-5">อันดับ</th>
                                <th className="p-3 text-center">เลข 2 ตัว</th>
                                <th className="p-3 text-right">ยอดขายรวม</th>
                                <th className="p-3 text-center">จำนวนบิล</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {top2Numbers.map((item, index) => (
                                <tr key={item.number} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="p-3 pl-5 text-slate-400 font-mono text-xs">#{index + 1}</td>
                                    <td className="p-3 text-center">
                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-bold text-base tracking-widest border border-blue-200">
                                            {item.number}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-black text-slate-700">
                                        {Number(item.total_amount).toLocaleString()} <span className="text-[10px] text-slate-400 font-medium">฿</span>
                                    </td>
                                    <td className="p-3 text-center text-slate-500 font-medium">
                                        {item.frequency}
                                    </td>
                                </tr>
                            ))}
                            {top2Numbers.length === 0 && !loading && (
                                <tr><td colSpan={4} className="p-10 text-center text-slate-400">ยังไม่มีข้อมูลการขายเลข 2 ตัว</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* คอลัมน์ที่ 2: เลข 3 ตัว */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="p-5 border-b border-gray-100 bg-white rounded-t-2xl flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <TrendingUp className="text-rose-500" size={20} /> 
                        เลข 3 ตัว (ยอดฮิต)
                    </h3>
                    <span className="text-xs font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded-lg">50 อันดับ</span>
                </div>
                <div className="flex-1">
                    <table className="w-full text-sm text-left relative">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs shadow-sm">
                            <tr>
                                <th className="p-3 pl-5">อันดับ</th>
                                <th className="p-3 text-center">เลข 3 ตัว</th>
                                <th className="p-3 text-right">ยอดขายรวม</th>
                                <th className="p-3 text-center">จำนวนบิล</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {top3Numbers.map((item, index) => (
                                <tr key={item.number} className="hover:bg-rose-50/50 transition-colors">
                                    <td className="p-3 pl-5 text-slate-400 font-mono text-xs">#{index + 1}</td>
                                    <td className="p-3 text-center">
                                        <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-lg font-bold text-base tracking-widest border border-rose-200">
                                            {item.number}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-black text-slate-700">
                                        {Number(item.total_amount).toLocaleString()} <span className="text-[10px] text-slate-400 font-medium">฿</span>
                                    </td>
                                    <td className="p-3 text-center text-slate-500 font-medium">
                                        {item.frequency}
                                    </td>
                                </tr>
                            ))}
                            {top3Numbers.length === 0 && !loading && (
                                <tr><td colSpan={4} className="p-10 text-center text-slate-400">ยังไม่มีข้อมูลการขายเลข 3 ตัว</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>
  );
}