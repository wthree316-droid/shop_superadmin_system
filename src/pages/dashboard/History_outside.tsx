import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
  X, RefreshCw, FileText, 
  ChevronRight, Receipt, ChevronLeft, 
  Search, Eye
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { calculateWinAmount, calculateNet, getStatusBadge } from '../../utils/lottoHelpers';

export default function History() {
  const [tickets, setTickets] = useState<any[]>([]);     
  const [loading, setLoading] = useState(false);
  
  const [filter, setFilter] = useState('ALL'); 
  const [searchTerm, setSearchTerm] = useState(''); 

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
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

  const filteredTickets = tickets.filter(t => {
      const statusMatch = filter === 'ALL' || t.status === filter;
      const searchLower = searchTerm.toLowerCase();
      const idMatch = t.id.toLowerCase().includes(searchLower);
      const nameMatch = t.lotto_type?.name?.toLowerCase().includes(searchLower);
      const userMatch = t.user?.username?.toLowerCase().includes(searchLower);
      return statusMatch && (searchTerm === '' || idMatch || nameMatch || userMatch);
  });

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="animate-fade-in pb-20 bg-gray-50 min-h-screen flex flex-col font-sans">
      
      {/* Header Sticky */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4 max-w-7xl mx-auto">
              <div>
                  <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Receipt className="text-blue-600" /> ประวัติการแทง
                  </h1>
                  <p className="text-xs text-slate-500">รายการโพยทั้งหมด</p>
              </div>
              <button 
                  onClick={fetchHistory} 
                  className={`p-2.5 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 transition-all ${loading ? 'animate-spin' : ''}`}
              >
                  <RefreshCw size={20} />
              </button>
          </div>
          
          <div className="max-w-7xl mx-auto space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        placeholder="ค้นหา..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    />
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['ALL', 'PENDING', 'WIN', 'LOSE', 'CANCELLED'].map(f => (
                        <button
                            key={f}
                            onClick={() => { setFilter(f); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                                filter === f 
                                ? 'bg-slate-800 text-white border-slate-800' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {f === 'ALL' ? 'ทั้งหมด' : f}
                        </button>
                    ))}
                </div>
              </div>
          </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full">
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">1. วัน/เวลา</th>
                                <th className="p-4">2. ลูกค้า</th>
                                <th className="p-4">3. หวย</th>
                                <th className="p-4 text-right">4. ยอดแทง</th>
                                <th className="p-4 text-right">5. ถูกรางวัล</th>
                                <th className="p-4 text-right">6. แพ้/ชนะ</th>
                                <th className="p-4 w-40">7. หมายเหตุ</th>
                                <th className="p-4 text-center">8. จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentTickets.map((t) => {
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
                                            <span className={isCancelled ? 'text-gray-400' : net > 0 ? 'text-green-600' : 'text-red-500'}>
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

      {/* Modal Detail (เพิ่มคอลัมน์ เรท, รวม) */}
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
                                      // คำนวณยอดคาดการณ์
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