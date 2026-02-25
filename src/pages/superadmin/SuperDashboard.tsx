import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
    Store, Users, Server, ShieldCheck, 
    Trash2, AlertTriangle, Loader2,
    ArrowRight, RefreshCw,
    Banknote, Ticket, Clock, TrendingUp, BarChart3,
    RotateCcw
} from 'lucide-react';
import { confirmAction, alertAction } from '../../utils/toastUtils';
import QuickDateFilters from '../../components/common/QuickDateFilters';

export default function SuperDashboard() {
  const getToday = () => {
     const d = new Date();
     const offset = d.getTimezoneOffset();
     d.setMinutes(d.getMinutes() - offset);
     return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [loading, setLoading] = useState(false);

  // Stats ระบบ
  const [systemStats, setSystemStats] = useState({
    total_shops: 0,
    total_users: 0,
    active_shops: 0,
    total_tickets: 0
  });

  // Stats การเงินรวม
  const [financialStats, setFinancialStats] = useState({
    total_sales: 0,
    total_tickets: 0,
    total_payout: 0,
    total_pending: 0,
    profit: 0
  });

  const [shopStats, setShopStats] = useState<any[]>([]);

  useEffect(() => {
    fetchSystemStats();
    fetchFinancialStats();
    fetchShopPerformance();
  }, [startDate, endDate]); 

  const fetchSystemStats = async () => {
    try {
        const res = await client.get('/system/stats'); 
        setSystemStats({
            total_shops: res.data.total_shops,
            active_shops: res.data.active_shops,
            total_users: res.data.total_users, 
            total_tickets: res.data.total_tickets
        });
    } catch(err) { console.error(err); }
  };

  const fetchFinancialStats = async () => {
      setLoading(true);
      try {
          const res = await client.get(`/play/stats/range?start_date=${startDate}&end_date=${endDate}`);
          setFinancialStats(res.data);
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  const fetchShopPerformance = async () => {
    try {
        const res = await client.get(`/shops/stats/performance?start_date=${startDate}&end_date=${endDate}`);
        setShopStats(res.data);
    } catch (err) { 
        console.error(err); 
    }
  };

  const handleGlobalCleanup = async () => {
      confirmAction("⚠️ คำเตือน: คุณกำลังจะล้างข้อมูล (โพย, ตัวเลข, ผลรางวัล, เลขอั้น) ทั้งหมดในระบบ!", async () => {
          // Delay นิดนึงเพื่อให้ Toast หายไปก่อน prompt ขึ้น
          setTimeout(async () => {
              const input = prompt("ยืนยันครั้งสุดท้าย: ข้อมูลจะไม่สามารถกู้คืนได้\nกรุณาพิมพ์คำว่า 'YES' เพื่อยืนยันการลบ");
              if (input !== 'YES') return;

              try {
                  await client.delete('/system/cleanup/global');
                  alertAction('ล้างข้อมูลเรียบร้อย (โพย, ตัวเลข, ผลรางวัล, เลขอั้น)', 'สำเร็จ', 'success');
                  fetchSystemStats();
                  fetchFinancialStats();
                  fetchShopPerformance();
              } catch (err) {
                  alertAction('เกิดข้อผิดพลาดในการล้างข้อมูล', 'ข้อผิดพลาด', 'error');
              }
          }, 100);
      }, 'ล้างข้อมูล', 'ยกเลิก');
  };

  // Component การ์ดแสดงผล
  const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-3 transition-all hover:shadow-md min-h-27.5">
        <div className="flex-1 min-w-0">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 truncate">{title}</p>
            <h3 className={`text-xl xl:text-2xl font-black truncate ${color}`} title={String(value)}>
                {loading ? '...' : value}
            </h3>
            {subValue && <p className="text-xs text-slate-400 mt-1 truncate">{subValue}</p>}
        </div>
        <div className={`shrink-0 p-3.5 rounded-xl ${color.replace('text-', 'bg-').replace('600', '50').replace('500', '50')} ${color}`}>
            <Icon size={24} />
        </div>
    </div>
  );

  return (
    <div className="p-6 animate-fade-in text-slate-800 pb-24 space-y-8">
      
      {/* --- Header & Filter --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <Server className="text-purple-600" /> Super Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">ภาพรวมระบบและยอดการเงินของทุกร้านค้า</p>
          </div>

          {/* ✅ ชุด Date Picker + Quick Filters (ปรับชิดขวา + กล่องขนาดพอดี) */}
          <div className="flex flex-col items-end gap-2 w-full md:w-auto">
              <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 w-full sm:w-auto">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-auto">
                          <input 
                              type="date" 
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full sm:w-auto pl-2 pr-1 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-slate-700 outline-none"
                          />
                      </div>
                      <span className="text-slate-400"><ArrowRight size={16}/></span>
                      <div className="relative w-full sm:w-auto">
                          <input 
                              type="date" 
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              min={startDate}
                              className="w-full sm:w-auto pl-2 pr-1 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-slate-700 outline-none"
                          />
                      </div>
                  </div>
                  <button 
                      onClick={() => { fetchFinancialStats(); fetchShopPerformance(); }} 
                      className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm w-full sm:w-auto flex justify-center"
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

      {/* --- Section 1: Financial Overview --- */}
      <div>
          <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Banknote className="text-blue-500"/> สรุปยอดเงินรวม (ทุกร้านค้า)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard 
                title="ยอดขายรวม" 
                value={`${Number(financialStats.total_sales).toLocaleString()} ฿`} 
                icon={Banknote} 
                color="text-indigo-600" 
            />
            <StatCard 
                title="จ่ายรางวัล" 
                value={`${Number(financialStats.total_payout).toLocaleString()} ฿`} 
                icon={Ticket} 
                color="text-red-500"
            />
            <StatCard 
                title="รอผลรางวัล" 
                value={`${Number(financialStats.total_pending).toLocaleString()} ฿`} 
                icon={Clock} 
                color="text-orange-500" 
            />
            <StatCard 
                title="กำไรสุทธิรวม" 
                value={`${Number(financialStats.profit).toLocaleString()} ฿`} 
                icon={TrendingUp} 
                color={financialStats.profit >= 0 ? "text-emerald-600" : "text-red-600"} 
            />
            <StatCard 
                title="จำนวนบิล" 
                value={financialStats.total_tickets.toLocaleString()} 
                icon={BarChart3} 
                color="text-blue-500"
            />
          </div>
      </div>

      {/* --- Section 2: System Health --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-purple-100 text-purple-600 rounded-2xl"><Store size={32} /></div>
              <div>
                  <p className="text-sm text-slate-500 font-bold uppercase">Total Shops</p>
                  <h3 className="text-3xl font-black text-slate-800">{systemStats.total_shops}</h3>
                  <p className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full inline-block mt-1">Active: {systemStats.active_shops}</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl"><Users size={32} /></div>
              <div>
                  <p className="text-sm text-slate-500 font-bold uppercase">Total Users</p>
                  <h3 className="text-3xl font-black text-slate-800">{systemStats.total_users.toLocaleString()}</h3>
                  <p className="text-xs text-slate-400 mt-1">All members</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-green-100 text-green-600 rounded-2xl"><ShieldCheck size={32} /></div>
              <div>
                  <p className="text-sm text-slate-500 font-bold uppercase">System Status</p>
                  <h3 className="text-3xl font-black text-green-600">Online</h3>
                  <p className="text-xs text-slate-400 mt-1">Server running</p>
              </div>
          </div>
      </div>
      
      {/* --- Section 3: Shop Performance Table --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Store className="text-amber-500" /> อันดับยอดขายรายร้าน
            </h3>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-xs">
                    <tr>
                        <th className="p-4 pl-6">ร้านค้า</th>
                        {/* ✅ เพิ่มคอลัมน์บิล */}
                        <th className="p-4 text-center w-24">บิล</th>
                        <th className="p-4 text-right">ยอดขาย</th>
                        
                        <th className="p-4 text-right text-orange-500">
                            <div className="flex items-center justify-end gap-1">
                                <Clock size={14}/> รอผล
                            </div>
                        </th>
                        
                        <th className="p-4 text-right text-slate-400">
                            <div className="flex items-center justify-end gap-1">
                                <RotateCcw size={14}/> ยกเลิก/คืน
                            </div>
                        </th> 
                        
                        <th className="p-4 text-right">จ่ายรางวัล</th>
                        <th className="p-4 text-right">กำไรสุทธิ</th>
                        <th className="p-4 text-center">สถานะ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loading ? (
                        <tr><td colSpan={8} className="p-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> กำลังโหลดข้อมูล...</td></tr>
                    ) : shopStats.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 italic">
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

                                {/* ✅ แสดงจำนวนบิล */}
                                <td className="p-4 text-center">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold border border-slate-200">
                                        {Number(shop.bill_count || 0).toLocaleString()}
                                    </span>
                                </td>

                                <td className="p-4 text-right font-bold text-blue-600 text-base">
                                    {Number(shop.sales).toLocaleString()}
                                </td>
                                
                                <td className="p-4 text-right text-orange-500 font-medium">
                                    {Number(shop.pending) > 0 ? Number(shop.pending).toLocaleString() : '-'}
                                </td>
                                
                                <td className="p-4 text-right text-slate-400 font-medium">
                                    {Number(shop.cancelled) > 0 ? Number(shop.cancelled).toLocaleString() : '-'}
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
                      ลบข้อมูล: <span className="font-bold">โพย, ตัวเลขในโพย, ผลรางวัล, เลขอั้น</span> ทั้งหมดในระบบ
                  </p>
                  <p className="text-xs text-red-500 mt-1.5 bg-red-100 px-2 py-1 rounded inline-block">
                      ✅ เก็บไว้: ร้านค้า, ผู้ใช้, หวย, หมวดหมู่หวย
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