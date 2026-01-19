import { useEffect, useState, useCallback, useMemo } from 'react';
import client from '../../api/client';
import { 
  Ticket, Eye, Ban, RefreshCcw, X, 
  ChevronLeft, ChevronRight, FileText,
  User, Calendar, Loader2
} from 'lucide-react';
import { calculateWinAmount, calculateNet, getStatusBadge } from '../../utils/lottoHelpers';

export default function ShopHistory() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [lottos, setLottos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  // Filters & Pagination (ไม่มี Search)
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const limit = 50; 

  // Load Master Data
  useEffect(() => {
      const fetchMasterData = async () => {
          try {
              const [resLottos, resCats] = await Promise.all([
                  client.get('/play/lottos'),
                  client.get('/play/categories')
              ]);
              setLottos(resLottos.data);
              setCategories(resCats.data);
          } catch (err) {
              console.error(err);
          }
      };
      fetchMasterData();
  }, []);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await client.get(`/play/shop_history?skip=${(page-1)*limit}&limit=${limit}`);
      let data = res.data;
      if (statusFilter !== 'ALL') {
          data = data.filter((t:any) => t.status === statusFilter);
      }
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const handleCancelTicket = async (ticketId: string) => {
    if(!confirm('⚠️ ยืนยันการยกเลิกโพยนี้?\nเงินจะถูกคืนเข้ากระเป๋าลูกค้าทันที')) return;
    try {
        await client.patch(`/play/tickets/${ticketId}/cancel`);
        alert('ยกเลิกโพยเรียบร้อย');
        fetchTickets();
        setSelectedTicket(null);
    } catch (err: any) {
        alert(`Error: ${err.response?.data?.detail}`);
    }
  };

  // Logic จัดกลุ่ม
  const groupedTickets = useMemo(() => {
      if (tickets.length === 0) return [];
      const catMap = new Map();
      categories.forEach(c => catMap.set(c.id, c));
      const lottoCatMap = new Map();
      lottos.forEach(l => lottoCatMap.set(l.id, l.category));

      const groups: any = {};
      const noCatKey = 'uncategorized';

      tickets.forEach(ticket => {
          const catId = lottoCatMap.get(ticket.lotto_type_id) || noCatKey;
          if (!groups[catId]) {
              groups[catId] = {
                  info: catMap.get(catId) || { label: 'หมวดอื่นๆ', color: 'bg-gray-800 text-white' },
                  items: []
              };
          }
          groups[catId].items.push(ticket);
      });

      return Object.entries(groups).sort((a, b) => {
          if (a[0] === noCatKey) return 1;
          if (b[0] === noCatKey) return -1;
          return 0;
      }).map(([, val]) => val);

  }, [tickets, lottos, categories]);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-8 animate-fade-in bg-slate-50 min-h-screen font-sans">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Ticket className="text-blue-600" /> รายการโพยลูกค้า (Admin)
                </h1>
                <p className="text-sm text-slate-500">ตรวจสอบและจัดการบิลเดิมพันทั้งหมดในร้าน</p>
            </div>
            
            <button onClick={fetchTickets} className="p-2.5 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200 self-end md:self-auto">
                <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            {['ALL', 'PENDING', 'WIN', 'LOSE', 'CANCELLED'].map(s => (
                <button 
                    key={s} 
                    onClick={() => { setStatusFilter(s); setPage(1); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${
                        statusFilter === s 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                >
                    {s === 'ALL' ? 'ทั้งหมด' : s}
                </button>
            ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-8">
        {isLoading && tickets.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
                <Loader2 className="animate-spin mb-2 mx-auto" size={32} />
                <p>กำลังโหลดข้อมูล...</p>
            </div>
        ) : groupedTickets.length === 0 ? (
            <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <FileText size={48} className="mb-2 opacity-20 mx-auto" />
                <p>ไม่พบรายการโพย</p>
            </div>
        ) : (
            /* วนลูปแสดงกลุ่มหมวดหมู่ */
            groupedTickets.map((group: any, index: number) => (
                <div key={index} className="animate-slide-up">
                    
                    {/* Header หมวดหมู่ */}
                    <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span className={`w-1.5 h-6 rounded-full ${group.info.color.split(' ')[0].replace('text', 'bg').replace('100', '500')}`}></span>
                        {group.info.label} 
                        <span className="text-xs font-normal text-slate-400 ml-2 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                            {group.items.length} รายการ
                        </span>
                    </h2>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
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
                                <tbody className="divide-y divide-slate-100">
                                    {group.items.map((t: any) => {
                                        const winAmount = calculateWinAmount(t);
                                        const net = calculateNet(t);
                                        const isWin = t.status === 'WIN';
                                        const isCancelled = t.status === 'CANCELLED';

                                        return (
                                            <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-slate-400"/>
                                                        <div>
                                                            <div className="font-bold text-slate-700">{new Date(t.created_at).toLocaleDateString('th-TH')}</div>
                                                            <div className="text-[10px] text-slate-400">{new Date(t.created_at).toLocaleTimeString('th-TH')}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                            <User size={14}/>
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-blue-600 text-sm">{t.user?.username || 'Unknown'}</div>
                                                            <div className="text-[10px] text-slate-400">ID: {t.id.slice(0,6)}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-bold text-slate-700">{t.lotto_type?.name}</td>
                                                <td className="p-4 text-right font-mono font-bold text-slate-700">{Number(t.total_amount).toLocaleString()}</td>
                                                <td className="p-4 text-right">
                                                    {isWin ? (
                                                        <span className="text-green-600 font-bold font-mono">+{winAmount.toLocaleString()}</span>
                                                    ) : getStatusBadge(t.status)}
                                                </td>
                                                <td className="p-4 text-right font-mono font-bold">
                                                    <span className={isCancelled ? 'text-gray-400' : net > 0 ? 'text-green-600' : 'text-red-500'}>
                                                        {isCancelled ? '0' : (net > 0 ? '+' : '') + net.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1 text-xs text-slate-500" title={t.note}>
                                                        <FileText size={12} className="shrink-0 opacity-50"/> 
                                                        <span className="truncate max-w-30">{t.note || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button 
                                                        onClick={() => setSelectedTicket(t)}
                                                        className="text-slate-400 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 p-2 rounded-lg transition-colors shadow-sm"
                                                        title="ดูรายละเอียด"
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

      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-4 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="p-2 bg-white rounded-lg border hover:bg-slate-50 disabled:opacity-50 shadow-sm"><ChevronLeft size={20}/></button>
          <span className="text-sm font-bold text-slate-600 bg-white px-4 py-2 rounded-lg border shadow-sm">หน้า {page}</span>
          <button onClick={() => setPage(p => p+1)} disabled={tickets.length < limit} className="p-2 bg-white rounded-lg border hover:bg-slate-50 disabled:opacity-50 shadow-sm"><ChevronRight size={20}/></button>
      </div>

      {/* Modal Detail (Admin Version - Full Columns) */}
      {selectedTicket && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">รายละเอียดโพย</h3>
                        <div className="text-xs text-slate-500">#{selectedTicket.id}</div>
                      </div>
                      <button onClick={() => setSelectedTicket(null)} className="bg-white p-1.5 rounded-full border hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                  </div>
                  
                  <div className="p-5 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4 shadow-sm text-center">
                            <div className="text-lg font-black text-slate-800 mb-1">{selectedTicket.lotto_type?.name}</div>
                            <div className="text-xs text-slate-400 mb-2">{new Date(selectedTicket.created_at).toLocaleString('th-TH')}</div>
                            <div className="inline-block bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                                ลูกค้า: {selectedTicket.user?.username}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-200 text-xs uppercase">
                                    <tr>
                                        <th className="p-3 text-left">เลข</th>
                                        <th className="p-3 text-left">ประเภท</th>
                                        <th className="p-3 text-right">เรท</th>
                                        <th className="p-3 text-right">ราคา</th>
                                        <th className="p-3 text-right">รวม</th>
                                        <th className="p-3 text-center">ผล</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedTicket.items?.map((item:any, idx:number) => {
                                        const potentialReward = Number(item.amount) * Number(item.reward_rate);
                                        return (
                                            <tr key={idx} className={item.status === 'WIN' ? 'bg-green-50/50' : ''}>
                                                <td className="p-3 font-mono font-bold text-slate-700 text-lg">{item.number}</td>
                                                <td className="p-3 text-slate-500 text-xs">{item.bet_type}</td>
                                                <td className="p-3 text-right text-gray-500 text-xs">{Number(item.reward_rate).toLocaleString()}</td>
                                                <td className="p-3 text-right font-bold text-slate-700">{Number(item.amount).toLocaleString()}</td>
                                                <td className="p-3 text-right font-bold text-blue-600 text-xs">{potentialReward.toLocaleString()}</td>
                                                <td className="p-3 text-center">
                                                    {item.status === 'WIN' ? <span className="text-green-600 font-bold text-xs">WIN</span> : 
                                                     item.status === 'LOSE' ? <span className="text-slate-300">-</span> : 
                                                     <span className="text-orange-400 text-xs">รอ</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                  </div>

                  <div className="p-4 border-t bg-white safe-pb shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                      <div className="flex justify-between items-center mb-4 px-2">
                          <span className="text-sm font-bold text-slate-500">ยอดรวม</span>
                          <span className="text-xl font-black text-slate-800">{Number(selectedTicket.total_amount).toLocaleString()} ฿</span>
                      </div>
                      
                      {selectedTicket.status === 'PENDING' && (
                          <button 
                            onClick={() => handleCancelTicket(selectedTicket.id)} 
                            className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 hover:bg-red-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                          >
                              <Ban size={18}/> ยกเลิกบิล / คืนเงิน
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}