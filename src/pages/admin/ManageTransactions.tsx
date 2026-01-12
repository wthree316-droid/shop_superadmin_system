import { useState, useEffect } from 'react';
import client from '../../api/client';
import { 
  CheckCircle, XCircle, Clock, Loader2, RefreshCw, 
  ArrowUpRight, ArrowDownLeft, Search, Image as ImageIcon, X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageTransactions() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('PENDING'); // PENDING, APPROVED, REJECTED
  
  // State สำหรับเก็บ URL รูปที่จะดูใน Modal (ถ้าเป็น null แปลว่าปิด Modal)
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => { 
      fetchRequests(); 
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // 1. ดึงรายการเติมเงิน
      const resTopup = await client.get(`/topup/requests?status=${filter}`);
      const topups = resTopup.data.map((i:any) => ({...i, type: 'TOPUP'}));
      
      // 2. ดึงรายการถอนเงิน (ถ้ามี Error ให้ข้ามไปก่อน)
      let withdraws: any[] = [];
      try {
         const resWithdraw = await client.get(`/withdraw/requests?status=${filter}`);
         withdraws = resWithdraw.data.map((i:any) => ({...i, type: 'WITHDRAW'}));
      } catch(e) {
         // console.error("Withdraw API not ready yet");
      }

      // 3. รวมรายการและเรียงตามเวลา (ใหม่ -> เก่า)
      const all = [...topups, ...withdraws].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRequests(all);

    } catch (err) { 
        console.error(err);
        toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally { 
        setLoading(false); 
    }
  };

  const handleAction = async (id: string, status: string, type: string) => {
      if(!confirm(`ยืนยันการ ${status} รายการนี้?`)) return;
      try {
          const endpoint = type === 'TOPUP' ? `/topup/requests/${id}/action` : `/withdraw/requests/${id}/action`;
          
          await client.put(endpoint, { 
              status, 
              remark: status === 'REJECTED' ? 'ปฏิเสธโดยแอดมิน' : null 
          });
          
          toast.success('ดำเนินการสำเร็จ');
          fetchRequests(); // โหลดข้อมูลใหม่
      } catch (err: any) {
          toast.error(err.response?.data?.detail || 'เกิดข้อผิดพลาด');
      }
  };

  return (
    <div className="space-y-4 font-sans animate-fade-in">
        
        {/* --- ส่วนหัว (Header & Filter) --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
                    <button 
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                            filter === s ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                        {s === 'PENDING' ? 'รอตรวจสอบ' : s === 'APPROVED' ? 'สำเร็จ' : 'ปฏิเสธ'}
                    </button>
                ))}
            </div>
            <button 
                onClick={fetchRequests} 
                className={`p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all ${loading ? 'animate-spin' : ''}`}
                title="รีเฟรชข้อมูล"
            >
                <RefreshCw size={18}/>
            </button>
        </div>

        {/* --- ส่วนแสดงรายการ (List) --- */}
        <div className="space-y-3 min-h-75">
            
            {/* กรณี 1: กำลังโหลด (ใช้ loading state แล้ว ✅) */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                    <p className="text-slate-400 text-sm">กำลังโหลดรายการ...</p>
                </div>
            ) : (
                <>
                    {/* กรณี 2: โหลดเสร็จ แต่ไม่มีข้อมูล */}
                    {requests.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <Search className="mx-auto mb-2 opacity-20" size={40}/>
                            <p>ไม่พบรายการในช่วงนี้</p>
                        </div>
                    ) : (
                        // กรณี 3: มีข้อมูล -> วนลูปแสดงผล
                        requests.map(req => (
                            <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                
                                {/* Info Section */}
                                <div className="flex gap-4 items-start md:items-center w-full md:w-auto">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                                        req.type === 'TOPUP' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                    }`}>
                                        {req.type === 'TOPUP' ? <ArrowDownLeft size={24}/> : <ArrowUpRight size={24}/>}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`font-bold text-sm ${req.type === 'TOPUP' ? 'text-green-700' : 'text-orange-700'}`}>
                                                {req.type === 'TOPUP' ? 'แจ้งฝากเงิน' : 'แจ้งถอนเงิน'}
                                            </span>
                                            <span className="text-xs text-slate-400">| User: {req.username || 'Unknown'}</span>
                                        </div>
                                        <div className="text-xl font-black text-slate-800 mt-0.5">
                                            {Number(req.amount).toLocaleString()} ฿
                                        </div>
                                        <div className="text-[10px] text-slate-400 flex gap-2 mt-1 items-center">
                                            <Clock size={12}/> {new Date(req.created_at).toLocaleString('th-TH')}
                                        </div>

                                        {/* ปุ่มดูสลิป (เฉพาะฝากเงิน และมีรูป) */}
                                        {req.type === 'TOPUP' && req.proof_image && (
                                            <button 
                                                onClick={() => setSelectedImage(req.proof_image)}
                                                className="mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors border border-blue-100"
                                            >
                                                <ImageIcon size={12}/> ดูหลักฐานการโอน
                                            </button>
                                        )}

                                        {/* ข้อมูลธนาคาร (ถ้าถอน) */}
                                        {req.type === 'WITHDRAW' && (
                                            <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                                <div className="font-bold">{req.bank_name}</div>
                                                <div>{req.account_number} ({req.account_name})</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions Section */}
                                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                                    {req.status === 'PENDING' ? (
                                        <>
                                            <button 
                                                onClick={() => handleAction(req.id, 'APPROVED', req.type)} 
                                                className="flex-1 md:flex-none bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-green-700 shadow-md shadow-green-200 flex items-center justify-center gap-1 transition-all active:scale-95"
                                            >
                                                <CheckCircle size={14}/> อนุมัติ
                                            </button>
                                            <button 
                                                onClick={() => handleAction(req.id, 'REJECTED', req.type)} 
                                                className="flex-1 md:flex-none bg-white text-red-600 border border-red-100 px-4 py-2 rounded-lg font-bold text-xs hover:bg-red-50 flex items-center justify-center gap-1 transition-all active:scale-95"
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
                        ))
                    )}
                </>
            )}
        </div>

        {/* --- Modal: ดูรูปสลิปขยายใหญ่ --- */}
        {selectedImage && (
            <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" 
                onClick={() => setSelectedImage(null)}
            >
                <div 
                    className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" 
                    onClick={e => e.stopPropagation()} // ป้องกันการกดที่กล่องแล้วปิด
                >
                    {/* ปุ่มปิด */}
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                    >
                        <X size={20}/>
                    </button>

                    {/* พื้นที่แสดงรูป */}
                    <div className="p-2 bg-slate-100 flex justify-center min-h-50">
                        <img 
                            src={selectedImage} 
                            alt="Slip Proof" 
                            className="max-h-[80vh] w-auto object-contain rounded-lg shadow-sm"
                            loading="lazy"
                            // ✅ แก้ไข: ใส่ as HTMLImageElement เพื่อแก้ขีดแดง
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://placehold.co/600x400?text=Image+Error';
                                target.onerror = null; // ป้องกัน Loop ถ้า placeholder เสียอีก
                            }}
                        />
                    </div>

                    {/* Footer ของ Modal */}
                    <div className="p-4 bg-white text-center border-t border-slate-100">
                        <p className="text-sm text-slate-500 mb-1">หลักฐานการโอนเงิน</p>
                        <a 
                            href={selectedImage} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline font-bold inline-flex items-center gap-1"
                        >
                            <ArrowUpRight size={12}/> เปิดรูปต้นฉบับ
                        </a>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
}