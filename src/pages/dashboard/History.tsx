import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
  X, RefreshCw, Trophy, FileText, 
  ChevronRight, Receipt, ChevronLeft, 
  Search, ArrowLeft, Calendar
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

// Interface
interface LottoType {
  id: string;
  name: string;
  img_url?: string;
}

export default function History() {
  // State ควบคุมหน้าจอ ('MENU' = เลือกหวย, 'LIST' = ดูรายการ)
  const [view, setView] = useState<'MENU' | 'LIST'>('MENU');
  const [selectedLotto, setSelectedLotto] = useState<LottoType | null>(null);

  // Data List
  const [lottos, setLottos] = useState<LottoType[]>([]); // รายชื่อหวยสำหรับเมนู
  const [tickets, setTickets] = useState<any[]>([]);     // รายการโพย
  
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState(''); // ค้นหาชื่อหวยในเมนู

  // Pagination & Modal
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 40;
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // 1. โหลดรายชื่อหวยก่อน (เมื่อเข้าหน้าแรก)
  useEffect(() => {
    const fetchLottos = async () => {
      try {
        const res = await client.get('/play/lottos');
        setLottos(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLottos();
  }, []);

  // 2. ฟังก์ชันโหลดประวัติ (เมื่อเลือกหวยแล้ว)
  const fetchHistory = async () => {
    if (!selectedLotto) return;
    
    setLoading(true);
    try {
      // ส่ง lotto_type_id ไปกรองที่ Backend
      const res = await client.get(`/play/history?limit=1000&lotto_type_id=${selectedLotto.id}`);
      setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // เมื่อกดเลือกหวย
  const handleSelectLotto = (lotto: LottoType) => {
    setSelectedLotto(lotto);
    setView('LIST');
    setTickets([]); // เคลียร์ของเก่า
    // fetchHistory จะถูกเรียกผ่าน useEffect หรือเรียกตรงนี้ก็ได้
    // แต่เพื่อความชัวร์ เรียกฟังก์ชัน fetchHistory ที่ปรับปรุงใหม่
    
    // Hack: เรียก fetch ตรงๆ เลยเพราะ state selectedLotto อาจยังไม่อัปเดตทันทีใน function scope
    setLoading(true);
    client.get(`/play/history?limit=1000&lotto_type_id=${lotto.id}`)
      .then(res => setTickets(res.data))
      .finally(() => setLoading(false));
  };

  const handleBack = () => {
    setView('MENU');
    setSelectedLotto(null);
    setSearchTerm('');
    setFilter('ALL');
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
  
  // 1. กรองรายชื่อหวยในหน้าเมนู
  const filteredLottos = lottos.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. กรองและแบ่งหน้าในหน้ารายการ
  const filteredTickets = tickets.filter(t => {
      if (filter === 'ALL') return true;
      return t.status === filter;
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
      
      {/* ---------------- VIEW 1: MENU (เลือกประเภทหวย) ---------------- */}
      {view === 'MENU' && (
        <div className="p-4 max-w-4xl mx-auto w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Receipt className="text-blue-600" /> ประวัติโพย
                </h1>
                <p className="text-slate-500 text-sm">เลือกประเภทหวยเพื่อดูประวัติการแทง</p>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <input 
                    type="text" 
                    placeholder="ค้นหาชื่อหวย..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
            </div>

            {/* Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLottos.map(lotto => (
                    <button 
                        key={lotto.id}
                        onClick={() => handleSelectLotto(lotto)}
                        className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between group text-left"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold shadow-sm group-hover:scale-110 transition-transform">
                                {lotto.img_url ? (
                                    <img src={lotto.img_url} 
                                    loading="lazy" 
                                    decoding="async"
                                    alt={lotto.name}  className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    lotto.name.charAt(0)
                                )}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                                    {lotto.name}
                                </div>
                                <div className="text-xs text-slate-400">คลิกเพื่อดูรายการโพย</div>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <ChevronRight size={18} />
                        </div>
                    </button>
                ))}
                {filteredLottos.length === 0 && (
                    <div className="col-span-full text-center py-10 text-slate-400">
                        ไม่พบหวยที่คุณค้นหา
                    </div>
                )}
            </div>
        </div>
      )}

      {/* ---------------- VIEW 2: LIST (รายการโพย) ---------------- */}
      {view === 'LIST' && selectedLotto && (
        <div className="flex-1 flex flex-col w-full h-full animate-slide-up">
            
            {/* Header Sticky */}
            <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-4 max-w-6xl mx-auto">
                    <button 
                        onClick={handleBack}
                        className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{selectedLotto.name}</h2>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Receipt size={12}/> ประวัติการแทงทั้งหมด
                        </div>
                    </div>
                    <button 
                        onClick={fetchHistory} 
                        className={`ml-auto p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-600 transition-all ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
                
                {/* Tabs Filter */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide max-w-6xl mx-auto">
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
                                className="break-inside-avoid bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer mb-4"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                                            t.status === 'WIN' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {t.status === 'WIN' ? <Trophy size={18} /> : <FileText size={18} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-800 text-sm truncate">โพย #{t.id.substring(0, 6)}</h3>
                                                {t.status === 'WIN' && <span className="text-[10px] bg-green-500 text-white px-1.5 rounded font-bold">WIN</span>}
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                <Calendar size={10} /> {new Date(t.created_at).toLocaleString('th-TH')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-blue-600 text-sm">-{Number(t.total_amount).toLocaleString()}</div>
                                        <div className={`text-[10px] px-2 rounded-full inline-block font-bold ${getStatusColor(t.status)}`}>
                                            {getStatusLabel(t.status)}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-50">
                                    {t.items?.slice(0, 5).map((item:any, i:number) => (
                                        <span key={i} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-slate-100">
                                            {item.number}
                                        </span>
                                    ))}
                                    {(t.items?.length || 0) > 5 && <span className="text-[10px] text-gray-400 px-1">+{t.items.length-5}</span>}
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
        </div>
      )}

      {/* ---------------- MODAL (รายละเอียดยังคงเดิม แต่ปรับ UI นิดหน่อย) ---------------- */}
      {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
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

                  {/* Modal Body */}
                  <div className="p-4 overflow-y-auto bg-white flex-1 custom-scrollbar">
                      
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