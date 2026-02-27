import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import client from '../../api/client';
import { 
    User, Filter, 
    X, Eye, Ban, RefreshCw, Loader2,
    Banknote, TrendingUp, FileText, ArrowDown, ArrowRight, RotateCcw
} from 'lucide-react';
import { calculateWinAmount, calculateNet } from '../../utils/lottoHelpers'; 
import { useAuth } from '../../contexts/AuthContext'; 
import { alertAction, confirmAction } from '../../utils/toastUtils';
import QuickDateFilters from '../../components/common/QuickDateFilters';

export default function ShopHistory() {
  const { user } = useAuth(); 

  // --- Data States ---
  const [tickets, setTickets] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // --- Filter States ---
  const getToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  
  const [selectedUser, setSelectedUser] = useState<string>(''); 
  const [filterStatus, setFilterStatus] = useState('ALL'); 

  // --- Infinite Scroll States ---
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [itemsPerPage] = useState(100); 
  
  // --- Modal State ---
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

  // --- Initial Load ---
  useEffect(() => {
    if (user?.role !== 'member') {
        fetchMembers();
    }
  }, [user]);

  // --- Reset & Reload Conditions ---
  useEffect(() => {
    setTickets([]);
    setCurrentPage(1);
    setHasMore(true);
    setInitialLoad(true);
    fetchHistory(1, true);
  }, [startDate, endDate, selectedUser]); 

  // --- Load More Effect ---
  useEffect(() => {
    if (currentPage > 1) {
        fetchHistory(currentPage, false);
    }
  }, [currentPage]);

  // --- API Functions ---
  const fetchMembers = async () => {
      try {
          const res = await client.get('/users/members');
          setMembers(res.data);
      } catch(err) { console.error("Load members fail", err); }
  };

  const fetchHistory = async (page: number, isNewFilter: boolean) => {
    setLoading(true);
    try {
      // ✅ 1. คำนวณ skip จาก page
      // สูตร: skip = (หน้าปัจจุบัน - 1) * จำนวนต่อหน้า
      // ตัวอย่าง: หน้า 1 (skip 0), หน้า 2 (skip 20), หน้า 3 (skip 40)
      const skip = (page - 1) * itemsPerPage;

      // ✅ 2. เปลี่ยน parameter ใน URL จาก page เป็น skip
      let url = `/play/shop_history?start_date=${startDate}&end_date=${endDate}&skip=${skip}&limit=${itemsPerPage}`;
      
      if (selectedUser) url += `&user_id=${selectedUser}`;
      
      const res = await client.get(url);
      const newData = Array.isArray(res.data) ? res.data : (res.data.items || []);
      
      setTickets(prev => {
          if (isNewFilter) return newData;
          
          // กรองข้อมูลที่ ID ซ้ำออก (Logic เดิมที่ดีอยู่แล้ว)
          const existingIds = new Set(prev.map(t => t.id));
          const uniqueNewData = newData.filter((t: any) => !existingIds.has(t.id));
          
          return [...prev, ...uniqueNewData];
      });
      
      // ถ้าข้อมูลที่ได้มา น้อยกว่า limit แสดงว่าหมดแล้ว
      setHasMore(newData.length === itemsPerPage);

    } catch (err) { 
        console.error(err); 
    } finally { 
        setLoading(false); 
        setInitialLoad(false);
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
      confirmAction("ยืนยันการยกเลิกบิลนี้? เงินจะถูกคืนให้ลูกค้าทันที", async () => {
          try {
              await client.patch(`/play/tickets/${ticketId}/cancel`);
              alertAction("ยกเลิกสำเร็จ", "สำเร็จ", "success");
              setTickets(prev => prev.map(t => 
                  t.id === ticketId ? { ...t, status: 'CANCELLED' } : t
              ));
              setSelectedTicket(null);
          } catch(err: any) {
              alertAction(`Error: ${err.response?.data?.detail}`, "ข้อผิดพลาด", "error");
          }
      }, "ยกเลิกบิล", "ปิด");
  };

  // --- Helper Renders ---
  const renderWinStatus = (ticket: any) => {
    if (ticket.status === 'PENDING') return <span className="text-orange-500 font-bold animate-pulse">รอผล</span>;
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

  // --- Grouping Logic ---
  const groupedLottos = useMemo(() => {
      if (tickets.length === 0) return [];

      let filtered = tickets;
      if (filterStatus !== 'ALL') {
          filtered = tickets.filter(t => t.status === filterStatus);
      }

      const groups: Record<string, any> = {};

      filtered.forEach(ticket => {
          const lottoId = ticket.lotto_type_id;
          const lottoName = ticket.lotto_type?.name || 'Unknown Lotto';

          if (!groups[lottoId]) {
              groups[lottoId] = {
                  id: lottoId,
                  name: lottoName,
                  close_time: ticket.lotto_type?.close_time || '23:59',
                  items: []
              };
          }
          groups[lottoId].items.push(ticket);
      });

      return Object.values(groups).map((group: any) => {
          let totalBet = 0;
          let totalWin = 0;
          let validCount = 0;
          let totalCancelled = 0; 
          let totalCommission = 0;

          group.items.forEach((t: any) => {
              if (t.status === 'CANCELLED') {
                  totalCancelled += Number(t.total_amount);
              } else {
                  totalBet += Number(t.total_amount);
                  totalCommission += Number(t.commission_amount || 0);
                  if (t.status === 'WIN') {
                      totalWin += calculateWinAmount(t);
                  }
                  validCount++;
              }
          });

          const profit = totalBet - totalWin - totalCommission;

          return {
              ...group,
              summary: {
                  count: group.items.length,
                  validCount,
                  totalBet,
                  totalWin,
                  profit,
                  totalCancelled,
                  totalCommission
              }
          };
      }).sort((a: any, b: any) => {
          // Sort Logic Same as History.tsx
          const getTimeScore = (timeStr: string | null) => {
              if (!timeStr) return -1;
              const [h, m] = timeStr.split(':').map(Number);
              if (h < 5) return (h + 24) * 60 + m; 
              return h * 60 + m;
          };

          const scoreA = getTimeScore(a.close_time);
          const scoreB = getTimeScore(b.close_time);
          
          // Descending Order (มากไปน้อย)
          return scoreB - scoreA;
      });
  }, [tickets, filterStatus]);

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      
      {/* --- Filter Section --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 top-0">
          
          {/* Top Row: Member Filter (Left) & Date Filters (Right) */}
          <div className="flex flex-col xl:flex-row justify-between items-start gap-4">
              
              {/* ⬅️ ซ้าย: กรองตามสมาชิก (Hidden for Member Role) */}
              <div className="w-full xl:w-72">
                  {user?.role !== 'member' && (
                      <div className="w-full">
                          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">กรองตามสมาชิก</label>
                          <div className="relative">
                              <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                              <select 
                                  value={selectedUser}
                                  onChange={e => setSelectedUser(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 appearance-none h-10.5"
                              >
                                  <option value="">-- ดูรายการทุกคน --</option>
                                  {members.map(m => (
                                      <option key={m.id} value={m.id}>
                                          {m.username} {m.full_name ? `(${m.full_name})` : ''}
                                      </option>
                                  ))}
                              </select>
                              <div className="absolute right-3 top-3 pointer-events-none">
                                  <Filter size={14} className="text-slate-400" />
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              {/* ➡️ ขวา: กล่องวันที่ + ปุ่มรีเฟรช + ปุ่มวันที่ด่วน */}
              <div className="flex flex-col items-end gap-2 w-full xl:w-auto">
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto">
                      
                      {/* กล่องเลือกวันที่ */}
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 w-full sm:w-auto h-10.5">
                          <div className="relative w-full sm:w-auto">
                              <input 
                                  type="date" 
                                  value={startDate} 
                                  onChange={e => setStartDate(e.target.value)} 
                                  className="w-full sm:w-auto pl-2 pr-1 bg-transparent text-sm font-bold text-slate-700 outline-none"
                              />
                          </div>
                          <span className="text-slate-400"><ArrowRight size={16}/></span>
                          <div className="relative w-full sm:w-auto">
                              <input 
                                  type="date" 
                                  value={endDate} 
                                  onChange={e => setEndDate(e.target.value)} 
                                  min={startDate} 
                                  className="w-full sm:w-auto pl-2 pr-1 bg-transparent text-sm font-bold text-slate-700 outline-none"
                              />
                          </div>
                      </div>

                      {/* ปุ่ม Refresh นำมาต่อท้ายกล่องวันที่ */}
                      <button 
                          onClick={() => { setTickets([]); fetchHistory(1, true); }} 
                          className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-600 w-full sm:w-auto flex justify-center items-center h-10.5"
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

          {/* Status Filters (ด้านล่าง) */}
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {['ALL', 'PENDING', 'WIN', 'LOSE', 'CANCELLED'].map(f => (
                <button key={f} onClick={() => setFilterStatus(f)} 
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${filterStatus === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                    {f === 'ALL' ? 'ทั้งหมด' : f === 'PENDING' ? 'รอผล' : f === 'WIN' ? 'ถูกรางวัล' : f === 'LOSE' ? 'ไม่ถูกรางวัล' : 'ยกเลิก'}
                </button>
            ))}
          </div>
      </div>

      {/* --- Ticket List (Grouped by Lotto) --- */}
      <div className="space-y-8">
          {initialLoad && loading ? (
              <div className="p-20 text-center bg-white rounded-xl border border-gray-100"><Loader2 className="animate-spin mx-auto text-blue-500 mb-2"/> กำลังโหลดข้อมูล...</div>
          ) : groupedLottos.length === 0 ? (
              <div className="p-20 text-center bg-white rounded-xl border border-dashed border-gray-200 text-slate-400">ไม่พบรายการโพยในช่วงเวลานี้</div>
          ) : (
              groupedLottos.map((group) => (
                  <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up">
                      
                      {/* Header แต่ละหวย */}
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                          <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                              <Banknote className="text-blue-600" size={20} /> {group.name}
                          </h3>
                          <span className="text-xs font-bold bg-white px-2 py-1 rounded-md border border-gray-200 text-slate-500">
                              {group.items.length} รายการ
                          </span>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left whitespace-nowrap">
                              <thead className="bg-white text-slate-500 font-bold border-b border-slate-100 text-xs">
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
                              <tbody className="divide-y divide-slate-50">
                                  {group.items.map((t: any) => {
                                      return (
                                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 text-center font-mono text-slate-500">
                                                    {new Date(t.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                                                </td>
                                                
                                                <td className="p-4 text-center text-blue-600 font-bold">{t.lotto_type?.name}</td>
                                                <td className="p-4 text-center font-mono">{new Date(t.created_at).toLocaleDateString('th-TH', {day:'2-digit', month:'2-digit', year:'numeric'})}</td>
                                                <td className="p-4 text-center font-mono font-bold">
                                                    {Number(t.total_amount).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {renderWinStatus(t)}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {renderNetProfit(t)}
                                                </td>
                                                <td className="p-4 text-center text-xs text-slate-400">
                                                    {t.note ? (
                                                        <span className="flex items-center justify-center gap-1" title={t.note}>
                                                            <FileText size={12} /> <span className="truncate max-w-25">{t.note}</span>
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => setSelectedTicket(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                                        <Eye size={18} />
                                                    </button>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {t.status === 'PENDING' ? (
                                                        <button onClick={() => handleCancelTicket(t.id)} className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="ยกเลิกบิล">
                                                            <Ban size={18} />
                                                        </button>
                                                    ) : <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="font-bold text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                                            {t.user?.username}
                                                        </div>
                                                        <div className="text-[9px] text-slate-400 mt-0.5">#{t.id.substring(0,6)}</div>
                                                    </div>
                                                </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>

                      {/* Footer สรุปยอด */}
                      <div className="bg-slate-50 border-t border-gray-200 p-3 px-4 flex flex-wrap gap-6 justify-end items-center text-sm shadow-inner">
                          
                          {/* ยอดยกเลิก */}
                          <div className="flex items-center gap-2 opacity-75">
                              <RotateCcw size={16} className="text-slate-400"/>
                              <span className="text-slate-500 text-xs uppercase font-bold">ยกเลิก/คืนเงิน:</span>
                              <span className="font-bold text-slate-600 decoration-slate-300 decoration-1">
                                  {group.summary.totalCancelled.toLocaleString()}
                              </span>
                          </div>

                          <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>

                          <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-xs uppercase font-bold">รวมยอดขาย:</span>
                              <span className="font-black text-blue-600 text-lg">{group.summary.totalBet.toLocaleString()}</span>
                          </div>
                          <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>
                          <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-xs uppercase font-bold">จ่ายรางวัล:</span>
                              <span className="font-bold text-red-500">{group.summary.totalWin.toLocaleString()}</span>
                          </div>
                          <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs uppercase font-bold">จ่ายค่าคอม:</span>
                            <span className="font-bold text-purple-600">{group.summary.totalCommission.toLocaleString()}</span>
                          </div>
                          <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${group.summary.profit >= 0 ? 'bg-green-100 border-green-200 text-green-700' : 'bg-red-100 border-red-200 text-red-700'}`}>
                              <TrendingUp size={18} />
                              <span className="text-xs uppercase font-bold mr-1">กำไรเจ้ามือ:</span>
                              <span className="font-black text-base">
                                  {group.summary.profit >= 0 ? '+' : ''}{group.summary.profit.toLocaleString()}
                              </span>
                          </div>
                      </div>

                  </div>
              ))
          )}
          
          {/* Infinite Scroll Sentinel */}
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
                  
                  {/* Header */}
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800">รายละเอียดบิล</h3>
                          <div className="text-xs text-blue-600 font-bold mt-1">ผู้ซื้อ: {selectedTicket.user?.username}</div>
                      </div>
                      <button onClick={() => setSelectedTicket(null)} className="p-1 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                  </div>

                  {/* Body */}
                  <div className="p-4 overflow-y-auto bg-white flex-1 custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 font-bold text-xs uppercase text-slate-500">
                                <tr>
                                      <th className="p-3 text-left">เลข</th>
                                      <th className="p-3 text-left">ประเภท</th>
                                      <th className="p-3 text-right">เรท</th>
                                      <th className="p-3 text-right">ราคา</th>
                                      <th className="p-3 text-right">รวม</th>
                                      <th className="p-3 text-right">ผล</th>
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
                                            
                                            {/* ✅ 4. ถ้าปิด ให้รวมช่อง Rate/Price/Total แล้วแสดงข้อความแจ้งเตือน */}
                                            {isClosed ? (
                                                <>
                                                    <td colSpan={3} className="p-3 text-center">
                                                        <span className="text-[10px] font-bold text-red-500 border border-red-200 bg-white px-2 py-1 rounded-lg">
                                                            ปิดรับ (ไม่คิดเงิน)
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

                  {/* Footer & Summary */}
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
                            onClick={() => handleCancelTicket(selectedTicket.id)} 
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