import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
  X, RefreshCw, Trophy, FileText, 
  ChevronRight, Receipt, ChevronLeft, 
  Search, Calendar
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function History() {
  // Data List
  const [tickets, setTickets] = useState<any[]>([]);     // รายการโพยทั้งหมด
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [filter, setFilter] = useState('ALL'); // สถานะโพย (ALL, WIN, LOSE...)
  const [searchTerm, setSearchTerm] = useState(''); // ค้นหาด้วยเลขโพย หรือ ชื่อหวย

  // Pagination & Modal
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 40;
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // 1. โหลดประวัติทั้งหมดทันทีที่เข้าหน้า
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // ไม่ส่ง lotto_type_id เพื่อดึง "ทั้งหมด"
      const res = await client.get(`/play/history?limit=100`); 
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

  // --- Logic การแสดงผล ---
  
  // กรองรายการ (สถานะ + คำค้นหา)
  const filteredTickets = tickets.filter(t => {
      // 1. กรองสถานะ
      const statusMatch = filter === 'ALL' || t.status === filter;
      
      // 2. กรองคำค้นหา (ค้นจาก ID โพย หรือ ชื่อหวย)
      const searchLower = searchTerm.toLowerCase();
      const idMatch = t.id.toLowerCase().includes(searchLower);
      const nameMatch = t.lotto_type?.name?.toLowerCase().includes(searchLower);
      
      return statusMatch && (searchTerm === '' || idMatch || nameMatch);
  });

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

  // ================= RENDER =================

  return (
    <div className="animate-fade-in pb-20 bg-gray-50 min-h-screen flex flex-col font-sans">
      
      {/* Header Sticky */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4 max-w-6xl mx-auto">
              <div>
                  <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Receipt className="text-blue-600" /> ประวัติการแทง
                  </h1>
                  <p className="text-xs text-slate-500">รายการโพยทั้งหมดของคุณ</p>
              </div>
              <button 
                  onClick={fetchHistory} 
                  className={`p-2.5 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 transition-all ${loading ? 'animate-spin' : ''}`}
              >
                  <RefreshCw size={20} />
              </button>
          </div>
          
          <div className="max-w-6xl mx-auto space-y-3">
              {/* Search */}
              <div className="relative">
                  <input 
                      type="text" 
                      placeholder="ค้นหาเลขโพย หรือ ชื่อหวย..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              </div>

              {/* Tabs Filter */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {['ALL', 'PENDING', 'WIN', 'LOSE', 'CANCELLED'].map(f => (
                      <button
                          key={f}
                          onClick={() => { setFilter(f); setCurrentPage(1); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                              filter === f 
                              ? 'bg-slate-800 text-white border-slate-800' 
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                          }`}
                      >
                          {f === 'ALL' ? 'ทั้งหมด' : getStatusLabel(f)}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* List Content */}
      <div className="flex-1 px-4 py-4 max-w-6xl mx-auto w-full">
          {loading ? (
              <div className="py-20 flex flex-col items-center text-slate-400">
                  <Loader2 className="animate-spin mb-2" size={32} />
                  <p>กำลังโหลดข้อมูล...</p>
              </div>
          ) : filteredTickets.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-sm flex flex-col items-center">
                  <FileText size={48} className="mb-2 opacity-20" />
                  ไม่พบรายการโพย
              </div>
          ) : (
              // Masonry Layout
              <div className="md:columns-2 gap-4"> 
                  {currentTickets.map((t) => (
                      <div 
                          key={t.id} 
                          onClick={() => setSelectedTicket(t)}
                          className="break-inside-avoid bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer mb-4 relative overflow-hidden"
                      >
                          {/* Stripe Status Color */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                              t.status === 'WIN' ? 'bg-green-500' : 
                              t.status === 'LOSE' ? 'bg-gray-300' : 
                              t.status === 'CANCELLED' ? 'bg-red-500' : 'bg-blue-500'
                          }`}></div>

                          <div className="pl-3">
                              <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 border ${
                                          t.status === 'WIN' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                                      }`}>
                                          {t.status === 'WIN' ? <Trophy size={18} /> : <FileText size={18} />}
                                      </div>
                                      <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                              <h3 className="font-bold text-slate-800 text-sm truncate">
                                                  {t.lotto_type?.name || 'ไม่ระบุชื่อหวย'}
                                              </h3>
                                          </div>
                                          <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-mono">
                                              <Calendar size={10} /> {new Date(t.created_at).toLocaleString('th-TH')}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className="font-bold text-blue-600 text-base">-{Number(t.total_amount).toLocaleString()}</div>
                                      <div className={`text-[9px] px-2 py-0.5 rounded-full inline-block font-bold mt-1 ${getStatusColor(t.status)}`}>
                                          {getStatusLabel(t.status)}
                                      </div>
                                  </div>
                              </div>
                              
                              {/* Preview Numbers */}
                              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-50">
                                  {t.items?.slice(0, 6).map((item:any, i:number) => (
                                      <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                                          item.status === 'WIN' 
                                          ? 'bg-green-500 text-white border-green-500 font-bold shadow-sm' 
                                          : 'bg-slate-50 text-slate-500 border-slate-100'
                                      }`}>
                                          {item.number}
                                      </span>
                                  ))}
                                  {(t.items?.length || 0) > 6 && <span className="text-[10px] text-gray-400 px-1 pt-0.5">+{t.items.length-6}</span>}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
          <div className="p-4 bg-white border-t flex justify-center items-center gap-2 sticky bottom-0 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
              <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={20} /></button>
              <span className="text-sm font-bold text-slate-600">หน้า {currentPage} / {totalPages}</span>
              <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={20} /></button>
          </div>
      )}

      {/* ---------------- MODAL DETAIL (เหมือนเดิม) ---------------- */}
      {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden">
                  
                  {/* Modal Header */}
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="font-bold text-lg text-gray-800">รายละเอียดโพย</h3>
                          <div className="flex items-center gap-1 text-xs text-gray-500 font-mono mt-0.5 font-bold">
                                # {selectedTicket.id.substring(0, 8)}...
                          </div>
                      </div>
                      <button onClick={() => setSelectedTicket(null)} className="p-2 bg-white rounded-full border hover:bg-gray-100 text-gray-500">
                          <X size={20} />
                      </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-4 overflow-y-auto bg-white flex-1 custom-scrollbar">
                      
                      {/* Info Header */}
                      <div className="text-center mb-4">
                          <h2 className="text-xl font-bold text-slate-800">{selectedTicket.lotto_type?.name}</h2>
                          <p className="text-xs text-slate-400">{new Date(selectedTicket.created_at).toLocaleString('th-TH')}</p>
                      </div>

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

                      {/* Items List */}
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