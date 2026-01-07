import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
  X, RefreshCw, Trophy, FileText, 
 ChevronRight, Receipt, Hash, ChevronLeft 
} from 'lucide-react';

export default function History() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 40; // หน้าละ 40 บิล

  // Modal State
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // ดึงมาเยอะหน่อย (1000) แล้วมาแบ่งหน้าเอาที่หน้าบ้าน (Client-side Pagination)
      // เพื่อความลื่นไหลเวลากดเปลี่ยนหน้า
      const res = await client.get('/play/history?limit=1000');
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

  // Logic การกรองและแบ่งหน้า
  const filteredTickets = tickets.filter(t => {
      if (filter === 'ALL') return true;
      return t.status === filter;
  });

  // คำนวณหน้า
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'WIN': return 'bg-green-100 text-green-700';
          case 'LOSE': return 'bg-gray-100 text-gray-500';
          case 'CANCELLED': return 'bg-red-100 text-red-600';
          default: return 'bg-blue-100 text-blue-600';
      }
  };

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'WIN': return 'ถูกรางวัล';
          case 'LOSE': return 'ไม่ถูก';
          case 'CANCELLED': return 'ยกเลิก';
          default: return 'รอผล';
      }
  };

  return (
    <div className="animate-fade-in pb-20 bg-gray-50 min-h-screen flex flex-col">
      
      {/* 1. Header Sticky */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 border-b border-gray-200">
          <div className="flex justify-between items-center mb-3">
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Receipt className="text-blue-600" /> ประวัติโพย
              </h1>
              <button 
                onClick={fetchHistory} 
                className={`p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-all ${loading ? 'animate-spin' : ''}`}
              >
                <RefreshCw size={18} className="text-gray-600" />
              </button>
          </div>
          
          {/* Tabs Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['ALL', 'PENDING', 'WIN', 'LOSE', 'CANCELLED'].map(f => (
                <button
                    key={f}
                    onClick={() => { setFilter(f); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                        filter === f 
                        ? 'bg-gray-800 text-white border-gray-800' 
                        : 'bg-white text-gray-500 border-gray-200'
                    }`}
                >
                    {f === 'ALL' ? 'ทั้งหมด' : getStatusLabel(f)}
                </button>
            ))}
          </div>
      </div>

      <div className="flex-1 px-4 py-4 max-w-6xl mx-auto w-full">
        {filteredTickets.length === 0 && !loading && (
            <div className="text-center py-20 text-gray-400 text-sm flex flex-col items-center">
                <FileText size={48} className="mb-2 opacity-20" />
                ไม่พบรายการ
            </div>
        )}

        {/* 2. Ticket List (Masonry Layout: 2 Columns) */}
        {/* ใช้ columns-1 (มือถือ) -> columns-2 (แท็บเล็ต/คอม) */}
        <div className="md:columns-2 gap-4"> 
            {currentTickets.map((t) => (
                <div 
                    key={t.id} 
                    onClick={() => setSelectedTicket(t)}
                    // break-inside-avoid สำคัญมาก เพื่อไม่ให้การ์ดขาดครึ่งตอนขึ้นคอลัมน์ใหม่
                    className="break-inside-avoid bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer mb-4"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {/* Icon Status */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                                t.status === 'WIN' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {t.status === 'WIN' ? <Trophy size={18} /> : <FileText size={18} />}
                            </div>
                            
                            {/* Info */}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-800 text-sm truncate">{t.lotto_type?.name || "หวย (ระบุชื่อไม่ได้)"}</h3>
                                    {t.status === 'WIN' && <span className="text-[10px] bg-green-500 text-white px-1.5 rounded font-bold">WIN</span>}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                    <span className="bg-gray-100 text-gray-500 px-1.5 rounded font-mono flex items-center gap-0.5">
                                        <Hash size={10} /> {t.id.substring(0, 8)}
                                    </span>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                    {new Date(t.created_at).toLocaleString('th-TH')}
                                </div>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                            <div className="font-bold text-blue-600 text-sm">-{Number(t.total_amount).toLocaleString()}</div>
                            <div className={`text-[10px] px-2 rounded-full inline-block font-bold ${getStatusColor(t.status)}`}>
                                {getStatusLabel(t.status)}
                            </div>
                        </div>
                    </div>
                    
                    {/* Preview เลข 5 ตัวแรก (เพื่อให้เห็นภาพรวมโดยไม่ต้องกดดู) */}
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-50">
                         {t.items?.slice(0, 5).map((item:any, i:number) => (
                             <span key={i} className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                                 {item.number}
                             </span>
                         ))}
                         {(t.items?.length || 0) > 5 && <span className="text-[10px] text-gray-400 px-1">+{t.items.length-5}</span>}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* 3. Pagination Controls */}
      {totalPages > 1 && (
          <div className="p-4 bg-white border-t flex justify-center items-center gap-2 sticky bottom-0 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
              <button 
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                  <ChevronLeft size={20} />
              </button>
              
              <div className="flex gap-1 overflow-x-auto max-w-[200px] scrollbar-hide px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                      <button
                          key={number}
                          onClick={() => paginate(number)}
                          className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                              currentPage === number 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                          {number}
                      </button>
                  ))}
              </div>

              <button 
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                  <ChevronRight size={20} />
              </button>
          </div>
      )}

      {/* 4. Detail Modal */}
      {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden">
                  
                  {/* Modal Header */}
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="font-bold text-lg text-gray-800">รายละเอียดโพย</h3>
                          <div className="flex items-center gap-1 text-xs text-gray-500 font-mono mt-0.5 font-bold">
                                # {selectedTicket.id}
                          </div>
                      </div>
                      <button onClick={() => setSelectedTicket(null)} className="p-2 bg-white rounded-full border hover:bg-gray-100 text-gray-500">
                          <X size={20} />
                      </button>
                  </div>

                  {/* Modal Body (Scrollable) */}
                  <div className="p-4 overflow-y-auto bg-white flex-1">
                      
                      {/* Status Banner */}
                      <div className={`p-4 rounded-xl mb-4 flex justify-between items-center border ${
                          selectedTicket.status === 'WIN' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-100'
                      }`}>
                          <div>
                              <div className="text-xs text-gray-500 mb-1">สถานะบิล</div>
                              <div className={`font-bold text-lg ${
                                  selectedTicket.status === 'WIN' ? 'text-green-700' : 'text-blue-800'
                              }`}>
                                  {getStatusLabel(selectedTicket.status)}
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-xs text-gray-500 mb-1">ยอดรวม</div>
                              <div className="font-bold text-xl text-gray-800">{Number(selectedTicket.total_amount).toLocaleString()} ฿</div>
                          </div>
                      </div>

                      {/* Items List Table (ตามที่คุณต้องการ เพื่อให้ดูง่ายและครบถ้วน) */}
                      <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                          <Receipt size={16} className="text-gray-400"/> รายการตัวเลข ({selectedTicket.items?.length})
                      </h4>
                      
                      <div className="border rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                              <thead className="bg-gray-100 text-gray-600 font-bold">
                                  <tr>
                                      <th className="p-3 text-left">เลข</th>
                                      <th className="p-3 text-left">ประเภท</th>
                                      <th className="p-3 text-right">ราคา</th>
                                      <th className="p-3 text-center">ผล</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {selectedTicket.items?.map((item: any, i: number) => (
                                      <tr key={i} className={item.status === 'WIN' ? 'bg-green-50' : 'bg-white'}>
                                          <td className="p-3 font-mono font-bold text-lg">{item.number}</td>
                                          <td className="p-3 text-gray-500">{item.bet_type}</td>
                                          <td className="p-3 text-right font-bold">{item.amount}</td>
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
                                  ))}
                              </tbody>
                          </table>
                      </div>

                      {selectedTicket.note && (
                          <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800 border border-yellow-100">
                              📝 <b>Note:</b> {selectedTicket.note}
                          </div>
                      )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t bg-gray-50 safe-pb">
                      {selectedTicket.status === 'PENDING' ? (
                          <button 
                              onClick={() => handleCancel(selectedTicket.id)}
                              className="w-full py-3 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
                          >
                              ยกเลิกโพย / คืนเงิน
                          </button>
                      ) : selectedTicket.status === 'WIN' ? (
                        <div className="flex justify-between items-center bg-green-100 p-3 rounded-xl border border-green-200">
                            <span className="text-green-800 font-bold">เงินรางวัลรวม</span>
                            <span className="text-2xl font-bold text-green-700">
                                +{selectedTicket.items.reduce((s:number, i:any) => s + Number(i.winning_amount || 0), 0).toLocaleString()} ฿
                            </span>
                        </div>
                      ) : (
                          <div className="text-center text-xs text-gray-400">
                              จบการทำงานแล้ว (ไม่สามารถแก้ไขได้)
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}