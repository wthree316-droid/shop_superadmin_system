import { useEffect, useState, useCallback, useMemo } from 'react';
import client from '../../api/client';
import { 
  Ticket, Eye, Ban, RefreshCcw, X, 
  Loader2, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import { calculateWinAmount, calculateNet } from '../../utils/lottoHelpers';

export default function ShopHistory() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [lottos, setLottos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  // ✅ เพิ่ม Date State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const limit = 50; 

  useEffect(() => {
      const fetchMasterData = async () => {
          try {
              const [resLottos, resCats] = await Promise.all([
                  client.get('/play/lottos'),
                  client.get('/play/categories')
              ]);
              setLottos(resLottos.data);
              setCategories(resCats.data);
          } catch (err) { console.error(err); }
      };
      fetchMasterData();
  }, []);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      // ✅ ส่ง date
      const res = await client.get(`/play/shop_history?skip=${(page-1)*limit}&limit=${limit}&date=${selectedDate}`);
      let data = res.data;
      if (statusFilter !== 'ALL') {
          data = data.filter((t:any) => t.status === statusFilter);
      }
      setTickets(data);
    } catch (err) { console.error(err); } 
    finally { setIsLoading(false); }
  }, [page, statusFilter, selectedDate]); // ✅ เพิ่ม selectedDate ใน dependency

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
    } catch (err: any) { alert(`Error: ${err.response?.data?.detail}`); }
  };

  const renderWinStatus = (ticket: any) => {
      if (ticket.status === 'PENDING') return <span className="text-red-500 font-bold">รอผล</span>;
      if (ticket.status === 'CANCELLED') return <span className="text-gray-400">ยกเลิก</span>;
      if (ticket.status === 'LOSE') return <span className="text-red-500 font-bold">ไม่ถูกรางวัล</span>;
      return <span className="text-green-600 font-bold">{Number(calculateWinAmount(ticket)).toLocaleString()}</span>;
  };

  const renderNetProfit = (ticket: any) => {
      if (ticket.status === 'PENDING' || ticket.status === 'CANCELLED') return <span className="text-gray-400">-</span>;
      const net = calculateNet(ticket);
      const isProfit = net >= 0;
      return <span className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>{isProfit ? '+' : ''}{Number(net).toLocaleString()}</span>;
  };

  const groupedTickets = useMemo(() => {
      if (tickets.length === 0) return [];
      const catMap = new Map();
      categories.forEach(c => catMap.set(c.id, c));
      const lottoMap = new Map();
      lottos.forEach(l => {
          const cat = catMap.get(l.category);
          lottoMap.set(l.id, { name: l.name, color: cat?.color || 'bg-gray-100 text-gray-800' });
      });

      const groups: any = {};
      tickets.forEach(ticket => {
          const key = ticket.lotto_type_id;
          if (!groups[key]) {
              groups[key] = { info: lottoMap.get(key) || { name: 'Unknown', color: '' }, items: [] };
          }
          groups[key].items.push(ticket);
      });
      return Object.values(groups).sort((a: any, b: any) => a.info.name.localeCompare(b.info.name, 'th'));
  }, [tickets, lottos, categories]);

  const handlePrevPage = () => setPage(prev => Math.max(1, prev - 1));
  const handleNextPage = () => setPage(prev => prev + 1);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-8 animate-fade-in bg-slate-50 min-h-screen font-sans">
      
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2"><Ticket className="text-blue-600" /> โพยลูกค้า (Admin)</h1>
            
            <div className="flex items-center gap-2">
                {/* ✅ Date Picker */}
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
                      className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                    />
                </div>
                <button onClick={fetchTickets} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"><RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} /></button>
            </div>
        </div>
        
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            {['ALL', 'PENDING', 'WIN', 'LOSE', 'CANCELLED'].map(s => (
                <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${statusFilter === s ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}>
                    {s === 'ALL' ? 'ทั้งหมด' : s}
                </button>
            ))}
        </div>
      </div>

      <div className="space-y-8">
        {isLoading && tickets.length === 0 ? <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto"/></div> : 
         groupedTickets.length === 0 ? <div className="py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">ไม่พบรายการในวันที่เลือก</div> : 
         groupedTickets.map((group: any, index: number) => (
            <div key={index} className="animate-slide-up">
                <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className={`w-1.5 h-6 rounded-full ${group.info.color.split(' ')[0].replace('text', 'bg').replace('100', '500')}`}></span>
                    {group.info.name} <span className="text-xs font-normal text-slate-400 ml-2 bg-white px-2 py-0.5 rounded-full border">{group.items.length} รายการ</span>
                </h2>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">1. เวลา</th>
                                    <th className="p-4">2. ชนิดหวย</th>
                                    <th className="p-4">3. งวดวันที่</th>
                                    <th className="p-4 text-right">4. ยอดแทง</th>
                                    <th className="p-4 text-right">5. ถูกรางวัล</th>
                                    <th className="p-4 text-right">6. กำไร/ขาดทุน</th>
                                    <th className="p-4">7. หมายเหตุ</th>
                                    <th className="p-4 text-center">8. รายละเอียด</th>
                                    <th className="p-4">9. ผู้ลงบิล</th>
                                    <th className="p-4 text-center">10. ยกเลิก</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {group.items.map((t: any) => (
                                    <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-4 font-bold text-slate-700">
                                            {new Date(t.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit' })}
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">{t.lotto_type?.name}</td>
                                        <td className="p-4 font-mono">{new Date(t.created_at).toLocaleDateString('th-TH', {day:'2-digit', month:'2-digit', year:'numeric'})}</td>
                                        <td className="p-4 text-right font-bold text-slate-700">{Number(t.total_amount).toLocaleString()}</td>
                                        <td className="p-4 text-right">{renderWinStatus(t)}</td>
                                        <td className="p-4 text-right">{renderNetProfit(t)}</td>
                                        <td className="p-4 text-xs text-gray-500">{t.note || '-'}</td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => setSelectedTicket(t)} className="text-slate-400 hover:text-blue-600"><Eye size={16} /></button>
                                        </td>
                                        <td className="p-4 text-xs font-bold text-blue-600">{t.user?.username}</td>
                                        <td className="p-4 text-center">
                                            {t.status === 'PENDING' && <button onClick={() => handleCancelTicket(t.id)} className="text-red-400 hover:text-red-600"><Ban size={16} /></button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        ))}
      </div>

      <div className="flex justify-center items-center gap-4 mt-8">
          <button 
            onClick={handlePrevPage} 
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={18} /> ก่อนหน้า
          </button>
          <span className="text-sm font-bold text-slate-600">หน้า {page}</span>
          <button 
            onClick={handleNextPage}
            disabled={tickets.length < limit}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            ถัดไป <ChevronRight size={18} />
          </button>
      </div>

      {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                  
                  {/* Header */}
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800">รายละเอียดบิล</h3>
                          <div className="text-xs text-slate-500">#{selectedTicket.id.substring(0, 8)}...</div>
                      </div>
                      <button onClick={() => setSelectedTicket(null)} className="p-1 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                  </div>

                  {/* Body */}
                  <div className="p-4 overflow-y-auto bg-white flex-1 custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 font-bold text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="p-3 rounded-l-lg text-left">เลข</th>
                                    <th className="p-3 text-left">ประเภท</th>
                                    <th className="p-3 text-right">ราคา</th>
                                    <th className="p-3 text-right rounded-r-lg">ผล</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {selectedTicket.items?.map((item: any, i: number) => {
                                    // ฟังก์ชันแปลภาษา (Inline translation)
                                    const translateType = (type: string) => {
                                        const map: Record<string, string> = {
                                            '2up': '2ตัวบน', '2down': '2ตัวล่าง',
                                            '3top': '3ตัวตรง', '3tod': '3ตัวโต๊ด',
                                            'run_up': 'วิ่งบน', 'run_down': 'วิ่งล่าง'
                                        };
                                        return map[type] || type;
                                    };

                                    return (
                                        <tr key={i} className={item.status === 'WIN' ? 'bg-green-50' : ''}>
                                            <td className="p-3 font-bold text-slate-700">{item.number}</td>
                                            <td className="p-3 text-xs text-slate-500">{translateType(item.bet_type)}</td>
                                            <td className="p-3 text-right font-mono">{Number(item.amount).toLocaleString()}</td>
                                            <td className="p-3 text-right">
                                                {item.status === 'WIN' ? <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded-full">WIN</span> : 
                                                 item.status === 'LOSE' ? <span className="text-red-400 text-xs">ไม่ถูก</span> : 
                                                 <span className="text-orange-400 text-xs font-medium">รอผล</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                  </div>

                  {/* Footer & Summary */}
                  <div className="p-4 border-t bg-gray-50 space-y-3">
                      
                      {/* ส่วนสรุปยอดเงิน */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">ยอดซื้อรวม:</span>
                              <span className="font-bold text-slate-800">{Number(selectedTicket.total_amount).toLocaleString()} บาท</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-t border-dashed pt-2">
                              <span className="text-slate-500">ผลรางวัลรวม:</span>
                              {(() => {
                                  // คำนวณยอดถูกรางวัล
                                  const winAmount = calculateWinAmount(selectedTicket);
                                  return winAmount > 0 ? (
                                      <span className="font-bold text-green-600">+{Number(winAmount).toLocaleString()} บาท</span>
                                  ) : selectedTicket.status === 'PENDING' ? (
                                      <span className="font-bold text-orange-400">รอผลรางวัล</span>
                                  ) : (
                                      <span className="font-bold text-red-500">ไม่ถูกรางวัล</span>
                                  );
                              })()}
                          </div>
                      </div>

                      {/* ปุ่มยกเลิก */}
                      {selectedTicket.status === 'PENDING' && (
                          <button 
                           
                            onClick={() => typeof handleCancelTicket === 'function' ? handleCancelTicket(selectedTicket.id) : (window as any).handleCancelTicket?.(selectedTicket.id)} 
                            className="w-full py-3 bg-white text-red-600 font-bold rounded-xl border-2 border-red-100 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                          >
                              ยกเลิกบิลคืนเงิน
                          </button>
                      )}
                  </div>

              </div>
          </div>
      )}
    </div>
  );
}