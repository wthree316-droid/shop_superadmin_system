import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import client from '../../api/client';
import { 
  X, RefreshCw, Eye, Layers, Ban,
  TrendingUp, Banknote, ArrowDown, ArrowRight, Loader2,
  RotateCcw, Check
} from 'lucide-react';
import { calculateWinAmount, calculateNet } from '../../utils/lottoHelpers';
import { alertAction, confirmAction } from '../../utils/toastUtils';

export default function History() {
  // --- Data States ---
  const [tickets, setTickets] = useState<any[]>([]);     
  const [lottos, setLottos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
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
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL'); // ✅ Filter หมวดหมู่
  
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // --- Infinite Scroll States ---
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [itemsPerPage] = useState(100); 

  // --- Observer for Infinite Scroll ---
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && hasMore) {
              setCurrentPage(prev => prev + 1);
          }
      });
      if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // --- 1. Load Master Data Once ---
  useEffect(() => {
      const fetchMasterData = async () => {
          try {
              const [resLottos, resCats] = await Promise.all([
                  client.get('/play/lottos'),
                  client.get('/play/categories')
              ]);
              setLottos(resLottos.data);
              setCategories(resCats.data);
          } catch (err) { console.error("Master data error", err); }
      };
      fetchMasterData();
  }, []);

  // --- 2. Reset & Reload when Date changes ---
  useEffect(() => {
    setTickets([]);
    setCurrentPage(1);
    setHasMore(true);
    setInitialLoad(true);
    fetchHistory(1, true);
  }, [startDate, endDate]);

  // --- 3. Load More when Page changes ---
  useEffect(() => {
    if (currentPage > 1) {
        fetchHistory(currentPage, false);
    }
  }, [currentPage]);

  const handleRefresh = () => {
      setTickets([]);
      setCurrentPage(1);
      setHasMore(true);
      fetchHistory(1, true);
  };

  const fetchHistory = async (page: number, isNewFilter: boolean) => {
    setLoading(true);
    try {
      const skip = (page - 1) * itemsPerPage;
      const url = `/play/history?start_date=${startDate}&end_date=${endDate}&skip=${skip}&limit=${itemsPerPage}`;
      const res = await client.get(url);
      
      const newData = Array.isArray(res.data) ? res.data : (res.data.items || []);
      
      setTickets(prev => {
          if (isNewFilter) return newData;
          const existingIds = new Set(prev.map(t => t.id));
          const uniqueNewData = newData.filter((t: any) => !existingIds.has(t.id));
          return [...prev, ...uniqueNewData];
      });
      
      setHasMore(newData.length === itemsPerPage);

    } catch (err) { 
        console.error(err); 
    } finally { 
        setLoading(false); 
        setInitialLoad(false);
    }
  };
  
  const handleCancel = async (ticketId: string) => {
    confirmAction('ยืนยันยกเลิกโพยนี้?', async () => {
        try {
          await client.patch(`/play/tickets/${ticketId}/cancel`);
          alertAction('ยกเลิกสำเร็จ', 'สำเร็จ', 'success');
          
          setTickets(prev => prev.map(t => 
              t.id === ticketId ? { ...t, status: 'CANCELLED' } : t
          ));
          
          setSelectedTicket(null);
        } catch (err: any) { alertAction(`Error: ${err.response?.data?.detail}`, 'ข้อผิดพลาด', 'error'); }
    }, 'ยกเลิกโพย', 'ปิด');
  };

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

  // 🔥 Flatten Grouping Logic (จัดกลุ่มตามหวยโดยตรง ไม่ซ้อน Category)
  const groupedLottos = useMemo(() => {
      if (tickets.length === 0) return [];

      const lottoMap = new Map();
      lottos.forEach(l => lottoMap.set(l.id, l));
      
      const catMap = new Map();
      categories.forEach(c => catMap.set(c.id, c));

      const groups: Record<string, any> = {};

      tickets.forEach(ticket => {
          const lottoId = ticket.lotto_type_id;
          if (!groups[lottoId]) {
              const lotto = lottoMap.get(lottoId) || { name: 'Unknown Lotto', category: 'UNCATEGORIZED', close_time: '23:59', result_time: '23:59' };
              const category = catMap.get(lotto.category) || { label: 'อื่นๆ', id: 'UNCATEGORIZED', color: 'bg-gray-100 text-gray-800' };
              
              groups[lottoId] = {
                  lotto,
                  category,
                  items: [],
                  summary: {
                      totalBet: 0,
                      totalWin: 0,
                      totalCancelled: 0,
                      count: 0
                  }
              };
          }
          
          // Add Ticket
          groups[lottoId].items.push(ticket);
          
          // Update Summary
          const g = groups[lottoId];
          g.summary.count++;
          if (ticket.status === 'CANCELLED') {
              g.summary.totalCancelled += Number(ticket.total_amount);
          } else {
              g.summary.totalBet += Number(ticket.total_amount);
              if (ticket.status === 'WIN') {
                  g.summary.totalWin += calculateWinAmount(ticket);
              }
          }
      });

      // Convert to Array & Calculate Net
      let result = Object.values(groups).map((g: any) => ({
          ...g,
          summary: {
              ...g.summary,
              netProfit: g.summary.totalWin - g.summary.totalBet
          }
      }));

      // Filter by Category (Strict)
      if (selectedCategory !== 'ALL') {
          result = result.filter(g => g.category.id === selectedCategory);
      }

      // Sort Logic (Time Score: Late night > Evening > Morning)
      result.sort((a, b) => {
          const getTimeScore = (timeStr: string | null) => {
              if (!timeStr) return -1;
              const [h, m] = timeStr.split(':').map(Number);
              // Shift 00:00-04:59 to be "later" than 23:59 (e.g., 25:00, 26:00)
              if (h < 5) return (h + 24) * 60 + m; 
              return h * 60 + m;
          };

          const scoreA = getTimeScore(a.lotto.close_time);
          const scoreB = getTimeScore(b.lotto.close_time);
          
          // Descending Order (มากไปน้อย: ดึก -> เช้า)
          return scoreB - scoreA;
      });

      return result;

  }, [tickets, lottos, categories, selectedCategory]);

  return (
    <div className="animate-fade-in pb-20 bg-gray-50 min-h-screen flex flex-col font-sans">
      
      {/* Header Filter */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20 border-b border-gray-200">
          <div className="flex flex-col gap-4 max-w-7xl mx-auto">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Layers className="text-blue-600" /> ประวัติ (แยกตามหวย)
                  </h1>
                  
                  {/* Date Picker */}
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
                      <div className="relative">
                          <input 
                            type="date" 
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="pl-3 pr-1 py-1.5 bg-transparent text-sm font-bold text-slate-700 outline-none w-32"
                          />
                      </div>
                      <span className="text-slate-400"><ArrowRight size={16}/></span>
                      <div className="relative">
                          <input 
                            type="date" 
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            min={startDate}
                            className="pl-3 pr-1 py-1.5 bg-transparent text-sm font-bold text-slate-700 outline-none w-32"
                          />
                      </div>
                      <button onClick={handleRefresh} className="ml-1 p-1.5 bg-white shadow-sm rounded-lg hover:bg-blue-50 transition-colors text-slate-600 border border-slate-100">
                          <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
                      </button>
                  </div>
              </div>

              {/* Category Filter Chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                  <button 
                      onClick={() => setSelectedCategory('ALL')}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                          selectedCategory === 'ALL' 
                          ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                      ทั้งหมด
                  </button>
                  {categories.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      const isHex = cat.color?.startsWith('#');
                      // ถ้าเลือก -> ใช้สีเต็ม, ถ้าไม่เลือก -> สีจางๆ หรือขาว
                      return (
                          <button
                              key={cat.id}
                              onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat.id)}
                              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                                  isSelected 
                                  ? 'ring-2 ring-offset-1 ring-blue-200 shadow-md'
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                              style={isSelected ? (isHex ? { backgroundColor: cat.color, color: 'white', borderColor: cat.color } : {}) : {}}
                          >
                              {/* Dot Color */}
                              {!isSelected && (
                                  <span 
                                    className={`w-2.5 h-2.5 rounded-full ${!isHex ? cat.color.replace('text-', 'bg-').split(' ')[0] : ''}`}
                                    style={isHex ? { backgroundColor: cat.color } : {}}
                                  ></span>
                              )}
                              {cat.label}
                              {isSelected && <Check size={14} className="ml-1"/>}
                          </button>
                      );
                  })}
              </div>

          </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full space-y-6">
          {initialLoad && loading ? <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500 mb-2"/> กำลังโหลดข้อมูล...</div> : 
           groupedLottos.length === 0 ? <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">ไม่พบรายการในหน้านี้</div> : 
           
           /* วนลูป Lottos (Flattened List) */
           groupedLottos.map((group: any, j: number) => (
                <div key={j} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up">
                    
                    {/* หัวข้อหวย */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-blue-600 flex items-center gap-2 text-lg">
                                <Banknote size={20} /> {group.lotto.name}
                            </h3>
                            {/* Category Badge */}
                            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${
                                group.category.color?.startsWith('#') 
                                ? 'bg-white text-slate-600 border-slate-200' 
                                : group.category.color.replace('bg-', 'text-').replace('text-', 'bg-opacity-10 bg-') + ' border-transparent'
                            }`}
                            style={group.category.color?.startsWith('#') ? { color: group.category.color, borderColor: group.category.color } : {}}
                            >
                                {group.category.label}
                            </span>
                        </div>
                        <span className="text-xs text-gray-400 font-mono bg-white px-2 py-1 rounded border border-gray-100">
                            {group.summary.count} บิล
                        </span>
                    </div>

                    {/* ตารางรายการ */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-white text-gray-500 font-bold border-b border-gray-100 text-xs">
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
                            <tbody className="divide-y divide-gray-50">
                                {group.items.map((t: any) => (
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

                    {/* Footer สรุปยอดของหวยนี้ */}
                    <div className="bg-slate-50 border-t border-gray-200 p-3 flex flex-wrap gap-4 justify-end items-center text-sm">
                        
                        {/* ยอดยกเลิก */}
                        <div className="flex items-center gap-2 opacity-75">
                            <RotateCcw size={16} className="text-slate-400"/>
                            <span className="text-slate-500 text-xs uppercase font-bold">ยกเลิก/คืนเงิน:</span>
                            <span className="font-bold text-slate-600 decoration-slate-300 decoration-1">
                                {group.summary.totalCancelled.toLocaleString()}
                            </span>
                        </div>

                        <div className="w-px h-4 bg-gray-300 mx-1 hidden sm:block"></div>

                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs uppercase font-bold">รวมยอดแทง:</span>
                            <span className="font-bold text-slate-800">{group.summary.totalBet.toLocaleString()}</span>
                        </div>
                        <div className="w-px h-4 bg-gray-300 mx-1 hidden sm:block"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs uppercase font-bold">ยอดถูกรางวัล:</span>
                            <span className="font-bold text-green-600">{group.summary.totalWin.toLocaleString()}</span>
                        </div>
                        <div className="w-px h-4 bg-gray-300 mx-1 hidden sm:block"></div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${group.summary.netProfit >= 0 ? 'bg-green-100 border-green-200 text-green-700' : 'bg-red-100 border-red-200 text-red-700'}`}>
                            <TrendingUp size={16} />
                            <span className="font-bold">
                                {group.summary.netProfit >= 0 ? '+' : ''}{group.summary.netProfit.toLocaleString()}
                            </span>
                        </div>
                    </div>

                </div>
            ))
          }
          
          {/* Infinite Scroll Sentinel */}
          {hasMore && !initialLoad && (
              <div ref={lastElementRef} className="py-8 flex justify-center text-slate-400 text-sm animate-pulse">
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
                                  return winAmount > 0 ? (<span className="font-bold text-green-600">+{Number(winAmount).toLocaleString()} บาท</span>) : selectedTicket.status === 'PENDING' ? (<span className="font-bold text-orange-400">รอผลรางวัล</span>) : (<span className="font-bold text-red-500">ไม่ถูกรางวัล</span>);
                              })()}
                          </div>
                      </div>
                      {selectedTicket.status === 'PENDING' && (
                          <button onClick={() => handleCancel(selectedTicket.id)} className="w-full py-3 bg-white text-red-600 font-bold rounded-xl border-2 border-red-100 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm">ยกเลิกบิลคืนเงิน</button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}