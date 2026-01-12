import { useState, useEffect } from 'react';
import client from '../../api/client';
import { 
  CheckCircle, XCircle, Clock, ExternalLink, RefreshCw, 
  ArrowUpRight, ArrowDownLeft, Search 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageTransactions() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('PENDING'); // PENDING, APPROVED, REJECTED

  useEffect(() => { fetchRequests(); }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // ดึงรายการเติมเงิน (Topup)
      const resTopup = await client.get(`/topup/requests?status=${filter}`);
      const topups = resTopup.data.map((i:any) => ({...i, type: 'TOPUP'}));
      
      // ดึงรายการถอนเงิน (Withdraw) - ถ้ามี withdraw.py แล้วให้ uncomment
      let withdraws: any[] = [];
      try {
         const resWithdraw = await client.get(`/withdraw/requests?status=${filter}`); // เช็ค path ใน withdraw.py
         withdraws = resWithdraw.data.map((i:any) => ({...i, type: 'WITHDRAW'}));
      } catch(e) { /* ถ้ายังไม่ทำ withdraw ก็ข้าม */ }

      // รวมและเรียงลำดับใหม่สุดขึ้นก่อน
      const combined = [...topups, ...withdraws].sort((a,b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setRequests(combined);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAction = async (id: string, action: 'APPROVED'|'REJECTED', type: string) => {
      if(!confirm(`ยืนยันการ ${action === 'APPROVED' ? 'อนุมัติ' : 'ปฏิเสธ'} รายการนี้?`)) return;
      
      const endpoint = type === 'TOPUP' ? '/topup' : '/withdraw';
      const toastId = toast.loading('กำลังบันทึก...');
      
      try {
          // ยิง API อนุมัติ (Backend topup.py บรรทัด process_topup_request)
          await client.put(`${endpoint}/requests/${id}/action`, { 
              status: action, 
              remark: 'Admin processed' 
          });
          
          toast.success('ทำรายการสำเร็จ', { id: toastId });
          fetchRequests(); // รีโหลดข้อมูล
      } catch(err) { 
          toast.error('เกิดข้อผิดพลาด', { id: toastId }); 
      }
  };

  return (
    <div className="animate-fade-in">
        {/* Header Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
            <div className="flex p-1 bg-slate-100 rounded-lg">
                {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
                    <button 
                        key={s} 
                        onClick={() => setFilter(s)}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                            filter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {s === 'PENDING' ? 'รอตรวจสอบ' : (s === 'APPROVED' ? 'สำเร็จ' : 'ปฏิเสธ')}
                    </button>
                ))}
            </div>
            <button onClick={fetchRequests} className="p-2.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>
            </button>
        </div>

        {/* List Content */}
        <div className="space-y-3">
            {requests.map(req => (
                <div key={req.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 items-center animate-slide-up">
                    
                    {/* Icon & User Info */}
                    <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                            req.type === 'TOPUP' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                            {req.type === 'TOPUP' ? <ArrowDownLeft size={24}/> : <ArrowUpRight size={24}/>}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold ${req.type === 'TOPUP' ? 'text-green-700' : 'text-orange-700'}`}>
                                    {req.type === 'TOPUP' ? 'แจ้งเติมเงิน' : 'แจ้งถอนเงิน'}
                                </span>
                                <span className="text-sm font-black text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                    {Number(req.amount).toLocaleString()} ฿
                                </span>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                                <Clock size={12}/> {new Date(req.created_at).toLocaleString('th-TH')}
                                {req.username && <span className="font-bold text-slate-500">• {req.username}</span>}
                            </div>
                            
                            {/* แสดงข้อมูลธนาคาร (ถ้าเป็นการถอน) */}
                            {req.type === 'WITHDRAW' && (
                                <div className="text-xs text-slate-500 mt-1 bg-orange-50 px-2 py-1 rounded w-fit">
                                    🏦 {req.bank_name} - {req.account_number} ({req.account_name})
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-50">
                        {/* ดูสลิป (เฉพาะเติมเงิน) */}
                        {req.proof_image && (
                            <a 
                                href={req.proof_image} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <ExternalLink size={14}/> ดูสลิป
                            </a>
                        )}

                        {req.status === 'PENDING' ? (
                            <>
                                <button 
                                    onClick={() => handleAction(req.id, 'APPROVED', req.type)} 
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-green-700 shadow-sm shadow-green-200 flex items-center gap-1"
                                >
                                    <CheckCircle size={14}/> อนุมัติ
                                </button>
                                <button 
                                    onClick={() => handleAction(req.id, 'REJECTED', req.type)} 
                                    className="bg-white text-red-600 border border-red-100 px-4 py-2 rounded-lg font-bold text-xs hover:bg-red-50 flex items-center gap-1"
                                >
                                    <XCircle size={14}/> ปฏิเสธ
                                </button>
                            </>
                        ) : (
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${
                                req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                                {req.status === 'APPROVED' ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                                {req.status}
                            </span>
                        )}
                    </div>
                </div>
            ))}
            
            {requests.length === 0 && !loading && (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Search className="mx-auto mb-2 opacity-20" size={32}/>
                    ไม่พบรายการในช่วงนี้
                </div>
            )}
        </div>
    </div>
  );
}