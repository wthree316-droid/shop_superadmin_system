import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
    Store, Users, Server, ShieldCheck, 
    Trash2, AlertTriangle, 
    ArrowRight, RefreshCw // ✅ เพิ่มไอคอน
} from 'lucide-react';

export default function SuperDashboard() {
  // ✅ 1. เพิ่ม State วันที่ (Default = วันนี้)
  const getToday = () => {
     const d = new Date();
     const offset = d.getTimezoneOffset();
     d.setMinutes(d.getMinutes() - offset);
     return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    total_shops: 0,
    total_users: 0,
    active_shops: 0,
    total_tickets: 0
  });

  const [shopStats, setShopStats] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchShopPerformance();
  }, [startDate, endDate]); // ✅ Reload เมื่อเปลี่ยนวัน

  const fetchStats = async () => {
    try {
        const res = await client.get('/system/stats'); 
        setStats({
            total_shops: res.data.total_shops,
            active_shops: res.data.active_shops,
            total_users: res.data.total_users, 
            total_tickets: res.data.total_tickets
        });
    } catch(err) { console.error(err); }
  };

  const fetchShopPerformance = async () => {
    setLoading(true);
    try {
        // ✅ ส่งวันที่ไปกับ API
        const res = await client.get(`/shops/stats/performance?start_date=${startDate}&end_date=${endDate}`);
        setShopStats(res.data);
    } catch (err) { 
        console.error(err); 
    } finally {
        setLoading(false);
    }
  };

  const handleGlobalCleanup = async () => {
      const confirm1 = confirm("⚠️ คำเตือน: คุณกำลังจะล้างข้อมูลประวัติการแทงทั้งหมดในระบบ!");
      if (!confirm1) return;
      const input = prompt("ยืนยันครั้งสุดท้าย: ข้อมูลจะไม่สามารถกู้คืนได้\nกรุณาพิมพ์คำว่า 'YES' เพื่อยืนยันการลบ");
      if (input !== 'YES') return;

      try {
          await client.delete('/system/cleanup/global');
          alert('ล้างข้อมูลเรียบร้อย ระบบสะอาดเอี่ยม!');
          fetchStats();
          fetchShopPerformance();
      } catch (err) {
          alert('เกิดข้อผิดพลาดในการล้างข้อมูล');
      }
  };

  return (
    <div className="p-6 animate-fade-in text-slate-800 pb-20">
      
      {/* --- Section 1: Overview Cards --- */}
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Server className="text-purple-600" /> System Overview
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-purple-100 text-purple-600 rounded-full"><Store size={32} /></div>
              <div>
                  <p className="text-sm text-slate-500">Total Shops</p>
                  <h3 className="text-3xl font-bold text-slate-800">{stats.total_shops}</h3>
                  <p className="text-xs text-green-600 font-bold">Active: {stats.active_shops}</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-full"><Users size={32} /></div>
              <div>
                  <p className="text-sm text-slate-500">Total Users</p>
                  <h3 className="text-3xl font-bold text-slate-800">{stats.total_users.toLocaleString()}</h3>
                  <p className="text-xs text-slate-400">System wide</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-green-100 text-green-600 rounded-full"><ShieldCheck size={32} /></div>
              <div>
                  <p className="text-sm text-slate-500">System Status</p>
                  <h3 className="text-3xl font-bold text-green-600">Online</h3>
                  <p className="text-xs text-slate-400">Server is running</p>
              </div>
          </div>
      </div>
      
      {/* --- Section 2: Shop Performance Table --- */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* ✅ Header Table + Date Picker */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Store className="text-amber-500" /> สรุปยอดขายรายร้าน (ช่วงเวลา)
                </h3>
                {/* แสดงวันที่ที่เลือกอยู่ */}
                <p className="text-xs text-slate-500 mt-1">
                    ข้อมูลวันที่ {new Date(startDate).toLocaleDateString('th-TH')} ถึง {new Date(endDate).toLocaleDateString('th-TH')}
                </p>
            </div>

            {/* ✅ Input เลือกวันที่ */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <div className="relative">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="pl-3 pr-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-500"
                    />
                </div>
                <span className="text-slate-400"><ArrowRight size={14}/></span>
                <div className="relative">
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        className="pl-3 pr-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-500"
                    />
                </div>
                <button 
                    onClick={() => { fetchStats(); fetchShopPerformance(); }}
                    className="p-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors shadow-sm"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>
        
        {/* Table Content (เหมือนเดิม) */}
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-xs">
                    <tr>
                        <th className="p-4 pl-6">ร้านค้า</th>
                        <th className="p-4 text-right">ยอดขาย</th>
                        <th className="p-4 text-right">จ่ายรางวัล</th>
                        <th className="p-4 text-right">กำไร/ขาดทุน</th>
                        <th className="p-4 text-center">สถานะ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loading ? (
                        <tr><td colSpan={5} className="p-10 text-center text-slate-400">กำลังโหลดข้อมูล...</td></tr>
                    ) : shopStats.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                ยังไม่มีข้อมูลการขายในช่วงเวลานี้
                            </td>
                        </tr>
                    ) : (
                        shopStats.map((shop) => (
                            <tr key={shop.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold overflow-hidden">
                                            {shop.logo_url ? (
                                                <img src={shop.logo_url} className="w-full h-full object-cover" />
                                            ) : (
                                                shop.name[0]
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{shop.name}</div>
                                            <div className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                                {shop.code}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-right font-bold text-blue-600 text-base">
                                    {Number(shop.sales).toLocaleString()}
                                </td>
                                <td className="p-4 text-right text-red-500 font-medium">
                                    {Number(shop.payout) > 0 ? Number(shop.payout).toLocaleString() : '-'}
                                </td>
                                <td className={`p-4 text-right font-black text-base ${shop.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {shop.profit > 0 ? '+' : ''}{Number(shop.profit).toLocaleString()}
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${shop.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} title={shop.is_active ? 'Online' : 'Offline'}></span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- Danger Zone --- */}
      <div className="mt-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
              <AlertTriangle /> Danger Zone
          </h3>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                  <h4 className="font-bold text-red-800">ล้างข้อมูลธุรกรรมทั้งหมด (Global Cleanup)</h4>
                  <p className="text-sm text-red-600 mt-1">
                      ลบข้อมูล Tickets, Ticket Items, Audit Logs และ ผลรางวัล ทั้งหมดในระบบ (Users และ Shops จะยังอยู่)
                  </p>
              </div>
              <button 
                onClick={handleGlobalCleanup}
                className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                  <Trash2 size={20} /> ล้างข้อมูลเดี๋ยวนี้
              </button>
          </div>
      </div>
    
    </div>
  );
}