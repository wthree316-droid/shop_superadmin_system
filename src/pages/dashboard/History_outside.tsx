import { useEffect, useState, useRef, useCallback } from 'react';
import client from '../../api/client';
import { 
  X, RefreshCw, Receipt, Eye, Ban,
  Loader2, ArrowDown, ArrowRight // ✅ เพิ่มไอคอน
} from 'lucide-react';
import { calculateWinAmount, calculateNet } from '../../utils/lottoHelpers';
import { alertAction, confirmAction } from '../../utils/toastUtils';

export default function HistoryOutside() {
  // --- Data States ---
  const [tickets, setTickets] = useState<any[]>([]);     
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // --- Filter States (✅ 1. เปลี่ยนเป็นช่วงเวลา) ---
  const getToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'PENDING', 'WIN', 'LOSE', 'CANCELLED' 

  // --- Infinite Scroll States (✅ 2. Logic เลื่อนดูเรื่อยๆ) ---
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [itemsPerPage] = useState(100); // โหลดทีละ 20 รายการ

  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // --- Observer for Infinite Scroll ---
  const observer = useRef<IntersectionObserver | null>(null);
  const lastTicketRef = useCallback((node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && hasMore) {
              setCurrentPage(prev => prev + 1);
          }
      });
      if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // --- Reset & Reload Conditions ---
  useEffect(() => {
    // เมื่อเปลี่ยนวันที่ หรือ สถานะ ให้ล้างข้อมูลและเริ่มโหลดหน้า 1 ใหม่
    setTickets([]);
    setCurrentPage(1);
    setHasMore(true);
    setInitialLoad(true);
    fetchHistory(1, true);
  }, [startDate, endDate, filterStatus]);

  // --- Load More Effect ---
  useEffect(() => {
    if (currentPage > 1) {
        fetchHistory(currentPage, false);
    }
  }, [currentPage]);

  const fetchHistory = async (page: number, isNewFilter: boolean) => {
    setLoading(true);
    try {
      // ✅ 1. คำนวณ skip
      const skip = (page - 1) * itemsPerPage;

      // ✅ 2. เปลี่ยน page เป็น skip
      let url = `/play/history?start_date=${startDate}&end_date=${endDate}&skip=${skip}&limit=${itemsPerPage}`;
      
      if (filterStatus !== 'ALL') {
          url += `&status=${filterStatus}`; 
      }

      const res = await client.get(url);
      
      let newData = [];
      if (Array.isArray(res.data)) {
          newData = res.data;
      } else {
          newData = res.data.items || [];
      }

      setTickets(prev => {
          if (isNewFilter) return newData;
          
          // ✅ 3. กรองข้อมูลซ้ำ
          const existingIds = new Set(prev.map(t => t.id));
          const uniqueNewData = newData.filter((t: any) => !existingIds.has(t.id));
          
          return [...prev, ...uniqueNewData];
      });

      // เช็คว่าหมดหรือยัง
      setHasMore(newData.length === itemsPerPage);

    } catch (err) {
      console.error(err);
      if (isNewFilter) setTickets([]);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const handleCancel = async (ticketId: string) => {
    confirmAction('ยืนยันยกเลิกโพยนี้? เงินจะคืนเข้าเครดิตทันที', async () => {
        try {
          await client.patch(`/play/tickets/${ticketId}/cancel`);
          alertAction('ยกเลิกสำเร็จ! คืนเงินเรียบร้อย', 'สำเร็จ', 'success');
          
          // อัปเดตสถานะในรายการทันที
          setTickets(prev => prev.map(t => 
              t.id === ticketId ? { ...t, status: 'CANCELLED' } : t
          ));
          
          setSelectedTicket(null);
        } catch (err: any) {
          alertAction(`ยกเลิกไม่ได้: ${err.response?.data?.detail}`, 'ข้อผิดพลาด', 'error');
        }
    }, 'ยกเลิกโพย', 'ปิด');
  };

  const renderWinStatus = (ticket: any) => {
      if (ticket.status === 'PENDING') return <span className="text-orange-500 font-bold animate-pulse">รอผล</span>;
      if (ticket.status === 'CANCELLED') return <span className="text-gray-400">ยกเลิก</span>;
      if (ticket.status === 'LOSE') return <span className="text-red-500 font-bold">ไม่ถูกรางวัล</span>;
      const winAmount = calculateWinAmount(ticket);
      return <span className="text-green-600 font-bold">{Number(winAmount).toLocaleString()}</span>;
  };

  const renderNetProfit = (ticket: any) => {
      if (ticket.status === 'PENDING' || ticket.status === 'CANCELLED') return <span className="text-gray-400">-</span>;
      const net = calculateNet(ticket);
      const isProfit = net >= 0;
      return <span className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>{isProfit ? '+' : ''}{Number(net).toLocaleString()}</span>;
  };

  return (
    <div className="animate-fade-in pb-20 bg-gray-50 min-h-screen flex flex-col font-sans">
      
      {/* Header & Filter */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20 border-b border-gray-200">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 max-w-7xl mx-auto mb-4">
              <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Receipt className="text-blue-600" /> ประวัติการแทง (รวม)
              </h1>
              
              {/* ✅ Date Range Input */}
              <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                      <div className="relative">
                          <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="pl-3 pr-1 py-1.5 bg-transparent text-sm font-bold text-slate-700 outline-none w-28 sm:w-32"
                          />
                      </div>
                      <span className="text-slate-400"><ArrowRight size={16}/></span>
                      <div className="relative">
                          <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            className="pl-3 pr-1 py-1.5 bg-transparent text-sm font-bold text-slate-700 outline-none w-28 sm:w-32"
                          />
                      </div>
                  </div>
                  
                  <button 
                    onClick={() => { setTickets([]); fetchHistory(1, true); }} 
                    className={`p-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 border border-slate-100 ${loading ? 'animate-spin' : ''}`}
                  >
                      <RefreshCw size={20} />
                  </button>
              </div>
          </div>
          
          {/* Status Filter Tabs */}
          <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { label: 'ทั้งหมด', value: 'ALL' },
              { label: 'รอผล', value: 'PENDING' },
              { label: 'ถูกรางวัล', value: 'WIN' },
              { label: 'ไม่ถูก', value: 'LOSE' },
              { label: 'ยกเลิก', value: 'CANCELLED' }
            ].map(f => (
                <button key={f.value} onClick={() => setFilterStatus(f.value)} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${filterStatus === f.value ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                    {f.label}
                </button>
            ))}
          </div>
      </div>

      {/* Content Table */}
      <div className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full space-y-6">
          {initialLoad && loading ? (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin" /> กำลังโหลด...
              </div> 
          ) : tickets.length === 0 ? (
              <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">ไม่พบรายการในช่วงเวลานี้</div> 
          ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4 text-center">1. เวลา</th>
                                <th className="p-4 text-center">2. ชนิดหวย</th>
                                <th className="p-4 text-center">3. งวดวันที่</th>
                                <th className="p-4 text-center">4. ยอดแทง</th>
                                <th className="p-4 text-center">5. ถูกรางวัล</th>
                                <th className="p-4 text-center">6. กำไร/ขาดทุน</th>
                                <th className="p-4 text-center">7. หมายเหตุ</th>
                                <th className="p-4 text-center">8. รายละเอียด</th>
                                <th className="p-4 text-center">9. ยกเลิก</th>
                                <th className="p-4 text-center">10. ผู้ลงบิล</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tickets.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-center font-bold text-slate-700">
                                        {new Date(t.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit' })}
                                    </td>
                                    <td className="p-4 text-center font-bold text-blue-600">{t.lotto_type?.name}</td>
                                    <td className="p-4 text-center font-mono">{new Date(t.created_at).toLocaleDateString('th-TH', {day:'2-digit', month:'2-digit', year:'numeric'})}</td>
                                    <td className="p-4 text-center font-bold text-slate-700">{Number(t.total_amount).toLocaleString()}</td>
                                    <td className="p-4 text-center">{renderWinStatus(t)}</td>
                                    <td className="p-4 text-center">{renderNetProfit(t)}</td>
                                    <td className="p-4 text-center text-xs text-gray-500">{t.note || '-'}</td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => setSelectedTicket(t)} className="text-slate-400 hover:text-blue-600"><Eye size={18} /></button>
                                    </td>
                                    <td className="p-4 text-center">
                                        {t.status === 'PENDING' && (
                                            <button onClick={() => handleCancel(t.id)} className="text-red-400 hover:text-red-600"><Ban size={16} /></button>
                                        )}
                                    </td>
                                    <td className="p-4 text-xs text-slate-600 text-center">
                                        <div className="font-bold bg-slate-100 px-2 py-0.5 rounded-full inline-block border border-slate-200">
                                            {t.user?.username}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
          )}

          {/* ✅ Infinite Scroll Sentinel */}
          {hasMore && !initialLoad && (
              <div ref={lastTicketRef} className="py-8 flex justify-center text-slate-400 text-sm animate-pulse">
                  {loading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16}/> กำลังโหลดเพิ่ม...</span> : <span className="flex items-center gap-2"><ArrowDown size={16}/> เลื่อนลงเพื่อโหลดต่อ</span>}
              </div>
          )}
          
          {!hasMore && tickets.length > 0 && (
              <div className="py-8 text-center text-slate-300 text-xs">
                  --- สิ้นสุดรายการ ---
              </div>
          )}
      </div>

      {/* Modal Detail */}
      {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800">รายละเอียดบิล</h3>
                          <div className="text-xs text-slate-500">#{selectedTicket.id.substring(0, 8)}...</div>
                      </div>
                      <button onClick={() => setSelectedTicket(null)} className="p-1 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="p-4 overflow-y-auto bg-white flex-1 custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 font-bold text-xs uppercase text-slate-500">
                                <tr>
                                      <th className="p-3 text-left">เลข</th>
                                      <th className="p-3 text-left">ประเภท</th>
                                      <th className="p-3 text-right">เรท</th>
                                      <th className="p-3 text-right">ราคา</th>
                                      <th className="p-3 text-right">รวม</th>
                                      <th className="p-3 text-center">ผล</th>
                                  </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {selectedTicket.items?.map((item: any, i: number) => {
                                    // ✅ 1. เช็คว่าเป็นเลขปิดหรือไม่ (เรท 0)
                                    const isClosed = Number(item.reward_rate) === 0;
                                    
                                    const potentialReward = Number(item.amount) * Number(item.reward_rate);
                                    const translateType = (type: string) => {
                                        const map: Record<string, string> = {
                                            '2up': '2ตัวบน', '2down': '2ตัวล่าง',
                                            '3top': '3ตัวตรง', '3tod': '3ตัวโต๊ด',
                                            'run_up': 'วิ่งบน', 'run_down': 'วิ่งล่าง'
                                        };
                                        return map[type] || type;
                                    };
                                    return (
                                        // ✅ 2. ถ้าปิด ให้พื้นหลังเป็นสีแดงอ่อนๆ
                                        <tr key={i} className={isClosed ? 'bg-red-50/50' : (item.status === 'WIN' ? 'bg-green-50' : '')}>
                                            <td className="p-3 font-bold text-slate-700">
                                                {/* ✅ 3. ถ้าปิด ให้ขีดฆ่าเลข */}
                                                <span className={isClosed ? 'line-through text-red-400' : ''}>{item.number}</span>
                                            </td>
                                            <td className="p-3 text-xs text-slate-500">{translateType(item.bet_type)}</td>
                                            
                                            {/* ✅ 4. จัดการแสดงผล เรท/ราคา/ผล */}
                                            {isClosed ? (
                                                <>
                                                    <td colSpan={3} className="p-3 text-center">
                                                        <span className="text-[10px] font-bold text-red-500 border border-red-200 bg-white px-2 py-1 rounded-lg">
                                                            ปิดรับ (คืนทุน)
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <span className="text-slate-400 text-xs">-</span>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="p-3 text-right text-gray-500 text-xs">{Number(item.reward_rate).toLocaleString()}</td>
                                                    <td className="p-3 text-right font-mono">{Number(item.amount).toLocaleString()}</td>
                                                    <td className="p-3 text-right font-bold text-blue-600 text-xs">{potentialReward.toLocaleString()}</td>
                                                    <td className="p-3 text-right">
                                                        {item.status === 'WIN' ? <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded-full">ถูกรางวัล</span> : 
                                                        item.status === 'LOSE' ? <span className="text-red-400 text-xs">ไม่ถูก</span> : 
                                                        <span className="text-orange-400 text-xs font-medium">รอผล</span>}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                  </div>
                  <div className="p-4 border-t bg-gray-50 space-y-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">ยอดซื้อรวม:</span>
                              <span className="font-bold text-slate-800">{Number(selectedTicket.total_amount).toLocaleString()} บาท</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-t border-dashed pt-2">
                              <span className="text-slate-500">ผลรางวัลรวม:</span>
                              {(() => {
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
                      {selectedTicket.status === 'PENDING' && (
                          <button 
                            onClick={() => handleCancel(selectedTicket.id)} 
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