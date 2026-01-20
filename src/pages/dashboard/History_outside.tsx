import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
  X, RefreshCw, Receipt, ChevronLeft, 
  ChevronRight, Eye, Ban, Calendar // เพิ่ม icon Calendar
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { calculateWinAmount, calculateNet } from '../../utils/lottoHelpers';

export default function HistoryOutside() {
  const [tickets, setTickets] = useState<any[]>([]);     
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); 
  
  // ✅ เพิ่ม State วันที่ (Default = วันนี้)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    fetchHistory();
  }, [selectedDate]); // ✅ โหลดใหม่เมื่อเปลี่ยนวันที่

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // ✅ ส่ง date ไปกับ API
      const res = await client.get(`/play/history?limit=100&date=${selectedDate}`); 
      setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (ticketId: string) => {
    if (!confirm('ยืนยันยกเลิกโพยนี้? เงินจะคืนเข้าเครดิตทันที')) return;
    try {
      await client.patch(`/play/tickets/${ticketId}/cancel`);
      alert('ยกเลิกสำเร็จ! คืนเงินเรียบร้อย');
      fetchHistory(); 
      setSelectedTicket(null);
    } catch (err: any) {
      alert(`ยกเลิกไม่ได้: ${err.response?.data?.detail}`);
    }
  };

  const renderWinStatus = (ticket: any) => {
      if (ticket.status === 'PENDING') return <span className="text-red-500 font-bold">รอผล</span>;
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

  const filteredTickets = tickets.filter(t => filter === 'ALL' || t.status === filter);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="animate-fade-in pb-20 bg-gray-50 min-h-screen flex flex-col font-sans">
      
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto mb-4">
              <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Receipt className="text-blue-600" /> ประวัติการแทง (รวม)
              </h1>
              
              <div className="flex items-center gap-2">
                  {/* ✅ ตัวเลือกวันที่ */}
                  <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                      <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                      />
                  </div>
                  <button onClick={fetchHistory} className={`p-2 bg-slate-100 rounded-lg hover:bg-slate-200 ${loading ? 'animate-spin' : ''}`}>
                      <RefreshCw size={20} />
                  </button>
              </div>
          </div>
          
          <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['ALL', 'PENDING', 'WIN', 'LOSE', 'CANCELLED'].map(f => (
                <button key={f} onClick={() => { setFilter(f); setCurrentPage(1); }} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${filter === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>
                    {f === 'ALL' ? 'ทั้งหมด' : f}
                </button>
            ))}
          </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full">
          {loading ? <div className="py-20 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" /> กำลังโหลด...</div> 
          : filteredTickets.length === 0 ? <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">ไม่พบรายการในวันที่เลือก</div> : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">1. เวลา</th> {/* วันที่รู้อยู่แล้วจาก filter */}
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
                        <tbody className="divide-y divide-gray-100">
                            {currentTickets.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-700">
                                        {new Date(t.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit' })}
                                    </td>
                                    <td className="p-4 font-bold text-blue-600">{t.lotto_type?.name}</td>
                                    <td className="p-4 font-mono">{new Date(t.created_at).toLocaleDateString('th-TH', {day:'2-digit', month:'2-digit', year:'numeric'})}</td>
                                    <td className="p-4 text-right font-bold text-slate-700">{Number(t.total_amount).toLocaleString()}</td>
                                    <td className="p-4 text-right">{renderWinStatus(t)}</td>
                                    <td className="p-4 text-right">{renderNetProfit(t)}</td>
                                    <td className="p-4 text-xs text-gray-500">{t.note || '-'}</td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => setSelectedTicket(t)} className="text-slate-400 hover:text-blue-600"><Eye size={18} /></button>
                                    </td>
                                    <td className="p-4 text-xs text-slate-600">{t.user?.username}</td>
                                    <td className="p-4 text-center">
                                        {t.status === 'PENDING' && (
                                            <button onClick={() => handleCancel(t.id)} className="text-red-400 hover:text-red-600"><Ban size={16} /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
          )}
      </div>

      {totalPages > 1 && (
          <div className="p-4 bg-white border-t flex justify-center items-center gap-2 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 disabled:opacity-30 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20} /></button>
              <span className="text-sm font-bold text-slate-600">หน้า {currentPage} / {totalPages}</span>
              <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 disabled:opacity-30 hover:bg-slate-100 rounded-lg"><ChevronRight size={20} /></button>
          </div>
      )}

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
                        
                            onClick={() => typeof handleCancel === 'function' ? handleCancel(selectedTicket.id) : (window as any).handleCancelTicket?.(selectedTicket.id)} 
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