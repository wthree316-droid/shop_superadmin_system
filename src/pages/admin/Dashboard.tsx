// src/pages/admin/Dashboard.tsx
import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
  Banknote, 
  TrendingUp, 
  TrendingDown,  
  Ticket,
  BarChart3
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_sales: 0,
    total_tickets: 0,
    total_payout: 0,
    profit: 0
  });
  
  const [topNumbers, setTopNumbers] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchTopNumbers();
    
    // Auto Refresh ทุก 1 นาที
    const interval = setInterval(() => {
        fetchStats();
        fetchTopNumbers();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await client.get('/play/stats/today');
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTopNumbers = async () => {
    try {
        const res = await client.get('/play/stats/top_numbers');
        setTopNumbers(res.data);
    } catch(err) { console.error(err); }
  };

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">ภาพรวมวันนี้ (Realtime)</h1>

      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Card 1: ยอดขาย */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Banknote size={24} />
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-1">ยอดขายรวม</p>
          <h3 className="text-3xl font-bold text-gray-900">
            {stats.total_sales.toLocaleString()} <span className="text-sm font-normal text-gray-400">บาท</span>
          </h3>
        </div>

        {/* Card 2: จำนวนบิล */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <Ticket size={24} />
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-1">จำนวนบิล</p>
          <h3 className="text-3xl font-bold text-gray-900">
            {stats.total_tickets.toLocaleString()} <span className="text-sm font-normal text-gray-400">ใบ</span>
          </h3>
        </div>

        {/* Card 3: ยอดจ่าย (ถูกรางวัล) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
              <TrendingDown size={24} />
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-1">ยอดจ่ายรางวัล</p>
          <h3 className="text-3xl font-bold text-red-600">
            {stats.total_payout.toLocaleString()} <span className="text-sm font-normal text-gray-400">บาท</span>
          </h3>
        </div>

        {/* Card 4: กำไรสุทธิ */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-1">กำไรสุทธิ</p>
          <h3 className={`text-3xl font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.profit.toLocaleString()} <span className="text-sm font-normal text-gray-400">บาท</span>
          </h3>
        </div>
      </div>

      {/* Section 2: Top Numbers & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Numbers Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <BarChart3 size={18} /> 10 อันดับเลขขายดี
                </h3>
                <span className="text-xs text-gray-500">วันนี้</span>
            </div>
            <table className="w-full text-sm text-left">
                <thead className="text-gray-500 bg-gray-50 border-b">
                    <tr>
                        <th className="p-3">อันดับ</th>
                        <th className="p-3 text-center">เลข</th>
                        <th className="p-3 text-right">ยอดเงิน</th>
                        <th className="p-3 text-center">จำนวนครั้ง</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {topNumbers.map((item, index) => (
                        <tr key={item.number} className="hover:bg-blue-50">
                            <td className="p-3 text-gray-500 pl-6">{index + 1}</td>
                            <td className="p-3 text-center font-bold text-xl text-blue-600 tracking-widest">{item.number}</td>
                            <td className="p-3 text-right font-bold text-gray-700">{item.total_amount.toLocaleString()}</td>
                            <td className="p-3 text-center text-gray-500">{item.frequency}</td>
                        </tr>
                    ))}
                    {topNumbers.length === 0 && (
                        <tr><td colSpan={4} className="p-6 text-center text-gray-400">ยังไม่มีข้อมูลการขาย</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Placeholder for Graph */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-80 flex flex-col items-center justify-center text-gray-400">
           <BarChart3 size={48} className="mb-4 opacity-20" />
           <p>กราฟยอดขายรายชั่วโมง</p>
           <span className="text-xs bg-gray-100 px-2 py-1 rounded mt-2">Coming in next update</span>
        </div>
      </div>
    </div>
  );
}