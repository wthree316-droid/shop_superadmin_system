import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
  Ticket, 
  Eye, 
  Ban, 
  RefreshCcw, 
  X, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Receipt
} from 'lucide-react';

export default function ShopHistory() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null); // สำหรับ Modal ดูรายละเอียด

  useEffect(() => {
    fetchTickets();
    
    // Optional: Auto Refresh ทุก 30 วินาที
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/play/shop_history?limit=50');
      setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
    if(!confirm('⚠️ ยืนยันการยกเลิกโพยนี้?\nเงินจะถูกคืนเข้ากระเป๋าลูกค้าทันที')) return;
    
    try {
        await client.patch(`/play/tickets/${ticketId}/cancel`);
        alert('ยกเลิกโพยเรียบร้อย คืนเครดิตแล้ว');
        fetchTickets(); // โหลดข้อมูลใหม่
        setSelectedTicket(null); // ปิด Modal
    } catch (err: any) {
        alert(`เกิดข้อผิดพลาด: ${err.response?.data?.detail}`);
    }
  };

  // Helper แปลงสถานะเป็น Badge สวยๆ
  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'WIN': 
            return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold border border-green-200"><CheckCircle size={12}/> ถูกรางวัล</span>;
        case 'LOSE': 
            return <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full text-xs font-bold border border-gray-200"><XCircle size={12}/> ไม่ถูก</span>;
        case 'CANCELLED': 
            return <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 px-2.5 py-1 rounded-full text-xs font-bold border border-red-200"><Ban size={12}/> ยกเลิก</span>;
        default: 
            return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-200"><Clock size={12}/> รอผล</span>;
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-8 animate-fade-in">
      
      {/* --- Header --- */}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                    <Ticket size={24} />
                </div>
                ประวัติโพย
            </h1>
            <p className="text-sm text-slate-500 mt-1 ml-1">รายการล่าสุด 50 รายการ (Auto Update)</p>
        </div>
        <button 
            onClick={fetchTickets} 
            className={`p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-all shadow-sm ${isLoading ? 'animate-spin text-blue-500' : ''}`}
            title="รีเฟรชข้อมูล"
        >
            <RefreshCcw size={20} />
        </button>
      </div>

      {/* --- Desktop Table View (Hidden on Mobile) --- */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs tracking-wider">
                    <tr>
                        <th className="p-4">เวลาทำรายการ</th>
                        <th className="p-4">ลูกค้า</th>
                        <th className="p-4 text-center">ประเภทหวย</th>
                        <th className="p-4 text-right">ยอดแทง</th>
                        <th className="p-4 text-center">สถานะ</th>
                        <th className="p-4 text-center">จัดการ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {tickets.map((t) => (
                        <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="p-4 text-slate-500 font-mono text-xs">
                                {new Date(t.created_at).toLocaleString('th-TH')}
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                        {(t.user?.username || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{t.user?.username || 'Unknown'}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 text-center">
                                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">
                                    {t.lotto_type?.name || 'หวย'}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <span className="font-bold text-blue-600 text-base">{Number(t.total_amount).toLocaleString()}</span>
                                <span className="text-xs text-slate-400 ml-1">฿</span>
                            </td>
                            <td className="p-4 text-center">
                                {getStatusBadge(t.status)}
                            </td>
                            <td className="p-4 text-center">
                                <button 
                                    onClick={() => setSelectedTicket(t)}
                                    className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                    title="ดูรายละเอียด"
                                >
                                    <Eye size={20} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {tickets.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400">
                                <Ticket size={40} className="mx-auto mb-2 opacity-20" />
                                ยังไม่มีรายการเดิมพัน
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- Mobile Card View (Show on Mobile) --- */}
      <div className="md:hidden space-y-4">
          {isLoading && <div className="text-center py-8 text-slate-400 text-sm">กำลังโหลดข้อมูล...</div>}
          {!isLoading && tickets.length === 0 && (
              <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                  <Ticket size={32} className="mx-auto mb-2 opacity-30" />
                  ไม่พบรายการเดิมพัน
              </div>
          )}

          {tickets.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden active:scale-[0.99] transition-transform" onClick={() => setSelectedTicket(t)}>
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-3 pb-2 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                              {(t.user?.username || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-sm">{t.user?.username || 'Unknown'}</h3>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock size={10} /> {new Date(t.created_at).toLocaleString('th-TH')}
                              </p>
                          </div>
                      </div>
                      {getStatusBadge(t.status)}
                  </div>

                  {/* Card Body */}
                  <div className="flex justify-between items-end">
                      <div>
                          <p className="text-xs text-slate-500 font-bold mb-1">{t.lotto_type?.name}</p>
                          <p className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded inline-block">
                              {t.items?.length || 0} รายการ
                          </p>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">ยอดแทง</p>
                          <p className="text-xl font-black text-blue-600">{Number(t.total_amount).toLocaleString()} ฿</p>
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {/* --- Ticket Detail Modal (Responsive) --- */}
      {selectedTicket && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95">
                  {/* Header */}
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                              <Receipt size={20} />
                          </div>
                          <div>
                              <h3 className="font-bold text-lg text-slate-800">รายละเอียดโพย</h3>
                              <p className="text-[10px] text-slate-500 font-mono">ID: {selectedTicket.id.substring(0,8)}...</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedTicket(null)} className="bg-white p-1.5 rounded-full text-slate-400 hover:text-red-500 border border-slate-200 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  
                  {/* Scrollable Content */}
                  <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar">
                      <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-xs font-bold text-slate-500 uppercase">สถานะบิล</span>
                          {getStatusBadge(selectedTicket.status)}
                      </div>

                      <div className="space-y-2">
                          {selectedTicket.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-mono font-black text-slate-700 text-sm tracking-widest border border-slate-200">
                                          {item.number}
                                      </div>
                                      <div className="flex flex-col">
                                          <span className="text-xs font-bold text-slate-600">{item.bet_type}</span>
                                          {item.status === 'WIN' && <span className="text-[10px] text-green-600 font-bold">ถูกรางวัล!</span>}
                                      </div>
                                  </div>
                                  <div className={`font-bold ${item.status === 'WIN' ? 'text-green-600' : 'text-slate-700'}`}>
                                      {Number(item.amount).toLocaleString()}.-
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Footer Action */}
                  <div className="p-5 border-t border-slate-100 bg-white rounded-b-2xl">
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-bold text-slate-500 uppercase">ยอดรวมทั้งสิ้น</span>
                          <span className="text-2xl font-black text-blue-600">{Number(selectedTicket.total_amount).toLocaleString()} ฿</span>
                      </div>
                      
                      {/* ปุ่มยกเลิก (เฉพาะสถานะ PENDING) */}
                      {selectedTicket.status === 'PENDING' && (
                          <button 
                            onClick={() => handleCancelTicket(selectedTicket.id)}
                            className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold border border-red-100 hover:bg-red-100 flex items-center justify-center gap-2 transition-colors active:scale-95"
                          >
                              <Ban size={18} /> ยกเลิกโพยและคืนเงิน
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}