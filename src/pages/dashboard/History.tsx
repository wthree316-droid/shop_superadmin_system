import { useEffect, useState, useMemo } from 'react';
import client from '../../api/client';
import { 
  X, RefreshCw, FileText,
   Search, Eye, Layers
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { calculateWinAmount, calculateNet, getStatusBadge } from '../../utils/lottoHelpers';

export default function History() {
  const [tickets, setTickets] = useState<any[]>([]);     
  const [lottos, setLottos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); 

  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [resHistory, resLottos, resCats] = await Promise.all([
            client.get('/play/history?limit=200'), 
            client.get('/play/lottos'),
            client.get('/play/categories')
        ]);
        
        setTickets(resHistory.data);
        setLottos(resLottos.data);
        setCategories(resCats.data);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const handleRefresh = async () => {
      setLoading(true);
      try {
          const res = await client.get('/play/history?limit=200');
          setTickets(res.data);
      } finally {
          setLoading(false);
      }
  };

  const handleCancel = async (ticketId: string) => {
    if (!confirm('ยืนยันยกเลิกโพยนี้? เงินจะคืนเข้าเครดิตทันที')) return;
    try {
      await client.patch(`/play/tickets/${ticketId}/cancel`);
      alert('ยกเลิกสำเร็จ! คืนเงินเรียบร้อย');
      handleRefresh(); 
      setSelectedTicket(null);
    } catch (err: any) {
      alert(`ยกเลิกไม่ได้: ${err.response?.data?.detail}`);
    }
  };

  // ✅ ปรับ Logic การจัดกลุ่ม: แยกตาม "ชื่อหวย" (Lotto) แทนหมวดหมู่ (Category)
  const groupedTickets = useMemo(() => {
      if (tickets.length === 0) return [];

      // 1. สร้าง Map หมวดหมู่เพื่อดึงสี (Color)
      const catMap = new Map();
      categories.forEach(c => catMap.set(c.id, c));

      // 2. สร้าง Map หวย เพื่อดึงชื่อและสีจากหมวดหมู่แม่
      const lottoMap = new Map();
      lottos.forEach(l => {
          const cat = catMap.get(l.category);
          lottoMap.set(l.id, {
              name: l.name,
              // ใช้สีของหมวดหมู่ (ถ้ามี) หรือสี Default
              color: cat?.color || 'bg-gray-100 text-gray-800'
          });
      });

      const groups: any = {};

      tickets.forEach(ticket => {
          const searchLower = searchTerm.toLowerCase();
          const matchUser = ticket.user?.username?.toLowerCase().includes(searchLower);
          const matchLotto = ticket.lotto_type?.name?.toLowerCase().includes(searchLower);
          const matchId = ticket.id.toLowerCase().includes(searchLower);
          
          if (searchTerm && !matchUser && !matchLotto && !matchId) return;

          // ✅ Group Key: ใช้ ID ของหวย (lotto_type_id)
          const key = ticket.lotto_type_id;
          
          if (!groups[key]) {
              // ดึงข้อมูลชื่อและสี
              const info = lottoMap.get(key) || {
                  name: ticket.lotto_type?.name || 'ไม่ระบุชื่อหวย',
                  color: 'bg-gray-100 text-gray-800'
              };

              groups[key] = {
                  info: info,
                  items: []
              };
          }
          groups[key].items.push(ticket);
      });

      // เรียงลำดับกลุ่มตามชื่อหวย (ก-ฮ)
      return Object.values(groups).sort((a: any, b: any) => 
          a.info.name.localeCompare(b.info.name, 'th')
      );

  }, [tickets, lottos, categories, searchTerm]);

  return (
    <div className="animate-fade-in pb-20 bg-gray-50 min-h-screen flex flex-col font-sans">
      
      {/* Header Sticky */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4 max-w-7xl mx-auto">
              <div>
                  <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Layers className="text-blue-600" /> ประวัติแยกตามหวย
                  </h1>
                  <p className="text-xs text-slate-500">ตรวจสอบรายการแบบแยกประเภทหวย</p>
              </div>
              <button 
                  onClick={handleRefresh} 
                  className={`p-2.5 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 transition-all ${loading ? 'animate-spin' : ''}`}
              >
                  <RefreshCw size={20} />
              </button>
          </div>
          
          <div className="max-w-7xl mx-auto">
              <div className="relative">
                  <input 
                      type="text" 
                      placeholder="ค้นหาชื่อหวย, เลขโพย..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              </div>
          </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full space-y-8">
          {loading ? (
              <div className="py-20 flex flex-col items-center text-slate-400">
                  <Loader2 className="animate-spin mb-2" size={32} />
                  <p>กำลังโหลดข้อมูล...</p>
              </div>
          ) : groupedTickets.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-sm flex flex-col items-center">
                  <FileText size={48} className="mb-2 opacity-20" />
                  ไม่พบรายการโพย
              </div>
          ) : (
              groupedTickets.map((group: any, index: number) => (
                  <div key={index} className="animate-slide-up">
                      
                      {/* หัวข้อชื่อหวย (ใช้สีจากหมวดหมู่) */}
                      <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <span className={`w-1.5 h-6 rounded-full ${group.info.color.split(' ')[0].replace('text', 'bg').replace('100', '500')}`}></span>
                          {group.info.name} 
                          <span className="text-xs font-normal text-slate-400 ml-2 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              {group.items.length} รายการ
                          </span>
                      </h2>

                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-4 w-32">1. วัน/เวลา</th>
                                        <th className="p-4 w-40">2. ลูกค้า</th>
                                        <th className="p-4">3. หวย</th>
                                        <th className="p-4 text-right">4. ยอดแทง</th>
                                        <th className="p-4 text-right">5. ถูกรางวัล</th>
                                        <th className="p-4 text-right">6. แพ้/ชนะ</th>
                                        <th className="p-4 w-40">7. หมายเหตุ</th>
                                        <th className="p-4 text-center">8. จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {group.items.map((t: any) => {
                                        const winAmount = calculateWinAmount(t);
                                        const net = calculateNet(t);
                                        const isWin = t.status === 'WIN';
                                        const isCancelled = t.status === 'CANCELLED';
                                        
                                        return (
                                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-700">{new Date(t.created_at).toLocaleDateString('th-TH')}</div>
                                                    <div className="text-xs text-gray-400 font-mono">{new Date(t.created_at).toLocaleTimeString('th-TH')}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-800">{t.user?.username || '-'}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-blue-600">{t.lotto_type?.name || 'Unknown'}</div>
                                                    <div className="text-[10px] text-gray-400">ID: {t.id.slice(0,6)}...</div>
                                                </td>
                                                <td className="p-4 text-right font-mono font-bold text-slate-700">
                                                    {Number(t.total_amount).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {isWin ? (
                                                        <span className="text-green-600 font-bold font-mono">+{winAmount.toLocaleString()}</span>
                                                    ) : getStatusBadge(t.status)}
                                                </td>
                                                <td className="p-4 text-right font-mono font-bold">
                                                    <span className={
                                                        isCancelled ? 'text-gray-400' :
                                                        net > 0 ? 'text-green-600' : 'text-red-500'
                                                    }>
                                                        {isCancelled ? '0' : (net > 0 ? '+' : '') + net.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-xs text-gray-500 truncate block max-w-36" title={t.note}>
                                                        {t.note || '-'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button 
                                                        onClick={() => setSelectedTicket(t)}
                                                        className="bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 p-2 rounded-lg transition-colors border border-slate-200"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* Modal Detail (มีคอลัมน์ เรท, รวม) */}
      {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="font-bold text-lg text-gray-800">รายละเอียดโพย</h3>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">#{selectedTicket.id}</div>
                      </div>
                      <button onClick={() => setSelectedTicket(null)} className="p-2 bg-white rounded-full border hover:bg-gray-100 text-gray-500">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-4 overflow-y-auto bg-white flex-1 custom-scrollbar">
                      <div className="text-center mb-4">
                          <h2 className="text-xl font-bold text-slate-800">{selectedTicket.lotto_type?.name}</h2>
                          <p className="text-xs text-slate-400">{new Date(selectedTicket.created_at).toLocaleString('th-TH')}</p>
                          <div className="text-sm font-bold text-blue-600 mt-1">ผู้เล่น: {selectedTicket.user?.username}</div>
                      </div>

                      <div className="border rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                              <thead className="bg-gray-100 text-gray-600 font-bold text-xs uppercase">
                                  <tr>
                                      <th className="p-3 text-left">เลข</th>
                                      <th className="p-3 text-left">ประเภท</th>
                                      <th className="p-3 text-right">เรท</th>
                                      <th className="p-3 text-right">ราคา</th>
                                      <th className="p-3 text-right">รวม</th>
                                      <th className="p-3 text-center">ผล</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {selectedTicket.items?.map((item: any, i: number) => {
                                      const potentialReward = Number(item.amount) * Number(item.reward_rate);
                                      return (
                                          <tr key={i} className={item.status === 'WIN' ? 'bg-green-50' : 'bg-white'}>
                                              <td className="p-3 font-mono font-bold text-lg">{item.number}</td>
                                              <td className="p-3 text-gray-500 text-xs">{item.bet_type}</td>
                                              <td className="p-3 text-right text-gray-500 text-xs">{Number(item.reward_rate).toLocaleString()}</td>
                                              <td className="p-3 text-right font-bold text-slate-700">{Number(item.amount).toLocaleString()}</td>
                                              <td className="p-3 text-right font-bold text-blue-600 text-xs">{potentialReward.toLocaleString()}</td>
                                              <td className="p-3 text-center">
                                                  {item.status === 'WIN' ? (
                                                      <span className="text-green-600 text-xs font-bold">WIN</span>
                                                  ) : item.status === 'LOSE' ? (
                                                      <span className="text-gray-300">-</span>
                                                  ) : (
                                                      <span className="text-orange-400 text-xs">รอ</span>
                                                  )}
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  <div className="p-4 border-t bg-gray-50 safe-pb">
                      {selectedTicket.status === 'PENDING' ? (
                          <button 
                              onClick={() => handleCancel(selectedTicket.id)}
                              className="w-full py-3 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
                          >
                              ยกเลิกโพย / คืนเงิน
                          </button>
                      ) : (
                          <div className="text-center text-xs text-gray-400">จบการทำงานแล้ว</div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}