import { useEffect, useState, useMemo } from 'react';
import client from '../../api/client';
import { 
    Calendar, User, Filter, 
    X, Eye, Ban, RefreshCw, Loader2,
    ChevronLeft, ChevronRight, Wallet, Receipt
} from 'lucide-react';
import { calculateWinAmount, calculateNet } from '../../utils/lottoHelpers'; 

export default function ShopHistory() {
  // --- Data States ---
  const [tickets, setTickets] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // --- Filter States ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUser, setSelectedUser] = useState<string>(''); 
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, PENDING, WIN, LOSE, CANCELLED

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // จำนวนรายการต่อหน้า
  const [totalPages, setTotalPages] = useState(1);

  // --- Modal State ---
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // --- Initial Load ---
  useEffect(() => {
    fetchMembers();
  }, []);

  // --- Reload Data conditions ---
  useEffect(() => {
    // เมื่อเปลี่ยน Filter หลัก (วัน/คน) ให้รีเซ็ตไปหน้า 1
    setCurrentPage(1);
    fetchHistory(1);
  }, [selectedDate, selectedUser]);

  useEffect(() => {
    // เมื่อเปลี่ยนหน้า ให้โหลดข้อมูลหน้าใหม่
    fetchHistory(currentPage);
  }, [currentPage]);

  // --- API Functions ---
  const fetchMembers = async () => {
      try {
          const res = await client.get('/users/members');
          setMembers(res.data);
      } catch(err) { console.error("Load members fail", err); }
  };

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      // สร้าง URL Query String
      let url = `/play/shop_history?date=${selectedDate}&page=${page}&limit=${itemsPerPage}`;
      
      if (selectedUser) {
          url += `&user_id=${selectedUser}`;
      }
      
      const res = await client.get(url);
      
      // กรณี Backend ส่งมาเป็น Array ตรงๆ (ไม่มี metadata pagination)
      if (Array.isArray(res.data)) {
          setTickets(res.data);
          // ถ้าไม่มี total_pages จากหลังบ้าน ให้คำนวณคร่าวๆ หรือซ่อนปุ่มถัดไปถ้าข้อมูล < limit
          setTotalPages(res.data.length < itemsPerPage ? page : page + 1); 
      } else {
          // กรณี Backend ส่ง format มาตรฐาน { items: [], total_pages: 5 }
          setTickets(res.data.items || res.data); 
          setTotalPages(res.data.total_pages || 1);
      }

    } catch (err) { 
        console.error(err); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
      if(!confirm("ยืนยันการยกเลิกบิลนี้? เงินจะถูกคืนให้ลูกค้าทันที")) return;
      try {
          await client.patch(`/play/tickets/${ticketId}/cancel`);
          alert("ยกเลิกสำเร็จ");
          fetchHistory(currentPage); // โหลดหน้าปัจจุบันใหม่
          setSelectedTicket(null);
      } catch(err: any) {
          alert(`Error: ${err.response?.data?.detail}`);
      }
  };

  // --- Client-Side Logic ---
  
  // 1. กรอง Status (ถ้า API ไม่รองรับการส่ง status ให้กรองที่นี่)
  const filteredTickets = useMemo(() => {
      if (filterStatus === 'ALL') return tickets;
      return tickets.filter(t => t.status === filterStatus);
  }, [tickets, filterStatus]);

  // 2. คำนวณยอดรวม (Dashboard) จากข้อมูลที่โหลดมา
  const summary = useMemo(() => {
      let totalSales = 0;
      let totalPayout = 0;
      let profit = 0;

      filteredTickets.forEach(t => {
          if (t.status !== 'CANCELLED') {
              totalSales += Number(t.total_amount);
              // คำนวณยอดจ่าย (เฉพาะบิลที่ถูกรางวัล)
              const win = calculateWinAmount(t);
              totalPayout += win;
          }
      });
      profit = totalSales - totalPayout;

      return { totalSales, totalPayout, profit };
  }, [filteredTickets]);

  return (
    <div className="animate-fade-in space-y-6 pb-10">
      
      {/* --- Filter Section --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
          
          <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                  {/* Date Input */}
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">วันที่</label>
                      <div className="relative">
                          <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                          <input 
                            type="date" 
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 w-full md:w-40"
                          />
                      </div>
                  </div>

                  {/* Member Select */}
                  <div className="flex-1 md:w-64">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">กรองตามสมาชิก</label>
                      <div className="relative">
                          <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                          <select 
                            value={selectedUser}
                            onChange={e => setSelectedUser(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 appearance-none"
                          >
                              <option value="">-- ดูรายการทั้งหมด --</option>
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
              </div>

              <button onClick={() => fetchHistory(1)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
                  <RefreshCw size={20} />
              </button>
          </div>

          {/* Status Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['ALL', 'PENDING', 'WIN', 'LOSE', 'CANCELLED'].map(f => (
                <button key={f} onClick={() => setFilterStatus(f)} 
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${filterStatus === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                    {f === 'ALL' ? 'ทั้งหมด' : f === 'PENDING' ? 'รอผล' : f === 'WIN' ? 'ถูกรางวัล' : f === 'LOSE' ? 'ไม่ถูกรางวัล' : 'ยกเลิก'}
                </button>
            ))}
          </div>
      </div>

      {/* --- Summary Cards (Mini Dashboard) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex items-center justify-between">
              <div>
                  <div className="text-xs text-slate-500 font-bold uppercase">ยอดขายรวม</div>
                  <div className="text-xl font-black text-blue-600">{summary.totalSales.toLocaleString()}</div>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><Wallet size={24}/></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 flex items-center justify-between">
              <div>
                  <div className="text-xs text-slate-500 font-bold uppercase">จ่ายรางวัล</div>
                  <div className="text-xl font-black text-red-500">{summary.totalPayout.toLocaleString()}</div>
              </div>
              <div className="p-2 bg-red-50 rounded-lg text-red-500"><Receipt size={24}/></div>
          </div>
          <div className={`bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between ${summary.profit >= 0 ? 'border-green-100' : 'border-red-100'}`}>
              <div>
                  <div className="text-xs text-slate-500 font-bold uppercase">กำไรสุทธิ</div>
                  <div className={`text-xl font-black ${summary.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {summary.profit >= 0 ? '+' : ''}{summary.profit.toLocaleString()}
                  </div>
              </div>
              <div className={`p-2 rounded-lg ${summary.profit >= 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                   {summary.profit >= 0 ? <RefreshCw size={24}/> : <Ban size={24}/>}
              </div>
          </div>
      </div>

      {/* --- Ticket List --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-xs">
                        <tr>
                            <th className="p-4">1. เวลา</th>
                            <th className="p-4">2. ชนิดหวย</th>
                            <th className="p-4">3. งวดวันที่</th>
                            <th className="p-4 text-right">4. ยอดแทง</th>
                            <th className="p-4 text-right">5. ถูกรางวัล</th>
                            <th className="p-4 text-right">6. กำไรโพย</th>
                            <th className="p-4">7. หมายเหตุ</th>
                            <th className="p-4 text-center">8. รายละเอียด</th>
                            <th className="p-4 text-center">9. ยกเลิก</th>
                            <th className="p-4">10. ผู้ซื้อ</th>

                        </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                      {loading ? (
                          <tr><td colSpan={9} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></td></tr>
                      ) : filteredTickets.length === 0 ? (
                          <tr><td colSpan={9} className="p-10 text-center text-gray-400">ไม่พบรายการบิลตามเงื่อนไข</td></tr>
                      ) : (
                          filteredTickets.map((t) => {
                              const winAmount = calculateWinAmount(t);
                              const net = calculateNet(t);
                              const isProfit = net >= 0;

                              return (
                                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-mono text-slate-500">
                                            {new Date(t.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                                        </td>
                                        
                                        <td className="p-4 text-blue-600 font-bold">{t.lotto_type?.name}</td>
                                        <td className="p-4 font-mono">{new Date(t.created_at).toLocaleDateString('th-TH', {day:'2-digit', month:'2-digit', year:'numeric'})}</td>
                                        <td className="p-4 text-right font-mono font-bold">
                                            {Number(t.total_amount).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            {t.status === 'WIN' ? <span className="text-green-600 font-bold">{winAmount.toLocaleString()}</span> :
                                            t.status === 'LOSE' ? <span className="text-red-400 font-bold">-</span> :
                                            t.status === 'CANCELLED' ? <span className="text-gray-400">ยกเลิก</span> :
                                            <span className="text-orange-500 text-xs font-bold animate-pulse">รอผล</span>}
                                        </td>
                                        <td className={`p-4 text-right font-bold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                                            {t.status === 'PENDING' || t.status === 'CANCELLED' ? '-' : `${isProfit ? '+' : ''}${net.toLocaleString()}`}
                                        </td>
                                        <td className="p-4 text-xs text-slate-400 truncate max-w-25">{t.note || '-'}</td>
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
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <div className="font-bold text-slate-700">{t.user?.username}</div>
                                                    <div className="text-[10px] text-slate-400">#{t.id.substring(0,6)}</div>
                                                </div>
                                            </div>
                                        </td>
                                  </tr>
                              );
                          })
                      )}
                  </tbody>
              </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-100 text-sm font-bold"
                >
                    <ChevronLeft size={16} /> ก่อนหน้า
                </button>
                <span className="text-sm text-slate-500 font-medium">หน้า {currentPage}</span>
                <button 
                    disabled={filteredTickets.length < itemsPerPage && totalPages === currentPage} 
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-100 text-sm font-bold"
                >
                    ถัดไป <ChevronRight size={16} />
                </button>
          </div>
      </div>

      {/* --- Ticket Detail Modal --- */}
      {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                  
                  {/* Header */}
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800">รายละเอียดบิล</h3>
                          <div className="text-xs text-slate-500">#{selectedTicket.id}</div>
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
                                    const potentialReward = Number(item.amount) * Number(item.reward_rate);
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
                                            <td className="p-3 text-right text-gray-500 text-xs">{Number(item.reward_rate).toLocaleString()}</td>
                                            <td className="p-3 text-right font-mono">{Number(item.amount).toLocaleString()}</td>
                                            <td className="p-3 text-right font-bold text-blue-600 text-xs">{potentialReward.toLocaleString()}</td>
                                            <td className="p-3 text-right">
                                                {item.status === 'WIN' ? <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded-full">+{Number(item.amount * item.reward_rate).toLocaleString()}</span> : 
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