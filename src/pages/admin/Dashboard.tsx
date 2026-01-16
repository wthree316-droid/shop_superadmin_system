// src/pages/admin/Dashboard.tsx

import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
  Banknote, 
  TrendingUp, 
  Ticket,
  BarChart3,
  Calendar as CalendarIcon, // เพิ่มไอคอน
  RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  // 1. เพิ่ม State สำหรับเลือกวันที่
  const [selectedDate, setSelectedDate] = useState(() => {
     // Default เป็นวันนี้ (Local Time)
     const d = new Date();
     const offset = d.getTimezoneOffset();
     d.setMinutes(d.getMinutes() - offset);
     return d.toISOString().split('T')[0];
  });

  const [stats, setStats] = useState({
    total_sales: 0,
    total_tickets: 0,
    total_payout: 0,
    profit: 0
  });
  
  const [topNumbers, setTopNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchTopNumbers();
    
    // Auto Refresh ทุก 1 นาที (เฉพาะถ้าดูวันปัจจุบัน)
    const interval = setInterval(() => {
        const today = new Date().toISOString().split('T')[0];
        if (selectedDate === today) {
            fetchStats();
            fetchTopNumbers();
        }
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedDate]); // <-- Refresh เมื่อเปลี่ยนวันที่

  const fetchStats = async () => {
    setLoading(true);
    try {
      // ✅ แก้ไขตรงนี้: เรียก /stats/daily และส่ง date_str ไปด้วย
      const res = await client.get(`/play/stats/daily?date_str=${selectedDate}`);
      setStats(res.data);
    } catch (err) { 
        console.error("Fetch Stats Error:", err); 
    } finally {
        setLoading(false);
    }
  };

  const fetchTopNumbers = async () => {
    try {
        // Top Numbers ถ้า Backend ยังไม่ได้แก้ให้รับวันที่ มันจะโชว์ของวันนี้เสมอ
        // แต่ถ้าแก้แล้วก็ส่ง param ไปได้: /play/stats/top_numbers?date_str=...
        const res = await client.get('/play/stats/top_numbers');
        setTopNumbers(res.data);
    } catch(err) { console.error(err); }
  };

  // Helper Card Component
  const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-all hover:shadow-md">
        <div>
            <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
            <h3 className={`text-2xl font-black ${color}`}>{loading ? '...' : value}</h3>
            {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
        <div className={`p-4 rounded-xl ${color.replace('text-', 'bg-').replace('600', '50')} ${color}`}>
            <Icon size={24} />
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* --- Header & Date Picker --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">แดชบอร์ดภาพรวม</h1>
            <p className="text-slate-500 text-sm">สรุปยอดขายและกำไร (ตามเวลาประเทศไทย)</p>
          </div>
          
          <div className="flex items-center gap-2">
              <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
              </div>
              <button 
                onClick={() => { fetchStats(); fetchTopNumbers(); }} 
                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
          </div>
      </div>

      {/* --- Stats Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
            title="ยอดขายทั้งหมด" 
            value={`${Number(stats.total_sales).toLocaleString()} ฿`} 
            icon={Banknote} 
            color="text-indigo-600" 
            subValue={`${stats.total_tickets.toLocaleString()} บิล`}
        />
        <StatCard 
            title="ยอดจ่ายรางวัล" 
            value={`${Number(stats.total_payout).toLocaleString()} ฿`} 
            icon={Ticket} 
            color="text-red-500"
        />
        <StatCard 
            title="กำไรสุทธิ" 
            value={`${Number(stats.profit).toLocaleString()} ฿`} 
            icon={TrendingUp} 
            color={stats.profit >= 0 ? "text-emerald-600" : "text-red-600"} 
        />
         {/* Card ที่ 4 อาจจะเป็น ยอดคงเหลือลูกค้า หรืออื่นๆ */}
         <StatCard 
            title="จำนวนบิล" 
            value={stats.total_tickets.toLocaleString()} 
            icon={BarChart3} 
            color="text-blue-500"
        />
      </div>

      {/* --- Top Numbers Table --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <TrendingUp className="text-rose-500" size={20} /> เลขขายดี 10 อันดับแรก
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4 pl-6">อันดับ</th>
                            <th className="p-4 text-center">เลข</th>
                            <th className="p-4 text-right">ยอดขายรวม</th>
                            <th className="p-4 text-center">จำนวนครั้ง</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {topNumbers.map((item, index) => (
                            <tr key={item.number} className="hover:bg-indigo-50/50 transition-colors">
                                <td className="p-4 pl-6 text-gray-400 font-mono">#{index + 1}</td>
                                <td className="p-4 text-center">
                                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-bold text-lg tracking-wider border border-indigo-200">
                                        {item.number}
                                    </span>
                                </td>
                                <td className="p-4 text-right font-bold text-gray-700">
                                    {Number(item.total_amount).toLocaleString()}
                                </td>
                                <td className="p-4 text-center text-gray-500">
                                    {item.frequency}
                                </td>
                            </tr>
                        ))}
                        {topNumbers.length === 0 && (
                            <tr><td colSpan={4} className="p-10 text-center text-gray-400">ยังไม่มีข้อมูลการขาย</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
      </div>
    </div>
  );
}